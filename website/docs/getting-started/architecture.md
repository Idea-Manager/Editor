---
slug: /architecture
sidebar_position: 4
---

# Architecture (overview)

IdeaEditor is a **TypeScript monorepo** in **active development** (`0.0.x`). Path aliases are defined in the root `tsconfig.json`.

:::info[Development status]

- **`packages/text-editor`** — primary embed target today; still evolving before a stable major release.
- **`packages/graphic-editor`** — **not production-ready**; APIs and UX change frequently. Treat graphic-editor docs as preview material.
:::

## Packages (what exists today)

Under `packages/` the workspace includes **`core`**, **`text-editor`**, and **`graphic-editor`**.

| Alias | Path | Role |
| ----- | ---- | ---- |
| `@core/*` | `packages/core/src/*` | Shared editor primitives: commands, history, events, document schema, serialization, i18n, shortcuts |
| `@text-editor/*` | `packages/text-editor/src/*` | Block text editor: engine, blocks, toolbar, inline marks |
| `@graphic-editor/*` | `packages/graphic-editor/src/*` | Canvas graphic editor (**in active development — not production-ready**) |
| `@shared/*` | `shared/*` | Cross-package UI components (accordion, modal, color picker, etc.) |

Top-level folders such as `src/` (app shell and SDK), `webpack/`, and `examples/` wire the packages into a runnable application and embed bundle. They are part of the same TypeScript project as configured in `tsconfig.json`.

## SDK bundle (`dist/`)

The public embed API lives in [src/sdk/index.ts](https://github.com/Idea-Manager/Editor/blob/master/src/sdk/index.ts). Build it with:

```bash
npm run build:lib
```

Webpack ([webpack/webpack.lib.js](https://github.com/Idea-Manager/Editor/blob/master/webpack/webpack.lib.js)) produces:

| Output | Purpose |
| ------ | ------- |
| `dist/idea-editor.esm.js` | ESM bundle for `import { createIdeaEditor } from '...'` |
| `dist/idea-editor.umd.cjs` | UMD bundle for `<script>` tags |
| `dist/index.d.ts` | Public TypeScript declarations |

See [Build and embed](./build-and-embed.md) and [API reference](./api-reference.md).

## Reserved paths in `tsconfig.json`

These aliases are declared but **have no `packages/...` directory yet**:

- **`@ui/*`** → `packages/ui/src/*` — reserved for shared UI components.

## Documentation site

The docs live in `website/` and are built with [Docusaurus](https://docusaurus.io/). They are **not** part of the main webpack application bundle.

## Deeper reading

Conceptual details (command pattern, undo stacks, operation records, events) are in the [Concepts](../concepts/commands.md) section rather than on this page.
