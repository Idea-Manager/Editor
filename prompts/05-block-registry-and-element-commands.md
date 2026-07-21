# Prompt 05 — `GraphicBlockRegistry`, `GraphicBlockDefinition`, element commands

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 04.

## Goal

Add the plugin model and the foundational commands the rest of the graphic
editor will use to manipulate the document. Mirrors the text editor's
`BlockDefinition` / `BlockRegistry` pattern but specialised for graphic
elements (no inline runs, no contenteditable).

## `GraphicBlockDefinition<TData>` (interface)

`packages/graphic-editor/src/blocks/block-definition.ts`:

```ts
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../engine/render-context';
import type { GraphicBlockProperty } from './properties';

/**
 * Plugin describing a kind of `GraphicElement` that the user can place from
 * the left panel. Built-in kinds live in this package; future user-supplied
 * blocks register through `GraphicEditorOptions.blocks` (added in a later
 * prompt).
 */
export interface GraphicBlockDefinition<TData = Record<string, unknown>> {
  /** Stable string used as `GraphicElement.type`. e.g. "rectangle". */
  readonly type: string;
  /** i18n key for the display label, e.g. "graphic.block.rectangle". */
  readonly labelKey: string;
  /** Material Symbols icon name for the left panel and toolbars. */
  readonly icon: string;
  /** Optional group key used to assemble left-panel accordions. */
  readonly groupKey?: string;
  /** Optional pivot points (relative to the element's local 0..1 box). */
  readonly pivots?: ReadonlyArray<{ x: number; y: number; id: string }>;

  /** Returns a freshly-defaulted data blob (called when the block is placed). */
  defaultData(): TData;

  /** Renders the SVG body. The renderer attaches data-element-id automatically. */
  renderSvg(node: GraphicElement<TData>, ctx: GraphicRenderContext): SVGElement;

  /**
   * OPTIONAL: renders an HTML overlay (foreignObject content or absolute DOM in
   * the overlay layer). Used for blocks with HTML templates inside (e.g.
   * sticker text input, future SQL-table content). Default behaviour: a
   * single-line text input centred inside the element bounds (sticker style).
   *
   * Return `null` to opt out of any overlay (a "stand-alone" block).
   */
  renderOverlay?(node: GraphicElement<TData>, ctx: GraphicRenderContext): HTMLElement | null;

  /**
   * OPTIONAL: declares property panels shown in the floating window. The
   * graphic editor uses this to build edit controls automatically; built-in
   * blocks declare border / background / fill / text-color / font-size here.
   */
  properties?(node: GraphicElement<TData>, ctx: GraphicRenderContext): GraphicBlockProperty[];

  /**
   * Returns the AABB of the element in world coords for hit-testing,
   * intersection logic with frames, and bounding-box rendering.
   */
  getBounds(node: GraphicElement<TData>): { x: number; y: number; width: number; height: number };
}
```

The `GraphicBlockProperty` shape is defined in
`packages/graphic-editor/src/blocks/properties.ts` (this prompt) as a tagged
union, to avoid the floating window having to import block-specific types:

```ts
export type GraphicBlockProperty =
  | { kind: 'border'; thicknessPath: string; colorPath: string }
  | { kind: 'background'; colorPath: string }
  | { kind: 'fill'; colorPath: string }
  | { kind: 'textColor'; colorPath: string }
  | { kind: 'fontSize'; path: string; min?: number; max?: number; unit?: 'px' | 'pt' }
  | { kind: 'text'; path: string; placeholderKey?: string }
  | { kind: 'pivots'; readonly?: boolean }
  | { kind: 'htmlTemplate'; element: HTMLElement; titleKey: string }
  | { kind: 'custom'; titleKey: string; element: HTMLElement };
```

`*Path` strings are dotted paths into `node.data` (e.g. `data.border.color`,
`data.fill`). Property panels (built in prompt 12) read/write through these
paths and emit `UpdateElementCommand` for granular `node:update` ops.

## `GraphicBlockRegistry`

`packages/graphic-editor/src/blocks/block-registry.ts`. Mirror
`packages/text-editor/src/blocks/block-registry.ts`:

```ts
export class GraphicBlockRegistry {
  register(def: GraphicBlockDefinition): void;
  get(type: string): GraphicBlockDefinition;
  has(type: string): boolean;
  getAll(): GraphicBlockDefinition[];
  /** Returns definitions grouped by `groupKey ?? '__ungrouped'`, preserving registration order. */
  getGroups(): Array<{ groupKey: string; definitions: GraphicBlockDefinition[] }>;
}
```

Special groups:

- A definition with no `groupKey` belongs to `__ungrouped`. The left panel will
  render those inside the sticky "Custom" accordion alongside user-created
  custom blocks.
- A definition's `labelKey` is the key passed to `i18n.t` — never display the
  raw `type` string.

## Commands

`packages/graphic-editor/src/engine/commands/`:

### `AddElementCommand`

```ts
new AddElementCommand({ doc, pageId, type, registry, dataOverride?, frameId? })
```

- Generates a new `GraphicElement` id via `generateId('el')` (or `'conn'` for
  arrows — but only after prompt 11 introduces arrows; for now `'el'`).
- Merges `defaultData()` with the doc's `getGraphicPreferences(doc)[type]` and
  any explicit `dataOverride`. (StyleMemory layering is added in prompt 12 by
  using this command's `dataOverride` argument; here the command needs to
  merge `defaultData` and `dataOverride` cleanly.)
- Pushes the element to `page.elements`. If `frameId` is supplied, also adds
  the new id to `frame.childElementIds` and sets `element.frameId`.
- Emits `OperationRecord { type: 'node:insert', payload: { parentId: pageId, index, node } }`.
- `execute()` is idempotent if called twice (re-execution after redo must use
  the same id; cache the constructed element snapshot for redo).

### `RemoveElementCommand`

- Removes the element from `page.elements`.
- If the element was in a frame, also removes its id from that frame's
  `childElementIds`.
- Stashes the original snapshot for `undo`.

### `UpdateElementCommand`

```ts
new UpdateElementCommand({ doc, pageId, elementId, path, value, mergeWindowMs? = 0 })
```

- `path` is a dotted path into `element.data` or `element.meta`. Only
  `data.*` and `meta.*` are allowed; reject `id` / `type`.
- Emits one `node:update` op with the `path`, `oldValue`, `newValue`.
- `merge(next)` returns true when `next` is an `UpdateElementCommand` for the
  same `elementId` + same `path` AND `mergeWindowMs > 0` AND the elapsed time
  since this command's last update is less than `mergeWindowMs`. This lets
  drags / resizes / typing produce one undo step.

### `MoveElementCommand`

- Specialised translation by `(dx, dy)` in world coords. Sets `data.x` and
  `data.y` to the new values via two `node:update` ops in a single
  `CompositeCommand`. Also supports merging consecutive moves of the same
  element.
- For an arrow element, `data.from.point` and `data.to.point` are translated
  instead (see prompt 11). This command only moves shapes/stickers/paths; for
  arrows use the dedicated commands defined in prompt 11.

> Use `CompositeCommand` from `@core/commands/composite-command` to assemble
> multi-op commands.

## Path utility

Add `packages/graphic-editor/src/util/object-path.ts`:

```ts
export function getAtPath(obj: unknown, path: string): unknown;
export function setAtPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T; // returns a NEW object (immutable update)
```

Implement via `path.split('.')` traversal. The setter must clone every level
along the path (so undo can compare references safely). Reject empty paths
and any segment that is `__proto__` / `constructor` / `prototype`.

## Tests

`packages/graphic-editor/src/blocks/__tests__/block-registry.test.ts`,
`packages/graphic-editor/src/engine/commands/__tests__/{add,remove,update,move}-element-command.test.ts`,
`packages/graphic-editor/src/util/__tests__/object-path.test.ts`.

Cover: registry get/getAll/getGroups; element add → undo restores; remove →
undo restores including frame attachment; update with deep path; update merge
within window; update merge rejects different paths; move composes two
node:update ops; object-path traversal + immutability + prototype-pollution
guard.

## Public API

Add to `packages/graphic-editor/src/index.ts`:

```ts
export type { GraphicBlockDefinition } from './blocks/block-definition';
export type { GraphicBlockProperty } from './blocks/properties';
export { GraphicBlockRegistry } from './blocks/block-registry';
export { AddElementCommand } from './engine/commands/add-element-command';
export { RemoveElementCommand } from './engine/commands/remove-element-command';
export { UpdateElementCommand } from './engine/commands/update-element-command';
export { MoveElementCommand } from './engine/commands/move-element-command';
export { getAtPath, setAtPath } from './util/object-path';
```

## Don'ts

- **Do not** mutate `node.data` in place inside commands; always clone via
  `setAtPath` so the operation log holds proper before/after snapshots.
- **Do not** import from `src/` inside the package.
- **Do not** add UI here. The registry and commands are pure logic.

## Acceptance criteria

- `npm test` green (new test files included).
- `npm run build` succeeds.
- The text-editor and graphic-editor import-guard scripts pass.
