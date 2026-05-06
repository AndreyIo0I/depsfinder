/**
 * Import resolver - resolves imports to actual file paths
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T007)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname, resolve, extname } from 'path';
import type { AnalyzedFile, PackageInfo, ImportInfo } from '../types/global.ts';

/**
 * Разрешает все импорты в проанализированных файлах
 */
export function resolveImports(
  analyzedFiles: AnalyzedFile[],
  packages: PackageInfo[]
): AnalyzedFile[] {
  // Создаём мапу пакетов для быстрого поиска
  const packageMap = new Map<string, PackageInfo>();
  for (const pkg of packages) {
    packageMap.set(pkg.name, pkg);
    packageMap.set(pkg.id, pkg);
    
    // Добавляем маппинг для scoped пакетов
    if (pkg.name.startsWith('@')) {
      const parts = pkg.name.split('/');
      if (parts.length === 2) {
        packageMap.set(parts[1], pkg);
      }
    }
  }
  
  // Создаём мапу файлов для быстрого поиска
  const fileMap = new Map<string, AnalyzedFile>();
  for (const file of analyzedFiles) {
    fileMap.set(file.filePath, file);
  }
  
  // Разрешаем импорты для каждого файла
  const resolvedFiles: AnalyzedFile[] = analyzedFiles.map(file => ({
    ...file,
    imports: file.imports.map(importInfo => ({
      ...importInfo,
      resolvedPath: resolveImportPath(importInfo, file, packages, fileMap)
    }))
  }));
  
  return resolvedFiles;
}

/**
 * Разрешает путь импорта к реальному файлу
 */
function resolveImportPath(
  importInfo: ImportInfo,
  sourceFile: AnalyzedFile,
  packages: PackageInfo[],
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  const moduleName = importInfo.moduleName;
  
  // Пропускаем внешние зависимости (начинаются с @ или не содержат / или .)
  if (isExternalModule(moduleName)) {
    return undefined;
  }
  
  // Относительный импорт (./ или ../)
  if (moduleName.startsWith('.') || moduleName.startsWith('/')) {
    return resolveRelativeImport(moduleName, sourceFile.filePath, fileMap);
  }
  
  // Scoped импорт (@scope/package или @scope/package/path)
  if (moduleName.startsWith('@')) {
    return resolveScopedImport(moduleName, packages, fileMap);
  }
  
  // Простой импорт пакета (package или package/path)
  return resolvePackageImport(moduleName, packages, fileMap);
}

/**
 * Проверяет, является ли модуль внешним (не из проекта)
 */
function isExternalModule(moduleName: string): boolean {
  // Внешние модули обычно не содержат путей
  if (!moduleName.includes('/') && !moduleName.includes('.')) {
    return true;
  }
  
  // node_modules всегда внешние
  if (moduleName.includes('node_modules')) {
    return true;
  }
  
  return false;
}

/**
 * Разрешает относительный импорт
 */
function resolveRelativeImport(
  moduleName: string,
  sourceFilePath: string,
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  const sourceDir = dirname(sourceFilePath);
  let resolvedPath = resolve(sourceDir, moduleName);
  
  // Пробуем разные расширения
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  
  // Проверяем файл с расширением
  if (existsSync(resolvedPath)) {
    return resolvedPath;
  }
  
  // Пробуем добавить расширения
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    if (existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }
  
  // Проверяем index файлы в директории
  for (const ext of extensions) {
    const indexPath = join(resolvedPath, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  // Если файл существует в fileMap, возвращаем его
  for (const [filePath] of fileMap) {
    if (filePath.startsWith(resolvedPath)) {
      return filePath;
    }
  }
  
  return resolvedPath;
}

/**
 * Разрешает scoped импорт (@scope/package)
 */
function resolveScopedImport(
  moduleName: string,
  packages: PackageInfo[],
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  const parts = moduleName.split('/');
  const scope = parts[0];
  const packageName = parts[1];
  const fullPath = `${scope}/${packageName}`;
  
  // Ищем пакет
  const pkg = packages.find(p => 
    p.name === fullPath || 
    p.name === `${scope}/${packageName}` ||
    p.id === packageName
  );
  
  if (!pkg) {
    return undefined;
  }
  
  // Если есть путь после имени пакета
  if (parts.length > 2) {
    const subPath = parts.slice(2).join('/');
    return resolveSubPath(pkg, subPath, fileMap);
  }
  
  // Возвращаем main файл или первый файл пакета
  if (pkg.main) {
    const mainPath = join(pkg.path, pkg.main);
    if (existsSync(mainPath)) {
      return mainPath;
    }
  }
  
  // Ищем index файл
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const indexPath = join(pkg.path, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  // Возвращаем первый файл пакета
  return pkg.files[0];
}

/**
 * Разрешает простой импорт пакета
 */
function resolvePackageImport(
  moduleName: string,
  packages: PackageInfo[],
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  const parts = moduleName.split('/');
  const packageName = parts[0];
  
  // Ищем пакет по имени
  const pkg = packages.find(p => 
    p.name === packageName || 
    p.id === packageName ||
    p.name.endsWith(`/${packageName}`)
  );
  
  if (!pkg) {
    return undefined;
  }
  
  // Если есть путь после имени пакета
  if (parts.length > 1) {
    const subPath = parts.slice(1).join('/');
    return resolveSubPath(pkg, subPath, fileMap);
  }
  
  // Возвращаем main файл или первый файл пакета
  if (pkg.main) {
    const mainPath = join(pkg.path, pkg.main);
    if (existsSync(mainPath)) {
      return mainPath;
    }
  }
  
  // Ищем index файл
  for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
    const indexPath = join(pkg.path, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  // Возвращаем первый файл пакета
  return pkg.files[0];
}

/**
 * Разрешает подпуть внутри пакета
 */
function resolveSubPath(
  pkg: PackageInfo,
  subPath: string,
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  // Проверяем существование пути
  const fullPath = join(pkg.path, subPath);
  
  if (existsSync(fullPath)) {
    return fullPath;
  }
  
  // Пробуем разные расширения
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const pathWithExt = fullPath + ext;
    if (existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }
  
  // Проверяем index файлы
  for (const ext of extensions) {
    const indexPath = join(fullPath, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  // Ищем в fileMap
  for (const [filePath] of fileMap) {
    if (filePath.includes(subPath) && filePath.startsWith(pkg.path)) {
      return filePath;
    }
  }
  
  return undefined;
}

/**
 * Обходит баррельные экспорты (index.ts) и находит реальный файл
 */
export function bypassBarrelExports(
  filePath: string,
  exportName: string,
  fileMap: Map<string, AnalyzedFile>
): string | undefined {
  const file = fileMap.get(filePath);
  if (!file) {
    return filePath;
  }
  
  // Проверяем, является ли файл баррелем (index.ts)
  const fileName = filePath.split('/').pop() || '';
  if (fileName !== 'index.ts' && fileName !== 'index.tsx') {
    return filePath;
  }
  
  // Ищем экспорт с нужным именем
  const exportInfo = file.exports.find(e => e.exportedName === exportName);
  if (!exportInfo) {
    return filePath;
  }
  
  // Ищем импорт этого экспорта в том же файле
  const importInfo = file.imports.find(i => 
    i.importedNames.includes(exportName)
  );
  
  if (importInfo && importInfo.resolvedPath) {
    return bypassBarrelExports(importInfo.resolvedPath, exportName, fileMap);
  }
  
  return filePath;
}
