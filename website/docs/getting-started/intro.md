---
slug: /intro
sidebar_position: 1
---

# IdeaEditor

IdeaEditor is a **single workspace** that merges the strengths of a **block-based text editor** and a **graphic editor**. The experience is organized around **two modes**—one for writing and structuring prose, one for creating and editing visuals—so you can switch focus without leaving the project. **Graphic content can be brought into a text document as a frame**: embedded graphic regions live inside the same structured document as your blocks, not only as flat images. The text editor is implemented today; the graphic editor and full frame workflow are on the roadmap and will share the same document model and core abstractions.

## Repository

**Source:** [Idea-Manager/Editor on GitHub](https://github.com/Idea-Manager/Editor)

## Editors

| Surface | Status | Documentation |
| -------- | ------ | --------------- |
| **Text editor** | Available (`packages/text-editor`) | [Text editor overview](../text-editor/overview.md) |
| **Graphic editor** | Coming soon (path reserved in TypeScript) | [Graphic editor roadmap](../graphic-editor/roadmap.md) |

## Concepts

Cross-cutting design (commands, undo/redo, operation log, events, document JSON) lives under **Concepts** in the sidebar. Start with [Commands](../concepts/commands.md) and [History and undo](../concepts/history-and-undo.md) if you are extending editing behavior.

## Next steps

- [Architecture](./architecture.md) — monorepo layout and packages that exist today
- [Contributing](../project/contributing.md) — how to participate; full guide in the repo root
- [License](../project/license.md) — MIT
