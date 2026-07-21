---
slug: /intro
sidebar_position: 1
---

# IdeaEditor

IdeaEditor is a **single workspace** that merges a **block-based text editor** and a **graphic editor**, organized around two modes so you can switch focus without leaving the project. Both surfaces share the same **document model** and **core** primitives (commands, undo/redo, events).

:::warning[Active development — not a stable release]

IdeaEditor is in **active development** (`0.0.x`). APIs, bundled CSS, and behavior **may change without notice** until the first **stable major version** is published.

- **Text editor** — the primary surface for early integrations and embed experiments. Expect iteration, but this is the recommended starting point today.
- **Graphic editor** — **not ready for production use**. It is under heavy development; features, UX, and APIs change frequently. Documentation in the **Graphic editor** section describes work in progress and **may be outdated** relative to the code.

**For production embeds, use `mode: 'text'`** and wait for a stable major release before relying on the graphic editor or `mode: 'both'`. See [Build and embed](./build-and-embed.md).
:::

You can embed the text editor (or the full workspace for preview) in your own app via the **`createIdeaEditor` SDK**. See [Build and embed](./build-and-embed.md).

## Repository

**Source:** [Idea-Manager/Editor on GitHub](https://github.com/Idea-Manager/Editor)

## Editors

| Surface | Status | Documentation |
| -------- | ------ | --------------- |
| **Text editor** | In active development — suitable for early embeds | [Text editor overview](../text-editor/overview.md) |
| **Graphic editor** | In active development — **not ready to use** in production | [Graphic editor overview](../graphic-editor/overview.md) (preview docs) |

## Concepts

Cross-cutting design (commands, undo/redo, operation log, events, document JSON) lives under **Concepts** in the sidebar. Start with [Commands](../concepts/commands.md) and [History and undo](../concepts/history-and-undo.md) if you are extending editing behavior.

## Next steps

- [Build and embed](./build-and-embed.md) — build `dist/`, import the bundle, mount in your page
- [API reference](./api-reference.md) — every public option, type, and default
- [Architecture](./architecture.md) — monorepo layout and SDK bundle
- [Contributing](../project/contributing.md) — how to participate; full guide in the repo root
- [License](../project/license.md) — MIT
