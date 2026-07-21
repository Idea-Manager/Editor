# Prompt 13 — Group window (multi-select) + custom blocks store

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 12.

## Goal

When more than one element is selected, replace the per-element floating
window with a **group properties** window that exposes:

1. Lock / Unlock (label + checkbox).
2. Group / Ungroup (label + checkbox).
3. Create new block (label + name input + button).

"Create new block" snapshots the selection into a `CustomBlockDefinition`
(prompt 01) stored in `DocumentNode.data.customBlocks`. Future placements of
that custom block instantiate the snapshot.

## Files to add / change

```
packages/graphic-editor/src/properties/
  group-properties-window.ts
  group-properties-window.scss
  __tests__/group-properties-window.test.ts
packages/graphic-editor/src/groups/
  group-controller.ts                  # selection.length>1 routing
  group-state.ts                       # locked/grouped flags persisted on doc
  custom-block-store.ts
  create-custom-block-command.ts
  delete-custom-block-command.ts
  set-locked-command.ts
  set-grouped-command.ts
  __tests__/{group-controller,custom-block-store,create-custom-block-command}.test.ts
```

Plus a small extension to `block-registry.ts` (prompt 05) so the registry
can host *runtime-registered* custom block definitions backed by the doc's
`customBlocks` data — no separate registry needed, but the registry must
filter and re-register on `'doc:change'` events that touch
`data.customBlocks`. See "Custom block instantiation" below.

## Group state (lock / group)

`group-state.ts` tracks two per-selection-set states by the **stable hash**
of the sorted member ids. The doc-level persistence lives in
`DocumentNode.data.graphicGroups` (extend prompt 01's typed accessor with a
new optional field) — but the simpler approach is to store the flags on
each `GraphicElement.meta`:

```ts
GraphicElement.meta?: { locked?: boolean; groupId?: string }
```

`meta` already exists on the interface (prompt 00 reference). Use it.

- `locked: true` → the element ignores drag, resize, and property edits
  except via group-window unlock; arrows can still be drawn from it
  (roadmap: "Prevent from moving and editing content. But arrows could be
  create from the group element and attached to it").
- `groupId` shared across multiple elements means selecting any one selects
  all — implement in selection-manager: `setSelection` expands the input
  with siblings sharing `groupId`. Add a `bypassGrouping` flag for internal
  uses.

### Commands

- `SetLockedCommand({ doc, pageId, elementIds, locked })` — bulk
  `node:update` ops on each element's `meta.locked`.
- `SetGroupedCommand({ doc, pageId, elementIds, grouped })` — when grouping
  generate a new `groupId` (`generateId('blk')` is fine; the prefix is just
  a tag) and write it to every element's `meta.groupId`. When ungrouping,
  set `meta.groupId = undefined` for those that share the current id.

Both commands are composites of `node:update` ops; undo restores prior
flags.

## `GroupPropertiesWindow`

```ts
export interface GroupPropertiesWindowConfig {
  i18n: I18nService;
  ctx: GraphicContext;
  hostSelector: string;
  selection: SelectionEntry[];
  onClose?: () => void;
}

export class GroupPropertiesWindow {
  constructor(host: HTMLElement, config: GroupPropertiesWindowConfig);
  setSelection(entries: SelectionEntry[]): void;
  destroy(): void;
}
```

Reuses `FloatingWindow` (prompt 03). Title:
`i18n.t('graphic.group.title', { count: selection.length })`. Body:

- **Lock / Unlock**:
  - Label: `i18n.t('graphic.group.lock')`.
  - Single checkbox (tri-state if mixed). On change → push
    `SetLockedCommand`.
- **Group / Ungroup**:
  - Label: `i18n.t('graphic.group.group')`.
  - Single checkbox. Checked when ALL selected elements share the same
    `meta.groupId`. Mixed when some share and others don't. On change →
    `SetGroupedCommand`.
- **Create new block** panel (Accordion item):
  - Read-only preview of the selection's bounding rect rendered as an SVG
    thumbnail (small inline render via the registry — or, simplest, an
    icon `auto_awesome_motion` with the count of elements).
  - Input field: `<input minlength="1" maxlength="40">` for the name.
  - Button: `i18n.t('graphic.group.createBlock')`. Disabled until the input
    is non-empty. On click → push `CreateCustomBlockCommand` (below).

When a Create succeeds, the window flashes a small success toast (use
`shared/components/toast`) with `i18n.t('graphic.group.createBlock.success', { name })` and clears the name input.

### Routing

`group-controller.ts` listens for `'selection:change'`:

- length === 0: nothing.
- length === 1 AND not arrow: `FloatingPropertiesWindow.open(node)` (delegate
  to prompt 12's instance — share via context). Close any group window.
- length === 1 AND arrow: FlyoutArrowToolbar (prompt 11).
- length > 1: close any FloatingPropertiesWindow, open `GroupPropertiesWindow`.

## Custom block store

`custom-block-store.ts`:

```ts
export class CustomBlockStore {
  constructor(doc: DocumentNode);
  list(): CustomBlockDefinition[];     // = getCustomBlocks(doc)
  has(id: string): boolean;
  get(id: string): CustomBlockDefinition | undefined;
}
```

Where `CustomBlockDefinition` (defined in prompt 01) is:

```ts
interface CustomBlockDefinition {
  id: string;                          // generateId('blk')
  name: string;                        // user-provided
  createdAt: string;                   // ISO timestamp
  /** Bounds at capture time; used to centre the placement ghost. */
  source: { width: number; height: number };
  /** Deep-cloned snapshot of selected elements with placeholder ids and zero-anchored coords. */
  elements: Array<{
    type: string;
    data: Record<string, unknown>;     // already zeroed against source.x/y; kept abstract per-block
    meta?: { groupId?: string; locked?: boolean };
    /** A stable placeholder id used to wire arrows that target other members of the snapshot. */
    placeholderId: string;
  }>;
  /** Optional snapshot of arrows whose endpoints fully refer to placeholderIds; arrows half-anchored to outside elements are dropped. */
  arrows: Array<{ data: Record<string, unknown>; placeholderId: string }>;
}
```

### `CreateCustomBlockCommand`

```ts
class CreateCustomBlockCommand implements Command {
  constructor(input: { doc: DocumentNode; pageId: string; name: string; entries: SelectionEntry[] });
}
```

- Compute the AABB of the selection.
- For each element entry: deep-clone `element.data`, subtract the AABB
  origin from `data.x` / `data.y` so the snapshot is zero-anchored. For
  paths, also translate `data.points` and `data.bounds`.
- For arrows: include only those whose `from` AND `to` either resolve to
  selected element ids (replace with `placeholderId` references) or are
  free points inside the AABB. Drop the rest.
- Assign each element a fresh `placeholderId` (e.g. `cb-{index}`).
- Build the `CustomBlockDefinition`.
- Emit `node:update` on the doc with `path: 'data.customBlocks'` (push to
  the array immutably).

`undo` removes the entry (by id) from `data.customBlocks`.

### Custom block instantiation

When the registry first loads, AND on every `'doc:change'` whose op
record's `path` starts with `data.customBlocks`, the registry rebuilds a
synthetic `GraphicBlockDefinition` per `CustomBlockDefinition`:

```ts
{
  type: `custom:${cb.id}`,
  labelKey: undefined,                // see below
  staticLabel: cb.name,               // new optional field on GraphicBlockDefinition
  icon: 'widgets',                    // generic
  groupKey: '__custom',
  defaultData: () => ({ x: 0, y: 0, width: cb.source.width, height: cb.source.height }),
  renderSvg: (node, ctx) => /* delegates to a CustomBlockRenderer */,
  properties: () => [],               // no per-block props yet; future
  getBounds: (node) => ({ … }),
}
```

> Add `staticLabel?: string` to `GraphicBlockDefinition` (prompt 05). When
> present and `labelKey` is missing, the left panel displays it verbatim.

When a custom block is **placed** (via the placement controller in prompt 8
or a left-panel click in prompt 14), instead of creating a single element
the placement commits a `CompositeCommand` that inserts each member of
`cb.elements` (with new `el` ids) translated by the click-anchor delta, and
each arrow with its endpoints rebound from `placeholderId` to the new ids.
Implement this in `instantiate-custom-block-command.ts` and call it from
the placement controller when the pending block type starts with `custom:`.

```ts
export class InstantiateCustomBlockCommand implements Command {
  constructor(input: { doc: DocumentNode; pageId: string; customBlockId: string; anchor: { x: number; y: number }});
}
```

## Roadmap details to honour

- "If user create a new block, it should automatically place in left panel
  in 'Custom' accordion element with visual preferences, but empty
  form/input." → `InstantiateCustomBlockCommand` resets `data.text` (and
  any html-template field values) to empty string (`''`) on instantiation.
  Visual prefs (border, bg, fill, font size, colours) are preserved as the
  snapshot encodes them.

- "Lock arrows from group element" → arrows started from a locked element's
  edge handle still work (selection-manager already guards drag, but
  edge-handle pointerdown must be allowed regardless of lock).

- "Click on group selects all" → selection-manager expansion rule above.

## i18n keys (en + uk)

```
graphic.group.title                Selection ({count})
graphic.group.lock                 Lock
graphic.group.group                Group
graphic.group.createBlock          Create new block
graphic.group.createBlock.input    Name
graphic.group.createBlock.success  Saved “{name}” to Custom
graphic.group.empty                Custom blocks appear here once you create them
```

## Tests

- `set-locked-command.test.ts`, `set-grouped-command.test.ts` — execute /
  undo on multiple elements; mixed-state UI computed correctly.
- `group-controller.test.ts` — selection size routing; arrow vs non-arrow
  vs multi.
- `create-custom-block-command.test.ts` — coordinates rebased to AABB
  origin; placeholder ids assigned; arrows with one foot outside the
  selection are dropped.
- `custom-block-store.test.ts` — list / has / get round-trip with
  serializer.
- Integration: registry rebuilds synthetic `custom:*` definitions when
  `data.customBlocks` changes.

## Don'ts

- **Do not** modify text-editor code. Custom blocks live entirely in
  graphic-editor.
- **Do not** include text content of stickers / shapes in the snapshot;
  only visual prefs survive.
- **Do not** allow custom blocks to nest other custom blocks in this
  iteration. (Catch: when creating a custom block from a selection that
  contains an instance of another custom block, persist its expanded
  members instead. Document this.)

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual: lasso a few shapes → group window opens; check "Group" → moving
  one moves all; check "Lock" → can't drag; type a name and click Create
  new block → toast confirms; the new block appears in the Custom
  accordion (visible after prompt 14 ships); placing it creates fresh
  copies with empty text but the saved styles.
