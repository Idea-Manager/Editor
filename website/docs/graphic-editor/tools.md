---
sidebar_position: 4
---

# Tools

The graphic editor has a small set of tools. Exactly one tool is active at a time; switching tools is instant and does not require a mode change.

## Tool state machine

`ToolState` (in `engine/tool-state.ts`) owns the currently active tool name and drives the ghost-placement overlay. It fires events that the interaction controllers subscribe to.

```
idle → placement (ghost visible) → idle   (ESC or pointer-up commits/cancels)
idle → arrow drawing              → idle
idle → pen drawing                → idle
```

### Keyboard shortcuts

| Key | Tool |
| --- | ---- |
| `V` | Selection |
| `F` | Frame |
| `A` | Arrow |
| `P` | Pen |
| `S` | Sticker |
| `Esc` | Return to Selection / cancel placement |

## Selection tool (`V`)

The default tool. With it you can:

- **Click** an element to select it; its handles appear.
- **Drag** an empty area to lasso-select multiple elements.
- **Drag** a selected element to move it (`DragController`).
- **Drag** a corner handle to resize it (`ResizeController`).
- **Hover** an edge arrow handle to start an arrow from that element.
- **Double-click** a text-enabled element to open its inline text editor.

`GraphicSelectionManager` renders and updates the handle overlay. Each handle has an accessible `aria-label` drawn from the `graphic.handle.*` i18n keys.

## Frame tool (`F`)

Press `F` then drag a rectangle to create a named frame (section). Frames can contain other elements — dragging an element into a frame attaches it; dragging it out detaches it. Frame names are editable inline. Frames are rendered by `FrameRenderer` and managed by `FrameController`.

## Arrow tool (`A`)

Press `A`, then:

1. Click the canvas to place a free-floating arrow, **or**
2. Click an edge handle of an existing element to anchor the start point.

After placing the first point, drag or click a second point to complete the arrow. Clicking a second element anchors the end point. The **FlyoutArrowToolbar** (`toolbar/flyout-arrow-toolbar.ts`) appears while the arrow tool is active, letting you set heading, direction, type, color, and thickness before or after drawing.

Arrow connections stay linked when elements are moved (`UpdateArrowEndpointCommand`).

## Pen tool (`P`)

Press `P` then drag to draw a freehand stroke. Releasing the pointer commits the path as a `path` block. `PenController` accumulates pointer positions during the drag; `smooth-points.ts` smooths the polyline on commit.

A hint banner appears while the pen tool is active: `graphic.tool.pen.hint`.

## Sticker tool (`S`)

Press `S` then click anywhere on the canvas to place a `sticker` block at that position. The sticker immediately enters text-editing mode so you can type your note.

## Ghost placement

When you pick a block tile from the left panel, `ToolState.beginPlacement(type)` is called. A ghost outline follows the pointer across the canvas. Clicking commits the element at that world position (`AddElementCommand` or `AddArrowCommand` or `AddPathCommand`). Pressing `Esc` cancels the placement.

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
| `ArrowController` | Arrow drawing, endpoint anchoring |
| `ArrowLabelEditor` | Inline label editing on arrow blocks |

All controllers receive `GraphicContext` and share the same event bus. See [Architecture](./architecture.md).
