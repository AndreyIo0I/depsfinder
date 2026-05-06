# Архитектура ts-dep

## 🏗 Общая структура системы

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/cli/index.ts                                   │   │
│  │  - Commander.js: команда 'ts-dep'                   │   │
│  │  - Загрузка конфигурации                            │   │
│  │  - Оркестрация пайплайна                            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Module                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/config/                                        │   │
│  │  - loader.ts: загрузка ts-dep.config.ts             │   │
│  │  - types.ts: TypeScript интерфейсы                  │   │
│  │  - validator.ts: валидация схемы                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Scanner Module                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/scanner/nx.ts                                  │   │
│  │  - Рекурсивный обход packages/                      │   │
│  │  - Поиск package.json                               │   │
│  │  - Фильтрация node_modules, dist, build             │   │
│  │  - Построение списка PackageInfo                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Analyzer Module                         │
│  ┌──────────────────┐         ┌──────────────────────┐    │
│  │  parser.ts       │         │  resolver.ts         │    │
│  │  - ts.Program    │◄───────►│  - Resolution logic  │    │
│  │  - CompilerHost  │         │  - @scope/* mapping  │    │
│  │  - AST walk      │         │  - Barrel bypass     │    │
│  └──────────────────┘         └──────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Graph Module                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/graph/builder.ts                               │   │
│  │  - Сборка Graph { nodes, edges }                    │   │
│  │  - Вычисление depth, incoming, outgoing             │   │
│  │  - Обогащение метаданными                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Exporter Module                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/exporter/json.ts                               │   │
│  │  - Сериализация Graph в JSON                        │   │
│  │  - Запись в outputPath                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Server Module                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  src/server/index.ts                                │   │
│  │  - Bun.serve()                                      │   │
│  │  - Routes: /, /styles.css, /app.ts, /graph.json     │   │
│  │  - Auto-open browser                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Module                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ index.html   │  │ styles.css   │  │ app.ts           │  │
│  │ (structure)  │  │ (layout)     │  │ (Cytoscape.js)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Поток данных (Data Flow)

### Этап 1: Инициализация
```
CLI (index.ts)
    │
    ├─► Парсинг аргументов командной строки
    │
    └─► Загрузка конфигурации
            │
            ├─► Поиск ts-dep.config.ts в rootDir
            │
            ├─► Merge с DEFAULT_CONFIG
            │
            └─► Валидация схемы
```

### Этап 2: Сканирование
```
Scanner (nx.ts)
    │
    ├─► Рекурсивный обход packageDirs
    │
    ├─► Для каждой директории:
    │       │
    │       ├─► Проверка на node_modules, dist, build
    │       │
    │       ├─► Поиск package.json
    │       │
    │       └─► Парсинг package.json → PackageInfo
    │
    └─► Возврат ScannerResult { packages, skipped }
```

### Этап 3: Анализ
```
Analyzer (parser.ts + resolver.ts)
    │
    ├─► Для каждого пакета из ScannerResult:
    │       │
    │       ├─► Создание ts.Program
    │       │       │
    │       │       ├─► Чтение tsconfig.json
    │       │       │
    │       │       └─► Настройка CompilerHost
    │       │
    │       ├─► Для каждого .ts файла:
    │       │       │
    │       │       ├─► Парсинг AST
    │       │       │
    │       │       ├─► Извлечение ImportDeclaration
    │       │       │
    │       │       ├─► Извлечение ExportDeclaration
    │       │       │
    │       │       └─► Resolution через resolver.ts
    │       │
    │       └─► Возврат AnalyzedFile[]
    │
    └─► Агрегация результатов по всем пакетам
```

### Этап 4: Resolution Logic
```
Resolver (resolver.ts)
    │
    ├─► Вход: moduleSpecifier (например, "@my-org/ui-lib")
    │
    ├─► Проверка на relative import (./ или ../)
    │       │
    │       ├─► Да: resolve относительно текущего файла
    │       │
    │       └─► Нет: проверка на scoped package
    │
    ├─► Для @scope/package:
    │       │
    │       ├─► Поиск пакета в ScannerResult.packages
    │       │
    │       ├─► Чтение exports из package.json
    │       │
    │       ├─► Если есть exports: resolution по map
    │       │
    │       └─► Если нет: fallback на main/types
    │
    ├─► Обход баррелей:
    │       │
    │       ├─► Если файл — index.ts
    │       │
    │       ├─► Чтение экспортов из index.ts
    │       │
    │       └─► Рекурсивное разрешение до конкретных файлов
    │
    └─► Возврат resolvedPath или null
```

### Этап 5: Построение графа
```
Graph Builder (builder.ts)
    │
    ├─► Инициализация Graph { metadata, nodes, edges }
    │
    ├─► Для каждого AnalyzedFile:
    │       │
    │       ├─► Создание Node { id, path, name, ... }
    │       │
    │       └─► Добавление в nodes
    │
    ├─► Для каждого ImportInfo в AnalyzedFile:
    │       │
    │       ├─► Создание Edge { id, source, target, ... }
    │       │
    │       └─► Добавление в edges
    │
    ├─► Вычисление метрик:
    │       │
    │       ├─► depth (BFS от корневых файлов)
    │       │
    │       ├─► incoming (count ребер, входящих в узел)
    │       │
    │       └─► outgoing (count ребер, исходящих из узла)
    │
    └─► Обновление metadata { nodeCount, edgeCount, ... }
```

### Этап 6: Экспорт и сервер
```
Exporter + Server
    │
    ├─► Запись graph.json в outputPath
    │
    ├─► Запуск Bun.serve() на порту config.port
    │
    ├─► Регистрация routes:
    │       │
    │       ├─► GET / → index.html
    │       │
    │       ├─► GET /styles.css → styles.css
    │       │
    │       ├─► GET /app.ts → app.ts (транслируется Bun)
    │       │
    │       └─► GET /graph.json → graph.json
    │
    └─► Автооткрытие браузера (если config.autoOpen)
```

## 🔗 Зависимости между модулями

```
src/cli/index.ts
    ├── src/config/loader.ts
    ├── src/scanner/nx.ts
    ├── src/analyzer/parser.ts
    └── src/server/index.ts

src/config/loader.ts
    ├── src/config/types.ts
    └── node:fs, node:path

src/scanner/nx.ts
    ├── src/config/types.ts
    ├── node:fs, node:path
    └── picomatch (опционально для glob)

src/analyzer/parser.ts
    ├── typescript
    ├── src/config/types.ts
    ├── src/analyzer/resolver.ts
    └── node:path

src/analyzer/resolver.ts
    ├── typescript
    ├── src/config/types.ts
    └── node:path, node:fs

src/graph/builder.ts
    ├── src/config/types.ts
    └── src/analyzer/parser.ts

src/exporter/json.ts
    ├── src/config/types.ts
    └── node:fs

src/server/index.ts
    ├── bun
    ├── node:path
    ├── src/frontend/index.html
    ├── src/frontend/styles.css
    └── src/frontend/app.ts

src/frontend/app.ts
    └── cytoscape (через CDN)
```

## 🎯 Ключевые архитектурные решения

### 1. Один ts.Program на пакет
**Решение**: Создавать отдельный `ts.Program` для каждого пакета, а не один на весь монорепозиторий.

**Обоснование**:
- Меньше потребление памяти
- Изоляция ошибок парсинга
- Возможность параллелизма в будущем
- Соответствует структуре NX монорепозитория

### 2. Обход баррелей (Barrel Bypass)
**Решение**: При разрешении импорта, если целевой файл — `index.ts`, рекурсивно обходить его экспорты до конкретных файлов.

**Обоснование**:
- Даёт более точную картину зависимостей
- Позволяет видеть реальные связи между модулями
- Упрощает выявление скрытых зависимостей

### 3. Silent Skip с логированием
**Решение**: Ошибки парсинга отдельных файлов не прерывают процесс, а логируются в консоль.

**Обоснование**:
- Устойчивость к битым файлам
- Полный сканирование даже при частичных ошибках
- Разработчик видит проблемы, но инструмент работает

### 4. Vanilla JS для фронтенда
**Решение**: Использовать чистый HTML + JS без фреймворков.

**Обоснование**:
- Минимальный размер бандла
- Быстрая загрузка
- Нет зависимостей от React/Vue/Angular
- Простота поддержки

### 5. Cytoscape.js с cose layout
**Решение**: Использовать `layout: cose` (Compound Spring Embedder).

**Обоснование**:
- Хорошо работает для графов зависимостей
- Автоматическая кластеризация связанных узлов
- Читаемая визуализация даже для больших графов

## 🔒 Обработка ошибок

### Уровни обработки

1. **Конфигурация**: Валидация схемы, fallback на дефолты
2. **Сканирование**: Логирование пропущенных путей, продолжение работы
3. **Анализ**: Try-catch вокруг парсинга каждого файла, сбор ошибок в `AnalyzedFile.errors`
4. **Resolution**: Возврат `null` при неудаче, логирование в консоль
5. **Сервер**: Graceful shutdown при ошибке binds

### Формат логирования

```typescript
// Пример вывода в консоль
[ts-dep] Scanning packages...
[ts-dep] Found 12 packages
[ts-dep] Analyzing @my-org/ui-lib...
[ts-dep] ⚠️  Failed to parse /path/to/broken.ts: Syntax error at line 42
[ts-dep] ⚠️  Could not resolve import './nonexistent' in /path/to/file.ts
[ts-dep] ✓ Built graph: 1234 nodes, 5678 edges
[ts-dep] Server running at http://localhost:8080
```

## 🚀 Масштабируемость

### Текущие ограничения
- 100k файлов без кэша
- Последовательный анализ пакетов
- Синхронный обход AST

### Будущие оптимизации (не в scope v1)
- Параллельный анализ пакетов (worker threads)
- Инкрементальное сканирование с кэшем
- Lazy loading для больших графов
- Streaming JSON export
