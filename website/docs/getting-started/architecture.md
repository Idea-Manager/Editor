---
slug: /architecture
sidebar_position: 2
---

# Architecture (overview)

IdeaEditor is a **TypeScript monorepo**. Path aliases are defined in the root `tsconfig.json`.

## Packages (what exists today)

Under `packages/` today there are only **`core`** and **`text-editor`**.

| Alias | Path | Role |
| ----- | ---- | ---- |
| `@core/*` | `packages/core/src/*` | Shared editor primitives: commands, history, events, document schema, serialization, i18n, shortcuts |
| `@text-editor/*` | `packages/text-editor/src/*` | Block text editor: engine, blocks, toolbar, inline marks |
| `@shared/*` | `shared/*` | Cross-package utilities |

Top-level folders such as `src/` (app shell), `apps/`, and `webpack/` wire the packages into a runnable application. They are part of the same TypeScript project as configured in `tsconfig.json`.

## Reserved paths in `tsconfig.json`

These aliases are declared but **have no `packages/...` directory yet**:

- **`@graphic-editor/*`** → `packages/graphic-editor/src/*` — upcoming graphic surface. See [Graphic editor roadmap](../graphic-editor/roadmap.md).
- **`@ui/*`** → `packages/ui/src/*` — reserved for shared UI components.

## Documentation site

The docs live in `website/` and are built with [Docusaurus](https://docusaurus.io/). They are **not** part of the main webpack application bundle.

## Deeper reading

Conceptual details (command pattern, undo stacks, operation records, events) are in the [Concepts](../concepts/commands.md) section rather than on this page.
