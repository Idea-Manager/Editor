---
sidebar_position: 2
---

# Custom blocks

You can register **custom block kinds** when initializing the text editor, without forking `text-editor.ts`. Block types are open strings on the document model: built-in kinds match the `BlockType` union (`paragraph`, `heading`, `list_item`, `table`, `embed`, `graphic`); plugins use their own non-empty `type` string (for example `callout`).

## `TextEditorOptions`

Pass options as the fourth argument to `TextEditor.prototype.init`:

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `locale` | `'en'` | Locale for `I18nService` (unchanged). |
| `includeDefaultBlocks` | `true` | If `false`, built-in blocks are **not** registered; only your `blocks` array is used (minimal editors, tests). |
| `blocks` | `[]` | Extra `BlockDefinition` instances. Registered **after** built-ins when `includeDefaultBlocks` is not `false`. |

**Ordering:** Built-ins first, then each entry in `blocks` in order. The registry maps by `type`; **the last registration wins** if the same `type` is registered twice.

## `BlockDefinition`

Implement the interface from `@text-editor` (see `packages/text-editor/src/blocks/block-definition.ts`):

- **`type`** — Non-empty string stored on `BlockNode.type` and used for registry lookup.
- **`labelKey`** — i18n key for the default palette row (when you do not define `paletteEntries`).
- **`icon`** — Icon name consumed by toolbar UI (see existing blocks for naming).
- **`defaultData()`** — Initial `data` payload for new blocks.
- **`render`**, **`serialize`**, **`deserialize`** — DOM rendering and document round-trip.
- **`onEnter`**, **`onDelete`** (optional) — Return a `Command` or `null` for special key handling.
- **`paletteEntries`** (optional) — Return multiple slash/gutter items for one block kind (see `TableBlock`).

Provide translations for `labelKey` (and any keys used in `paletteEntries`) in your i18n bundle or fork of locale data.

## Helpers and exports

- **`registerDefaultBlocks(registry)`** — Registers the five built-in text blocks (paragraph, heading, list_item, table, embed).
- **`createDefaultBlockRegistry()`** — `new BlockRegistry()` plus `registerDefaultBlocks`.

Use these in tests or a custom shell that does not use `<idea-text-editor>`.

## Schema and validation

`document.schema.json` treats `blockNode.type` as **any non-empty string**. `validateDocument()` therefore accepts plugin block types. If you import documents from **untrusted** sources, add your own allowlist or extra validation beyond the base schema.

## Semver note

`BlockNode.type` is typed as `string` in `@core`; the `BlockType` union remains the set of **known built-in** kinds for APIs that need narrowing (for example palette exclusions). See the repo root `CHANGELOG.md` for breaking-change notes.

## Example

```ts
import { TextEditor } from '@text-editor';
import type { BlockDefinition } from '@text-editor';
import type { BlockNode } from '@core/model/interfaces';
// … implement BlockDefinition for your type, then:

editor.init(doc, eventBus, undoRedoManager, {
  blocks: [new MyCalloutBlock()],
});
```

With `includeDefaultBlocks: false`, only `MyCalloutBlock` appears in the slash palette and block-type menus driven by `BlockRegistry.getPaletteItems()`.
