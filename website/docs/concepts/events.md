---
sidebar_position: 4
---

# Events

The editor uses a small **publish–subscribe** bus: **`EventBus`** in `packages/core/src/events/event-bus.ts`.

## `EditorEvent` union

Event names are typed as **`EditorEvent`**. They include:

| Area | Events (examples) |
| ---- | ----------------- |
| Document | `doc:change`, `doc:save` |
| Mode | `mode:change` |
| Selection | `selection:change` |
| Blocks | `block:insert`, `block:delete`, `block:update` |
| Graphics (future) | `element:add`, `element:remove`, `element:update`, `frame:add`, `frame:remove`, `frame:update` |
| History | `history:push`, `history:undo`, `history:redo` |
| Collaboration hooks | `operation:local`, `operation:remote` |
| Tables | `table:range-select-end`, `table:range-ui` |

Handlers receive a **payload** whose shape depends on the event; the type definition is intentionally loose at the boundary (`Handler<T = unknown>`).

## Typical uses

- **UI** — refresh toolbars, dirty indicators, undo/redo buttons when `doc:change` or `history:*` fires.
- **Telemetry or sync** — listen for `operation:local` / `operation:remote` when wiring collaboration (as the architecture evolves).
- **Cross-module coordination** — table UI completion events, selection-driven overlays, etc.

## Access

`EditorContext` exposes **`eventBus`** (`packages/text-editor/src/engine/editor-context.ts`) so engine code and plugins share the same bus instance for a document surface.

## See also

- [History and undo](./history-and-undo.md)
- [Text editor architecture](./text-editor-architecture.md)
