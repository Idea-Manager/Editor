---
sidebar_position: 1
---

# Graphic editor (roadmap)

The **graphic editor** is not implemented in the repository yet. It is planned as the **graphic mode** alongside **text mode**: one workspace, two ways to work, with a path to **import or embed graphic compositions into text documents as frames** so blocks and graphics share the same structured document and **core** abstractions.

## What exists today

- **Document schema** includes examples that separate text-heavy and graphic-heavy documents — see `packages/core/src/schema/examples/` (for example `graphic-only.json`).
- **Operation log** types already include **node-level** operations (`node:insert`, `node:delete`, `node:update`, `node:move`) suitable for structured graphics trees, not only text. See [Operation log](../concepts/operation-log.md).
- **TypeScript path** `@graphic-editor/*` → `packages/graphic-editor/src/*` is **reserved** in `tsconfig.json`; the directory will appear when development starts.

## Planned relationship to core

When the package lands, it should reuse:

- **`Command` / `UndoRedoManager`** — the same undo model as the text editor.
- **`EventBus`** — consistent `doc:*`, `history:*`, and element/frame events where applicable.
- **Serialization and schema version** — load/save through the same JSON document pipeline as in [Document model](../concepts/document-model.md).

## Documentation

This section will gain API and user-facing pages once `packages/graphic-editor` exists. Until then, use [Architecture](../getting-started/architecture.md) and the **Concepts** guides for shared behavior.
