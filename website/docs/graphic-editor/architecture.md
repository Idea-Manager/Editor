---
sidebar_position: 2
---

# Architecture

## Package layout

All source lives in `packages/graphic-editor/src/`:

```
engine/               Core rendering and interaction controllers
  graphic-editor.ts   Custom element (<idea-graphic-editor>)
  graphic-context.ts  Shared context interface passed between controllers
  canvas-renderer.ts  SVG world + DOM overlay rendering
  viewport-controller.ts  Pan, zoom, world↔screen coordinate math
  selection-manager.ts    Selection handles, hit zones
  tool-state.ts           Active tool and ghost-placement state
  commands/           Undoable command implementations
  …other controllers  drag, resize, lasso, pen, frame, placement

blocks/               Block registry and built-in block definitions
  block-definition.ts GraphicBlockDefinition interface
  block-registry.ts   GraphicBlockRegistry
  shapes/             Rectangle, triangle, circle
  path/               Freehand path block
  sticker/            Sticker (rich-text sticky note)

layout/               Bottom toolbar, zoom panel, left panel, block tile
properties/           Floating properties window, group properties window,
                      per-property renderers
groups/               Custom-block creation, store, group/lock commands
preferences/          Style memory service, update-preferences command
i18n/                 Typed i18n key constants (keys.ts)
```

## The host-agnostic custom element

`GraphicEditor` is a plain `HTMLElement` subclass (registered as `<idea-graphic-editor>`). It accepts four options on `init()`:

| Option | Type | Purpose |
| ------ | ---- | ------- |
| `document` | `DocumentNode` | The shared document root |
| `eventBus` | `EventBus` | Cross-editor event channel |
| `undoRedoManager` | `UndoRedoManager` | Shared history stack |
| `locale` | `Locale` | `'en'` \| `'uk'` etc. |

It creates an `I18nService`, mounts the canvas renderer, all interaction controllers, the left panel, zoom panel, and property windows — then wires everything together through a `GraphicContext` object:

```ts
export interface GraphicContext {
  document: DocumentNode;
  page: GraphicPageNode;
  undoRedoManager: UndoRedoManager;
  eventBus: EventBus;
  rootElement: HTMLElement;
  i18n: I18nService;
  viewportController: ViewportController;
  registry: GraphicBlockRegistry;
  toolState?: ToolState;
  styleMemory?: StyleMemoryService;
}
```

Passing `GraphicContext` around (not the full `GraphicEditor`) keeps controllers independently testable.

## Hybrid SVG + DOM rendering

The canvas is split into two layers that share the same viewport transform:

- **SVG world** — shapes and paths are `<svg>` elements. They scale and transform cleanly with the viewport.
- **DOM overlay** — selection handles, frame labels, sticker text inputs, property windows, and toolbars are positioned `div`/`button` elements on top of the SVG. DOM is used here because it supports focus, pointer events, scrolling, and accessibility semantics that are cumbersome in SVG.

The `CanvasRenderer` owns the SVG root and calls each block's `render()` method. The `SelectionManager` renders DOM handle overlays. Individual controllers (`DragController`, `ResizeController`, etc.) attach pointer-event listeners to the DOM overlay.

Coordinate conversion between screen space and SVG world space is handled by `ViewportController.screenToWorld()` / `worldToScreen()`.

## Persistence model

The graphic editor persists two things on the shared `DocumentNode`:

### 1. Graphic page (`DocumentNode.children`)

Each child `GraphicPageNode` holds the array of graphic elements (`page.elements`). Every element has:

- `id` — stable nanoid
- `type` — block kind string (e.g. `'rectangle'`, `'path'`)
- `x`, `y`, `width`, `height` — world-space geometry
- `data` — block-specific payload (fill, border, text, etc.)

### 2. Graphic preferences and custom blocks

Stored on `DocumentNode.data`:

```ts
DocumentNode.data.graphicPreferences  // GraphicPreferences — viewport, style defaults
DocumentNode.data.customBlocks        // CustomBlock[]      — user-defined reusable blocks
```

Helpers `getGraphicPreferences()` and `getCustomBlocks()` from `@core/model/document-data` read these fields, creating defaults if absent.

### Active-mode flag

The app shell tracks which editor surface is active (`'text'` | `'graphic'`) in `DocumentNode.meta.activeMode`. The shell reads and writes this flag; the graphic editor itself does not depend on it directly.

```
DocumentNode.meta.activeMode = 'graphic' | 'text'
```

## CRDT readiness

Every mutation in the graphic editor is expressed as a `Command` that:

1. Calls `execute()` — modifies the document and emits `operationRecords`.
2. Calls `undo()` — reverses the mutation and emits inverse `operationRecords`.
3. Pushes `OperationRecord`s into the shared `OperationLog`.

This mirrors exactly the text editor's design. When a collaboration backend is added, the `OperationLog` feed is the integration point. No controller modifies the document directly. See [`g_multi-editing` rule](./../../../.cursor/rules/g_multi-editing.mdc) and [Operation log](../concepts/operation-log.md).
