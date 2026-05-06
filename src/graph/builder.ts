/**
 * Graph builder - builds dependency graph from analyzed files
 * Based on: openspec/changes/ts-dep-implementation/tasks.md (T008)
 * Related specs: openspec/specs/types.md, openspec/changes/ts-dep-implementation/design.md
 */

import type { 
  Graph, 
  Node, 
  Edge, 
  GraphMetadata, 
  PackageInfo, 
  AnalyzedFile
} from '../types/global.ts';
import { NodeType, EdgeType } from '../types/global.ts';
import { resolveImports } from '../analyzer/resolver.ts';

/**
 * Строит граф зависимостей из проанализированных файлов
 */
export async function buildGraph(
  analyzedFiles: AnalyzedFile[],
  packages: PackageInfo[]
): Promise<Graph> {
  const startTime = Date.now();
  
  // Разрешаем импорты перед построением графа
  const resolvedFiles = resolveImports(analyzedFiles, packages);
  
  // Создаём узлы для пакетов
  const packageNodes: Node[] = packages.map(pkg => createPackageNode(pkg));
  
  // Создаём узлы для файлов
  const fileNodes: Node[] = resolvedFiles.map(file => createFileNode(file));
  
  // Объединяем все узлы
  const nodes: Node[] = [...packageNodes, ...fileNodes];
  
  // Создаём рёбра зависимостей
  const edges: Edge[] = buildEdges(resolvedFiles);
  
  // Создаём метаданные
  const metadata: GraphMetadata = {
    createdAt: new Date(),
    totalFiles: fileNodes.length,
    totalPackages: packageNodes.length,
    totalDependencies: edges.length,
    scanDurationMs: Date.now() - startTime
  };
  
  return { nodes, edges, metadata };
}

/**
 * Создаёт узел для пакета
 */
function createPackageNode(pkg: PackageInfo): Node {
  return {
    id: `pkg:${pkg.id}`,
    type: NodeType.PACKAGE,
    label: pkg.name,
    packageId: pkg.id
  };
}

/**
 * Создаёт узел для файла
 */
function createFileNode(file: AnalyzedFile): Node {
  const fileName = file.filePath.split('/').pop() || file.filePath;
  
  return {
    id: `file:${file.filePath}`,
    type: NodeType.FILE,
    label: fileName,
    packageId: file.packageName,
    filePath: file.filePath
  };
}

/**
 * Строит рёбра зависимостей
 */
function buildEdges(analyzedFiles: AnalyzedFile[]): Edge[] {
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Для предотвращения дубликатов
  
  for (const file of analyzedFiles) {
    const sourceId = `file:${file.filePath}`;
    
    for (const importInfo of file.imports) {
      if (!importInfo.resolvedPath) {
        continue; // Пропускаем внешние зависимости
      }
      
      const targetId = `file:${importInfo.resolvedPath}`;
      
      // Создаём уникальные ID для рёбер
      for (const importedName of importInfo.importedNames) {
        const edgeId = `edge:${sourceId}->${targetId}:${importedName}`;
        
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: EdgeType.IMPORT,
            importName: importedName
          });
        }
      }
      
      // Если нет конкретных имён, создаём одно ребро
      if (importInfo.importedNames.length === 0) {
        const edgeId = `edge:${sourceId}->${targetId}`;
        
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: EdgeType.IMPORT
          });
        }
      }
    }
    
    // Добавляем рёбра для экспортов
    for (const exportInfo of file.exports) {
      const edgeId = `edge:export:${sourceId}:${exportInfo.exportedName}`;
      
      // Экспорты не имеют целевого узла, они указывают на сам файл
      // Но мы можем создать специальные узлы для экспортов в будущем
    }
  }
  
  return edges;
}

/**
 * Связывает узлы файлов с узлами пакетов
 */
function linkFilesToPackages(nodes: Node[], packages: PackageInfo[]): void {
  // Создаём мапу путей пакетов
  const packagePathMap = new Map<string, string>();
  for (const pkg of packages) {
    packagePathMap.set(pkg.path, `pkg:${pkg.id}`);
  }
  
  // Для каждого файла находим его пакет
  for (const node of nodes) {
    if (node.type === NodeType.FILE && node.filePath) {
      // Ищем пакет, которому принадлежит файл
      for (const [pkgPath, pkgId] of packagePathMap.entries()) {
        if (node.filePath.startsWith(pkgPath)) {
          // Файл принадлежит этому пакету
          // В будущем можно добавить рёбра между файлом и пакетом
          break;
        }
      }
    }
  }
}
