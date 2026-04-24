---
sidebar_position: 2
---

# History and undo

Undo and redo are implemented in **`UndoRedoManager`** (`packages/core/src/history/undo-redo-manager.ts`). Every text-editor change that should be reversible should go through this type, via [`Command`](./commands.md) instances.

## Stacks

The manager keeps two stacks:

- **Undo stack** — commands that have been applied; popping runs `undo()`.
- **Redo stack** — commands that were undone; popping runs `execute()` again.

Properties **`canUndo`** / **`canRedo`** reflect whether each stack is non-empty.

## `push(cmd)`

When you push a command:

1. The manager compares `cmd` with the **previous** top of the undo stack.
2. If `prev.merge?.(cmd)` returns `true`, the new command is **absorbed** by `prev`. **`execute()` is not called again** on `cmd` in that case — the merge implementation is responsible for applying the combined effect (see `InsertTextCommand.merge`).
3. Otherwise, **`cmd.execute()`** runs, then `cmd` is pushed onto the undo stack.
4. The **redo stack is cleared**. Any new edit after an undo invalidates the redo history.

After each push, undo, or redo, the manager emits events on the **event bus** (see [Events](./events.md)).

## `undo()` and `redo()`

- **`undo()`** — pop from the undo stack, call `undo()` on that command, push it onto the redo stack.
- **`redo()`** — pop from the redo stack, call `execute()` on that command, push it back onto the undo stack.

## Input path

Keyboard shortcuts for undo/redo are classified as intents and dispatched in **`InputInterceptor`** (`packages/text-editor/src/engine/input-interceptor.ts`), which calls `this.ctx.undoRedoManager.undo()` or `redo()` directly for those intents.

## UI integration

Chrome such as the top bar can listen for **`history:push`**, **`history:undo`**, and **`history:redo`** to enable or disable buttons and reflect dirty state. Example: `src/layout/top-bar.ts` subscribes to these events alongside `doc:change`.

## See also

- [Commands](./commands.md) — `merge` and `CompositeCommand`
- [Events](./events.md) — `EditorEvent` names
