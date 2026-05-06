/**
 * TypeScript parser using Compiler API
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T006)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import * as ts from 'typescript';
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import type { PackageInfo, AnalyzedFile, ImportInfo, ExportInfo, TsDepConfig } from '../types/global.ts';

/**
 * Анализирует все пакеты и извлекает импорты/экспорты
 */
export async function analyzePackages(packages: PackageInfo[], config: TsDepConfig): Promise<AnalyzedFile[]> {
  const analyzedFiles: AnalyzedFile[] = [];
  
  for (const pkg of packages) {
    console.log(`[DEBUG] Analyzing package: ${pkg.name}`);
    
    // Создаём ts.Program для пакета
    const program = createProgramForPackage(pkg.path);
    
    // Анализируем каждый файл в пакете
    for (const filePath of pkg.files) {
      try {
        const analyzedFile = analyzeFile(filePath, pkg.id, program);
        if (analyzedFile) {
          analyzedFiles.push(analyzedFile);
        }
      } catch (error) {
        // Silent skip с логированием
        console.log(`[WARN] Failed to analyze file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  return analyzedFiles;
}

/**
 * Создаёт ts.Program для пакета
 */
function createProgramForPackage(packagePath: string): ts.Program {
  // Ищем tsconfig.json
  const tsconfigPath = findTsconfig(packagePath);
  
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    checkJs: false,
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true
  };
  
  if (tsconfigPath && existsSync(tsconfigPath)) {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      dirname(tsconfigPath)
    );
    
    Object.assign(compilerOptions, parsedConfig.options);
  }
  
  // Получаем список файлов для программы
  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram([], compilerOptions, host);
  
  return program;
}

/**
 * Ищет tsconfig.json в директории или выше
 */
function findTsconfig(startPath: string): string | null {
  let currentPath = startPath;
  
  while (currentPath !== dirname(currentPath)) {
    const tsconfigPath = join(currentPath, 'tsconfig.json');
    if (existsSync(tsconfigPath)) {
      return tsconfigPath;
    }
    currentPath = dirname(currentPath);
  }
  
  return null;
}

/**
 * Анализирует отдельный файл
 */
function analyzeFile(filePath: string, packageName: string, program: ts.Program): AnalyzedFile | null {
  const sourceFile = program.getSourceFile(filePath);
  
  if (!sourceFile) {
    // Файл не найден в программе, создаём новый source file
    const content = readFileSync(filePath, 'utf-8');
    const newSourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    return extractImportsExports(newSourceFile, filePath, packageName);
  }
  
  return extractImportsExports(sourceFile, filePath, packageName);
}

/**
 * Извлекает импорты и экспорты из AST
 */
function extractImportsExports(sourceFile: ts.SourceFile, filePath: string, packageName: string): AnalyzedFile {
  const imports: ImportInfo[] = [];
  const exports: ExportInfo[] = [];
  
  // Проходим по всем узлам AST
  ts.forEachChild(sourceFile, (node) => {
    // Обработка импортов
    if (ts.isImportDeclaration(node)) {
      const importInfo = extractImportInfo(node, sourceFile);
      if (importInfo) {
        imports.push(importInfo);
      }
    }
    
    // Обработка экспортов
    if (ts.isExportDeclaration(node)) {
      const exportInfos = extractExportInfo(node, sourceFile);
      exports.push(...exportInfos);
    }
    
    // Обработка именованных экспортов
    if (ts.isVariableStatement(node)) {
      const exportInfos = extractNamedExportInfo(node, sourceFile);
      exports.push(...exportInfos);
    }
    
    if (ts.isFunctionDeclaration(node)) {
      const exportInfos = extractFunctionExportInfo(node, sourceFile);
      exports.push(...exportInfos);
    }
    
    if (ts.isClassDeclaration(node)) {
      const exportInfos = extractClassExportInfo(node, sourceFile);
      exports.push(...exportInfos);
    }
  });
  
  // Подсчёт строк кода
  const lineCount = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd()).line + 1;
  
  return {
    filePath,
    packageName,
    imports,
    exports,
    hasErrors: false
  };
}

/**
 * Извлекает информацию об импорте
 */
function extractImportInfo(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ImportInfo | null {
  const moduleSpecifier = node.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpecifier)) {
    return null;
  }
  
  const moduleName = moduleSpecifier.text;
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  
  const importedNames: string[] = [];
  
  // Обрабатываем разные типы импортов
  if (node.importClause) {
    // Default import
    if (node.importClause.name) {
      importedNames.push(node.importClause.name.text);
    }
    
    // Named imports
    if (node.importClause.namedBindings) {
      if (ts.isNamedImports(node.importClause.namedBindings)) {
        node.importClause.namedBindings.elements.forEach(element => {
          importedNames.push(element.name.text);
        });
      } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        importedNames.push(`* as ${node.importClause.namedBindings.name.text}`);
      }
    }
  }
  
  return {
    moduleName,
    startLine,
    endLine,
    importedNames
  };
}

/**
 * Извлекает информацию об экспорте (export declaration)
 */
function extractExportInfo(node: ts.ExportDeclaration, sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  
  if (node.exportClause && ts.isNamedExports(node.exportClause)) {
    node.exportClause.elements.forEach(element => {
      exports.push({
        exportedName: element.name.text,
        startLine,
        endLine,
        isDefault: false
      });
    });
  }
  
  // Default export without name
  if (!node.exportClause && !node.moduleSpecifier) {
    exports.push({
      exportedName: 'default',
      startLine,
      endLine,
      isDefault: true
    });
  }
  
  return exports;
}

/**
 * Извлекает информацию об именованном экспорте переменной
 */
function extractNamedExportInfo(node: ts.VariableStatement, sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  // Проверяем наличие модификатора export
  const hasExport = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  if (!hasExport) {
    return exports;
  }
  
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  
  node.declarationList.declarations.forEach(decl => {
    if (ts.isIdentifier(decl.name)) {
      exports.push({
        exportedName: decl.name.text,
        startLine,
        endLine,
        isDefault: false
      });
    }
  });
  
  return exports;
}

/**
 * Извлекает информацию об экспорте функции
 */
function extractFunctionExportInfo(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  const hasExport = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  if (!hasExport || !node.name) {
    return exports;
  }
  
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  
  const isDefault = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  
  exports.push({
    exportedName: node.name.text,
    startLine,
    endLine,
    isDefault
  });
  
  return exports;
}

/**
 * Извлекает информацию об экспорте класса
 */
function extractClassExportInfo(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): ExportInfo[] {
  const exports: ExportInfo[] = [];
  
  const hasExport = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
  if (!hasExport || !node.name) {
    return exports;
  }
  
  const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  
  const isDefault = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  
  exports.push({
    exportedName: node.name.text,
    startLine,
    endLine,
    isDefault
  });
  
  return exports;
}
