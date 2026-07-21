# Prompt 16 — Docs + i18n audit + smoke tests

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 15 (and effectively all prior prompts).

## Goal

The graphic editor is feature-complete. This prompt:

1. Rewrites the docs site under `website/docs/graphic-editor/` to reflect
   the implemented state (it currently only has a stub `roadmap.md`).
2. Audits every `graphic.*` i18n key referenced in the codebase against
   `packages/core/src/i18n/locales/{en,uk}.ts`. Adds missing translations,
   removes orphans.
3. Adds a tiny end-to-end smoke test that exercises the full flow.
4. Updates `Graphic_Editor_Roadmap.md` with a "Status: ✅ shipped" header
   and a link to the docs (NEVER delete the file — it's the historical
   spec).

## Tasks

### 1. Documentation pages

Add (or rewrite) under `website/docs/graphic-editor/`:

```
overview.md
architecture.md
blocks.md
tools.md
custom-blocks.md
properties.md
keyboard-and-mouse.md
extensibility.md
i18n.md
roadmap.md             # update existing stub
```

Cross-reference the existing `concepts/document-model.md`,
`concepts/commands.md`, `concepts/operation-log.md`,
`concepts/events.md`, `concepts/history-and-undo.md` rather than
duplicating their content.

Required content per page:

- **overview.md**: high-level intro, what the editor is, what it isn't,
  screenshot, supported workflows. Keep it ≤ 200 lines.
- **architecture.md**:
  - Package layout: `packages/graphic-editor/src/`.
  - The host-agnostic `GraphicEditor` element, `GraphicContext`, viewport
    controller, canvas-renderer (SVG world + DOM overlay).
  - Hybrid SVG + DOM rendering rationale.
  - Persistence model: `DocumentNode.data.graphicPreferences`,
    `DocumentNode.data.customBlocks`. Diagram of where mode flag lives
    (`meta.activeMode`).
  - CRDT readiness: every mutation goes through `Command` →
    `OperationRecord`s → `OperationLog`. Reference `g_multi-editing.mdc`.
- **blocks.md**: `GraphicBlockDefinition` shape; built-ins (rectangle,
  triangle, circle, ellipse, sticker, arrow, path, custom). Worked example
  of a third-party block.
- **tools.md**: tool state machine, ghost placement, frame tool semantics,
  pen tool freehand, arrow tool + FlyoutArrowToolbar, sticker tool,
  selection tool & handles.
- **custom-blocks.md**: how a user creates one (the group window flow);
  how the snapshot is stored; that text/form values aren't saved; future
  ideas (e.g. nesting, sharing).
- **properties.md**: property kinds, the `path`-based update flow, style
  memory rules, non-persistable paths. Reference `commands.md`.
- **keyboard-and-mouse.md**: complete shortcut table (V/F/A/P/S/Esc/
  Delete/Backspace, Cmd+Z/Y), mouse interactions (wheel zoom, middle-pan,
  Space-pan, drag-to-resize, drag-to-move, edge-arrow-handles).
- **extensibility.md**: where to plug in new block kinds, how to subclass
  `GraphicBlockDefinition`, how to register at runtime, where the
  graphic editor refuses to import from `src/` (the import-guard rule),
  CRDT-friendly patterns to follow.
- **i18n.md**: all `graphic.*` keys grouped by namespace; how to add a
  locale; where `en.ts` / `uk.ts` live.
- **roadmap.md**: short summary + links to the original
  `Graphic_Editor_Roadmap.md` (use a relative GitHub link or copy the
  file into the docs).

Style: use the existing docs voice; second-person ("you"); short
paragraphs; small code snippets only (do not paste massive bodies — link
to source when long).

If the docs site uses Docusaurus / VitePress / etc., update its sidebar
config to include the new pages. Find the config file in `website/`
(likely `sidebars.ts` or `config.ts`) and add a new section.

### 2. i18n audit

Build a small script `scripts/check-graphic-i18n.mjs` that:

- Greps the codebase for `i18n.t('graphic.<key>')` style calls (use
  `rg -n "i18n\.t\(\s*'graphic\.[^']+'"` etc.).
- Loads `packages/core/src/i18n/locales/en.ts` and `uk.ts` and compares.
- Errors when:
  - A key referenced in code is missing from `en.ts` or `uk.ts`.
  - A `graphic.*` key in `en.ts` is unused anywhere (orphan).
- Add `npm run check:graphic-i18n` and wire it into `pretest` (or the same
  pretest hook as the import-guard).

Also: add an explicit unit test
`packages/core/src/i18n/__tests__/graphic-locales.test.ts` that:

- Confirms en and uk locales have the SAME set of keys under the
  `graphic.*` namespace.
- Fails on a known set of canonical keys (one per namespace area:
  `graphic.tool.selection`, `graphic.block.rectangle`, `graphic.props.border`,
  `graphic.group.title`, `graphic.zoom.label`, `graphic.arrow.heading`,
  `graphic.frame.defaultName`).

### 3. End-to-end smoke test

Add `packages/graphic-editor/src/__tests__/e2e.test.ts` (jsdom):

- Mount `GraphicEditor` against a fresh `createDocument()` doc + bus +
  history.
- Trigger `toolState.beginPlacement('rectangle')` and dispatch a
  pointerdown over a known canvas point → expect one element with the
  expected world coords.
- Push an `UpdateElementCommand` to change `data.border.thickness` to 4 →
  expect the rendered `<rect>` `stroke-width` attribute to update.
- Open `FloatingPropertiesWindow` → expect `selection:change` causes its
  body to render the rectangle's properties.
- `undoRedoManager.undo()` x 2 → expect the document and renderer to
  return to empty.
- Switch to `'graphic'` mode in `AppShell`, then back to `'text'`, then
  back to `'graphic'` → element count and selection state must persist.

This is a sanity test — keep it ≤ 200 lines and resilient to small DOM
changes.

### 4. Roadmap file update

Edit `Graphic_Editor_Roadmap.md`:

- Insert a new top section ABOVE the existing content:

  ```md
  > Status: ✅ Shipped. See `website/docs/graphic-editor/` for the live docs.
  > This document is preserved as the original specification.
  ```

- Do not edit anything below; keep the original prose intact.

### 5. README mention (optional)

If `README.md` mentions only the text editor, add a paragraph about the
graphic editor and how to enter Graphic mode. Otherwise skip.

### 6. CHANGELOG (if the project keeps one)

If `CHANGELOG.md` exists, add a `## Unreleased — Graphic editor` section
with a short bullet list. If not, skip.

## i18n keys cleanup

By the end of this prompt, the following i18n key namespaces MUST exist in
both `en.ts` and `uk.ts`:

```
graphic.page.*
graphic.zoom.*
graphic.viewport.*
graphic.tool.*
graphic.block.*
graphic.props.*
graphic.group.*
graphic.arrow.*
graphic.frame.*
graphic.handle.*
graphic.placement.*
mode.*
```

Run `npm run check:graphic-i18n` and ensure 0 missing / 0 orphan. Manually
proof-read the Ukrainian translations.

## Tests / scripts to run at the end

- `npm test` — green
- `npm run check:text-editor-imports` — green
- `npm run check:graphic-editor-imports` — green
- `npm run check:graphic-i18n` — green
- `npm run build` — green
- `npm run docs:dev` — boots without errors, the new pages are in the
  sidebar

## Don'ts

- **Do not** delete the original `Graphic_Editor_Roadmap.md`.
- **Do not** add screenshots that aren't actually in the repo. If a docs
  page references an image, place it under `website/static/img/graphic/`
  with a real PNG. If you don't have one, just describe the behaviour
  textually.
- **Do not** introduce new English-only strings. Every `i18n.t` call has
  parallel uk translation.

## Acceptance criteria

- All listed scripts green.
- Docs site shows a populated `graphic-editor/` section with the listed
  pages.
- Roadmap file has the "Shipped" banner.
- A fresh contributor can read `overview.md` → `architecture.md` →
  `extensibility.md` and understand how to register a new block kind
  without reading any code beyond what the docs link to.
