# ts-dep

CLI-библиотека для статического анализа зависимостей в TypeScript-проектах с интерактивной визуализацией.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
bun install

# Запуск анализа
bun run dev

# Или напрямую
bun run src/cli/index.ts
```

## 📋 Требования

- Bun runtime (последняя версия)
- TypeScript проект с `tsconfig.json`
- NX монорепозиторий с пакетами в директории `packages/`

## ⚙️ Конфигурация

Создайте файл `ts-dep.config.ts` в корне проекта:

```typescript
import type { TsDepConfig } from './src/types/global.ts';

const config: Partial<TsDepConfig> = {
  port: 8080,
  projectRoot: '.',
  packagesDir: 'packages',
  excludePaths: ['node_modules', 'dist', 'build'],
  outputFormat: 'json',
  outputFile: 'graph.json',
  openBrowser: true,
  logLevel: 'info'
};

export default config;
```

### Опции конфигурации

| Опция | Тип | По умолчанию | Описание |
|-------|-----|--------------|----------|
| `port` | `number` | `8080` | Порт для HTTP-сервера |
| `projectRoot` | `string` | `'.'` | Путь к корню проекта |
| `packagesDir` | `string` | `'packages'` | Директория с пакетами |
| `excludePaths` | `string[]` | `['node_modules', 'dist', 'build']` | Пути для исключения |
| `outputFormat` | `'json' \| 'html'` | `'json'` | Формат вывода |
| `outputFile` | `string` | `'graph.json'` | Путь к выходному файлу |
| `openBrowser` | `boolean` | `true` | Открывать браузер автоматически |
| `logLevel` | `'silent' \| 'error' \| 'warn' \| 'info' \| 'debug'` | `'info'` | Уровень логирования |

## 🖥️ CLI команды

```bash
# Базовый запуск
bun run src/cli/index.ts

# С кастомной конфигурацией
bun run src/cli/index.ts -c my-config.ts

# С указанием порта
bun run src/cli/index.ts -p 3000

# Без открытия браузера
bun run src/cli/index.ts --no-open

# Подробное логирование
bun run src/cli/index.ts -v
```

### CLI опции

| Опция | Короткая | Описание |
|-------|----------|----------|
| `--config <path>` | `-c` | Путь к конфигурационному файлу |
| `--port <number>` | `-p` | Порт для HTTP-сервера |
| `--no-open` | - | Не открывать браузер |
| `--verbose` | `-v` | Включить подробное логирование |
| `--help` | `-h` | Показать справку |
| `--version` | `-V` | Показать версию |

## 🎯 Возможности

- ✅ Сканирование NX-пакетов (поиск в `packages/`)
- ✅ Анализ статических импортов/экспортов в TypeScript-файлах
- ✅ Разрешение импортов через баррельные экспорты
- ✅ Интерактивная визуализация графа с помощью Cytoscape.js
- ✅ Фильтрация и поиск узлов графа
- ✅ Клик по узлу для перехода к исходному коду
- ✅ Автоматическое открытие браузера
- ✅ Поддержка до 100k файлов (без кэша)

## 🏗️ Архитектура

Проект следует методологии Spec-Driven Development:

```
openspec/
├── specs/              # Источник истины
│   ├── architecture.md
│   ├── types.md
│   └── ui.md
└── changes/
    └── ts-dep-implementation/
        ├── proposal.md
        ├── design.md
        └── tasks.md

src/
├── cli/                # Entry point (Commander)
├── config/             # Загрузчик конфигурации
├── scanner/            # Обход packages/**/package.json
├── analyzer/           # Парсинг и разрешение импортов
├── graph/              # Сборка графа
├── exporter/           # Сериализация JSON
├── server/             # HTTP сервер
└── frontend/           # HTML/CSS/JS визуализация
```

## 🔧 Разработка

### Структура проекта

```
ts-dep/
├── package.json
├── tsconfig.json
├── ts-dep.config.ts (optional)
├── openspec/           # Спецификации
└── src/
    ├── cli/
    ├── config/
    ├── scanner/
    ├── analyzer/
    ├── graph/
    ├── exporter/
    ├── server/
    ├── frontend/
    └── types/
```

### Команды разработки

```bash
# Запуск в режиме разработки
bun run dev

# Сборка для продакшена
bun run build

# Проверка типов
bun tsc --noEmit
```

## 📄 Лицензия

MIT
