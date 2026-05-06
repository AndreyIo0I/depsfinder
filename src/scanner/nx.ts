/**
 * NX packages scanner
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T005)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import { readdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { TsDepConfig, PackageInfo, ScannerResult, SkippedPath } from '../types/global.ts';

/**
 * Сканирует проект и находит все пакеты/модули
 * Если packagesDir не содержит поддиректорий с package.json, сканирует напрямую файлы
 */
export async function scanNxPackages(config: TsDepConfig): Promise<ScannerResult> {
  const packages: PackageInfo[] = [];
  const skippedPaths: SkippedPath[] = [];
  
  const projectRoot = resolve(config.projectRoot);
  const packagesDir = join(projectRoot, config.packagesDir);
  
  // Проверяем существование директории
  if (!existsSync(packagesDir)) {
    console.log(`[WARN] Packages directory not found: ${packagesDir}`);
    return { packages, skippedPaths };
  }
  
  // Читаем содержимое директории
  const entries = readdirSync(packagesDir, { withFileTypes: true });
  const hasSubdirs = entries.some(e => e.isDirectory());
  
  // Если это плоская структура (как src/), обрабатываем напрямую
  if (!hasSubdirs || config.packagesDir === 'src') {
    const files = findTypeScriptFiles(packagesDir, config.excludePaths);
    const packageJsonPath = join(projectRoot, 'package.json');
    
    let packageName = 'project';
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        packageName = packageJson.name || 'project';
      } catch {}
    }
    
    if (files.length > 0) {
      packages.push({
        id: packageName,
        name: packageName,
        path: packagesDir,
        files
      });
    }
    
    return { packages, skippedPaths };
  }
  
  // Для NX-структуры с поддиректориями
  const packageDirs = entries
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Для каждой директории проверяем наличие package.json
  for (const pkgDir of packageDirs) {
    const pkgPath = join(packagesDir, pkgDir);
    const packageJsonPath = join(pkgPath, 'package.json');
    
    // Проверяем исключённые пути
    if (config.excludePaths.some(exclude => pkgPath.includes(exclude))) {
      skippedPaths.push({
        path: pkgPath,
        reason: 'excluded_by_config'
      });
      continue;
    }
    
    // Проверяем наличие package.json
    if (!existsSync(packageJsonPath)) {
      skippedPaths.push({
        path: pkgPath,
        reason: 'no_package_json'
      });
      continue;
    }
    
    try {
      // Читаем и парсим package.json
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      // Находим все TypeScript файлы в пакете
      const files = findTypeScriptFiles(pkgPath, config.excludePaths);
      
      // Создаём PackageInfo
      const packageInfo: PackageInfo = {
        id: packageJson.name || pkgDir,
        name: packageJson.name || pkgDir,
        path: pkgPath,
        main: packageJson.main,
        types: packageJson.types || packageJson.typings,
        files
      };
      
      packages.push(packageInfo);
    } catch (error) {
      console.log(`[WARN] Failed to parse package.json for ${pkgDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      skippedPaths.push({
        path: pkgPath,
        reason: 'no_package_json'
      });
    }
  }
  
  return { packages, skippedPaths };
}

/**
 * Рекурсивно находит все TypeScript файлы в директории
 */
function findTypeScriptFiles(dir: string, excludePaths: string[]): string[] {
  const files: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Пропускаем исключённые пути
      if (excludePaths.some(exclude => fullPath.includes(exclude))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Рекурсивно сканируем директории
        files.push(...findTypeScriptFiles(fullPath, excludePaths));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // Silent skip с логированием
    console.log(`[WARN] Failed to read directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return files;
}
