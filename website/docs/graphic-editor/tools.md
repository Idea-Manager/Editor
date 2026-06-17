---
sidebar_position: 4
---

# Tools

The graphic editor has a small set of tools. Exactly one tool is active at a time; switching tools is instant and does not require a mode change.

## Tool state machine

`ToolState` (in `engine/tool-state.ts`) owns the currently active tool name and drives the ghost-placement overlay. It fires events that the interaction controllers subscribe to.

```
idle → placement (ghost visible) → idle   (ESC or pointer-up commits/cancels)
idle → pen drawing                → idle
```

### Keyboard shortcuts

| Key | Tool |
| --- | ---- |
| `V` | Selection |
| `F` | Frame |
| `P` | Pen |
| `S` | Sticker |
| `H` | Hand (pan) |
| `Esc` | Return to Selection / cancel placement |

## Selection tool (`V`)

The default tool. With it you can:

- **Click** an element to select it; its handles appear.
- **Drag** an empty area to lasso-select multiple elements.
- **Drag** a selected element to move it (`DragController`).
- **Drag** a corner handle to resize it (`ResizeController`).
- **Double-click** a text-enabled element to open its inline text editor.

`GraphicSelectionManager` renders and updates the handle overlay. Each handle has an accessible `aria-label` drawn from the `graphic.handle.*` i18n keys.

## Frame tool (`F`)

Press `F` then drag a rectangle to create a named frame (section). Frames can contain other elements — dragging an element into a frame attaches it; dragging it out detaches it. Frame names are editable inline. Frames are rendered by `FrameRenderer` and managed by `FrameController`.

## Pen tool (`P`)

Press `P` then drag to draw a freehand stroke. Releasing the pointer commits the path as a `path` block. `PenController` accumulates pointer positions during the drag; `smooth-points.ts` smooths the polyline on commit.

A hint banner appears while the pen tool is active: `graphic.tool.pen.hint`.

## Sticker tool (`S`)

Press `S` then click anywhere on the canvas to place a `sticker` block at that position. The sticker immediately enters text-editing mode so you can type your note.

## Hand tool (`H`)

Press `H` then drag with the primary button to pan the canvas. Middle-button drag and `Space`+drag also pan from any tool.

## Ghost placement

When you pick a block tile from the left panel, `ToolState.beginPlacement(type)` is called. A ghost outline follows the pointer across the canvas. Clicking commits the element at that world position (`AddElementCommand` or `AddPathCommand`). Pressing `Esc` cancels the placement.

A placement-cancel hint is shown while a ghost is active: `graphic.placement.cancel`.

## Controllers

Each tool behaviour is split into a dedicated controller class:

| Controller | Responsibility |
| ---------- | -------------- |
| `DragController` | Moving selected elements |
| `ResizeController` | Resizing via corner handles |
| `LassoController` | Rubber-band multi-select |
| `PlacementController` | Ghost + click-to-place flow |
| `FrameController` | Frame creation and attachment |
| `PenController` | Freehand path recording |

All controllers receive `GraphicContext` and share the same event bus. See [Architecture](./architecture.md).
