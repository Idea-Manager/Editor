---
sidebar_position: 1
---

# Commands

In IdeaEditor, a **command** is an object that applies an **undoable** change to the document (or related state). This is **not** the same as the application **command palette** (`src/layout/command-palette.ts`), which is UI for running actions. The pattern discussed here is the core **`Command`** interface used with **undo/redo**.

## The `Command` interface

Defined in `packages/core/src/commands/command.ts`:

- **`execute()`** — apply the change forward.
- **`undo()`** — reverse the change.
- **`operationRecords`** — an array of [`OperationRecord`](./operation-log.md) values describing the logical operations for logging or future collaboration.
- **`merge?(next: Command): boolean`** (optional) — if the next command can be **coalesced** into this one, return `true` and absorb its effect; otherwise return `false`.

`UndoRedoManager` calls `execute()` when a command is **pushed** (unless the previous command’s `merge` absorbs it). `undo()` / `redo()` call `undo()` / `execute()` on the relevant stack entries.

## Composite commands

**`CompositeCommand`** (`packages/core/src/commands/composite-command.ts`) runs a list of commands in order on `execute()` and reverses them in reverse order on `undo()`. Its `operationRecords` is the concatenation of all child commands.

**`batchCommands`** (`packages/core/src/commands/helpers.ts`) is a small helper that wraps an array in a `CompositeCommand`.

Use this when a single user gesture must commit several atomic commands as **one** undo step.

## Text editor commands

Concrete commands live mainly in:

- `packages/text-editor/src/engine/commands/` — block and table operations, paste, insert text, split block, alignment, etc.
- `packages/text-editor/src/inline/` — mark and link toggles, text color, etc.

The usual flow: build a command with the current document and selection, then `undoRedoManager.push(cmd)`.

## Coalescing with `merge`

`UndoRedoManager.push` checks the **top** of the undo stack. If `prev.merge(next)` returns `true`, the new command is **not** pushed as its own entry; the previous command has already incorporated its effect (and typically appended to `operationRecords`).

Example: **`InsertTextCommand`** (`packages/text-editor/src/engine/commands/insert-text-command.ts`) merges another `InsertTextCommand` when:

- it targets the same block,
- the next insert continues at the end of the merged text (caret moved forward),
- and the time gap is within one second.

That turns rapid typing into a **single** undo step while still emitting granular operation records for each absorbed keystroke batch.

Tests that exercise merge behavior include `packages/core/src/history/__tests__/undo-redo-manager.test.ts` and `packages/text-editor/src/__tests__/input-commands.test.ts`.

## See also

- [History and undo](./history-and-undo.md)
- [Operation log](./operation-log.md)
- [Text editor architecture](./text-editor-architecture.md)
