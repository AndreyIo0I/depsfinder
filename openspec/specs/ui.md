# UI спецификация ts-dep

## 🎨 Интерфейс визуализации

### Общая структура страницы

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ts-dep: Dependency Visualizer          [Filters ▼]   │ │
│  └───────────────────────────────────────────────────────┘ │
├──────────────┬──────────────────────────────────────────────┤
│  Sidebar     │              Main Canvas                     │
│  ┌────────┐  │  ┌────────────────────────────────────────┐ │
│  │ Search │  │  │                                        │ │
│  ├────────┤  │  │            Cytoscape.js                │ │
│  │ Filters│  │  │             Graph View                 │ │
│  ├────────┤  │  │                                        │ │
│  │ Stats  │  │  │                                        │ │
│  └────────┘  │  │                                        │ │
│              │  └────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────┘
```

## 📋 Компоненты интерфейса

### 1. Header

**Расположение**: Верхняя полоса, фиксированная высота 60px

**Содержимое**:
- Логотип/название: "ts-dep: Dependency Visualizer"
- Кнопка "Filters" (открывает/закрывает sidebar)
- Индикатор состояния (сканирование / готово / ошибка)

**Поведение**:
- Всегда виден при скролле
- Кнопка Filters переключает видимость sidebar

### 2. Sidebar (панель фильтров)

**Расположение**: Левая панель, ширина 300px, collapsible

**Секции**:

#### 2.1 Поиск (Search)
```
┌─────────────────────────────────┐
│ 🔍 Search...                    │
│ [_________________________]     │
└─────────────────────────────────┘
```

**Поля**:
- Текстовое поле для ввода поискового запроса
- Placeholder: "Search by file or package name..."
- Live search (фильтрация при вводе, debounce 300ms)

**Логика**:
- Поиск по `node.name` и `node.package`
- Case-insensitive
- Подсветка найденных узлов (изменение цвета)

#### 2.2 Фильтры (Filters)
```
┌─────────────────────────────────┐
│ Depth Range                     │
│ Min: [0___]  Max: [10__]        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                 │
│ Node Types                      │
│ ☑ Files  ☑ Barrels  ☐ External  │
│                                 │
│ Packages                        │
│ ┌─────────────────────────┐    │
│ │ @my-org/ui-lib      [x] │    │
│ │ @my-org/utils       [x] │    │
│ │ @my-org/api         [x] │    │
│ │ ...                 [...] │    │
│ └─────────────────────────┘    │
└─────────────────────────────────┘
```

**Элементы управления**:

1. **Depth Range Sliders**:
   - Два ползунка (min/max)
   - Диапазон: 0 — максимальная глубина в графе
   - Значения по умолчанию: min=0, max=Infinity
   - Обновление графа в реальном времени

2. **Node Types Checkboxes**:
   - Три чекбокса: Files, Barrels, External
   - Все включены по умолчанию
   - Переключение скрывает/показывает узлы соответствующего типа

3. **Package Multiselect**:
   - Выпадающий список с чекбоксами
   - Список всех пакетов из графа
   - Кнопки "Select All" / "Deselect All"
   - Поиск по названию пакета

**Поведение**:
- Применение фильтров без перезагрузки страницы
- Анимация скрытия/показа узлов (fade out/in)
- Сброс фильтров кнопкой "Reset All"

#### 2.3 Статистика (Stats)
```
┌─────────────────────────────────┐
│ Graph Statistics                │
│                                 │
│ Nodes:  1,234                   │
│ Edges:  5,678                   │
│ Packages: 12                    │
│                                 │
│ Deepest: 15 levels              │
│ Avg Degree: 4.6                 │
└─────────────────────────────────┘
```

**Обновление**:
- При загрузке графа
- При изменении фильтров (пересчёт видимых узлов)

### 3. Main Canvas (Cytoscape.js)

**Расположение**: Основная область, занимает всё оставшееся место

**Настройки Cytoscape**:

```typescript
const cyOptions: cytoscape.CoreOptions = {
  container: document.getElementById('cy'),
  
  layout: {
    name: 'cose',
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 30,
    nodeDimensionsIncludeLabels: true,
    spacingFactor: 1.2,
    componentSpacing: 100,
    nodeRepulsion: 400000,
    edgeElasticity: 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
    randomize: false
    // Compound layout is enabled automatically when nodes have parent relationships
  },
  
  style: [
    // Package nodes (compound nodes/frames)
    {
      selector: 'node[type="package"]',
      style: {
        'background-color': getNodeColor,
        'label': 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center',
        'color': '#ffffff',
        'text-outline-width': 2,
        'text-outline-color': '#000000',
        'width': 200,  // Развёрнутое состояние
        'height': 150,
        'shape': 'round-rectangle',
        'font-size': '14px',
        'font-weight': 'bold',
        'border-width': 3,
        'border-color': '#333',
        'padding': '30px',
        'compound-sizing-wrt-labels': 'exclude'
      },
    },
    
    // File nodes inside packages
    {
      selector: 'node[type="file"]',
      style: {
        'background-color': getNodeColor,
        'label': 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center',
        'color': '#212529',
        'text-outline-width': 1,
        'text-outline-color': '#ffffff',
        'width': 40,
        'height': 40,
        'shape': 'rectangle',
        'font-size': '10px'
      },
    },
    
    // Import edges - outgoing (source to target)
    {
      selector: 'edge[type="import"][direction="outgoing"]',
      style: {
        'line-color': '#0d6efd',
        'target-arrow-color': '#0d6efd',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'width': 2,
        'arrow-scale': 1.5
      }
    },
    
    // Import edges - incoming (target from source)
    {
      selector: 'edge[type="import"][direction="incoming"]',
      style: {
        'line-color': '#dc3545',
        'target-arrow-color': '#dc3545',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'width': 2,
        'arrow-scale': 1.5
      }
    },
    
    // Selected elements
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#ffc107',
        'background-opacity': 0.8
      }
    },
    
    {
      selector: 'edge:selected',
      style: {
        'width': 4,
        'line-color': '#ffc107',
        'target-arrow-color': '#ffc107'
      }
    },
    
    // Hover effect
    {
      selector: 'node:hover',
      style: {
        'background-opacity': 0.7
      }
    }
  ],
  
  wheelSensitivity: 0.3,
  boxSelectionEnabled: true,
  selectionType: 'single'
};
```

**Интерактивность**:

1. **Zoom/Pan**:
   - Колесо мыши: zoom in/out
   - Drag на пустом месте: pan
   - Double-click: fit to all visible nodes

2. **Клик по узлу**:
   - Выделение узла (изменение стиля)
   - Показ detail panel (справа или modal)
   - Информация: полный путь, пакет, импорты, экспорты

3. **Hover на узел**:
   - Подсветка соседних узлов и рёбер
   - Tooltip с краткой информацией

4. **Клик по ребру**:
   - Выделение ребра
   - Показ информации: тип импорта, символы

5. **Контекстное меню (правый клик)**:
   - "Expand/Collapse" (для пакетов)
   - "Isolate Node" (показать только этот узел и связи)
   - "Open in Editor" (file:// ссылка)

6. **Double-click по пакету**:
   - Сворачивание/разворачивание пакета
   - При сворачивании: пакет уменьшается до ~50x50px, узлы внутри скрываются
   - При разворачивании: пакет возвращается к размеру 200x150px, узлы показываются

7. **Перетаскивание пакета**:
   - При перемещении пакета все дочерние узлы автоматически перемещаются вместе с ним
   - Реализовано через compound nodes Cytoscape.js

### 4. Detail Panel (при клике на узел)

**Расположение**: Правая панель или modal overlay

**Содержимое**:
```
┌─────────────────────────────────┐
│ File Details                    │
│                                 │
│ 📄 Button.tsx                   │
│ @my-org/ui-lib                  │
│ packages/ui-lib/src/Button/...  │
│                                 │
│ ─────────────────────────────── │
│ Metrics                         │
│ Depth: 3                        │
│ Incoming: 12                    │
│ Outgoing: 5                     │
│                                 │
│ ─────────────────────────────── │
│ Imports (5)                     │
│ • ./styles.css                  │
│ • @my-org/utils/format          │
│ • react                         │
│ • ...                           │
│                                 │
│ Exports (3)                     │
│ • Button (default)              │
│ • ButtonProps                   │
│ • StyledButton                  │
│                                 │
│ [Open in Editor] [Copy Path]    │
└─────────────────────────────────┘
```

**Действия**:
- **Open in Editor**: Открывает файл в редакторе (VS Code через `vscode://file://...` или системный файловый менеджер)
- **Copy Path**: Копирует полный путь в буфер обмена

## 🎭 Анимации и переходы

### 1. Загрузка графа
```typescript
// Последовательная анимация
cy.ready(() => {
  cy.elements().fadeOut({ duration: 0 });
  cy.elements().each((ele, i) => {
    setTimeout(() => ele.fadeIn({ duration: 300 }), i * 10);
  });
});
```

### 2. Применение фильтров
```typescript
// Fade out несовпадающих узлов
nodesToHide.animate({
  style: { opacity: 0.2 },
  duration: 300,
});

// Fade in подходящих узлов
nodesToShow.animate({
  style: { opacity: 1 },
  duration: 300,
});
```

### 3. Выделение узла
```typescript
// Подсветка соседей
selectedNode.neighborhood().animate({
  style: { 'line-color': '#3498db', 'width': 3 },
  duration: 200,
});
```

### 4. Переход к узлу (focus)
```typescript
// Центрирование камеры на узле
cy.animate({
  fit: { eles: selectedNode, padding: 100 },
  duration: 500,
  easing: 'ease-in-out-cubic',
});
```

## 📱 Адаптивность

### Desktop (≥1200px)
- Full layout: sidebar + canvas + detail panel
- Все фильтры видны

### Tablet (768px — 1199px)
- Sidebar collapsible (по умолчанию скрыт)
- Detail panel как modal overlay
- Упрощённые фильтры

### Mobile (<768px)
- Только canvas на весь экран
- Filters кнопка открывает fullscreen overlay
- Detail panel как bottom sheet
- Упрощённая навигация (touch gestures)

## ⌨️ Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `Ctrl+F` | Фокус на поиск |
| `Esc` | Закрыть панели, снять выделение |
| `Ctrl+0` | Fit to screen |
| `Ctrl++` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Delete` | Удалить выделенный узел из вида (не из графа) |
| `Space` | Toggle sidebar |

## 🎨 Цветовая схема

### Light Mode (default)
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #2c3e50;
  --text-secondary: #7f8c8d;
  --accent-blue: #3498db;
  --accent-purple: #9b59b6;
  --accent-orange: #e67e22;
  --accent-red: #e74c3c;
  --border-color: #ecf0f1;
  --shadow: rgba(0, 0, 0, 0.1);
}
```

### Node Colors
- **File**: `#3498db` (blue)
- **Barrel**: `#9b59b6` (purple)
- **External**: `#95a5a6` (gray)
- **Selected**: `#e67e22` (orange)
- **Highlighted**: `#2ecc71` (green)

### Edge Colors
- **Import**: `#bdc3c7` (light gray)
- **Export**: `#95a5a6` (gray, dashed)
- **Selected**: `#e74c3c` (red)

## 🔄 Состояния интерфейса

### 1. Initial Load
```
[Loading spinner]
"Scanning project..."
Progress bar: ████████░░ 80%
```

### 2. Graph Ready
```
Canvas with nodes and edges
Sidebar with filters populated
Stats updated
```

### 3. No Results (after filter)
```
[Empty state illustration]
"No nodes match your filters"
[Reset Filters] button
```

### 4. Error State
```
[Error icon]
"Failed to load graph"
Details: [error message]
[Retry] button
```

### 5. Large Graph Warning
```
⚠️ Large graph detected (10,000+ nodes)
Performance may be affected.
[Continue] [Apply Aggressive Filters]
```

## 📊 Производительность UI

### Целевые метрики
- First paint: < 1s
- Interactive: < 3s
- Filter update: < 100ms
- Zoom/pan: 60fps

### Оптимизации
1. **Virtual rendering**: Cytoscape.js рендерит только видимые узлы
2. **Level of detail**: Упрощённые стили при большом зуме out
3. **Debounced filters**: 300ms задержка перед применением
4. **Web Workers**: Вычисление фильтров в фоне (опционально)
5. **Lazy loading**: Подгрузка деталей узла по клику

## 🔌 API для взаимодействия

### События (Custom Events)
```typescript
// Dispatched when graph is loaded
window.dispatchEvent(new CustomEvent('tsdep:graph-loaded', { 
  detail: { nodeCount, edgeCount } 
}));

// Dispatched when node is clicked
window.dispatchEvent(new CustomEvent('tsdep:node-clicked', { 
  detail: { nodeId, path, package } 
}));

// Dispatched when filters change
window.dispatchEvent(new CustomEvent('tsdep:filters-changed', { 
  detail: { filters: FilterState } 
}));
```

### Глобальные функции (для отладки)
```typescript
window.tsDep = {
  getGraph(): Graph,
  getNodeById(id: string): Node | null,
  applyFilters(filters: FilterState): void,
  resetFilters(): void,
  focusNode(id: string): void,
  exportGraph(format: 'json' | 'png'): Blob,
};
```
