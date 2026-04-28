# Prompt 11 — Arrow tool + Flyout arrow toolbar + arrow editing

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 08 (and uses event from prompt 07).

## Goal

Implement arrows as a graphic-element kind, plus the arrow-specific
`FlyoutArrowToolbar`, plus the click-to-draw and double-click-label flow
described in the roadmap.

Roadmap references: "Flyout arrow toolbar" component, "Arrow tool"
behaviour, the final paragraph about arrow selection, label, and
endpoint-drag.

## Files to add

```
packages/graphic-editor/src/blocks/arrow/
  arrow-block.ts                # GraphicBlockDefinition for type 'arrow'
  arrow-block.scss
  arrow-geometry.ts             # path generation (line/curve), bounds
  __tests__/arrow-block.test.ts
  __tests__/arrow-geometry.test.ts
packages/graphic-editor/src/toolbar/
  flyout-arrow-toolbar.ts
  flyout-arrow-toolbar.scss
  __tests__/flyout-arrow-toolbar.test.ts
packages/graphic-editor/src/engine/
  arrow-controller.ts           # creating + editing arrows
  arrow-label-editor.ts         # double-click → editable label
  __tests__/arrow-controller.test.ts
  __tests__/arrow-label-editor.test.ts
packages/graphic-editor/src/engine/commands/
  add-arrow-command.ts
  update-arrow-endpoint-command.ts
  __tests__/add-arrow-command.test.ts
  __tests__/update-arrow-endpoint-command.test.ts
```

## `ArrowData`

```ts
export type ArrowHeading = 'none' | 'stroke' | 'fill';
export type ArrowDirection = 'none' | 'to' | 'from' | 'both';
export type ArrowType = 'line' | 'curve';

export interface ArrowEndpoint {
  /** Either anchored to a target element/pivot, or free at a world point. */
  target?: { elementId: string; pivotId?: string };
  point: { x: number; y: number };  // mirror of the resolved anchor in world coords
}

export interface ArrowData {
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  arrowType: ArrowType;     // line | curve
  heading: ArrowHeading;    // none | stroke | fill   (applies to both ends if direction = both)
  direction: ArrowDirection;// none | to | from | both
  color: string;            // stroke colour
  thickness: number;        // 1..8 px
  /** Optional label that appears mid-arrow, white-bg pill. */
  label?: string;
}

export const ARROW_DEFAULTS: Pick<ArrowData, 'arrowType'|'heading'|'direction'|'color'|'thickness'> = {
  arrowType: 'curve',
  heading: 'stroke',
  direction: 'to',
  color: '#888888',         // gray per roadmap
  thickness: 2,
};
```

`generateId('conn')` for the arrow's element id.

## `ArrowBlock` definition

```ts
export const ArrowBlock: GraphicBlockDefinition<ArrowData> = {
  type: 'arrow',
  labelKey: 'graphic.block.arrow',
  icon: 'arrow_right_alt',
  groupKey: undefined,           // not in the left panel
  defaultData: () => ({
    from: { point: { x: 0, y: 0 } },
    to: { point: { x: 100, y: 0 } },
    ...ARROW_DEFAULTS,
  }),
  renderSvg: (node, ctx) => /* see "Rendering" */,
  renderOverlay: (node, ctx) => /* label only — see "Label" */,
  properties: () => [],          // arrows use the FlyoutArrowToolbar, not the floating window
  getBounds: (node) => arrowBounds(node.data),
};
```

Register in `registerDefaultBlocks` (prompt 06 patch). Update its tests.

### Rendering

`arrow-geometry.ts`:

- For `arrowType === 'line'`, use a straight `<path d="M ax ay L bx by"/>`.
- For `arrowType === 'curve'`, use a quadratic bezier with a control point
  offset perpendicular to the line by `min(distance * 0.25, 80)`. Document
  the control point formula and stay deterministic for tests.
- Compute marker positions (start/end) in world coords; draw arrow heads as
  child `<polygon>` (filled) or `<polyline>` (stroke-only) according to
  `heading`. Direction `'to'` only renders the head at the end; `'from'`
  only at the start; `'both'` renders both; `'none'` renders neither.
- AABB used by `getBounds`: extend the polyline AABB by `thickness + 6` to
  include head extents.

Endpoint resolution: when an endpoint has `target.elementId`, resolve to the
nearest pivot point on that element OR (if `pivotId` is set) the requested
pivot. The block's `pivots` are read via `registry.get(targetType).pivots`
(prompt 05). Cache the resolved point on `endpoint.point` so the renderer
doesn't have to re-query each frame.

### Label

When `data.label` is non-empty, render a DOM overlay `<div
class="idea-graphic-arrow__label">` centred at the path midpoint. White
background, 1px border `$color-border`, padding `$spacing-xs`, font
`$font-size-sm`. Roadmap: "white background, it could cross the arrow
itself". `pointer-events: auto` so it's selectable.

## `ArrowController`

Active when `toolState.getTool() === 'arrow'` OR when starting from a
selection-ring edge handle (prompt 07 emits `'graphic:start-arrow'`).

Drawing flow:

- `pointerdown` on a non-selected element edge handle (event from prompt 07)
  OR on an empty area in `'arrow'` tool: begin draw with `from = anchor`,
  `to = pointer`.
- `pointermove`: update the arrow's `to.point` to the pointer in world
  coords. If the pointer is over an element body, snap `to` to the nearest
  pivot/edge of that element (within 12 screen px). Show pivot indicator
  dots.
- `pointerup`:
  - If the drag distance < 4px, abort.
  - Otherwise push `AddArrowCommand` with the current endpoints + the
    document-level Arrow defaults (see below).
- `Escape` aborts.

### Editing existing arrows

Selecting an arrow (prompt 07's selection plumbing already returns the
arrow as `kind: 'element'` from hit-testing) does the following:

1. Selection visuals for arrows: NO dashed bounding rect; NO corner handles;
   instead show a 6px circle at each endpoint (same handle styling). The
   selection-manager's `renderOverlay` checks `element.type === 'arrow'`
   and dispatches to an arrow-specific overlay.
2. Open the FlyoutArrowToolbar above the arrow (positioned at the midpoint
   minus toolbar height − 8px). Update on viewport changes.
3. Endpoint drag: dragging an endpoint circle reattaches it (snap to pivot
   logic from drawing). Push `UpdateArrowEndpointCommand({ which: 'from'|'to', ... })`.
4. If the drag started from a pivot circle on the source element AND the
   user did not move ≥4px before releasing, do nothing (no new arrow created
   — roadmap: "if arrow sticked to pivot point, drag and drop from pivot
   point don't create new arrow, but simply allow to drag and drop existing
   arrow").
5. Double-click on the arrow body (not endpoints) → `ArrowLabelEditor`
   opens an editable `<input>` at the midpoint. On commit (Enter / blur),
   push `UpdateElementCommand` for `data.label`.

## `FlyoutArrowToolbar`

Reusable toolbar but **arrow-specific**, lives in
`packages/graphic-editor/src/toolbar/`.

```ts
export interface FlyoutArrowToolbarConfig {
  i18n: I18nService;
  initialValues: Pick<ArrowData, 'heading'|'direction'|'arrowType'|'color'|'thickness'>;
  onChange: (next: Partial<Pick<ArrowData, 'heading'|'direction'|'arrowType'|'color'|'thickness'>>) => void;
  onClose?: () => void;
}

export class FlyoutArrowToolbar {
  constructor(host: HTMLElement, config: FlyoutArrowToolbarConfig);
  setValues(next: FlyoutArrowToolbarConfig['initialValues']): void;
  setPosition(p: { x: number; y: number }): void; // screen coords
  destroy(): void;
}
```

Five controls, in roadmap order:

1. **Arrow heading** — dropdown showing icons; current value visible:
   - `none` → `subdirectory_arrow_right`-without-arrow (or just `remove`)
   - `stroke` → `arrow_outward` outline only
   - `fill` → `arrow_forward` filled
   Use Material icon names that visually convey each state and document the
   choice; if nothing fits cleanly, you may fall back to a labelled icon
   button with text. Ask the user before introducing a custom SVG.

2. **Arrow direction** — dropdown:
   - `none` → `horizontal_rule`
   - `to` → `arrow_forward`
   - `from` → `arrow_back`
   - `both` → `swap_horiz`

3. **Arrow type** — dropdown: `line` (`linear_scale`/`drag_handle`) and
   `curve` (`gesture`).

4. **Arrow color** — opens `shared/components/color-picker` anchored at the
   button. Shows current colour as the swatch background.

5. **Arrow thickness** — `dropdown-combobox` with `inputMode: 'integer'`,
   `unit: 'px'`, `numericMin: 1`, `numericMax: 8`, predefined options 1..8.

The toolbar is a small horizontal pill with `$spacing-xs` between controls.
`flex-direction: row; align-items: center;`. White background, 1px
`$color-border`, soft shadow.

## Arrow defaults flow

The bottom-toolbar Arrow button additionally opens the FlyoutArrowToolbar in
"defaults" mode (no arrow selected). Listen for prompt 08's
`'graphic:open-arrow-defaults'` event:

- Read defaults from `getGraphicPreferences(doc).arrow ?? ARROW_DEFAULTS`.
- Show the toolbar anchored above the bottom toolbar's Arrow button.
- On change → `UpdateElementCommand` is NOT used (no element). Instead push
  a doc-level `UpdatePreferencesCommand` introduced by prompt 12. For this
  prompt, write to `data.graphicPreferences.arrow` directly via a tiny
  helper command `SetArrowDefaultsCommand` (single `node:update` with `path:
  'data.graphicPreferences.arrow'` and `nodeId: doc.id`). Prompt 12
  generalises this; document that this command is provisional.

## Commands

### `AddArrowCommand`

```ts
class AddArrowCommand implements Command {
  constructor(input: {
    doc: DocumentNode;
    pageId: string;
    from: ArrowEndpoint;
    to: ArrowEndpoint;
    overrides?: Partial<ArrowData>;
  });
}
```

- Generates id with `generateId('conn')` and `type: 'arrow'`.
- Composes with the same frame-attach logic from prompt 09 (so an arrow
  drawn inside a frame is attached). Skip with `skipFrameAttach: true`.

### `UpdateArrowEndpointCommand`

- Targets one endpoint (`'from'` or `'to'`) of an arrow element.
- Two `node:update` ops: `data.{from|to}.target` and `data.{from|to}.point`.
- Supports `merge` within `mergeWindowMs` for drag.

## Selection & flyout coordination

- When `selection.length === 1 && selection[0].element.type === 'arrow'`,
  the `FloatingPropertiesWindow` (prompt 12) does NOT open — show the
  FlyoutArrowToolbar instead.
- When the selection changes away from an arrow, destroy the toolbar.
- When the viewport changes, call `setPosition` to keep the toolbar pinned
  above the arrow's midpoint.

## i18n keys (en + uk)

```
graphic.block.arrow              Arrow
graphic.arrow.heading            Heading
graphic.arrow.heading.none       None
graphic.arrow.heading.stroke     Stroke
graphic.arrow.heading.fill       Fill
graphic.arrow.direction          Direction
graphic.arrow.direction.none     None
graphic.arrow.direction.to       To
graphic.arrow.direction.from     From
graphic.arrow.direction.both     Both
graphic.arrow.type               Type
graphic.arrow.type.line          Line
graphic.arrow.type.curve         Curve
graphic.arrow.color              Color
graphic.arrow.thickness          Thickness
graphic.arrow.label.placeholder  Add a label…
graphic.arrow.defaults.title     Arrow defaults
```

## Tests

- `arrow-geometry.test.ts` — straight + curve `d` strings; bounds extension
  by thickness + head; head polygons orient to the line tangent.
- `arrow-block.test.ts` — `defaultData` matches roadmap defaults (curve,
  stroke, to, gray, 2px); `renderSvg` output structure.
- `flyout-arrow-toolbar.test.ts` — initial values reflected in controls;
  changing a control fires `onChange`; thickness combobox clamps to 1..8.
- `arrow-controller.test.ts` — drag flow creates an arrow when distance > 4
  px; pivot-snap when over an element; ESC aborts; double-click opens
  label; pivot-no-move releases without creating.
- `add-arrow-command.test.ts` and `update-arrow-endpoint-command.test.ts`
  — execute / undo / merge windows.

## Don'ts

- **Do not** add custom SVG icons. If a Material symbol doesn't exist for an
  arrow heading state, ASK before adding.
- **Do not** open the standard FloatingPropertiesWindow for a selected
  arrow — arrows route through this toolbar exclusively.
- **Do not** allow arrows to attach to themselves or to a deleted element
  (validate in commands; on a deleted target, fall back to `endpoint.point`).

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual: with the Arrow tool, drag from one shape to another; arrow snaps
  to a pivot; clicking the arrow opens the flyout toolbar above it;
  changing thickness in the combobox updates the arrow live; double-click
  opens a label input; dragging an endpoint reattaches; arrows started from
  edge-handle (prompt 07) work too; clicking the bottom Arrow button with
  no arrow selected opens the toolbar against current defaults and edits
  persist as the new defaults.
