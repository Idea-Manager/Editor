---
sidebar_position: 8
---

# Extensibility

The graphic editor is designed so that new block kinds can be added without touching the core engine. This page explains the full plugin pattern.

## Where to plug in new block kinds

New block kinds are registered in `GraphicBlockRegistry` before (or immediately after) `GraphicEditor.init()` is called. The registry is exposed on `GraphicContext.registry`.

There are two registration points:

1. **At startup** — pass a pre-built registry to `init()`.
2. **At runtime** — call `registry.register(definition)` on a live editor instance.

Built-in blocks are registered by `registerDefaultBlocks(registry)` from `packages/graphic-editor/src/blocks/index.ts`. Your plugin blocks are registered on top of that.

## How to subclass `GraphicBlockDefinition`

You do not need to subclass anything. `GraphicBlockDefinition` is a plain interface. Implement it as an object literal or class:

```ts
import type { GraphicBlockDefinition } from '@graphic-editor';

export const myBlock: GraphicBlockDefinition<MyData> = {
  type: 'my-org/my-block',          // namespaced to avoid collisions
  labelKey: 'myPlugin.block.label', // must exist in your i18n bundle
  groupKey: 'graphic.group.shapes', // or your own group key
  icon: '<circle cx="12" cy="12" r="10"/>',

  defaultData(): MyData {
    return { color: '#cccccc' };
  },

  render(element, svgGroup, ctx) {
    svgGroup.innerHTML = '';
    // ... build SVG children and append to svgGroup ...
  },

  properties(element) {
    return [
      { kind: 'fill', path: 'data.color', persistable: true },
    ];
  },
};
```

## How to register at runtime

```ts
import { GraphicEditor } from '@graphic-editor';
import { myBlock } from './my-block';

const editor = document.querySelector('idea-graphic-editor') as GraphicEditor;
editor.context.registry.register(myBlock);
// The left panel re-renders automatically.
```

If you need the block available before the first render, register it before calling `init()`:

```ts
const registry = new GraphicBlockRegistry();
registerDefaultBlocks(registry);
registry.register(myBlock);

editor.init({ document, eventBus, undoRedoManager, registry });
```

## The import-guard rule

`packages/graphic-editor` must **never** import from the repo application tree (`src/`). This boundary is enforced by:

```bash
npm run check:graphic-editor-imports
```

The script (`scripts/check-graphic-editor-imports.mjs`) fails if any `.ts` file inside `packages/graphic-editor/src/` contains a relative import that traverses into `src/`. This rule ensures the package can eventually be published independently.

Allowed import paths:
- `@core/*` — core model, events, history, i18n
- `@graphic-editor/*` — self-referential
- `@shared/*` — shared UI components
- Relative paths within `packages/graphic-editor/src/`

## CRDT-friendly patterns

When you write commands for your block:

1. Always implement the `Command` interface from `@core/commands/command.ts` — `execute()`, `undo()`, and `operationRecords`.
2. Return meaningful `OperationRecord`s in `operationRecords` so a future CRDT layer can replay or transform them.
3. Never modify the document outside a command. Direct mutations break undo/redo and will conflict with CRDT merging.
4. Keep commands **atomic** — one intent per command. Compound edits should compose commands.

See [Commands](../concepts/commands.md) and [Operation log](../concepts/operation-log.md) for the full spec.

## Adding a new i18n key for your block

1. Add the key to `packages/core/src/i18n/locales/en.ts` and `uk.ts`.
2. Add a typed constant to `packages/graphic-editor/src/i18n/keys.ts` (optional but recommended).
3. Run `npm run check:graphic-i18n` to verify 0 missing / 0 orphan.

See [i18n](./i18n.md) for the key naming convention.
