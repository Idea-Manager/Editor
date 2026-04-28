# Prompt 01 — Core data extensions for graphic preferences and custom blocks

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first. It contains the project
> context, architecture decisions, naming conventions, and house rules that
> apply to every prompt. **Do not skip it.**

## Goal

Add purely-additive type definitions and helpers in `@core` so the graphic
editor (built in later prompts) can:

1. Read and write per-block-type "last-used style" memory.
2. Read and write user-created custom blocks.

Both must round-trip through the existing JSON serializer/deserializer with no
schema changes (the document schema's `data` field is already an open object).

This prompt does **not** add UI, commands, or graphic rendering. It is the
typed foundation everything else depends on.

## Scope (do this)

### 1. New types

Create `packages/core/src/model/graphic-preferences.ts`:

```ts
import type { GraphicElement } from './interfaces';

/**
 * Per-block-type "last-used style" memory.
 *
 * Keyed by the `GraphicElement.type` string (e.g. `"rectangle"`, `"triangle"`,
 * `"sticker"`). Values are partial element data so each block kind can store
 * only the fields it cares about (border, fill, fontSize, etc.). Stored under
 * `DocumentNode.data.graphicPreferences`.
 *
 * The graphic editor merges these on top of `defaultData()` when creating a
 * new element, so a user-customised rectangle "teaches" the next triangle the
 * same border, background and text color.
 */
export type GraphicPreferences = Record<string, Partial<GraphicElement['data']>>;

/**
 * A user-created custom block, stored at the document level so it round-trips
 * through import / export. Created from a multi-element selection via
 * "Create new block" in the group floating window.
 */
export interface CustomBlockDefinition {
  /** Stable ID. Generate with `generateId('blk')`. */
  id: string;
  /** User-provided display name (min 1 char). */
  name: string;
  /**
   * Bounds of the original group in world space at creation time. Used to
   * normalise child element offsets so the custom block can be placed at any
   * cursor position later.
   */
  sourceBounds: { x: number; y: number; width: number; height: number };
  /**
   * Deep-cloned graphic elements with their original IDs replaced by stable
   * placeholder tokens (`"$el0"`, `"$el1"`, …). The graphic editor rewrites
   * these to fresh IDs at insertion time.
   *
   * Frame elements are NOT included — custom blocks are flat groups. The
   * elements' coordinates are translated so `sourceBounds.x/y` becomes (0,0).
   */
  elements: GraphicElement[];
  /** Optional: original group element IDs in z-order, mirrored on `elements`. */
  childOrder?: string[];
  meta?: { createdAt?: number; createdBy?: string; version?: number };
}
```

Add re-exports to `packages/core/src/index.ts`:

```ts
// New (additive) — add near the existing model exports
export type { GraphicPreferences, CustomBlockDefinition } from './model/graphic-preferences';
```

### 2. Document-data accessors

Create `packages/core/src/model/document-data.ts` with **read-only** typed
accessors so callers don't have to cast `data: Record<string, unknown>`
themselves:

```ts
import type { DocumentNode } from './interfaces';
import type { GraphicPreferences, CustomBlockDefinition } from './graphic-preferences';

const PREFS_KEY = 'graphicPreferences';
const CUSTOM_KEY = 'customBlocks';

export function getGraphicPreferences(doc: DocumentNode): GraphicPreferences {
  const raw = (doc.data as Record<string, unknown>)[PREFS_KEY];
  return (raw && typeof raw === 'object' ? raw : {}) as GraphicPreferences;
}

export function getCustomBlocks(doc: DocumentNode): CustomBlockDefinition[] {
  const raw = (doc.data as Record<string, unknown>)[CUSTOM_KEY];
  return Array.isArray(raw) ? (raw as CustomBlockDefinition[]) : [];
}
```

Mutations are NOT done here — they will go through `Command` instances in later
prompts (so they are undoable). Do not add `setGraphicPreferences` or
`addCustomBlock` here; expose the keys instead:

```ts
export const DOCUMENT_DATA_KEYS = {
  graphicPreferences: PREFS_KEY,
  customBlocks: CUSTOM_KEY,
} as const;
```

Re-export from `packages/core/src/index.ts`:

```ts
export { getGraphicPreferences, getCustomBlocks, DOCUMENT_DATA_KEYS } from './model/document-data';
```

### 3. Schema example

Update `packages/core/src/schema/examples/graphic-only.json` (or add a new
`graphic-with-prefs.json`) to demonstrate a document carrying
`graphicPreferences` and one `customBlocks` entry under `data`. Verify the
existing `validateDocument` still accepts it (the schema's `data: { type:
"object" }` is already permissive — confirm via a unit test).

### 4. Tests

Create `packages/core/src/model/__tests__/document-data.test.ts`:

- `getGraphicPreferences` returns `{}` when `data` has no key, returns the
  stored value otherwise.
- `getCustomBlocks` returns `[]` when missing, returns the stored array
  otherwise. Returns `[]` when the value is not an array.
- A document with both keys populated under `data` round-trips through
  `DocumentSerializer.export` → `DocumentDeserializer.import` byte-equivalent
  (modulo the existing key-order replacer).
- `validateDocument` accepts a document carrying both keys.

## Don'ts

- **Do not** modify `document.schema.json`. The `data` field is already an open
  `{ type: "object" }` and adding closed sub-schemas now would be premature.
- **Do not** modify `DocumentNode`'s shape (no new top-level fields). Keep
  everything under `data`.
- **Do not** add helpers that mutate the document. Mutations are owned by
  Commands defined in prompts 12 and 13.
- **Do not** export from anywhere except `packages/core/src/index.ts` (single
  public surface for `@core`).
- **Do not** add CRDT logic — the existing operation-log shape is enough; later
  prompts emit `node:update` records with paths like `data.graphicPreferences.rectangle.fill`.

## Acceptance criteria

- `npx tsc --noEmit` (or `npm run build`) is clean.
- `npm test` green, including the new `document-data.test.ts`.
- `npm run check:text-editor-imports` still passes (this prompt doesn't touch
  the text editor, but verify).
- Imports work from a hypothetical caller:

  ```ts
  import {
    getGraphicPreferences,
    getCustomBlocks,
    DOCUMENT_DATA_KEYS,
    type GraphicPreferences,
    type CustomBlockDefinition,
  } from '@core/index';
  ```
