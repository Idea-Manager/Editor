# Prompt 14 — Left panel: block library + sticky Custom accordion

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompts 02 (Accordion) and 13 (custom block store).

## Goal

Render the left panel:

- A scrollable list of `Accordion` instances grouped by
  `GraphicBlockDefinition.groupKey` (one accordion per group).
- The **first** group is opened by default; others are closed. This is
  configurable per group via a small config object.
- A "Custom" accordion is **sticky to the bottom** of the panel. It hosts:
  - Every registered block definition that has no `groupKey` (the
    `__ungrouped` bucket — currently empty for built-ins because Sticker is
    placed by the bottom toolbar; arrows / paths intentionally have no
    `groupKey` and are not in the panel).
  - Every `custom:*` block produced from `data.customBlocks` (prompt 13).
  Render the accordion only if it has at least one entry; show an empty
  state with `i18n.t('graphic.group.empty')` when the user opens it but
  there's nothing yet (only relevant if some other block source produces
  an entry).

A click on a block tile starts placement (prompt 08's `beginPlacement`).

## Files to add

```
packages/graphic-editor/src/layout/
  left-panel.ts
  left-panel.scss
  block-tile.ts
  block-tile.scss
  __tests__/left-panel.test.ts
  __tests__/block-tile.test.ts
```

## DOM

```html
<aside class="idea-graphic-left-panel">
  <div class="idea-graphic-left-panel__scroll">
    <!-- one Accordion instance per group, in registration order -->
    <div class="idea-graphic-left-panel__group" data-group-key="shapes">…</div>
  </div>
  <div class="idea-graphic-left-panel__sticky">
    <!-- the Custom accordion, only mounted when it has entries -->
  </div>
</aside>
```

The aside is mounted by `GraphicEditor.connectedCallback()` BEFORE the
`.idea-graphic-canvas`. Layout is grid: `grid-template-columns: 240px 1fr;`
inside the editor host.

`min-width: 240px;`. `border-right: 1px solid $color-border;`.
`background: $color-bg-subtle;`.

## Group rendering

```ts
class LeftPanel {
  constructor(host: HTMLElement, ctx: GraphicContext);
  refresh(): void;            // re-render based on the current registry
  destroy(): void;
}
```

`refresh()`:

1. Get groups via `registry.getGroups()` (prompt 05). This returns:
   `{ groupKey, definitions }` items in insertion order.
2. Filter out the special `__custom` and `__ungrouped` group keys (handled
   below).
3. For each remaining group, create an `Accordion` (from prompt 02) with
   one item:
   - title: `i18n.t('graphic.group.<groupKey>')` falling back to
     `groupKey`.
   - body: a flex-wrap container of `BlockTile`s.
4. The FIRST group's accordion item starts expanded; the rest collapsed.
5. Mount each accordion into `.idea-graphic-left-panel__scroll`.

For the sticky Custom accordion: combine `__ungrouped` + `__custom`
definitions, sorted as: `__custom` first (most recent first by `createdAt`),
then `__ungrouped`.

If the combined list is empty, the sticky container is `display: none;`.

## `BlockTile`

```ts
export class BlockTile {
  constructor(host: HTMLElement, def: GraphicBlockDefinition, i18n: I18nService);
  onActivate(callback: () => void): () => void;
  destroy(): void;
}
```

Tile DOM:

```html
<button class="idea-graphic-block-tile" title="…">
  <span class="idea-graphic-block-tile__icon material-symbols-outlined">{def.icon}</span>
  <span class="idea-graphic-block-tile__label">{label}</span>
</button>
```

- Tile size: 64×64 with the icon centred, label as small text below the
  icon. Use `$font-size-xs`, `color: $color-text-secondary`.
- Hover: `background: $gray-100;` and `color: $color-text;`.
- Active state during `pointerdown`: a subtle inset shadow.
- `title` attribute = the label text (so screen readers can announce a
  tooltip).

Activation order:

1. `pointerdown`: prevent default and call `toolState.beginPlacement(def.type)`.
   Emit a small toast hint `i18n.t('graphic.placement.cancel')` ONLY the
   first time the user does this in the session (gate via a session-scoped
   `Set`).
2. `Esc` cancels placement (handled by the placement controller).

For custom blocks (`def.type` starts with `custom:`), placement still calls
`beginPlacement(def.type)`. The placement controller (prompt 08) detects
the prefix and dispatches to `InstantiateCustomBlockCommand` instead of
`AddElementCommand`.

## Live updates

`LeftPanel.refresh()` is called when:

- `'doc:change'` op records include any `data.customBlocks` path.
- A new block is registered at runtime (custom blocks register
  automatically per prompt 13's registry rebuild rule).

To avoid unnecessary churn, debounce refresh by an animation frame.

## Configurability

Add a panel-level configuration so consumers can override the
"first-open" rule:

```ts
export interface LeftPanelOptions {
  /** Group keys whose accordion starts expanded. Defaults to the first group's key. */
  initiallyExpandedGroups?: string[];
  /** Hide certain groups entirely. */
  hiddenGroups?: string[];
}
```

Wire `LeftPanelOptions` into `GraphicEditorOptions.leftPanel?: LeftPanelOptions`.
Default behaviour matches the roadmap.

## i18n keys (en + uk)

```
graphic.group.shapes      Shapes
graphic.group.custom      Custom
graphic.group.empty       Custom blocks appear here once you create them
graphic.block.tile.add    Click to place. ESC to cancel.
```

`graphic.group.shapes` was already added in prompt 06; reuse.

## Style tokens

If you need a slight shading for the sticky Custom container, add:

```
$color-graphic-left-panel-bg: $color-bg-subtle;
$color-graphic-left-panel-sticky-bg: $white;
```

to `_variables.scss`. The sticky container uses `border-top: 1px solid
$color-border; box-shadow: 0 -4px 8px rgba($black, 0.04);`.

## Tests

- `block-tile.test.ts` — renders icon + label; click calls
  `beginPlacement(type)`; tooltip text matches i18n.
- `left-panel.test.ts`:
  - shows one accordion per group (excluding special keys);
  - first accordion expanded, others collapsed;
  - sticky Custom hidden when no entries;
  - sticky Custom appears with custom-block tile after `data.customBlocks`
    update on the doc;
  - `hiddenGroups` filters groups out;
  - `initiallyExpandedGroups` overrides default expansion.

## Don'ts

- **Do not** mount the left panel from `app-shell.ts` — `GraphicEditor`
  owns its own layout; the AppShell only mounts the GraphicEditor element.
- **Do not** show the Pen / Arrow / Sticker types in the left panel; they
  are tools, not library blocks.
- **Do not** open the floating properties window from the panel; it opens
  on selection after placement (prompt 12).

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual:
  - The four default shapes appear in the "Shapes" accordion (open by
    default).
  - Clicking a tile shows a ghost on the canvas; clicking the canvas drops
    the shape, which becomes selected and opens the floating window.
  - After creating a custom block (prompt 13), it appears in a sticky
    "Custom" accordion at the bottom of the panel; clicking it places a
    full instance.
