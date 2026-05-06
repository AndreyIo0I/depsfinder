# Типы и контракты ts-dep

## 📐 Конфигурация

### TsDepConfig
```typescript
interface TsDepConfig {
  /** Порт HTTP сервера (по умолчанию: 8080) */
  port: number;
  
  /** Корневая директория проекта (по умолчанию: process.cwd()) */
  rootDir: string;
  
  /** Пути к пакетам для сканирования (по умолчанию: ['packages']) */
  packageDirs: string[];
  
  /** Исключаемые пути (glob patterns) */
  exclude: string[];
  
  /** Включать ли баррель-файлы в граф как узлы */
  includeBarrels: boolean;
  
  /** Глубина анализа импортов (по умолчанию: Infinity) */
  maxDepth: number;
  
  /** Путь к выходному JSON файлу (по умолчанию: './graph.json') */
  outputPath: string;
  
  /** Автоматически открывать браузер */
  autoOpen: boolean;
}
```

### Config по умолчанию
```typescript
const DEFAULT_CONFIG: TsDepConfig = {
  port: 8080,
  rootDir: process.cwd(),
  packageDirs: ['packages'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.spec.ts', '**/*.test.ts'],
  includeBarrels: false,
  maxDepth: Infinity,
  outputPath: './graph.json',
  autoOpen: true,
};
```

## 🕸 Граф зависимостей

### Graph
```typescript
interface Graph {
  /** Метаданные графа */
  metadata: GraphMetadata;
  
  /** Узлы графа (файлы) */
  nodes: Node[];
  
  /** Рёбра графа (импорты) */
  edges: Edge[];
}
```

### GraphMetadata
```typescript
interface GraphMetadata {
  /** Дата генерации графа */
  generatedAt: string;
  
  /** Корневая директория проекта */
  rootDir: string;
  
  /** Количество узлов */
  nodeCount: number;
  
  /** Количество рёбер */
  edgeCount: number;
  
  /** Список пакетов */
  packages: string[];
}
```

### Node
```typescript
interface Node {
  /** Уникальный ID узла (полный путь к файлу) */
  id: string;
  
  /** Относительный путь от rootDir */
  path: string;
  
  /** Имя файла */
  name: string;
  
  /** Пакет, которому принадлежит файл */
  package: string | null;
  
  /** Тип узла */
  type: NodeType;
  
  /** Глубина в графе зависимостей */
  depth: number;
  
  /** Количество входящих импортов */
  incoming: number;
  
  /** Количество исходящих импортов */
  outgoing: number;
  
  /** Метаданные файла */
  fileMeta: FileMetadata;
}
```

### NodeType
```typescript
type NodeType = 'file' | 'barrel' | 'external';
```

### FileMetadata
```typescript
interface FileMetadata {
  /** Размер файла в байтах */
  size: number;
  
  /** Количество строк */
  lines: number;
  
  /** Экспортируемые символы */
  exports: string[];
  
  /** Импортируемые модули */
  imports: string[];
}
```

### Edge
```typescript
interface Edge {
  /** Уникальный ID ребра */
  id: string;
  
  /** ID исходного узла (откуда импортируют) */
  source: string;
  
  /** ID целевого узла (что импортируют) */
  target: string;
  
  /** Тип импорта */
  type: EdgeType;
  
  /** Импортируемые символы (если указаны) */
  symbols: string[];
  
  /** Строка импорта из исходного кода */
  importStatement: string;
}
```

### EdgeType
```typescript
type EdgeType = 'import' | 'export' | 'reexport';
```

## 🔍 Scanner

### PackageInfo
```typescript
interface PackageInfo {
  /** Название пакета из package.json */
  name: string;
  
  /** Полный путь к директории пакета */
  path: string;
  
  /** Путь к package.json */
  manifestPath: string;
  
  /** Версия пакета */
  version?: string;
  
  /** Main entry point */
  main?: string;
  
  /** TypeScript entry point */
  types?: string;
  
  /** Exports map */
  exports?: Record<string, ExportEntry>;
}
```

### ExportEntry
```typescript
type ExportEntry = string | {
  import?: string;
  require?: string;
  types?: string;
  default?: string;
};
```

### ScannerResult
```typescript
interface ScannerResult {
  /** Найденные пакеты */
  packages: PackageInfo[];
  
  /** Пропущенные пути с причинами */
  skipped: SkippedPath[];
}
```

### SkippedPath
```typescript
interface SkippedPath {
  /** Путь, который был пропущен */
  path: string;
  
  /** Причина пропуска */
  reason: 'node_modules' | 'exclude_pattern' | 'no_package_json' | 'error';
}
```

## 🧩 Analyzer

### AnalyzedFile
```typescript
interface AnalyzedFile {
  /** Полный путь к файлу */
  filePath: string;
  
  /** Относительный путь */
  relativePath: string;
  
  /** Пакет */
  package: string | null;
  
  /** Статические импорты */
  imports: ImportInfo[];
  
  /** Статические экспорты */
  exports: ExportInfo[];
  
  /** Ошибки парсинга */
  errors: ParseError[];
}
```

### ImportInfo
```typescript
interface ImportInfo {
  /** Строка импорта (как в коде) */
  moduleSpecifier: string;
  
  /** Разрешённый абсолютный путь */
  resolvedPath: string | null;
  
  /** Импортируемые имена */
  namedImports: string[];
  
  /** Default импорт */
  defaultImport: string | null;
  
  /** Namespace импорт */
  namespaceImport: string | null;
  
  /** Является ли это импортом типа */
  isTypeOnly: boolean;
}
```

### ExportInfo
```typescript
interface ExportInfo {
  /** Экспортируемое имя */
  name: string;
  
  /** Является ли export default */
  isDefault: boolean;
  
  /** Реэкспорт из другого модуля */
  reexportFrom: string | null;
  
  /** Является ли это экспортом типа */
  isTypeOnly: boolean;
}
```

### ParseError
```typescript
interface ParseError {
  /** Тип ошибки */
  type: 'syntax' | 'resolution' | 'other';
  
  /** Сообщение об ошибке */
  message: string;
  
  /** Номер строки (если применимо) */
  line?: number;
}
```

## 🎨 Frontend

### CytoscapeNode
```typescript
interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    path: string;
    package: string | null;
    type: NodeType;
    depth: number;
    incoming: number;
    outgoing: number;
  };
  position?: {
    x: number;
    y: number;
  };
}
```

### CytoscapeEdge
```typescript
interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    type: EdgeType;
    symbols: string[];
  };
}
```

### FilterState
```typescript
interface FilterState {
  /** Поисковый запрос по имени файла/пакета */
  searchQuery: string;
  
  /** Минимальная глубина */
  minDepth: number;
  
  /** Максимальная глубина */
  maxDepth: number;
  
  /** Фильтр по типу узла */
  nodeTypes: NodeType[];
  
  /** Фильтр по пакету */
  selectedPackage: string | null;
}
```

### UIEvent
```typescript
interface UINodeClickEvent {
  type: 'node:click';
  nodeId: string;
  path: string;
}

interface UINodeHoverEvent {
  type: 'node:hover';
  nodeId: string;
  path: string;
}

interface UIFilterChangeEvent {
  type: 'filter:change';
  filters: FilterState;
}
```

## 📋 Валидация конфигурации

```typescript
interface ConfigValidationError {
  /** Поле, в котором ошибка */
  field: string;
  
  /** Сообщение об ошибке */
  message: string;
  
  /** Текущее значение */
  value: unknown;
  
  /** Ожидаемое значение/тип */
  expected: string;
}

interface ConfigValidationResult {
  /** Валидна ли конфигурация */
  isValid: boolean;
  
  /** Список ошибок */
  errors: ConfigValidationError[];
}
```
