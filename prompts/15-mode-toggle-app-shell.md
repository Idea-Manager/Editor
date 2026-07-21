# Prompt 15 — Top-bar Text/Graphic mode toggle + AppShell wiring

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 14.

## Goal

Wire the standalone Graphic mode into the demo app:

- Add a Text / Graphic segmented control to `src/layout/top-bar.ts`.
- Have `src/layout/app-shell.ts` mount BOTH `TextEditor` and `GraphicEditor`
  and switch which is visible based on the mode.
- Persist the selected mode on `DocumentNode.meta.activeMode` so it survives
  import/export round-trips.
- Re-route the global `ShortcutManager` scope between `'text'` and
  `'graphic'` on toggle.

User decision (from `00-INDEX.md`):

> This work adds a standalone Graphic mode. `top-bar.ts` gains a Text /
> Graphic segmented control. `app-shell.ts` mounts both editors and shows
> the active one. The `GraphicEditor` engine is host-agnostic … A later
> "Frame block" in the text editor will mount the same `GraphicEditor`
> inside a text block — design APIs accordingly.

## Files to change / add

```
src/layout/top-bar.ts
src/layout/top-bar.scss            # extend, do not duplicate
src/layout/app-shell.ts
src/layout/app-shell.scss
src/main.ts                        # mount both editors via AppShell
src/util/active-mode.ts            # tiny helpers around DocumentNode.meta.activeMode
src/util/__tests__/active-mode.test.ts
```

(No graphic-editor package changes are required — its public API was
finalised by prompts 04–14.)

## `ActiveMode` helper

`src/util/active-mode.ts`:

```ts
export type ActiveMode = 'text' | 'graphic';

export function getActiveMode(doc: DocumentNode): ActiveMode {
  const m = (doc.meta as Record<string, unknown> | undefined)?.activeMode;
  return m === 'graphic' ? 'graphic' : 'text';
}

export function setActiveMode(doc: DocumentNode, mode: ActiveMode): void {
  if (!doc.meta) doc.meta = {};
  (doc.meta as Record<string, unknown>).activeMode = mode;
}
```

> `DocumentNode.meta` is already an open record (see prompt 00 ref to the
> schema). Storing the active mode there is additive and survives
> serialization. NEVER store the active mode in `data` — `data` is reserved
> for the document-content extensions (`graphicPreferences`,
> `customBlocks`).

Tests: round-trip via `DocumentSerializer` (already in the core tests
catalogue) keeps `meta.activeMode`.

## Top bar segmented control

Mount the toggle to the LEFT of the existing history group:

```html
<div class="top-bar__group top-bar__mode" role="tablist" aria-label="…">
  <button data-mode="text"   role="tab" aria-selected="true">{i18n('mode.text')}</button>
  <button data-mode="graphic" role="tab">{i18n('mode.graphic')}</button>
</div>
```

Behaviour:

- The currently active button has `is-active` modifier (background
  `$gray-200`, weight 600).
- Click on a tab fires a callback supplied via `TopBarConfig`:

  ```ts
  TopBarConfig {
    …existing fields…;
    onModeChange: (mode: ActiveMode) => void;
    initialMode: ActiveMode;
  }
  ```

- Keyboard accessibility: Left/Right arrow keys cycle the active tab when
  the segmented control has focus.

Update `top-bar.test.ts` (if present; otherwise add one) to verify the
control switches active state and calls `onModeChange`.

## AppShell wiring

`AppShell` (existing `src/layout/app-shell.ts`) currently exposes
`getEditorContainer()`. Rework so it mounts both editors at once:

```ts
class AppShell {
  // …existing fields…
  private textEditor: TextEditor;
  private graphicEditor: GraphicEditor;
  private currentMode: ActiveMode;

  constructor(config: AppShellConfig);

  setMode(mode: ActiveMode): void;     // toggles visibility, focuses canvas, flips shortcut scope
  getCurrentMode(): ActiveMode;
  getDocument(): DocumentNode;
  setDocumentReplaceHook(fn: (doc: DocumentNode) => void): void;
}
```

Internal layout:

```html
<div class="app-shell">
  <!-- top-bar mounted here -->
  <div class="app-shell__editor-area">
    <idea-text-editor    class="app-shell__editor app-shell__editor--text"></idea-text-editor>
    <idea-graphic-editor class="app-shell__editor app-shell__editor--graphic"></idea-graphic-editor>
  </div>
</div>
```

When `setMode('text')`:

- `app-shell__editor--graphic` gets `display: none;`.
- `app-shell__editor--text` becomes visible and focusable.
- `shortcuts.setScope('text')`.
- Persists via `setActiveMode(doc, 'text')` and emits `'mode:change'` on the
  bus (already in the union).

When `setMode('graphic')`:

- Mirror image.
- `shortcuts.setScope('graphic')`. Add `'graphic'` as a valid scope (the
  `ShortcutManager` already treats unknown scopes safely; document this).

Both editors stay MOUNTED (not destroyed) during the session. They share
the same `doc`, `eventBus`, and `undoRedoManager` instances.

`replaceDocument(newDoc)` (from import) calls BOTH editors'
`replaceDocument(newDoc)` so they stay in sync; then re-applies
`setMode(getActiveMode(newDoc))`.

## `main.ts` updates

```ts
import { TextEditor } from '@text-editor/index';
import { GraphicEditor } from '@graphic-editor/index';
import { getActiveMode, setActiveMode } from './util/active-mode';

…

const shell = new AppShell({ doc, eventBus: bus, undoRedoManager: history, i18n });
app.appendChild(shell.element);

shell.setMode(getActiveMode(doc));

// the AppShell constructor wires both editors' init() internally so
// main.ts no longer needs to call editor.init directly.

shortcuts.setScope(shell.getCurrentMode());
```

Move all `editor.init(...)` calls inside `AppShell` constructor (DRY: only
one place wires the editors).

`shell.setDocumentReplaceHook` already exists — extend it to call
`graphicEditor.replaceDocument(newDoc)` AND `textEditor.replaceDocument(newDoc)`,
then `shell.setMode(getActiveMode(newDoc))`.

## Shortcut scope

The text editor already declares its shortcuts under scope `'text'`. The
graphic editor's `init()` (prompt 04) registers any shortcuts it needs
under scope `'graphic'`. Verify each `shortcutManager.registerAll(...)`
call inside `packages/graphic-editor/src/**` uses `scope: 'graphic'`. If
not, fix this here as a small follow-up.

The global Cmd+K palette stays under `'global'` and works in either mode.

## Title bar update

When the document title is edited, store it on `doc.meta.title` (already
the convention). The mode toggle does not need to do anything with the
title.

## Visual style for segmented control

Add to `top-bar.scss`:

- `.top-bar__mode { display: inline-flex; border: 1px solid $color-border; border-radius: 6px; overflow: hidden; }`
- `.top-bar__mode > button { padding: 4px 12px; background: transparent; border: none; color: $color-text-secondary; font-weight: 500; cursor: pointer; }`
- `.top-bar__mode > button.is-active { background: $gray-200; color: $color-text; }`
- `.top-bar__mode > button + button { border-left: 1px solid $color-border; }`

No new tokens needed.

## i18n keys (en + uk)

```
mode.text         Text
mode.graphic      Graphic
mode.toggle.aria  Editor mode
```

## Tests

- `active-mode.test.ts` — round-trip helpers, default to `'text'`.
- `top-bar.mode.test.ts` — tab click fires `onModeChange`, active state
  follows the prop, arrow keys move focus / switch tab.
- `app-shell.mode.test.ts` (new):
  - `setMode('graphic')` hides text, shows graphic, calls
    `shortcuts.setScope('graphic')`, writes to `doc.meta.activeMode`.
  - Importing a document with `meta.activeMode = 'graphic'` mounts in
    graphic mode.
  - Both editors persist between toggles (no destroy/re-init).

## Don'ts

- **Do not** destroy / re-mount the editors on toggle — only toggle
  visibility. This preserves selection, viewport, and ephemeral UI state.
- **Do not** add `'mode:change'` events from `AppShell` if the
  `UndoRedoManager` would treat them as undoable; mode is a UI-only flag,
  not a document content change.
- **Do not** share keyboard event listeners between modes; the
  `ShortcutManager` scope handles that already.

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- `npm run dev`:
  - Top bar shows `Text | Graphic` to the LEFT of undo/redo.
  - Clicking `Graphic` reveals the graphic editor; clicking `Text` returns
    to the text editor; both are preserved.
  - Importing a JSON saved while in Graphic mode reopens in Graphic mode.
  - The graphic mode keyboard shortcuts (V/F/A/P/S, Delete, Esc) work and
    text-mode shortcuts (e.g. Cmd+B for bold) do NOT fire while Graphic is
    active. Cmd+K palette works in both.
