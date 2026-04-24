---
sidebar_position: 3
---

# Operation log

Commands expose **`operationRecords: OperationRecord[]`** so each undoable edit can be described as one or more **logical operations** independent of how the command class stores internal state.

Types live in `packages/core/src/operation-log/interfaces.ts`.

## `OperationRecord`

Each record includes:

- **`id`** — unique id for the operation.
- **`actorId`** — who performed it (for example `'local'` in text commands today).
- **`timestamp`** — **Lamport-style logical clock** for ordering in distributed scenarios.
- **`wallClock`** — `Date.now()`-style time for display only; **not** used for ordering.
- **`type`** — an `OperationType` discriminator.
- **`payload`** — structured data for that type.

## Operation types

**Node operations** (suited to trees of blocks or graphic nodes):

- `node:insert`, `node:delete`, `node:update`, `node:move`

**Text operations** (runs inside blocks):

- `text:insert`, `text:delete`

Payload shapes (`NodeInsertPayload`, `TextInsertPayload`, etc.) carry parent ids, indices, offsets, and snapshots as needed for replay or merge strategies.

## Why granular paths on updates?

`NodeUpdatePayload` includes a **`path`** string (for example `data.fill`) and old/new values. Comments in the source note **granular updates** for CRDT-style merging. The wire format is designed so collaboration features can reason about **field-level** changes rather than replacing whole subtrees—without claiming that full CRDT sync is implemented in every package today.

## Relation to commands

When a command runs `execute()`, it typically **pushes** one or more `OperationRecord`s that describe what happened. On **`merge`**, a command may append **additional** records (as `InsertTextCommand` does) so the log stays consistent with the coalesced undo step.

## See also

- [Commands](./commands.md)
- [Document model](./document-model.md)
