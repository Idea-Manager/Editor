---
sidebar_position: 10
---

# Roadmap

The graphic editor is **shipped**. The pages in this section document the implemented state.

## What is implemented

- **Canvas** — hybrid SVG + DOM surface with pan and zoom.
- **Built-in blocks** — rectangle, triangle, circle, sticker (rich text), freehand path.
- **Tools** — selection, frame, pen, sticker, hand; ghost placement from left panel.
- **Interaction** — drag to move, drag handles to resize, lasso multi-select, Space-pan, scroll-zoom.
- **Frames** — named sections; elements attach and detach when dragged in/out.
- **Properties** — floating properties window per element; group properties window for multi-select.
- **Custom blocks** — save a group as a reusable template; place copies from the left panel.
- **Style memory** — last-used style values are remembered per block kind.
- **Undo / redo** — all mutations go through the shared `UndoRedoManager`.
- **i18n** — English and Ukrainian; see [i18n](./i18n.md).
- **CRDT readiness** — every mutation produces `OperationRecord`s; see [Architecture](./architecture.md#crdt-readiness).

## Original specification

The original design document is preserved at [`Graphic_Editor_Roadmap.md`](https://github.com/Idea-Manager/Editor/blob/master/Graphic_Editor_Roadmap.md) in the repository root.

## Planned / future work

- Real-time collaboration via a CRDT backend (out of scope for this repo).
- Nested custom blocks and parameterised templates.
- Sharing / exporting custom-block libraries.
- Additional block kinds (tables, images, embed blocks on canvas).
- Accessibility audit and full keyboard navigation for handles.
