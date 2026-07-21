# Embed smoke test

Interactive cheatsheet and live demos for embedding IdeaEditor via the ESM bundle.

> **Active development:** IdeaEditor is in active development (`0.0.x`). For production embeds, use **`mode: 'text'`** only. The graphic editor is **not ready for production** — the full-view demo (`mode: 'both'`) is for preview only until a stable major version is released.

## Prerequisites

- Node.js and npm installed
- Repository cloned locally

## Run the example

### 1. Build the SDK bundle

From the repo root:

```bash
npm run build:lib
```

This produces `dist/idea-editor.esm.js` and `dist/index.d.ts`.

### 2. Serve the repo root

Static files (including `examples/` and `dist/`) must be served from the repository root:

```bash
npx serve . -p 4173
```

### 3. Open the example

Visit:

```
http://localhost:4173/examples/embed-smoke/
```

Full documentation: [Build and embed](https://github.com/Idea-Manager/Editor/blob/master/website/docs/getting-started/build-and-embed.md) and [API reference](https://github.com/Idea-Manager/Editor/blob/master/website/docs/getting-started/api-reference.md) (or run `npm run docs:dev` locally).

## What you should see

The page includes three sections:

1. **Cheatsheet** — copy-paste snippets for full and inline embed patterns
2. **Live examples** — two mounted editors:
   - **Full view** — `mode: 'both'` (preview only; graphic editor not production-ready), fills a 420px container with top bar and status bar
   - **Inline view** — `mode: 'text'`, `view: 'inline'` (recommended embed pattern), 200px textarea-like box with status bar
3. **Config reference** — short descriptions of all public SDK options

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page or module import error | Run `npm run build:lib` again to rebuild `dist/` |
| Inline editor appears collapsed | Set an explicit height on the container (e.g. `height: 200px`) |

## Optional: dev app with HMR

For local development of the editor itself (not the embed bundle), use:

```bash
npm run dev
```

Then open `http://localhost:3000/` with optional query params:

- `?mode=text`
- `?mode=graphic`
- `?mode=both`
- `?mode=read-only`

This uses the webpack dev server and is separate from the embed smoke test.
