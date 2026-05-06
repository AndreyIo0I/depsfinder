# План реализации ts-dep

## 📋 Задачи (Tasks)

### T001: Настройка проекта и зависимостей
**Status**: DONE ✅  
**Related Spec**: proposal.md (Стек технологий)  
**Критерий завершения**: 
- `bun init` выполнен
- Установлены зависимости: `typescript`, `@types/node`, `commander`, `cytoscape`, `@types/cytoscape`
- Создана структура папок `src/`, `openspec/`

**Подзадачи**:
- [x] Инициализировать Bun проект
- [x] Установить runtime зависимости
- [x] Установить dev зависимости
- [x] Создать структуру папок

---

### T002: Создание спецификаций OpenSpec
**Status**: DONE ✅  
**Related Spec**: Все spec файлы  
**Критерий завершения**: 
- Созданы все файлы в `openspec/specs/` и `openspec/changes/ts-dep-implementation/`
- Спецификации выведены на утверждение
- Получено подтверждение ✅ SPECS APPROVED

**Подзадачи**:
- [x] Создать `proposal.md`
- [x] Создать `design.md`
- [x] Создать `specs/types.md`
- [x] Создать `specs/architecture.md`
- [x] Создать `specs/ui.md`
- [x] Создать `tasks.md` (этот файл)
- [x] Вывести спеки на утверждение
- [x] Получить подтверждение

---

### T003: Модуль конфигурации
**Status**: TODO  
**Related Spec**: types.md (TsDepConfig), architecture.md (Configuration Module)  
**Критерий завершения**: 
- Загрузка `ts-dep.config.ts` работает
- Валидация схемы реализована
- Merge с дефолтами работает

**Подзадачи**:
- [ ] Создать `src/config/types.ts` — интерфейсы конфигурации
- [ ] Создать `src/config/defaults.ts` — DEFAULT_CONFIG
- [ ] Создать `src/config/loader.ts` — загрузка и валидация
- [ ] Создать шаблон `ts-dep.config.example.ts`

---

### T004: NX Scanner
**Status**: TODO  
**Related Spec**: types.md (PackageInfo, ScannerResult), architecture.md (Scanner Module)  
**Критерий завершения**: 
- Рекурсивный обход `packages/` работает
- Поиск `package.json` реализован
- Фильтрация `node_modules`, `dist`, `build` работает
- Возвращается валидный `ScannerResult`

**Подзадачи**:
- [ ] Создать `src/scanner/nx.ts`
- [ ] Реализовать рекурсивный обход директорий
- [ ] Реализовать парсинг `package.json`
- [ ] Реализовать фильтрацию по patterns
- [ ] Добавить логирование

---

### T005: TypeScript Parser
**Status**: TODO  
**Related Spec**: types.md (AnalyzedFile, ImportInfo, ExportInfo), architecture.md (Analyzer Module)  
**Критерий завершения**: 
- Инициализация `ts.Program` работает
- Кастомный `CompilerHost` настроен
- AST traversal извлекает импорты/экспорты
- Обработка ошибок с silent skip

**Подзадачи**:
- [ ] Создать `src/analyzer/parser.ts`
- [ ] Реализовать создание `ts.Program`
- [ ] Реализовать кастомный `CompilerHost`
- [ ] Реализовать обход AST для `ImportDeclaration`
- [ ] Реализовать обход AST для `ExportDeclaration`
- [ ] Добавить обработку ошибок

---

### T006: Resolution Logic
**Status**: TODO  
**Related Spec**: types.md (ImportInfo.resolvedPath), design.md (Resolution Logic)  
**Критерий завершения**: 
- Resolution relative imports (`./`, `../`) работает
- Resolution scoped packages (`@scope/package`) работает
- Обход баррелей (`index.ts`) реализован
- Чтение `exports` из `package.json` работает

**Подзадачи**:
- [ ] Создать `src/analyzer/resolver.ts`
- [ ] Реализовать resolution relative paths
- [ ] Реализовать маппинг `@scope/*` → пакеты
- [ ] Реализовать чтение `exports` map
- [ ] Реализовать обход баррелей
- [ ] Добавить fallback на `main`/`types`

---

### T007: Graph Builder
**Status**: TODO  
**Related Spec**: types.md (Graph, Node, Edge), architecture.md (Graph Module)  
**Критерий завершения**: 
- Сборка `Graph` из `AnalyzedFile[]` работает
- Вычисление `depth` (BFS) реализовано
- Вычисление `incoming`/`outgoing` работает
- Метаданные графа заполнены

**Подзадачи**:
- [ ] Создать `src/graph/builder.ts`
- [ ] Реализовать создание узлов из файлов
- [ ] Реализовать создание рёбер из импортов
- [ ] Реализовать BFS для вычисления depth
- [ ] Реализовать подсчёт incoming/outgoing
- [ ] Заполнить metadata

---

### T008: JSON Exporter
**Status**: TODO  
**Related Spec**: types.md (Graph), architecture.md (Exporter Module)  
**Критерий завершения**: 
- Сериализация `Graph` в JSON работает
- Запись файла в `outputPath` работает
- Форматированный вывод (pretty print)

**Подзадачи**:
- [ ] Создать `src/exporter/json.ts`
- [ ] Реализовать сериализацию
- [ ] Реализовать запись файла
- [ ] Добавить логирование

---

### T009: HTTP Server
**Status**: TODO  
**Related Spec**: architecture.md (Server Module)  
**Критерий завершения**: 
- `Bun.serve()` запущен на заданном порту
- Routes `/`, `/styles.css`, `/app.ts`, `/graph.json` работают
- Автооткрытие браузера реализовано

**Подзадачи**:
- [ ] Создать `src/server/index.ts`
- [ ] Реализовать сервер на `Bun.serve()`
- [ ] Настроить routes для статики
- [ ] Реализовать автооткрытие браузера
- [ ] Добавить graceful shutdown

---

### T010: Frontend — HTML структура
**Status**: TODO  
**Related Spec**: ui.md (Общая структура страницы)  
**Критерий завершения**: 
- `index.html` содержит Header, Sidebar, Main Canvas
- Подключены стили и скрипты
- Семантическая вёрстка

**Подзадачи**:
- [ ] Создать `src/frontend/index.html`
- [ ] Разметить Header
- [ ] Разметить Sidebar с секциями
- [ ] Разметить Main Canvas (div для Cytoscape)
- [ ] Разметить Detail Panel (скрытый по умолчанию)

---

### T011: Frontend — CSS стили
**Status**: TODO  
**Related Spec**: ui.md (Цветовая схема, Адаптивность)  
**Критерий завершения**: 
- Реализована light mode цветовая схема
- Sidebar collapsible
- Адаптивность для desktop/tablet/mobile
- Анимации переходов

**Подзадачи**:
- [ ] Создать `src/frontend/styles.css`
- [ ] Реализовать CSS variables
- [ ] Стилизовать Header
- [ ] Стилизовать Sidebar
- [ ] Стилизовать Main Canvas
- [ ] Стилизовать Detail Panel
- [ ] Добавить media queries
- [ ] Добавить анимации

---

### T012: Frontend — Cytoscape.js инициализация
**Status**: TODO  
**Related Spec**: ui.md (Main Canvas, Настройки Cytoscape)  
**Критерий завершения**: 
- Cytoscape.js подключён (через CDN)
- Граф рендерится с `cose` layout
- Стили узлов и рёбер применены
- Zoom/Pan работают

**Подзадачи**:
- [ ] Создать `src/frontend/app.ts`
- [ ] Подключить Cytoscape.js
- [ ] Реализовать загрузку `graph.json`
- [ ] Настроить `layout: cose`
- [ ] Определить стили узлов (file, barrel, external)
- [ ] Определить стили рёбер (import, export)
- [ ] Реализовать zoom/pan

---

### T013: Frontend — Интерактивность
**Status**: TODO  
**Related Spec**: ui.md (Интерактивность, Detail Panel)  
**Критерий завершения**: 
- Клик по узлу выделяет его
- Hover подсвечивает соседей
- Detail panel показывает информацию
- Кнопки "Open in Editor" и "Copy Path" работают

**Подзадачи**:
- [ ] Реализовать обработчик клика по узлу
- [ ] Реализовать hover подсветку
- [ ] Реализовать показ Detail Panel
- [ ] Заполнить Detail Panel данными
- [ ] Реализовать "Open in Editor"
- [ ] Реализовать "Copy Path"

---

### T014: Frontend — Фильтры
**Status**: TODO  
**Related Spec**: ui.md (Фильтры, Поиск)  
**Критерий завершения**: 
- Поиск по имени работает (live search)
- Depth range sliders работают
- Node types checkboxes работают
- Package multiselect работает
- Reset All кнопка работает

**Подзадачи**:
- [ ] Реализовать Search input с debounce
- [ ] Реализовать Depth Range sliders
- [ ] Реализовать Node Types checkboxes
- [ ] Реализовать Package Multiselect
- [ ] Реализовать Reset All кнопку
- [ ] Реализовать применение фильтров к графу
- [ ] Добавить анимации фильтров

---

### T015: CLI Entry Point
**Status**: TODO  
**Related Spec**: architecture.md (CLI Layer)  
**Критерий завершения**: 
- Commander.js настроен
- Команда `ts-dep` доступна
- Пайплайн оркестрирован (scan → analyze → build → export → serve)
- Логирование выводится в консоль

**Подзадачи**:
- [ ] Создать `src/cli/index.ts`
- [ ] Настроить Commander.js
- [ ] Интегрировать Config Loader
- [ ] Интегрировать Scanner
- [ ] Интегрировать Analyzer
- [ ] Интегрировать Graph Builder
- [ ] Интегрировать Exporter
- [ ] Интегрировать Server
- [ ] Добавить прогресс-логирование

---

### T016: Тестирование и отладка
**Status**: TODO  
**Related Spec**: proposal.md (Критерии успеха)  
**Критерий завершения**: 
- Все критерии успеха достигнуты
- Нет критических ошибок
- Производительность в пределах нормы

**Подзадачи**:
- [ ] Протестировать на тестовом проекте
- [ ] Проверить генерацию graph.json
- [ ] Проверить запуск сервера
- [ ] Проверить визуализацию
- [ ] Проверить фильтры
- [ ] Исправить найденные баги

---

### T017: Документация и финализация
**Status**: TODO  
**Related Spec**: N/A  
**Критерий завершения**: 
- README.md создан
- Scripts в package.json настроены
- Спеки обновлены (если были изменения)
- Папка итерации заархивирована

**Подзадачи**:
- [ ] Создать README.md
- [ ] Настроить scripts в package.json (`dev`, `build`)
- [ ] Обновить спеки (если нужны изменения)
- [ ] Переместить `changes/ts-dep-implementation/` в архив
- [ ] Пометить tasks.md как DONE

---

## 📊 Диаграмма Ганта

```
Неделя 1:
T001 ████
T002 ████████
T003     ████
T004         ████
T005             ████
T006                 ████
T007                     ████

Неделя 2:
T008 ████
T009     ████
T010         ████
T011             ████
T012                 ████
T013                     ████
T014                         ████

Неделя 3:
T015 ████
T016     ████████
T017             ████
```

## 🔗 Traceability Matrix

| Task | Spec Reference | Code Location |
|------|---------------|---------------|
| T003 | types.md#TsDepConfig | src/config/* |
| T004 | types.md#PackageInfo | src/scanner/nx.ts |
| T005 | types.md#AnalyzedFile | src/analyzer/parser.ts |
| T006 | design.md#Resolution | src/analyzer/resolver.ts |
| T007 | types.md#Graph | src/graph/builder.ts |
| T008 | types.md#Graph | src/exporter/json.ts |
| T009 | architecture.md#Server | src/server/index.ts |
| T010-T014 | ui.md | src/frontend/* |
| T015 | architecture.md#CLI | src/cli/index.ts |

## ✅ Определение готовности (DoD)

Задача считается выполненной, когда:
1. Код написан и соответствует спецификации
2. Код компилируется без ошибок (`bun run build`)
3. Добавлено логирование (где применимо)
4. Обработаны ошибки (silent skip)
5. Задокументированы публичные API (JSDoc)

---

*Последнее обновление: 2024*  
*Статус: Ожидание утверждения спецификаций*
