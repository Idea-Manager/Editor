# Architecture Plan v2: Block Text Editor + Graphic Editor

## 1. Project Overview

Two tightly integrated editors sharing a unified JSON document model:

- **Text Editor** — block-based rich text editor built from scratch
- **Graphic Editor** — canvas-based diagram/drawing/wireframe editor built from scratch
- **Shared layer** — JSON schema, import/export, event bus, component registries
- **Host Application** — project container with per-project mode switching

No dependency on Editor.js, MaxGraph, Quill, Slate, Fabric.js, Konva, or similar.

**CRDT Notice**: Real-time multi-user editing via CRDTs is intentionally deferred to a later phase. However, every design decision in this document is made with CRDT compatibility as a hard constraint. Key implications are marked with `[CRDT]` throughout.

---

## 2. Core Architectural Principles

### 2.1 Document-First Design
Every piece of content in both editors is a **Document Node** in a shared JSON tree. Both editors are views over different node types. Rendering, serialization, and all mutations operate on the same tree.

### 2.2 Registry Pattern
Both editors use pluggable registries. New block types, element types, and element categories are added by registration — the core engine has zero knowledge of specific content. Categories are described in JSON catalog files; behaviors are provided by TypeScript renderer classes.

### 2.3 Command Pattern (Undo/Redo)
All mutations go through a **Command Stack**. Every operation is a serializable, reversible command object.

`[CRDT]` Commands are designed to be the CRDT operation primitives. Each command is serializable to a compact JSON operation record and carries a stable actor ID and logical timestamp. When the CRDT layer is added, the `UndoRedoManager` is extended — not replaced — to broadcast operations to the collaboration backend.

### 2.4 Decoupled Rendering
The internal document model never holds DOM or canvas references. Renderers consume the model and produce output independently.

### 2.5 Operation Granularity
`[CRDT]` No "replace everything" mutations exist. All operations are granular: insert a node, delete a node, update a specific property of a specific node by its stable ID. This makes every operation independently mergeable. Array positions are never used as references — all cross-references are by stable `id` strings.

### 2.6 Stable Identity
`[CRDT]` Every node, block, element, cell, text run, and asset has a `nanoid()`-generated ID assigned at creation and never changed. No ID is ever reused. This is the foundation that makes CRDT merging possible.

### 2.7 Mode-Scoped Editing
The host application provides a **Project Context** that determines the active editing mode (`text` or `graphic`) per project. Mode state is owned by the host — not the editors. Both editors are always instantiated; only the active one is visible and accepts input.

---

## 3. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript | Type safety critical for complex model |
| Bundler | Webpack 5 | Existing infrastructure, `ts-loader`, `sass-loader`, asset pipeline |
| Framework | Vanilla TS + minimal observable store | No React/Vue — direct DOM for editor performance |
| Canvas | Native HTML5 Canvas 2D API | Graphic editor rendering |
| State | Custom observable store (~150 lines) | No Redux/Zustand |
| Testing | Jest + Playwright | Unit (Jest for TS compatibility with Webpack) + E2E |
| Future: CRDT | Yjs or Automerge (backend-driven) | To be added; core is pre-shaped for it |

---

## 4. Build Configuration (Webpack 5)

### 4.1 Config Overview

The project extends the Webpack 5 config from your existing setup. The monorepo structure means each package is resolved as a path alias. The key additions on top of your base config:

```js
// webpack/webpack.common.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');
const Dotenv = require('dotenv-webpack');

const config = {
  entry: {
    main: './src/main.ts',
  },
  output: {
    clean: true,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Monorepo package aliases — avoids relative ../../ hell
      '@core':           path.resolve(__dirname, '../packages/core/src'),
      '@text-editor':    path.resolve(__dirname, '../packages/text-editor/src'),
      '@graphic-editor': path.resolve(__dirname, '../packages/graphic-editor/src'),
      '@ui':             path.resolve(__dirname, '../packages/ui/src'),
    },
  },
  module: {
    rules: [
      // HTML (raw import — used for template strings)
      { test: /\.html$/, resourceQuery: /raw/, type: 'asset/source' },
      // HTML (processed by html-loader for template files)
      { test: /\.html$/, resourceQuery: { not: [/raw/] }, use: ['html-loader'] },
      // TypeScript
      { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
      // SCSS — inline (Web Components shadow DOM, returns string)
      {
        test: /\.scss$/,
        resourceQuery: /inline/,
        use: [
          'to-string-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData: `@use "${path.resolve(__dirname, '../src/styles/variables').replace(/\\/g, '/')}" as *;`,
            },
          },
        ],
      },
      // SCSS — global (injected into <head> via style-loader)
      {
        test: /\.scss$/,
        resourceQuery: { not: [/inline/] },
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              additionalData: (content, loaderContext) => {
                if (loaderContext.resourcePath.endsWith('_base.scss')) {
                  const variablesPath = path.resolve(__dirname, '../src/styles/variables').replace(/\\/g, '/');
                  return `@use "${variablesPath}" as *;\n${content}`;
                }
                return content;
              },
            },
          },
        ],
      },
      // Fonts
      { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource' },
      // Graphic element catalog JSON files — loaded as JS objects
      { test: /\.catalog\.json$/, type: 'json' },
    ],
  },
  plugins: [
    new Dotenv(),
    new CopyPlugin({
      patterns: [
        { from: 'src/locales', to: 'locales/[name][ext]' },
        // Copy element category catalog files to output for runtime loading
        { from: 'packages/graphic-editor/src/catalog', to: 'catalog/[name][ext]' },
      ],
    }),
    new FaviconsWebpackPlugin({
      logo: './src/assets/images/logo.svg',
      mode: 'webapp',
      devMode: 'webapp',
      favicons: {
        appName: 'Editor',
        background: '#f7f7f8',
        theme_color: '#1e40af',
        icons: {
          android: false, appleIcon: false, appleStartup: false,
          windows: false, coast: false, yandex: false,
        },
      },
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      chunks: ['main'],
      template: 'src/index.html',
    }),
  ],
};

module.exports = config;
```

```js
// webpack/webpack.dev.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    historyApiFallback: true,  // SPA routing
    hot: true,
    port: 3000,
  },
});
```

```js
// webpack/webpack.prod.js
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
  },
});
```

### 4.2 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "paths": {
      "@core/*":           ["packages/core/src/*"],
      "@text-editor/*":    ["packages/text-editor/src/*"],
      "@graphic-editor/*": ["packages/graphic-editor/src/*"],
      "@ui/*":             ["packages/ui/src/*"]
    }
  },
  "include": ["src", "packages"]
}
```

---

## 5. Repository Structure

```
/
├── webpack/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
│
├── packages/
│   ├── core/                       # Shared model, schema, serialization
│   │   └── src/
│   │       ├── model/              # Node interfaces, DocumentNode, TextRun, etc.
│   │       ├── commands/           # Command base, CompositeCommand
│   │       ├── history/            # UndoRedoManager
│   │       ├── operation-log/      # [CRDT] Serializable operation records
│   │       ├── events/             # EventBus
│   │       ├── serialization/      # JSON import/export, migrations
│   │       ├── schema/             # JSON Schema definitions
│   │       └── id/                 # nanoid wrapper (stable ID generation)
│   │
│   ├── text-editor/
│   │   └── src/
│   │       ├── engine/             # Editor core, selection, input pipeline
│   │       ├── blocks/             # BlockRegistry + built-in block types
│   │       ├── inline/             # Inline mark system
│   │       ├── toolbar/            # Floating toolbar + slash palette
│   │       └── renderer/           # DOM reconciler
│   │
│   ├── graphic-editor/
│   │   └── src/
│   │       ├── engine/             # Canvas loop, viewport, hit-testing
│   │       ├── catalog/            # JSON category + element descriptor files
│   │       │   ├── categories.json
│   │       │   ├── basic-shapes.catalog.json
│   │       │   ├── flowchart.catalog.json
│   │       │   ├── db-schema.catalog.json
│   │       │   ├── wireframe.catalog.json
│   │       │   └── drawing.catalog.json
│   │       ├── elements/           # ElementRegistry + renderer classes
│   │       │   ├── registry.ts
│   │       │   ├── renderers/      # One file per element type
│   │       │   └── behaviors/      # Shared behavior mixins (labelable, connectable…)
│   │       ├── grid/               # Dynamic background grid
│   │       ├── frame/              # Frame element (first-class artboard)
│   │       ├── tools/              # Tool system (select, draw, pan, pencil, pen…)
│   │       │   ├── select/
│   │       │   ├── draw/
│   │       │   ├── pencil/
│   │       │   ├── pen/
│   │       │   └── pan/
│   │       ├── transform/          # Move, resize, rotate, snap
│   │       ├── connectors/         # Connector routing system
│   │       ├── drawing/            # Freehand + Bézier path system
│   │       └── panels/             # Toolbox UI, properties panel, color picker
│   │
│   └── ui/                         # Shared UI primitives (modal, dropdown, toast, etc.)
│
├── apps/
│   └── main/
│       └── src/
│           ├── project/            # ProjectContext, mode switching
│           ├── layout/             # App shell, split view, sidebar
│           └── integration/        # Wires editors into project context
│
└── docs/
    ├── json-schema.md
    ├── element-catalog-format.md
    └── crdt-upgrade-guide.md       # Pre-written guide for future CRDT phase
```

---

## 6. Shared Core (`packages/core`)

### 6.1 Document Model

```ts
// Every node — text block or graphic element — extends this
interface Node {
  id: string;           // nanoid(), never changes, globally unique [CRDT]
  type: string;
  children?: Node[];
  data: Record<string, unknown>;
  meta?: NodeMeta;
}

interface NodeMeta {
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;   // actorId — ready for CRDT attribution [CRDT]
  locked?: boolean;
  version?: number;     // Monotonic per-node version counter [CRDT]
}

interface DocumentNode extends Node {
  type: 'document';
  schemaVersion: number;
  children: BlockNode[];
  graphicPages: GraphicPageNode[];
  assets: AssetMap;
}

interface GraphicPageNode {
  id: string;
  name: string;
  elements: GraphicElement[];
  frames: FrameElement[];          // Frames are first-class, separate from elements
  viewport: { x: number; y: number; zoom: number };
}
```

### 6.2 Operation Log (CRDT-Ready)

`[CRDT]` Every command, before execution, is converted to a serializable **Operation Record**. Right now these are only logged locally (for undo/redo). When the CRDT layer arrives, this log becomes the sync primitive sent to the backend.

```ts
interface OperationRecord {
  id: string;                      // nanoid() — unique per operation
  actorId: string;                 // Client session ID (set at app startup)
  timestamp: number;               // Lamport logical clock value
  wallClock: number;               // Date.now() — for display only, not ordering
  type: OperationType;
  payload: OperationPayload;
}

type OperationType =
  | 'node:insert'
  | 'node:delete'
  | 'node:update'       // Updates ONE property of ONE node
  | 'node:move'         // Reorder within a parent's children array
  | 'text:insert'       // Character-level text insert (future: CRDT string)
  | 'text:delete';      // Character-level text delete

interface NodeUpdatePayload {
  nodeId: string;
  path: string;           // e.g. "data.fill" or "data.label"
  oldValue: unknown;      // Required for undo [CRDT: conflict resolution]
  newValue: unknown;
}
```

`[CRDT]` The `path` field in `NodeUpdatePayload` is intentionally granular — never update the entire `data` object at once. "data.fill changed from #fff to #f00" is independently mergeable. "data changed to {…whole object…}" is not.

### 6.3 UndoRedoManager

```ts
interface Command {
  readonly operationRecords: OperationRecord[];  // [CRDT] what this command produces
  execute(): void;
  undo(): void;
  merge?(next: Command): boolean;  // Coalesce rapid keystrokes
}

class UndoRedoManager {
  push(cmd: Command): void;
  undo(): void;
  redo(): void;
  clear(): void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  // [CRDT] future: onRemoteOperation(op: OperationRecord): void
}
```

### 6.4 EventBus

```ts
type EditorEvent =
  | 'doc:change'
  | 'doc:save'
  | 'mode:change'           // Host app mode switch
  | 'selection:change'
  | 'block:insert' | 'block:delete' | 'block:update'
  | 'element:add' | 'element:remove' | 'element:update'
  | 'frame:add' | 'frame:remove' | 'frame:update'
  | 'history:push' | 'history:undo' | 'history:redo'
  | 'operation:local'       // [CRDT] emitted on every local command
  | 'operation:remote';     // [CRDT] emitted when BE sends a remote op

class EventBus {
  on<T>(event: EditorEvent, handler: (payload: T) => void): () => void;
  emit<T>(event: EditorEvent, payload?: T): void;
  off(event: EditorEvent, handler: Function): void;
}
```

### 6.5 Serialization + Schema Versioning

```ts
class DocumentSerializer {
  export(doc: DocumentNode): string;
  exportPage(page: GraphicPageNode): string;  // Export a single graphic page
}

class DocumentDeserializer {
  import(json: string): DocumentNode;
  importPage(json: string): GraphicPageNode;
}

// Migrations — pure functions, one per version bump
const migrations: Record<number, (doc: unknown) => unknown> = {
  1: (d) => d,
  2: migrateV1ToV2,
};
```

### 6.6 JSON Export Format

```json
{
  "schemaVersion": 1,
  "type": "document",
  "id": "doc_abc",
  "assets": {},
  "children": [
    {
      "id": "blk_001",
      "type": "heading",
      "data": { "level": 1, "align": "left" },
      "children": [
        { "id": "txt_001", "type": "text", "data": { "text": "Title", "marks": ["bold"] } }
      ],
      "meta": { "createdAt": 1700000000, "version": 1 }
    },
    {
      "id": "blk_002",
      "type": "graphic",
      "data": { "graphicPageId": "page_001", "frameId": "frm_001", "height": 400 }
    }
  ],
  "graphicPages": [
    {
      "id": "page_001",
      "name": "Diagram 1",
      "viewport": { "x": 0, "y": 0, "zoom": 1 },
      "frames": [
        {
          "id": "frm_001",
          "name": "Flow Overview",
          "data": { "x": 0, "y": 0, "width": 800, "height": 600,
                    "background": "#fafafa", "clipContent": true }
        }
      ],
      "elements": [
        {
          "id": "el_001",
          "type": "rect",
          "frameId": "frm_001",
          "data": { "x": 100, "y": 100, "width": 160, "height": 60,
                    "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
                    "label": "Start" }
        }
      ]
    }
  ]
}
```

---

## 7. Host Application — Project Context & Mode Switching

### 7.1 Project Model

A **Project** is the top-level container. Each project holds one `DocumentNode` and a UI state bag that is not persisted in the document JSON.

```ts
interface Project {
  id: string;
  name: string;
  document: DocumentNode;
  uiState: ProjectUIState;
}

interface ProjectUIState {
  activeMode: 'text' | 'graphic';
  activeGraphicPageId: string | null;
  textEditorScrollTop: number;
  graphicViewport: { x: number; y: number; zoom: number };
}
```

### 7.2 Mode Switching

Mode is stored in `ProjectUIState` — it is per-project UI state, not document state. Switching mode does not create an undo entry.

```ts
class ProjectContext {
  readonly project: Project;
  readonly eventBus: EventBus;

  setMode(mode: 'text' | 'graphic'): void {
    this.project.uiState.activeMode = mode;
    this.eventBus.emit('mode:change', { mode });
  }

  get activeMode(): 'text' | 'graphic' {
    return this.project.uiState.activeMode;
  }
}
```

### 7.3 App Layout

The host renders both editors simultaneously in the DOM but only shows the active one. This avoids teardown/setup cost on every mode switch and keeps scroll positions stable.

```
AppShell
├── TopBar (project name, mode toggle, save/export, undo/redo)
├── EditorContainer
│   ├── TextEditorView   (hidden when mode === 'graphic')
│   └── GraphicEditorView (hidden when mode === 'text')
└── StatusBar
```

The mode toggle button in the `TopBar` is the primary UI affordance. A keyboard shortcut (`Ctrl+Shift+M`) also toggles mode. Within the graphic editor view, clicking a Frame and choosing "Edit in Text Editor" also switches mode and scrolls to the corresponding `graphic` block.

---

## 8. Text Editor (`packages/text-editor`)

### 8.1 Block Registry

```ts
interface BlockDefinition<TData = Record<string, unknown>> {
  type: string;
  label: string;
  icon: string;
  defaultData(): TData;
  render(node: BlockNode<TData>, ctx: RenderContext): HTMLElement;
  serialize(node: BlockNode<TData>): BlockNode<TData>;
  deserialize(raw: unknown): BlockNode<TData>;
  onEnter?(node: BlockNode<TData>, ctx: EditorContext): Command | null;
  onDelete?(node: BlockNode<TData>, ctx: EditorContext): Command | null;
  // [CRDT] Every produced Command must carry operation records
}
```

### 8.2 Built-in Block Types

| Type | Key data fields |
|---|---|
| `paragraph` | `align: 'left'\|'center'\|'right'` |
| `heading` | `level: 1–5`, `align` |
| `list_item` | `ordered: boolean`, `depth: number` |
| `table` | `rows: TableRow[]`, `columnWidths: number[]` |
| `embed` | `url: string`, `title: string`, `provider?: string` |
| `graphic` | `graphicPageId: string`, `frameId: string`, `height: number` |

### 8.3 Inline Mark System

```ts
interface TextRun {
  id: string;      // [CRDT] stable ID even for individual runs
  type: 'text';
  data: {
    text: string;
    marks: ('bold' | 'italic' | 'underline' | 'code')[];
  };
}
```

### 8.4 Selection Model

```ts
interface BlockSelection {
  anchorBlockId: string;
  anchorOffset: number;
  focusBlockId: string;
  focusOffset: number;
  isCollapsed: boolean;
}
```

Selection is the source of truth; `window.getSelection()` is the follower, synced after every model update.

### 8.5 Input Handling Pipeline

```
Browser Event (keydown / input / paste / mousedown)
     ↓
InputInterceptor
     ↓
IntentClassifier
     ↓
CommandFactory  →  Command (with OperationRecords) [CRDT]
     ↓
UndoRedoManager.push()
     ↓
Model Mutation
     ↓
EventBus.emit('operation:local', records)  [CRDT]
     ↓
Renderer.reconcile()
     ↓
SelectionSync.sync()
```

### 8.6 Table Block

```ts
interface TableData {
  rows: Array<{
    id: string;
    cells: Array<{
      id: string;
      content: TextRun[];
      colspan: number;
      rowspan: number;
      absorbed: boolean;   // true = cell is consumed by a merge, renderer skips it
      style: {
        borderTop: boolean; borderRight: boolean;
        borderBottom: boolean; borderLeft: boolean;
        background?: string;
      };
    }>;
  }>;
  columnWidths: number[];
}
```

### 8.7 Graphic Block ↔ Frame

The `graphic` block references a `GraphicPageNode` by `graphicPageId` and a `FrameElement` by `frameId`. The text editor renders the frame's canvas region inside a resizable block. Clicking the frame canvas in text editor mode activates a lightweight read-only render. A toolbar button "Edit in Diagram Editor" switches mode to `graphic` and pans/zooms the canvas so the referenced frame fills the view.

`[CRDT]` The `frameId` reference is stable; renaming a frame or moving elements inside it does not break the reference in the text block.

---

## 9. Graphic Editor (`packages/graphic-editor`)

### 9.1 Architecture Overview

```
GraphicEditor
├── Viewport               pan/zoom, world↔screen transforms
├── GridRenderer           dynamic background grid
├── ElementRegistry        element type → renderer class mapping
├── ElementCatalog         JSON-driven category and element descriptor store
├── SceneGraph             ordered GraphicElement[] per page
├── FrameManager           Frame elements (first-class artboards)
├── RenderPipeline
│   ├── Layer 0: Grid
│   ├── Layer 1: Frame backgrounds + labels
│   ├── Layer 2: Elements (z-order)
│   ├── Layer 3: Frame borders (drawn on top of elements)
│   ├── Layer 4: Selection handles
│   └── Layer 5: Active tool overlay (in-progress draw)
├── HitTester
├── ToolManager
├── SelectionManager
├── TransformSystem        move, resize, rotate, snap
├── ConnectorSystem        smart connector routing
└── DrawingSystem          freehand pencil + Bézier pen
```

### 9.2 Viewport & Coordinate Systems

```ts
class Viewport {
  panX = 0; panY = 0; zoom = 1;
  readonly minZoom = 0.05;
  readonly maxZoom = 20;

  screenToWorld(sx: number, sy: number): Point;
  worldToScreen(wx: number, wy: number): Point;
  fitToRect(rect: Rect, canvasSize: Size, padding?: number): void;
  fitToContent(elements: GraphicElement[], frames: FrameElement[]): void;
}
```

All element positions are stored in world space. The renderer applies `ctx.setTransform(zoom, 0, 0, zoom, panX, panY)` once per frame; all element renderers draw in world coordinates.

### 9.3 Render Loop

```ts
class RenderPipeline {
  markDirty(): void;  // Request a repaint on next animation frame
  // Internally: dirty flag + single rAF — never renders more than once per frame
  // [CRDT] remote operation arriving → markDirty()
}
```

### 9.4 Dynamic Grid

Multi-level grid matching Draw.io behavior:

| Zoom range | Visible levels |
|---|---|
| < 0.15× | Major only (100 world units) |
| 0.15–0.5× | Major (100) |
| 0.5–5× | Major (100) + Minor (20) |
| 5–15× | Major (100) + Minor (20) + Sub (4) |
| > 15× | Minor (20) + Sub (4) |

Grid lines fade in/out smoothly over the transition zoom range. Lines are drawn in screen space after applying `worldToScreen()` to each grid line's world coordinate. The center of the world coordinate space is marked with a subtle `+` crosshair.

---

## 10. Element Catalog System (Refactored)

The element system separates **what an element looks like in the catalog** (JSON) from **how an element renders and behaves** (TypeScript). This means new element categories and types can be added by dropping in a JSON file and a renderer class — no changes to the core engine.

### 10.1 Catalog JSON Format

#### `catalog/categories.json` — master category registry

```json
{
  "version": 1,
  "categories": [
    {
      "id": "basic_shapes",
      "label": "Shapes",
      "icon": "icon-shapes",
      "order": 0,
      "collapsible": true
    },
    {
      "id": "flowchart",
      "label": "Flowchart",
      "icon": "icon-flowchart",
      "order": 1,
      "collapsible": true
    },
    {
      "id": "db_schema",
      "label": "Database",
      "icon": "icon-db",
      "order": 2,
      "collapsible": true
    },
    {
      "id": "wireframe",
      "label": "Wireframe",
      "icon": "icon-wireframe",
      "order": 3,
      "collapsible": true
    },
    {
      "id": "drawing",
      "label": "Drawing",
      "icon": "icon-drawing",
      "order": 4,
      "collapsible": true
    }
  ]
}
```

#### `catalog/basic-shapes.catalog.json` — element descriptors for a category

```json
{
  "categoryId": "basic_shapes",
  "elements": [
    {
      "type": "rect",
      "label": "Rectangle",
      "icon": "icon-rect",
      "order": 0,
      "defaultData": {
        "x": 0, "y": 0, "width": 120, "height": 80,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "cornerRadius": 0, "label": "", "labelAlign": "center",
        "labelFontSize": 13, "labelColor": "#333333"
      },
      "constraints": {
        "minWidth": 20, "minHeight": 20,
        "resizable": true, "rotatable": true, "labelEditable": true
      }
    },
    {
      "type": "ellipse",
      "label": "Ellipse",
      "icon": "icon-ellipse",
      "order": 1,
      "defaultData": {
        "x": 0, "y": 0, "width": 120, "height": 80,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "", "labelAlign": "center", "labelFontSize": 13, "labelColor": "#333333"
      },
      "constraints": {
        "minWidth": 20, "minHeight": 20,
        "resizable": true, "rotatable": true, "labelEditable": true
      }
    },
    {
      "type": "line",
      "label": "Line",
      "icon": "icon-line",
      "order": 2,
      "defaultData": {
        "x1": 0, "y1": 0, "x2": 120, "y2": 0,
        "stroke": "#333333", "strokeWidth": 1, "strokeDash": []
      },
      "constraints": {
        "resizable": false, "rotatable": false, "labelEditable": false
      }
    },
    {
      "type": "arrow",
      "label": "Arrow",
      "icon": "icon-arrow",
      "order": 3,
      "defaultData": {
        "x1": 0, "y1": 0, "x2": 120, "y2": 0,
        "stroke": "#333333", "strokeWidth": 1.5,
        "arrowStart": "none", "arrowEnd": "open"
      },
      "constraints": {
        "resizable": false, "rotatable": false, "labelEditable": false
      }
    },
    {
      "type": "text",
      "label": "Text",
      "icon": "icon-text",
      "order": 4,
      "defaultData": {
        "x": 0, "y": 0, "width": 160, "height": 40,
        "text": "Text", "fontSize": 14, "fontWeight": "normal",
        "color": "#333333", "align": "left"
      },
      "constraints": {
        "minWidth": 40, "minHeight": 20,
        "resizable": true, "rotatable": false, "labelEditable": true
      }
    },
    {
      "type": "triangle",
      "label": "Triangle",
      "icon": "icon-triangle",
      "order": 5,
      "defaultData": {
        "x": 0, "y": 0, "width": 100, "height": 100,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1, "label": ""
      },
      "constraints": { "resizable": true, "rotatable": true, "labelEditable": true }
    }
  ]
}
```

#### `catalog/flowchart.catalog.json`

```json
{
  "categoryId": "flowchart",
  "elements": [
    {
      "type": "fc_process",
      "label": "Process",
      "icon": "icon-fc-process",
      "order": 0,
      "defaultData": {
        "x": 0, "y": 0, "width": 160, "height": 60,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "Process", "labelFontSize": 13
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_decision",
      "label": "Decision",
      "icon": "icon-fc-decision",
      "order": 1,
      "defaultData": {
        "x": 0, "y": 0, "width": 140, "height": 80,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "Decision?", "labelFontSize": 13
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_terminator",
      "label": "Terminator",
      "icon": "icon-fc-terminator",
      "order": 2,
      "defaultData": {
        "x": 0, "y": 0, "width": 140, "height": 50,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "Start / End", "labelFontSize": 13
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_data",
      "label": "Data",
      "icon": "icon-fc-data",
      "order": 3,
      "defaultData": {
        "x": 0, "y": 0, "width": 140, "height": 60,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "skew": 20, "label": "Input / Output", "labelFontSize": 13
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_document",
      "label": "Document",
      "icon": "icon-fc-doc",
      "order": 4,
      "defaultData": {
        "x": 0, "y": 0, "width": 140, "height": 70,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "Document", "labelFontSize": 13
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_connector",
      "label": "Connector",
      "icon": "icon-fc-connector",
      "order": 5,
      "defaultData": {
        "x": 0, "y": 0, "width": 40, "height": 40,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "A", "labelFontSize": 12
      },
      "constraints": { "resizable": false, "rotatable": false, "labelEditable": true }
    },
    {
      "type": "fc_subprogram",
      "label": "Subprogram",
      "icon": "icon-fc-subprogram",
      "order": 6,
      "defaultData": {
        "x": 0, "y": 0, "width": 160, "height": 60,
        "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
        "label": "Sub-process", "labelFontSize": 13,
        "sideBarWidth": 16
      },
      "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
    }
  ]
}
```

#### `catalog/drawing.catalog.json`

```json
{
  "categoryId": "drawing",
  "elements": [
    {
      "type": "freehand",
      "label": "Pencil",
      "icon": "icon-pencil",
      "order": 0,
      "defaultData": {
        "points": [],
        "stroke": "#333333", "strokeWidth": 2,
        "opacity": 1.0, "smoothing": true
      },
      "constraints": { "resizable": false, "rotatable": false, "labelEditable": false }
    },
    {
      "type": "bezier_path",
      "label": "Pen",
      "icon": "icon-pen",
      "order": 1,
      "defaultData": {
        "anchors": [],
        "closed": false,
        "fill": "none", "stroke": "#333333", "strokeWidth": 2,
        "opacity": 1.0
      },
      "constraints": { "resizable": false, "rotatable": false, "labelEditable": false }
    }
  ]
}
```

### 10.2 ElementCatalog (Runtime)

The `ElementCatalog` class loads all JSON files and provides query methods used by the toolbox panel, drag-to-canvas, and element creation commands:

```ts
class ElementCatalog {
  load(categoriesJson: unknown, ...catalogFiles: unknown[]): void;

  getCategories(): CategoryDescriptor[];
  getElementsInCategory(categoryId: string): ElementDescriptor[];
  getDescriptor(type: string): ElementDescriptor | undefined;
  getDefaultData(type: string, x: number, y: number): Record<string, unknown>;

  // Used by the toolbox search
  search(query: string): ElementDescriptor[];
}
```

### 10.3 ElementRegistry (Behavior)

The `ElementRegistry` maps element `type` strings to renderer class instances. This is separate from the catalog — the catalog is about description and discovery; the registry is about behavior.

```ts
interface ElementRenderer<TData = Record<string, unknown>> {
  draw(el: GraphicElement<TData>, ctx: CanvasRenderingContext2D, vp: Viewport, state: RenderState): void;
  getBoundingBox(el: GraphicElement<TData>): Rect;
  hitTest(el: GraphicElement<TData>, worldPoint: Point): boolean;
  getHandles(el: GraphicElement<TData>): Handle[];
  onHandleDrag(el: GraphicElement<TData>, handle: Handle, delta: Point, snap: SnapConfig): Partial<TData>;
  // Optional
  onDoubleClick?(el: GraphicElement<TData>, ctx: EditorContext): void;  // e.g. open label editor
  getConnectionAnchors?(el: GraphicElement<TData>): ConnectionAnchor[];
}

class ElementRegistry {
  register(type: string, renderer: ElementRenderer): void;
  get(type: string): ElementRenderer;
  has(type: string): boolean;
}
```

### 10.4 Registering a New Element Type (Full Example)

Adding a new "Cylinder" shape requires exactly two things:

**1. Add to a catalog JSON file** (or a new `cylinder.catalog.json`):
```json
{
  "type": "cylinder",
  "label": "Cylinder",
  "icon": "icon-cylinder",
  "order": 6,
  "defaultData": {
    "x": 0, "y": 0, "width": 80, "height": 120,
    "fill": "#ffffff", "stroke": "#333333", "strokeWidth": 1,
    "ellipseHeight": 20, "label": ""
  },
  "constraints": { "resizable": true, "rotatable": false, "labelEditable": true }
}
```

**2. Register a renderer class**:
```ts
// elements/renderers/cylinder.renderer.ts
class CylinderRenderer implements ElementRenderer<CylinderData> {
  draw(el, ctx, vp, state) {
    const { x, y, width, height, fill, stroke, strokeWidth, ellipseHeight } = el.data;
    const rx = width / 2;
    // Top ellipse
    ctx.beginPath();
    ctx.ellipse(x + rx, y + ellipseHeight / 2, rx, ellipseHeight / 2, 0, 0, Math.PI * 2);
    // ... body and bottom ellipse
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
  getBoundingBox(el) { return { x: el.data.x, y: el.data.y, width: el.data.width, height: el.data.height }; }
  hitTest(el, pt) { /* bounding box check */ return false; }
  getHandles(el) { return standardRectHandles(el.data); }
  onHandleDrag(el, handle, delta, snap) { return resizeByHandle(el.data, handle, delta, snap); }
}

// Register once at startup
ElementRegistry.register('cylinder', new CylinderRenderer());
```

Nothing in the engine changes. No switch statements, no if-chains.

### 10.5 Behavior Mixins

Shared behaviors are extracted as standalone functions that renderers compose rather than inherit:

```ts
// Standard 8-handle bounding-box handles (top/bottom/left/right + corners)
function standardRectHandles(data: {x,y,width,height}): Handle[]

// Resize logic for standard rect handle drag
function resizeByHandle(data, handle, delta, snap): Partial<RectData>

// Draw a centered, word-wrapped text label inside a bounding box
function drawLabel(ctx, label, bounds, style): void

// Returns 4 midpoint connection anchors for a rect bounding box
function rectConnectionAnchors(data): ConnectionAnchor[]
```

---

## 11. Frame Element (First-Class Artboard)

Frames are top-level named containers in a graphic page. They are not regular elements — they live in `GraphicPageNode.frames[]` and are managed by `FrameManager`. They serve as:

- **Named artboards** (like Figma frames) for organizing the canvas
- **The bridge** between the graphic editor and the text editor's `graphic` block
- **Clip regions** (optional) that crop their child elements for export/embedding

### 11.1 Frame Data Model

```ts
interface FrameElement {
  id: string;
  name: string;
  data: {
    x: number;
    y: number;
    width: number;
    height: number;
    background: string;          // CSS color, default "#ffffff"
    clipContent: boolean;        // Whether to clip child elements at frame bounds
    showLabel: boolean;          // Show frame name above the frame
    labelFontSize: number;
  };
  childElementIds: string[];     // Ordered list of element IDs parented to this frame
  meta?: NodeMeta;
}
```

### 11.2 Frame Rendering

Frames are drawn in two separate render passes:

- **Pass 1 (Layer 1)**: Frame background fills and name labels — drawn before elements so elements render on top of the background
- **Pass 3 (Layer 3)**: Frame border outlines — drawn after elements so the frame edge is always visible

When `clipContent` is true, the canvas uses `ctx.save()` / `ctx.clip()` to mask element rendering to the frame boundary.

### 11.3 Frame ↔ Text Editor Link

When a user drops a `graphic` block into the text editor:
1. A frame picker modal shows all named frames from all graphic pages
2. The user selects a frame → `graphicPageId` and `frameId` are stored in the block's data
3. The text editor renders a mini canvas showing the frame's content at the block's width
4. The frame's aspect ratio determines the block height (can be manually overridden)

When a user creates a new frame in the graphic editor, they can immediately choose "Insert in text editor" from the frame context menu, which appends a `graphic` block to the text document.

### 11.4 Frame Commands

```ts
class AddFrameCommand implements Command { /* … */ }
class DeleteFrameCommand implements Command { /* … */ }
class RenameFrameCommand implements Command { /* … */ }
class ResizeFrameCommand implements Command { /* … */ }
class MoveFrameCommand implements Command { /* … */ }
class AssignElementToFrameCommand implements Command { /* … */ }
```

---

## 12. Tool System

### 12.1 Tool Interface

```ts
interface Tool {
  id: string;
  cursor: string | ((state: ToolState) => string);
  activate(ctx: ToolContext): void;
  deactivate(ctx: ToolContext): void;
  onPointerDown(e: PointerEvent, ctx: ToolContext): void;
  onPointerMove(e: PointerEvent, ctx: ToolContext): void;
  onPointerUp(e: PointerEvent, ctx: ToolContext): void;
  onKeyDown?(e: KeyboardEvent, ctx: ToolContext): void;
  onKeyUp?(e: KeyboardEvent, ctx: ToolContext): void;
  // Called every frame while tool is active — for tool-specific overlays
  drawOverlay?(ctx2d: CanvasRenderingContext2D, vp: Viewport): void;
}
```

### 12.2 Built-in Tools

| Tool ID | Description |
|---|---|
| `select` | Click/box-select, delegates internally to move/resize/rotate sub-tools |
| `pan` | Drag to pan; Space+drag also activates this transiently from any tool |
| `draw_rect` | Click+drag → rect element |
| `draw_ellipse` | Click+drag → ellipse element |
| `draw_line` | Click+drag → line element |
| `draw_arrow` | Click+drag → arrow element |
| `draw_frame` | Click+drag → new Frame artboard |
| `text` | Click on canvas → text element with immediate inline editing |
| `connector` | Click source element then target → connector element |
| `pencil` | Freehand pencil (see Section 13) |
| `pen` | Bézier pen (see Section 13) |

---

## 13. Drawing System — Pencil & Pen Tools

### 13.1 Pencil Tool (Freehand)

The Pencil tool captures raw pointer positions and creates a `freehand` element.

**During drawing** (pointer is down): raw `(x, y)` points are appended to an in-progress array at every `pointermove` event. The overlay renderer draws a polyline through all current points in world space — cheap and responsive.

**On pointer up**: the raw points array is passed through the **Ramer-Douglas-Peucker algorithm** to reduce point count while preserving the path's visual character. The simplification epsilon is derived from the current zoom level: `epsilon = 2 / viewport.zoom`. The simplified points are stored in `freehand.data.points` and committed via `AddElementCommand`.

```ts
interface FreehandData {
  points: Array<{ x: number; y: number; pressure?: number }>;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  smoothing: boolean;   // If true, renderer uses Catmull-Rom spline through points
}
```

**Rendering freehand elements**: When `smoothing` is true, the renderer converts the points array into a smooth cubic Bézier spline using Catmull-Rom → cubic Bézier conversion. This produces the characteristic smooth pencil stroke appearance without storing full Bézier handles.

**Stroke width and color** are controlled by the active drawing style panel (see Section 13.3) which is visible whenever the pencil or pen tool is active.

### 13.2 Pen Tool (Bézier Path)

The Pen tool creates `bezier_path` elements with explicit anchor points and control handles — identical in concept to the pen tools in Illustrator or Figma.

```ts
interface BezierAnchor {
  id: string;
  x: number;
  y: number;
  handleIn?: { x: number; y: number };   // Control handle from previous segment
  handleOut?: { x: number; y: number };  // Control handle to next segment
  type: 'corner' | 'smooth' | 'symmetric';
}

interface BezierPathData {
  anchors: BezierAnchor[];
  closed: boolean;
  fill: string;         // "none" for open paths
  stroke: string;
  strokeWidth: number;
  strokeDash: number[];  // e.g. [5, 3] for dashed
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
  opacity: number;
}
```

**Pen tool interaction states**:

```
Idle
 │── Click canvas (no drag) ──► Add corner anchor → Drawing
 │
Drawing
 │── Click (no drag) ──────────► Add corner anchor, stay in Drawing
 │── Click + drag ──────────────► Add smooth anchor (drag sets handleOut), stay in Drawing
 │── Click on first anchor ─────► Close path (closed: true) → Commit → Idle
 │── Double-click ──────────────► Commit open path → Idle
 │── Escape ────────────────────► Commit open path (no last anchor) → Idle
 │
Editing existing path (after select + double-click)
 │── Drag anchor ───────────────► Move anchor
 │── Drag handle ───────────────► Adjust curve
 │── Click anchor + Alt ─────────► Toggle corner/smooth
 │── Click segment ─────────────► Insert new anchor on segment
 │── Delete key on selected anchor → Remove anchor
```

**Overlay rendering** while drawing: the pen tool's `drawOverlay()` draws anchor point circles (filled for confirmed anchors, hollow for the current preview anchor), control handles (small squares connected by dashed lines), the completed path segments, and a preview bezier curve from the last confirmed anchor to the current mouse position.

### 13.3 Drawing Style Panel

A compact floating panel that appears when the pencil or pen tool is active. It does not disappear when drawing — it stays docked to the top of the canvas area.

```ts
interface DrawingStyle {
  strokeColor: string;      // Hex or CSS color
  strokeWidth: number;      // 1–50px
  strokeDash: number[];     // [] = solid, [5,3] = dashed, [1,3] = dotted
  lineCap: 'butt' | 'round' | 'square';
  opacity: number;          // 0–1
  // Pen only:
  fillColor: string;        // "none" or color
  fillOpacity: number;
}
```

UI components:
- **Color swatch + picker**: click swatch to open a compact color picker (hue/saturation square + hue bar + hex input + 16-color palette of recent/preset colors)
- **Width slider**: range 1–50 with a live preview stroke rendered inside the slider track itself
- **Dash style**: 3 icon buttons (solid, dashed, dotted)
- **Opacity slider**: 0–100%
- **Pen only — Fill swatch**: same color picker, with a "None" option

All style changes update a `DrawingStyleStore` (a simple observable object). New elements created by pencil/pen inherit from the current style store. Changing the style after a path is committed does not affect existing paths — the style is copied into the element's `data` at creation time.

---

## 14. Connector System

```ts
interface ConnectorData {
  sourceId: string | null;
  targetId: string | null;
  sourcePoint?: Point;
  targetPoint?: Point;
  sourceAnchor: 'auto' | 'top' | 'right' | 'bottom' | 'left';
  targetAnchor: 'auto' | 'top' | 'right' | 'bottom' | 'left';
  routingMode: 'straight' | 'orthogonal' | 'curved';
  waypoints?: Point[];
  label?: string;
  arrowStart: 'none' | 'open' | 'filled' | 'circle' | 'one' | 'many' | 'zero_one' | 'zero_many';
  arrowEnd: 'none' | 'open' | 'filled' | 'circle' | 'one' | 'many' | 'zero_one' | 'zero_many';
  stroke: string;
  strokeWidth: number;
  strokeDash: number[];
}
```

`[CRDT]` When a connected element moves, the connector re-routes automatically. This re-routing is not a separate command — it is computed at render time from the current element positions. Only the `waypoints` array is stored; endpoint positions are always derived. This means a CRDT merge that moves two connected elements will naturally produce a valid routed connector without any merge conflict on connector data.

---

## 15. Performance Considerations

### Text Editor
- No block-level `contenteditable` — all structural operations go through the command pipeline
- Virtual rendering for documents > 500 blocks (IntersectionObserver-based)
- Batch DOM updates within one `requestAnimationFrame`
- `[CRDT]` All text mutations use character-level granularity in preparation for future CRDT string types

### Graphic Editor
- Dirty-flag rAF loop — never more than one render per frame
- Offscreen canvas cache for static elements (invalidated on any `element:update` event for that element)
- Spatial index (grid bucketing) for hit-testing when element count > 200
- `[CRDT]` Remote operation arrives → only re-renders the bounding box of changed elements (partial redraw)

---

## 16. Keyboard Shortcut Map

| Action | Shortcut |
|---|---|
| Bold | Ctrl/Cmd + B |
| Italic | Ctrl/Cmd + I |
| Underline | Ctrl/Cmd + U |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |
| Save / Export | Ctrl/Cmd + S |
| Open slash menu (text) | / at block start |
| Switch mode | Ctrl/Cmd + Shift + M |
| Select all (graphic) | Ctrl/Cmd + A |
| Delete selection | Delete / Backspace |
| Pan canvas | Space + drag |
| Zoom in/out | Ctrl/Cmd + Scroll |
| Group | Ctrl/Cmd + G |
| Ungroup | Ctrl/Cmd + Shift + G |
| Select tool | V or Escape |
| Pan tool | H |
| Pencil tool | P |
| Pen tool | Shift + P |
| Rectangle tool | R |
| Ellipse tool | O |
| Frame tool | F |
| Connector tool | C |
| Text tool | T |
| Close Bézier path (pen) | Click first anchor |
| Finalize open path (pen) | Double-click or Escape |
| Add anchor midpoint (pen) | Click segment |
| Toggle anchor type (pen) | Alt + click anchor |
| Zoom to fit | Ctrl/Cmd + Shift + H |

---

---

# Appendix: Feature Split for Prompting (v2)

## How to Use This Section

Each entry below is a self-contained prompt unit. Before each prompt, include:

1. **All relevant source files already written** — paste full contents, not summaries
2. **The exact TypeScript interfaces** the feature touches — copy from this document verbatim
3. **A note on what's already working** — prevents re-implementing finished code
4. **The [CRDT] note** at the bottom of every prompt: "All commands must produce `OperationRecord[]`. No mutations bypass the command pipeline."

---

## Phase 0 — Foundation (sequential, do in order)

### Prompt 0.1 — Core Node Model
**Include:** Nothing (greenfield).
**Ask for:** All TypeScript interfaces from Section 6.1 and 6.2: `Node`, `DocumentNode`, `GraphicPageNode`, `NodeMeta`, `OperationRecord`, `OperationPayload`, `OperationType`. Also the JSON Schema file for validation (use `ajv` compatible format). Generate three example JSON documents: text-only, graphic-only, mixed with a graphic block referencing a frame.
**Tip:** Ask it to create a `src/id.ts` wrapper around `nanoid` that prefixes IDs by type: `blk_`, `txt_`, `el_`, `frm_`, `doc_`, `op_`. Prefixed IDs make debugging far easier.

### Prompt 0.2 — EventBus + UndoRedoManager
**Include:** Core interfaces from 0.1.
**Ask for:** `EventBus` class (typed, with `EditorEvent` union from Section 6.4), `UndoRedoManager` class (Section 6.3), and `CompositeCommand` (multiple sub-commands as one undo unit). Include Vitest unit tests.
**Tip:** Ask for a `batchCommands(commands: Command[]): CompositeCommand` helper — you'll need it for table cell merges, multi-element deletes, and paste operations.

### Prompt 0.3 — Serializer + Deserializer + Migrations
**Include:** Phase 0 so far.
**Ask for:** `DocumentSerializer`, `DocumentDeserializer` with validation and the migration system (Section 6.5). Write the v1 baseline and a synthetic v1→v2 migration as proof-of-concept.
**Tip:** Ask for error messages that include JSON pointer paths. Also ask for a `validateDocument(doc: unknown): ValidationResult` function that returns `{ valid: boolean; errors: string[] }` — you'll use this in the import UI.

### Prompt 0.4 — Webpack 5 Build Setup
**Include:** The full Webpack config from Section 4 of this document.
**Ask for:** `webpack/webpack.common.js`, `webpack/webpack.dev.js`, `webpack/webpack.prod.js`, and `tsconfig.json`. Also the `package.json` scripts: `"dev"`, `"build"`, `"build:analyze"` (with `webpack-bundle-analyzer`). Include the `resolve.alias` setup so `@core`, `@text-editor`, `@graphic-editor`, `@ui` all resolve.
**Tip:** Ask for a working minimal `src/main.ts` that just imports from `@core` and logs the version — confirms the alias resolution works before building anything else.

---

## Phase 1 — Text Editor Core

### Prompt 1.1 — Selection Model + SelectionSync
**Include:** Core model, EventBus.
**Ask for:** `BlockSelection` type, `SelectionManager` class (set/get/clear/extend), `SelectionSync` (syncs model ↔ `window.getSelection()`).
**Tip:** Include a written description of cross-block selection: anchor in block A at offset 5, focus in block B at offset 2. The sync must write the browser selection from the model after every model update, not the other way around.

### Prompt 1.2 — BlockRegistry + Paragraph + Heading
**Include:** Core model, SelectionManager, UndoRedoManager.
**Ask for:** `BlockRegistry`, `RenderContext` type, `ParagraphBlock`, `HeadingBlock` (h1–h5) as the first two registrations. Full DOM rendering and serialize/deserialize.
**[CRDT] note:** Add to prompt: "The block registry's `deserialize` must be pure — given the same JSON it always returns an identical block node. No randomness, no side effects."

### Prompt 1.3 — Inline Mark System
**Include:** BlockRegistry, ParagraphBlock, RenderContext.
**Ask for:** `InlineMarkManager` (toggle bold/italic/underline across selection, split/merge TextRun objects), inline DOM renderer (TextRun[] → DOM spans), `ToggleMarkCommand`.
**Tip:** Paste the `TextRun` interface verbatim and add: "A single TextRun can have multiple marks simultaneously. A run with `marks: ['bold','italic']` renders as `<strong><em>text</em></strong>`."

### Prompt 1.4 — Input Pipeline (Part A: typing, backspace, enter)
**Include:** Selection model, InlineMarkManager, UndoRedoManager.
**Ask for:** `InputInterceptor`, `IntentClassifier`, and commands for: `InsertTextCommand`, `DeleteCharCommand`, `SplitBlockCommand`, `MergeBlocksCommand`. Connect to the DOM `input` and `keydown` events.
**Tip:** Separate typing (rapid, should `merge()` into previous InsertTextCommand) from structural operations (backspace at block start merges blocks — this should never merge).

### Prompt 1.5 — Input Pipeline (Part B: paste, cut, copy)
**Include:** Everything from 1.4.
**Ask for:** Clipboard handling: paste HTML → strip to plain text + inline marks only (no block structure from external HTML), paste plain text → split by newlines into separate blocks. Cut = copy + delete selection. Include `PasteCommand`.
**Tip:** Specify: "When pasting HTML from an external source like a browser, preserve only bold, italic, underline, and line breaks. Strip everything else (colors, font sizes, classes, divs)."

### Prompt 1.6 — Slash Command Palette
**Include:** BlockRegistry (with all registered blocks), InputInterceptor.
**Ask for:** Slash palette component — overlay anchored to cursor, keyboard nav (up/down/enter), fuzzy-filter on typed query, escape dismissal, converts the `/...` text to the chosen block type via command.
**Tip:** Provide an ASCII mockup of the palette layout and specify: position the overlay below the cursor using `getBoundingClientRect()` of the caret position, not the block element.

### Prompt 1.7 — Floating Toolbar
**Include:** SelectionManager, InlineMarkManager, BlockRegistry.
**Ask for:** `FloatingToolbar` — appears 80ms after non-collapsed selection settles, shows mark toggles (B/I/U), alignment buttons, block-type switcher dropdown. Disappears on selection collapse or click outside.
**Tip:** Specify the z-index situation explicitly if your app has a top bar or sidebars. Also: "The toolbar must not cause the editor to scroll when it appears near the top of the viewport."

---

## Phase 2 — Text Editor Block Types

### Prompt 2.1 — List Blocks
**Include:** BlockRegistry, InputInterceptor, UndoRedoManager.
**Ask for:** `ListItemBlock` supporting ordered and unordered, nesting (Tab = indent, Shift+Tab = outdent, max depth 4). Adjacent same-type list items at the same depth render as one visual `<ul>` or `<ol>`.
**Tip:** Paste this exact rule: "The list type and depth are properties of each `list_item` block. There is no container block. The renderer groups consecutive same-type blocks into a single `<ul>` or `<ol>` at render time."

### Prompt 2.2 — Alignment (text and heading)
**Include:** BlockRegistry, FloatingToolbar, ParagraphBlock, HeadingBlock.
**Ask for:** Add `align: 'left' | 'center' | 'right' | 'justify'` to paragraph and heading. Add alignment toggle buttons to the floating toolbar. Create `SetAlignCommand`.
**Tip:** Small prompt — group with 2.1 if you prefer to save prompt budget.

### Prompt 2.3 — Table Block (Render + Cell Editing)
**Include:** BlockRegistry, UndoRedoManager, InlineMarkManager. Paste the `TableData` interface from Section 8.6 verbatim.
**Ask for:** `TableBlock` — DOM rendering of table, click-to-focus individual cells, inline `contenteditable` text editing per cell, Tab to move to next cell, column resize by dragging header borders. Do not include cell merging in this prompt.
**Tip:** Ask for `InsertRowCommand`, `InsertColumnCommand`, `DeleteRowCommand`, `DeleteColumnCommand` as well — these are simpler and you'll need them before merging.

### Prompt 2.4 — Table Cell Borders + Cell Merging
**Include:** Complete TableBlock from 2.3.
**Ask for:** Per-cell border toggle (each of 4 sides individually), `MergeCellsCommand`, `SplitCellCommand`. Include a concrete before/after JSON example of a 3×3 table with the top-right 2×2 area merged.
**Tip:** Ask for a visual selection mode within the table (click + drag across cells highlights the merge region before committing). This is UX-critical for merge to feel usable.

### Prompt 2.5 — Embed Block
**Include:** BlockRegistry.
**Ask for:** `EmbedBlock` with two states: (a) URL input state (input field + "Embed" button), (b) preview state (iframe with a title bar showing site name + "Open in new tab" button). Include provider detection (YouTube, Figma, Miro, Google Maps → determine if embeddable). Graceful fallback card for non-embeddable URLs.
**Tip:** Include the list of providers you want to support. Specify: "The iframe's `sandbox` attribute must include `allow-scripts allow-same-origin` for embeds to work, but explicitly must not include `allow-top-navigation`."

---

## Phase 3 — Graphic Editor Core

### Prompt 3.1 — Canvas + Viewport + Render Loop
**Include:** Core model, EventBus.
**Ask for:** `GraphicEditor` class, `Viewport` (Section 9.2) with `fitToContent()`, `RenderPipeline` (dirty-flag rAF loop, Section 9.3), mouse/wheel wiring for pan (Space+drag) and zoom (Ctrl+scroll). Min zoom 0.05×, max 20×.
**Tip:** Ask for a `resetView()` method and also `zoomTo(level, centerPoint)` — you'll need both for the "Zoom to fit" shortcut.

### Prompt 3.2 — Dynamic Grid
**Include:** Viewport from 3.1.
**Ask for:** `GridRenderer` implementing the zoom-level table from Section 9.4. Include smooth fade transitions and the center crosshair.
**Tip:** The grid must be drawn in screen space (apply worldToScreen to each line position) so lines are always exactly 1 CSS pixel wide regardless of zoom. Specify this explicitly.

### Prompt 3.3 — Element Catalog + Registry Setup
**Include:** `ElementCatalog` and `ElementRegistry` interfaces from Section 10.2 and 10.3. Include `categories.json` and `basic-shapes.catalog.json` from Section 10.1.
**Ask for:** Both classes implemented, with loading of the JSON catalogs at startup. Include the `search()` method. Register placeholder renderers for all basic shapes (renders as a gray rect — real renderers come next).
**Tip:** This prompt establishes the plug-in architecture. Ask for a console warning when `ElementRegistry.get()` is called for an unregistered type — this surfaces missing renderer registrations early.

### Prompt 3.4 — Basic Shape Renderers
**Include:** ElementRegistry, all basic shape catalog entries, behavior mixins from Section 10.5.
**Ask for:** Renderer classes for: `rect`, `ellipse`, `line`, `arrow`, `text`, `triangle`. Use the behavior mixin functions (`standardRectHandles`, `resizeByHandle`, `drawLabel`, `rectConnectionAnchors`).
**Tip:** Ask for renderers that handle the `selected` state from `RenderState` — selected elements draw their outline in the selection color (e.g. `#0099ff`) instead of `data.stroke`.

### Prompt 3.5 — Scene Graph + Hit Tester + Select Tool
**Include:** All of Phase 3 so far, SelectionManager interface.
**Ask for:** `SceneGraph` (ordered element array, add/remove/reorder by z-index), `HitTester` (Section 9.4 patterns), `SelectTool` (click select, box select, Shift+click multi-select, click-empty deselect). Selection visual: blue bounding box + 8 resize handles + rotation handle.
**Tip:** The hit tester must test elements in reverse z-order (topmost first). Ask for `elementsIntersecting(rect)` as well — needed for box selection.

### Prompt 3.6 — Move + Resize + Snap
**Include:** SelectTool, SelectionManager, UndoRedoManager, element renderers.
**Ask for:** `MoveTool` (drag selected elements, commits on pointer up), `ResizeTool` (drag handles, commits on pointer up), snap-to-grid (configurable 20-unit default), snap-to-element-bounds (align to edges of other elements while dragging).
**Tip:** Specify: "During drag, apply snap visually (move the element to snapped position) but do not emit commands until pointer up. The undo stack should have exactly one entry per drag operation."

### Prompt 3.7 — Draw Tools + Tool Manager
**Include:** Scene graph, element renderers, UndoRedoManager.
**Ask for:** `DrawRectTool`, `DrawEllipseTool`, `DrawLineTool`, `DrawArrowTool`, `TextTool`, `DrawFrameTool` — all follow the pattern: click+drag → draw → commit on pointer up → switch to select tool with new element selected. Include `ToolManager` (activate/deactivate, cursor management, keyboard shortcuts).
**Tip:** Ask for a `transient pan` behavior built into `ToolManager`: pressing Space from any tool temporarily activates the pan tool; releasing Space returns to the previous tool.

---

## Phase 4 — Frame System

### Prompt 4.1 — Frame Element
**Include:** Scene graph, render pipeline, `FrameElement` interface from Section 11.1.
**Ask for:** `FrameManager`, `DrawFrameTool`, all Frame commands (Section 11.4), frame rendering (two-pass: background in Layer 1, border in Layer 3), clip-content mode using canvas clip path, frame name label above the frame.
**Tip:** Include the exact render layer order from Section 9.1. The two-pass rendering is important — ask for it explicitly.

### Prompt 4.2 — Frame ↔ Text Editor Integration
**Include:** Complete Frame system, complete GraphicBlock (text editor), DocumentNode model.
**Ask for:** The frame picker modal (lists all named frames from all graphic pages), the mini-canvas render of a frame inside the `graphic` text block, the "Edit in Diagram Editor" toolbar button that switches mode and focuses the frame.
**Tip:** Specify the mini-canvas behavior: "The graphic block renders the frame at the block's width. The frame's aspect ratio determines the rendered height. The user can drag the block's bottom edge to override the height (stores a manual height override in the block data). Pan and zoom inside the mini-canvas should be disabled — it always shows the full frame."

---

## Phase 5 — Drawing Tools

### Prompt 5.1 — Drawing Style Panel
**Include:** EventBus, `DrawingStyle` interface from Section 13.3.
**Ask for:** `DrawingStyleStore` (observable, persisted to localStorage between sessions), `DrawingStylePanel` UI component (compact floating panel: color swatch, width slider with live preview, dash selector, opacity slider). No framework — plain TS + DOM.
**Tip:** The color picker is the hardest sub-component. Consider asking for it as a separate sub-prompt: "Build a compact color picker: a hue/saturation square (HSV), a hue bar, a hex input, and 16 preset color swatches. Returns a hex string."

### Prompt 5.2 — Pencil Tool (Freehand)
**Include:** Tool system, DrawingStyleStore, SceneGraph, UndoRedoManager, `FreehandData` and `FreehandRenderer` skeleton.
**Ask for:** `PencilTool` with RDP simplification, `FreehandRenderer` (Catmull-Rom spline rendering), `AddFreehandCommand`. Include the pressure simulation (derive apparent pressure from pointer speed — fast movement = thinner stroke).
**Tip:** Ask for the RDP algorithm as a standalone pure function `simplifyPath(points: Point[], epsilon: number): Point[]` in its own file. It's independently testable and you may want to reuse it.

### Prompt 5.3 — Pen Tool (Bézier)
**Include:** Tool system, DrawingStyleStore, SceneGraph, `BezierPathData`, `BezierAnchor` interfaces from Section 13.2.
**Ask for:** `PenTool` implementing the full interaction state machine from Section 13.2, `BezierPathRenderer` (Canvas 2D bezierCurveTo rendering), the overlay renderer (anchors, handles, preview curve), `AddBezierPathCommand`.
**Tip:** This is the most complex single tool. Split into two prompts if needed: (a) drawing a new path (pointer down → add anchors → commit), then (b) editing an existing path (double-click on `bezier_path` element → enter edit mode, drag anchors and handles).

---

## Phase 6 — Element Libraries

### Prompt 6.1 — Flowchart Renderers
**Include:** ElementRegistry, `flowchart.catalog.json` from Section 10.1, behavior mixins.
**Ask for:** Renderer classes for all 7 flowchart types: `fc_process`, `fc_decision`, `fc_terminator`, `fc_data`, `fc_document`, `fc_connector`, `fc_subprogram`.
**Tip:** Provide a visual description or ASCII art of each shape. The decision diamond and subprogram double-line border are the two that are hardest to describe in words — be explicit.

### Prompt 6.2 — Connector System
**Include:** SceneGraph, element renderers with `getConnectionAnchors()`, `ConnectorData` from Section 14.
**Ask for:** Full connector system: `ConnectorTool`, `ConnectorRenderer` (straight, orthogonal, curved routing), auto-anchor computation, connector re-route on element move (computed at render time — not stored), label on connector, `AddConnectorCommand`.
**Tip:** Paste the CRDT note from Section 14 verbatim. Also specify: "Orthogonal routing must avoid routing through the source or target element's bounding box."

### Prompt 6.3 — DB Schema Elements
**Include:** ElementRegistry, ConnectorSystem, `db-schema.catalog.json` (you'll need to write this before the prompt).
**Ask for:** `TableEntityElement` (header + attribute rows with name/type columns, double-click to add/edit attributes inline), relationship connector with cardinality markers (`1`, `N`, `0..1`, `0..N`, `||`, `}|`, etc.).
**Tip:** Provide example JSON for a two-table schema (users → posts) so the AI targets the exact data shape.

### Prompt 6.4 — Wireframe Elements
**Include:** ElementRegistry, `wireframe.catalog.json` (write this before the prompt).
**Ask for:** Wireframe element renderers: Button, Input, Checkbox, Radio, Dropdown, NavBar, Card, ImagePlaceholder, BrowserFrame, MobileFrame. All in Balsamiq-style — flat gray, no color, structural outlines only.
**Tip:** Provide an ASCII mockup or description of each widget. Specify: "All wireframe elements use a consistent light gray fill (#f0f0f0) and dark gray stroke (#666666). No color. Font is the same canvas font as other elements."

---

## Phase 7 — Integration & Polish

### Prompt 7.1 — Properties Panel
**Include:** ElementRegistry, SelectionManager, all element renderers.
**Ask for:** Right-side properties panel that dynamically renders editable fields for the selected element's `data`. The panel is driven by the element descriptor's `constraints` from the catalog JSON plus a per-renderer `getPropertySchema()` method that returns field definitions.
**Tip:** Ask for property field types: `color` (swatch + picker), `number` (input + optional range slider), `text` (input), `select` (dropdown), `boolean` (toggle), `strokeDash` (3-icon selector). The panel must batch rapid numeric changes into a single undo entry on blur.

### Prompt 7.2 — Toolbox Panel
**Include:** ElementCatalog, FrameManager, ToolManager.
**Ask for:** Left-side toolbox: top section shows tools (selection, draw, pencil, pen, etc.), bottom section shows element catalog grouped by category (collapsible, drag-to-canvas to place elements). Include the catalog search input.
**Tip:** Drag-to-canvas: on dragstart, store the element `type` in `dataTransfer`. On canvas `drop`, create the element at the drop world position via command. This is simpler than implementing a full DnD library.

### Prompt 7.3 — Import / Export UI
**Include:** DocumentSerializer, DocumentDeserializer, `validateDocument()`.
**Ask for:** "Export JSON" button (download `project.json`), "Import JSON" button (file picker → load + validate → replace document), "Copy JSON" action, JSON preview modal (syntax-highlighted read-only textarea). Error toast with specific validation message on invalid import.
**Tip:** Ask for a `canImport(json: string): { ok: boolean; error?: string }` pre-check that validates before replacing the current document. Destructive imports should show a confirmation dialog.

### Prompt 7.4 — Keyboard Shortcut Manager
**Include:** Both editors, UndoRedoManager, ToolManager, ProjectContext.
**Ask for:** `ShortcutManager` implementing the full table from Section 16. Focus-scoped: text editor shortcuts only fire when text editor has focus, graphic editor shortcuts when graphic editor has focus. Include a global command palette (Ctrl+K) listing all commands with their shortcuts and a search input.
**Tip:** Ask for the shortcut system to be declarative: `registerShortcut({ keys: 'ctrl+b', scope: 'text', label: 'Bold', command: () => … })`. This makes the command palette trivial to build — it just lists all registered shortcuts.

---

## CRDT Upgrade Guide (Future Phase)

When you are ready to add real-time collaboration, the upgrade touches these specific seams:

1. `UndoRedoManager` — add `onRemoteOperation(op: OperationRecord): void` that applies a remote op without adding it to the local undo stack
2. `EventBus` — `operation:local` events are sent to the WebSocket client; `operation:remote` events are emitted when the server delivers ops
3. `CommandFactory` — commands already produce `OperationRecord[]`; the WebSocket client subscribes to `operation:local` and sends them
4. `DocumentDeserializer` — add `importFromLog(ops: OperationRecord[]): DocumentNode` that reconstructs state by replaying an operation log
5. Text conflicts — upgrade `TextRun` storage to use a CRDT string type (Yjs `Y.Text` or Automerge `Text`) — this is the only breaking change

Nothing in the registry, renderer, tool, or frame systems needs to change. The CRDT layer is an extension of the command pipeline, not a replacement.

---

## General Prompting Tips

**Include type definitions verbatim.** The single biggest source of hallucination is the AI inventing data shapes. Paste the exact TypeScript interfaces from this document into every prompt that touches those types.

**State "no external editor libraries"** in every prompt: "Do not use Editor.js, Quill, Slate, Fabric.js, Konva, MaxGraph, or any other editor or diagramming library. Use only the browser's native Canvas 2D API and DOM APIs."

**Break complex features into (a) model + commands and (b) rendering + UI.** The AI produces better code when focused on one concern per prompt.

**Ask for integration tests** at the end of each prompt: "Write a test that creates a document, performs the operation, serializes to JSON, deserializes, and asserts the round-trip result matches."

**Always add the CRDT reminder** to prompts touching commands or the document model: "All commands must emit `OperationRecord[]`. No mutations bypass the command pipeline. No 'replace entire object' mutations — update only the specific changed property."

**Version your context files.** Add a comment: `// after prompt 3.5` to each file you paste. You'll have dozens of files by Phase 4 and you need to know which version you passed.
