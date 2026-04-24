---
sidebar_position: 6
---

# Text editor architecture

This page ties together how the **text editor** turns user input into document changes. It complements [Text editor overview](../text-editor/overview.md) with the core pipeline.

## `EditorContext`

`packages/text-editor/src/engine/editor-context.ts` defines the object passed through the engine:

- **`document`** — root `DocumentNode`
- **`selectionManager`** — caret and selection state
- **`undoRedoManager`** — history (see [History and undo](./history-and-undo.md))
- **`eventBus`** — [Events](./events.md)
- **`blockRegistry`** — block type dispatch
- **`rootElement`** — host DOM
- **`i18n`** — strings

Commands and interceptors receive this context so they stay decoupled from global state.

## Input pipeline

1. **`IntentClassifier`** (`intent-classifier.ts`) maps raw `beforeinput`, keydown, and related events to **`EditIntent`** values (insert text, delete, split block, undo, redo, marks, indent, etc.).
2. **`InputInterceptor`** (`input-interceptor.ts`) validates intents against the current selection, then either dispatches to **`UndoRedoManager`** (undo/redo) or builds **`Command`** instances and **`push`**es them.

So: **DOM events → intents → commands → history**.

## Selection

**`SelectionManager`** keeps the authoritative selection and coordinates with the DOM. Other modules query it before constructing commands that depend on caret or range position.

## Reconciliation

The engine maintains a mapping between the document model and DOM nodes so updates stay consistent after commands run. Reconciliation logic lives in **`reconciler.ts`** and related block renderers.

## Shortcuts vs undoable commands

**`ShortcutManager`** (`packages/core/src/shortcuts/shortcut-manager.ts`) registers **key chords** to arbitrary **`command: () => void`** callbacks. Those callbacks might open UI, export JSON, or call into the editor—but they are **not** the same as the **`Command`** interface used for undo.

The in-app **command palette** lists shortcut-driven actions; again, that is **UI**, not the undo stack’s `Command` type. See [Commands](./commands.md) for the distinction.

## See also

- [Commands](./commands.md)
- [Document model](./document-model.md)
