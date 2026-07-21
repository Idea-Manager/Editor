---
sidebar_position: 2
---

# Build and embed

This guide walks through building the IdeaEditor SDK bundle from the monorepo and mounting it in your own HTML or application.

:::warning[Active development]

IdeaEditor is in **active development** (`0.0.x`). For production or customer-facing embeds, use **`mode: 'text'`** only. The **graphic editor is not ready for production use** — `mode: 'graphic'` and `mode: 'both'` are for preview and internal testing until a stable major release.
:::

For a complete list of configuration fields and types, see the [API reference](./api-reference.md). For a live demo, see the [embed-smoke example](https://github.com/Idea-Manager/Editor/tree/master/examples/embed-smoke) in the repository (`examples/embed-smoke/`).

## Prerequisites

- **Node.js** and **npm** installed
- The [IdeaEditor repository](https://github.com/Idea-Manager/Editor) cloned locally

## Step 1 — Install dependencies

From the repository root:

```bash
npm install
```

## Step 2 — Build the library bundle

```bash
npm run build:lib
```

This runs webpack with [webpack/webpack.lib.js](https://github.com/Idea-Manager/Editor/blob/master/webpack/webpack.lib.js) and writes artifacts to `dist/`:

| File | Format | Use |
| ---- | ------ | --- |
| `idea-editor.esm.js` | ESM | **Recommended** — `import` in modern browsers and bundlers |
| `idea-editor.umd.cjs` | UMD | `<script>` tag; exposes global `IdeaEditor` |
| `index.d.ts` | TypeScript | Public type declarations (copied from `src/sdk/public-api.d.ts`) |

Source maps are emitted alongside the JS files.

## Step 3 — Import in your app

### ESM (browser module)

```html
<div id="editor-host"></div>
<script type="module">
  import { createIdeaEditor } from './dist/idea-editor.esm.js';

  createIdeaEditor({
    mode: 'both',
    container: '#editor-host',
    config: { locale: 'en' },
  });
</script>
```

Adjust the import path relative to your page. In the repo example, the path is `../../dist/idea-editor.esm.js` from `examples/embed-smoke/`.

### UMD (script tag)

```html
<div id="editor-host"></div>
<script src="./dist/idea-editor.umd.cjs"></script>
<script>
  IdeaEditor.create({
    mode: 'text',
    container: '#editor-host',
  });
</script>
```

### TypeScript

When consuming from the monorepo, point at the package exports in root `package.json`:

```json
{
  "types": "./dist/index.d.ts"
}
```

Or import types directly:

```ts
import { createIdeaEditor, type IdeaEditorCreateOptions } from 'idea-editor';
```

## Step 4 — Provide a mount container

The editor shell fills its container. **Bounded height is required** for scrolling to work correctly.

### Full view (`view: 'full'`, default)

Give the container a defined height:

```css
#editor-host {
  height: 100vh; /* or a fixed px height, e.g. 420px */
  overflow: hidden;
}
```

The app shell fills `height: 100%` of the host. The text editor scrolls inside `.idea-editor` when content exceeds the available area.

### Inline view (`view: 'inline'`)

Inline mode is a compact, textarea-like shell. **Explicit height is required**:

```css
#inline-host {
  height: 200px;
  max-width: 640px;
}
```

Optional: `overflow: hidden` on the host to clip the bordered shell.

## Step 5 — Call `createIdeaEditor`

Common patterns:

| Pattern | `mode` | `view` | Notes |
| ------- | ------ | ------ | ----- |
| **Text embed (recommended)** | `'text'` | `'full'` or `'inline'` | Production-oriented early embed; text editor only |
| Text-only inline | `'text'` | `'inline'` | Compact shell; set `config.statusBar: true` for a footer |
| Full workspace (preview) | `'both'` | `'full'` (default) | Includes graphic mode — **not stable**; preview only |
| Graphic-only (preview) | `'graphic'` | `'full'` | **Not ready for production** — active development |
| Read-only | `'read-only'` | `'full'` or `'inline'` | Viewing only; editing and import/export disabled |

**Recommended text-only example:**

```js
createIdeaEditor({
  mode: 'text',
  container: '#editor-host',
  config: {
    locale: 'en',
  },
});
```

**Full workspace preview** (graphic editor not production-ready):

```js
createIdeaEditor({
  mode: 'both',
  container: '#editor-host',
  config: {
    locale: 'en',
    chrome: { showImportExport: true },
  },
});
```

**Inline text example:**

```js
createIdeaEditor({
  mode: 'text',
  view: 'inline',
  container: '#inline-host',
  config: {
    statusBar: true,
  },
});
```

## Step 6 — Verify locally

Serve the **repository root** (so both `dist/` and `examples/` are reachable):

```bash
npx serve . -p 4173
```

Open:

```
http://localhost:4173/examples/embed-smoke/
```

You should see full-view and inline-view live examples with a config cheatsheet.

## Step 7 — Lifecycle in your app

`createIdeaEditor` returns an **`IdeaEditorInstance`**. Typical integration:

```js
const editor = createIdeaEditor({
  mode: 'both',
  container: '#editor-host',
  config: {
    onReady: (instance) => {
      console.log('Editor mounted', instance.getElement());
    },
    onChange: (doc) => {
      // Persist doc JSON
    },
    onModeChange: (mode) => {
      console.log('Active mode:', mode);
    },
  },
});

// Later, on page teardown or route change:
editor.destroy();
```

Useful instance methods:

- **`getDocument()` / `setDocument(doc)`** — read or replace the document
- **`getMode()` / `setMode('text' | 'graphic')`** — switch active surface when `mode: 'both'`
- **`getEventBus()`** — subscribe to internal events for custom integrations
- **`exportJSON()` / `importJSON()`** — trigger built-in JSON dialogs (when chrome allows)

See [API reference — IdeaEditorInstance](./api-reference.md).

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| Module not found / blank page | Run `npm run build:lib` to rebuild `dist/` |
| Editor grows with content, no scrollbar | Set explicit **height** on the mount container; scrolling happens inside `.idea-editor` |
| Inline editor appears collapsed | Set **`height`** on the container (e.g. `200px`) |
| Styles missing or unstyled accordions | Do not set `includeDefaultStyles: false` unless you supply equivalent CSS; rebuild with `npm run build:lib` |
| Mode switch shows wrong editor | Ensure you are on a fresh `build:lib` build; see app-shell mode CSS in the SDK bundle |

## Dev app vs embed bundle

| Command | Purpose |
| ------- | ------- |
| `npm run dev` | Webpack dev server with HMR at `/` for monorepo development |
| `npm run build:lib` | Production embed bundle in `dist/` for external pages |

The dev app ([src/dev/main.ts](https://github.com/Idea-Manager/Editor/blob/master/src/dev/main.ts)) mounts via `createIdeaEditor` into `#app`. Optional query params: `?mode=text`, `?mode=graphic`, `?mode=both`, `?mode=read-only`.

## Next steps

- [API reference](./api-reference.md) — every public option, type, and default
- [Text editor overview](../text-editor/overview.md) — text surface capabilities and extension points
- [Graphic editor overview](../graphic-editor/overview.md) — canvas editor capabilities
