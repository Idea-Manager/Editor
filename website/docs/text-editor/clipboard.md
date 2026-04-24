---
sidebar_position: 6
---

# Text editor: clipboard (experimental hooks)

Phase D **v1** exposes a small, optional API on **`TextEditorOptions.clipboard`**. It is marked **experimental**: types and behavior may change; use only when you need paste policy control and can review security implications.

## API summary

Import types from `@text-editor` (or the package entry your app uses):

- **`TextEditorClipboardOptions`**
- **`PasteDataSource`** — `'idea-editor' | 'text/html' | 'text/plain'`
- **`DEFAULT_PASTE_DATA_SOURCES`** — `['idea-editor', 'text/html', 'text/plain']` (same order as before these hooks existed)

| Field | Behavior |
| ----- | -------- |
| **`transformPaste?`** | `(ctx, e) => BlockNode[] \| null`. If it returns a **non-empty** array, that list is pasted and **built-in parsing is skipped** for that event. Return `null` or `[]` to use the default pipeline. Synchronous only. |
| **`pasteDataSources?`** | Ordered list of sources to try until one produces blocks. Defaults to `DEFAULT_PASTE_DATA_SOURCES`. For example, `['text/plain']` pastes from plain text only and **ignores** our internal JSON MIME and `text/html`. |

Hook order: after the editor applies the normal “delete selection if non-collapsed” step, **`transformPaste` runs first**. If it does not supply blocks, the handler resolves content using **`pasteDataSources`**.

## Security expectations

- **Core HTML paste** is parsed with a **fixed allowlist of tags** in `ClipboardHandler` (for example `P`, `B`, `STRONG`, `I`, and similar). That reduces arbitrary HTML, but is **not** a full CSP or sanitization service for untrusted user paste in every deployment.
- If you implement **`transformPaste`**, you are responsible for returning **`BlockNode[]` structures you trust** (same as providing document JSON from a server you trust). Do not return blocks built from unvalidated user HTML without your own normalization.
- To **avoid rich HTML entirely**, set `pasteDataSources: ['text/plain']` so `text/html` and the idea-editor payload are never read for that editor instance.
- If you add **client-side transforms** of arbitrary clipboard HTML, document your own XSS assumptions for end users of your product.

## Custom edits without clipboard hooks

You do not need these hooks to perform undoable document edits. Implement the shared **`Command`** contract and push through **`EditorContext.undoRedoManager`**, as in [Commands](../concepts/commands.md). The engine does not expose a public registry to map **new** keyboard or `beforeinput` intents to commands from options (that would be a higher-risk, separate design). Clipboard hooks address **paste** only in this release.

## Future work

Intent classification (`IntentClassifier`) replacement and pluggable **intent → command** tables are **out of scope** for this revision; they need broader design and fuzzing before stabilization.
