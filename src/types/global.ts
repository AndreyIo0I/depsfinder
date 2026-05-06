/**
 * Global type definitions for ts-dep
 * Based on: openspec/specs/types.md
 */

// Configuration types
export interface TsDepConfig {
  /** Порт для HTTP-сервера */
  port: number;
  /** Путь к корню проекта */
  projectRoot: string;
  /** Путь к директории packages */
  packagesDir: string;
  /** Пути для исключения из анализа */
  excludePaths: string[];
  /** Формат вывода */
  outputFormat: 'json' | 'html';
  /** Путь к выходному файлу */
  outputFile: string;
  /** Открывать ли браузер автоматически */
  openBrowser: boolean;
  /** Уровень детализации логирования */
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export const DEFAULT_CONFIG: TsDepConfig = {
  port: 8080,
  projectRoot: '.',
  packagesDir: 'packages',
  excludePaths: ['node_modules', 'dist', 'build'],
  outputFormat: 'json',
  outputFile: 'graph.json',
  openBrowser: true,
  logLevel: 'info'
};

export class ConfigValidationError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export type ConfigValidationResult = 
  | { success: true; config: TsDepConfig }
  | { success: false; errors: ConfigValidationError[] };

// Graph types
export enum NodeType {
  FILE = 'file',
  PACKAGE = 'package'
}

export enum EdgeType {
  IMPORT = 'import',
  EXPORT = 'export'
}

export interface FileMetadata {
  size: number;
  importsCount: number;
  exportsCount: number;
  linesOfCode: number;
  extension: string;
}

export interface Node {
  id: string;
  type: NodeType;
  label: string;
  packageId: string;
  filePath?: string;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  importName?: string;
  exportName?: string;
}

export interface GraphMetadata {
  createdAt: Date;
  totalFiles: number;
  totalPackages: number;
  totalDependencies: number;
  scanDurationMs: number;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  metadata: GraphMetadata;
}

// Scanner types
export interface PackageInfo {
  id: string;
  name: string;
  path: string;
  main?: string;
  types?: string;
  files: string[];
}

export interface ExportEntry {
  name: string;
  path: string;
}

export interface SkippedPath {
  path: string;
  reason: 'not_found' | 'no_package_json' | 'excluded_by_config';
}

export interface ScannerResult {
  packages: PackageInfo[];
  skippedPaths: SkippedPath[];
}

// Analyzer types
export interface ImportInfo {
  moduleName: string;
  resolvedPath?: string;
  startLine: number;
  endLine: number;
  importedNames: string[];
}

export interface ExportInfo {
  exportedName: string;
  startLine: number;
  endLine: number;
  isDefault: boolean;
}

export interface AnalyzedFile {
  filePath: string;
  packageName: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  hasErrors: boolean;
}

export interface ParseError {
  filePath: string;
  error: string;
  line?: number;
  column?: number;
}

// Frontend types
export interface CytoscapeNodeData {
  id: string;
  label: string;
  type: NodeType;
  packageId: string;
  filePath?: string;
}

export interface CytoscapeNode {
  data: CytoscapeNodeData;
  classes?: string;
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

export interface CytoscapeEdge {
  data: CytoscapeEdgeData;
  classes?: string;
}

export interface FilterState {
  searchQuery: string;
  minDepth: number;
  maxDepth: number;
  showFileNodes: boolean;
  showPackageNodes: boolean;
  selectedPackages: string[];
}

// UI Events
export interface GraphEventMap {
  'node-click': { nodeId: string; nodeData: Node };
  'edge-click': { edgeId: string; edgeData: Edge };
  'filter-change': FilterState;
  'graph-ready': Graph;
}
