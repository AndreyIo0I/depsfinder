# AGENTS.md

## 🤖 AI Agent Setup Guide

Этот файл содержит инструкции для AI-агентов (Qwen Coder, Claude Code, Cursor и др.) для работы с проектом ts-dep.

## 📦 Быстрая настройка (One-Command Setup)

### Для Bun + Node.js окружения:
```bash
curl -fsSL https://bun.sh/install | bash && source ~/.bashrc && bun install && npm install -g @fission-ai/openspec@latest
```

### Только Node.js (если Bun уже установлен):
```bash
bun install && npm install -g @fission-ai/openspec@latest
```

### Проверка установки:
```bash
bun --version           # Должна быть версия 1.x
node --version          # Должна быть версия 20.x
openspec --version      # Должна быть версия 1.x
```

## 🏗️ Структура проекта

```
ts-dep/
├── AGENTS.md                 # Этот файл
├── README.md                 # Основная документация
├── package.json              # Зависимости и скрипты
├── tsconfig.json             # TypeScript конфигурация
├── ts-dep.config.ts          # Конфигурация ts-dep (опционально)
├── graph.json                # Выходной файл графа зависимостей
├── openspec/                 # OpenSpec спецификации
│   ├── specs/                # Источник истины
│   │   ├── architecture.md   # Архитектура системы
│   │   ├── types.md          # Типы и интерфейсы
│   │   └── ui.md             # UI спецификации
│   └── changes/              # Предложенные изменения
│       └── ts-dep-implementation/
│           ├── proposal.md   # Предложение по реализации
│           ├── design.md     # Детальный дизайн
│           └── tasks.md      # Список задач
└── src/
    ├── cli/                  # CLI entry point (Commander.js)
    ├── config/               # Загрузчик конфигурации
    ├── scanner/              # Сканирование NX-пакетов
    ├── analyzer/             # Парсинг TypeScript импортов
    ├── graph/                # Построение графа зависимостей
    ├── exporter/             # Экспорт в JSON
    ├── server/               # HTTP сервер для веб-интерфейса
    ├── frontend/             # Веб-визуализация (Cytoscape.js)
    └── types/                # TypeScript типы
```

## 🔧 Основные команды

### Разработка:
```bash
# Запуск в режиме разработки (анализ + веб-сервер)
bun run dev

# Сборка продакшен версии
bun run build

# Только сборка фронтенда
bun run build:frontend

# Проверка типов TypeScript
bun tsc --noEmit
```

### CLI использование:
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

### OpenSpec команды:
```bash
# Показать статус изменений
openspec status

# Показать список изменений
openspec list

# Просмотр задач
openspec view

# Валидация спецификаций
openspec validate
```

## 🎯 Контекст для AI-агентов

### Архитектурные принципы:
1. **Spec-Driven Development**: Все изменения начинаются с обновления спецификаций в `openspec/specs/`
2. **Модульность**: Каждый модуль (`scanner`, `analyzer`, `graph`, etc.) независим
3. **TypeScript-first**: Строгая типизация через `src/types/global.ts`
4. **Bun runtime**: Использование Bun-specific фич для производительности

### Ключевые файлы:
- `src/cli/index.ts` - Entry point, оркестрация пайплайна
- `src/scanner/nx.ts` - Поиск пакетов в монорепозитории
- `src/analyzer/parser.ts` - Парсинг TypeScript AST
- `src/analyzer/resolver.ts` - Разрешение импортов
- `src/graph/builder.ts` - Построение графа зависимостей
- `src/server/index.ts` - HTTP сервер с веб-интерфейсом
- `src/frontend/app.ts` - Cytoscape.js визуализация

### Паттерны разработки:
1. Перед изменением кода обнови `openspec/specs/*.md`
2. Создай change request в `openspec/changes/<feature-name>/`
3. Реализуй изменения следуя Spec-Driven подходу
4. Запусти `openspec validate` для проверки

## 🐛 Отладка

### Логирование:
```bash
# Включить debug логи
DEBUG=ts-dep:* bun run src/cli/index.ts

# Тихий режим (только ошибки)
bun run src/cli/index.ts --log-level error
```

### Проверка графа:
```bash
# После запуска проверить graph.json
cat graph.json | jq '.nodes | length'  # Количество узлов
cat graph.json | jq '.edges | length'  # Количество рёбер
```

## 📝 Генерация задач для AI

Для создания новой задачи используй структуру:
```markdown
## [Название задачи]

**Контекст**: Краткое описание проблемы/возможности

**Требования**:
- [ ] Требование 1
- [ ] Требование 2

**Спецификации**:
- Обновить: `openspec/specs/<file>.md`
- Создать: `openspec/changes/<task-name>/proposal.md`

**Критерии приёмки**:
- [ ] Код компилируется без ошибок
- [ ] Все тесты проходят
- [ ] Спецификации обновлены
```

## 🔗 Полезные ссылки

- [OpenSpec Documentation](https://github.com/Fission-AI/OpenSpec/tree/main/docs)
- [Bun Documentation](https://bun.sh/docs)
- [Cytoscape.js Documentation](https://js.cytoscape.org/)
- [Commander.js Documentation](https://github.com/tj/commander.js)
