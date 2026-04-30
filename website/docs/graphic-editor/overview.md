---
sidebar_position: 1
---

# Graphic editor overview

The graphic editor is a **canvas-based drawing surface** built in TypeScript as a Web Component. It lets you create diagrams and illustrations using a familiar drag-and-drop interface — shapes, arrows, freehand paths, sticky notes, and reusable custom blocks — all stored in the shared document model alongside text content.

## What it is

- A host-agnostic custom element `<idea-graphic-editor>` you wire up with a document, an event bus, and an undo/redo manager.
- A **hybrid SVG + DOM** renderer: shapes live in an SVG world layer; interactive overlays (selection handles, property windows, toolbars) are DOM elements layered on top.
- A **command-based** editing engine: every mutation goes through a `Command`, producing `OperationRecord`s that feed the shared `OperationLog` and enable undo/redo.
- An **i18n-aware** surface: all visible strings go through `I18nService`. See [i18n](./i18n.md).

## What it is not

- Not a pixel editor or raster graphics tool.
- Not a real-time collaboration backend — but the architecture is CRDT-ready. See [Architecture](./architecture.md#crdt-readiness).
- Not a standalone npm package yet; it lives in `packages/graphic-editor` and is imported by the app shell.

## Supported workflows

| Workflow | How |
| -------- | --- |
| Draw shapes | Select a shape from the left panel, click to place; or use keyboard shortcut `V` then pick a block tile |
| Connect elements with arrows | Press `A` or pick the arrow tool; drag from an edge handle of an existing element to another |
| Freehand drawing | Press `P` or pick the pen tool; drag to draw a stroke |
| Sticky notes | Press `S` or pick the sticker tool; click to place |
| Frames / sections | Press `F` or pick the frame tool; drag to define a named region |
| Select & edit | Click an element to select; drag handles to resize; double-click text-enabled blocks to edit inline |
| Lasso select | Click on empty canvas and drag to lasso-select multiple elements |
| Create custom blocks | Select ≥ 1 elements → Group Properties window → name and save |
| Pan the canvas | Middle-button drag, or hold `Space` and drag |
| Zoom | Scroll wheel, or use the zoom panel in the bottom bar |

## Where the code lives

| Area | Path |
| ---- | ---- |
| Custom element | `packages/graphic-editor/src/engine/graphic-editor.ts` |
| Shared context type | `packages/graphic-editor/src/engine/graphic-context.ts` |
| Block definitions | `packages/graphic-editor/src/blocks/` |
| Interaction controllers | `packages/graphic-editor/src/engine/` |
| Commands | `packages/graphic-editor/src/engine/commands/` |
| Layout components | `packages/graphic-editor/src/layout/` |
| Property windows | `packages/graphic-editor/src/properties/` |
| Group / custom-block logic | `packages/graphic-editor/src/groups/` |

## Related pages

- [Architecture](./architecture.md) — internals, rendering pipeline, persistence
- [Blocks](./blocks.md) — built-in block kinds and how to add your own
- [Tools](./tools.md) — tool state machine and each tool's behaviour
- [Keyboard and mouse](./keyboard-and-mouse.md) — full shortcut reference
- [Extensibility](./extensibility.md) — how to register new block kinds at runtime
- [Concepts / Commands](../concepts/commands.md) — the command pattern used throughout
- [Concepts / Document model](../concepts/document-model.md) — how the document is structured
