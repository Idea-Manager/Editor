---
sidebar_position: 1
---

# Text editor overview

The text editor is a **custom block editor** built in TypeScript. It keeps structured content in a JSON document, maps it to the DOM, and routes user input through a small pipeline that produces **commands** for undoable edits.

:::info[Active development]

IdeaEditor is in **active development** (`0.0.x`). The text editor is the **recommended embed surface** today, but APIs and behavior may still change before the first stable major release. The **graphic editor is not production-ready** — use `mode: 'text'` unless you are previewing the workspace internally.
:::

## Capabilities (high level)

- **Blocks** — paragraphs, headings, lists, tables, embeds, and related block types registered in the block registry.
- **Inline marks** — formatting such as bold, links, and color, applied on text runs inside blocks.
- **Toolbar and palettes** — floating toolbar, slash command palette, block gutter, table UI.
- **Clipboard** — copy/cut/paste; optional **experimental** paste hooks. See [Clipboard](./clipboard.md).
- **Internationalization** — strings and locale data from `@core/i18n`; per-editor overrides via **`TextEditorOptions.i18nOverrides`**. See [i18n](./i18n.md).
- **Theming** — bundled editor CSS and optional **`extraStyleText`** on the host; see [Theming](./theming.md).

## Using via the SDK

In most integrations you do not mount `<idea-text-editor>` directly. Use the public SDK:

```js
import { createIdeaEditor } from './dist/idea-editor.esm.js';

createIdeaEditor({
  mode: 'text',           // recommended for embeds; avoid 'both' / 'graphic' in production
  view: 'inline',         // or 'full' (default)
  container: '#editor-host',
  config: {
    text: {
      locale: 'en',
      readOnly: false,
    },
  },
});
```

- [Build and embed](../getting-started/build-and-embed.md) — step-by-step build, import, and mount
- [API reference — TextEditorOptions](../getting-started/api-reference.md#texteditoroptions) — every `config.text` field

For monorepo development without the embed bundle, the dev app uses the same API via [src/dev/main.ts](https://github.com/Idea-Manager/Editor/blob/master/src/dev/main.ts) (`npm run dev`).

## Layout and scrolling

The text editor host (`.idea-editor`) is the **scroll container** when content exceeds the available height:

- `overflow-y: auto` and `min-height: 0` on `.idea-editor` keep scrolling inside the editor rather than expanding the page.
- The **mount container must have a bounded height** in embed scenarios (e.g. `height: 420px`, `height: 100vh`, or inline `height: 200px`).
- **Caret scroll-into-view** runs after document renders and on native selection changes, so Enter, arrow keys, and paste keep the cursor visible within the scrollport.

When using `createIdeaEditor`, the app shell (`#idea-editor-shell-styles`) and text editor styles (`#idea-editor-styles`) are injected automatically on first mount. See [Theming](./theming.md).

## Where the code lives

| Area | Location |
| ---- | -------- |
| Custom element entry, editor wiring | `packages/text-editor/src/engine/text-editor.ts` |
| Caret scroll-into-view | `packages/text-editor/src/engine/scroll-caret-into-view.ts` |
| Context passed through the engine | `packages/text-editor/src/engine/editor-context.ts` |
| Keyboard and input → intents | `packages/text-editor/src/engine/intent-classifier.ts`, `input-interceptor.ts` |
| Selection | `packages/text-editor/src/engine/selection-manager.ts` |
| Undoable edits | `packages/text-editor/src/engine/commands/*.ts`, `packages/text-editor/src/inline/*` |
| Block definitions | `packages/text-editor/src/blocks/*.ts` |
| Toolbars and menus | `packages/text-editor/src/toolbar/*.ts` |

## Extending the editor

1. **New block types** — implement a `BlockDefinition` and pass it in **`TextEditorOptions.blocks`** (or register on a `BlockRegistry` you build yourself). See [Custom blocks](./custom-blocks.md) and the built-in block files under `packages/text-editor/src/blocks/`. A copy-paste sketch and steps live in the repo at **`examples/custom-blocks`**.

2. **Toolbars and menus** — use **`TextEditorOptions.toolbars`** for slash palette, floating toolbar, gutter, table menu, and link hover (config and optional factories). See [Toolbars](./toolbars.md) and [API reference](../getting-started/api-reference.md).
3. **i18n for extensions** — add **`TextEditorOptions.i18nOverrides`** (or `mergeDictionaries` from `@core`) for custom `labelKey` / `titleKey` values not present in the core locale files. See [i18n](./i18n.md).
4. **Styles** — set **`includeDefaultStyles: false`** to skip the global bundle, and/or pass **`extraStyleText`** for per-instance CSS. See [Theming](./theming.md).
5. **Clipboard (advanced)** — optional **`TextEditorOptions.clipboard`** for paste transform and plain-only policies. **Experimental;** see [Clipboard](./clipboard.md) for security notes.
6. **New edits** — implement the [`Command`](https://github.com/Idea-Manager/Editor/blob/master/packages/core/src/commands/command.ts) interface (execute, undo, optional merge, `operationRecords`), then push instances through `EditorContext.undoRedoManager`.
7. **UI reactions** — subscribe to the shared **event bus** (`EditorContext.eventBus`) for document and history events.

See [Custom blocks](./custom-blocks.md), [Toolbars](./toolbars.md), [i18n](./i18n.md), [Theming](./theming.md), [Clipboard](./clipboard.md), [Text editor architecture](../concepts/text-editor-architecture.md), and [Commands](../concepts/commands.md) for the full pattern.

## Relationship to the graphic editor

Both surfaces are designed to operate on the same **document model** and **core** primitives. In a future stable release, `createIdeaEditor({ mode: 'both' })` will let users switch between text and graphic mode in one shell.

:::warning[Graphic editor not ready]

The graphic editor is **under active development** and **not ready for production use**. Features, UX, and APIs change frequently; [Graphic editor](../graphic-editor/overview.md) documentation may lag behind the code. **Wait for a stable major version** before building on `mode: 'graphic'` or `mode: 'both'`.
:::
