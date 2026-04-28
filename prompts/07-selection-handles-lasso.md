# Prompt 07 — Selection, handles, lasso, drag, delete

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 06.

## Goal

Bring elements to life: clicking selects, dragging moves, dragging the
background lassoes, corner circles resize, edge arrow handles preview a new
arrow (the actual arrow creation is wired in prompt 11), the top-left grip
icon moves the element, and Delete / Backspace removes the selection.

This prompt only covers SHAPES, STICKERS, and PATHS (paths arrive in prompt
10 and use the same selection plumbing). Arrows have a different selection
shape and are handled in prompt 11.

## Scope of behavior (from roadmap)

- Click selects single element. Click on empty canvas clears selection.
- Shift-click toggles an element in/out of the selection.
- Drag on empty canvas → lasso rectangle (semi-transparent fill, dashed
  border). On mouseup, every element whose AABB intersects the lasso is
  selected.
- Selection bounding rectangle: black dashed 1px outline that fits all
  selected elements' combined AABB.
- 4 corner resize circles: 6px radius, 1px dashed black border, light blue
  fill (token: `$color-graphic-handle-fill` — define if missing).
- 4 edge arrow handles: small black `arrow_forward`-style triangles, one at
  the centre of each edge, only visible when **hovering** a single selected
  element. Clicking starts an arrow drag (this prompt only fires a
  `'graphic:start-arrow'` intent on the eventBus; prompt 11 wires it).
- Top-left grip icon: same Material symbol used in the text editor (`drag_indicator`)
  positioned just OUTSIDE the bounding rect's left edge, vertically aligned
  to the top. Drag = move element (or whole selection if multi).
- Delete / Backspace removes selection.

## Files to add / change

```
packages/graphic-editor/src/engine/
  selection-manager.ts                  # promote stub from prompt 04
  selection-manager.scss                # selection ring + handles styles
  drag-controller.ts                    # element drag (move) controller
  resize-controller.ts                  # corner resize controller
  lasso-controller.ts                   # background drag → lasso rectangle
  hit-tester.ts                         # AABB hit-test helpers (world-space)
  commands/
    move-selection-command.ts
    resize-element-command.ts
  __tests__/
    selection-manager.test.ts
    drag-controller.test.ts
    resize-controller.test.ts
    hit-tester.test.ts
```

`canvas-renderer.ts` is extended (do not duplicate it) to call back into the
selection manager during render.

## `SelectionManager`

```ts
export interface SelectionEntry { type: 'element' | 'frame'; id: string; }

export class GraphicSelectionManager {
  constructor(ctx: GraphicContext);

  getSelection(): SelectionEntry[];
  has(id: string): boolean;
  setSelection(entries: SelectionEntry[]): void;     // emits selection:change
  add(entry: SelectionEntry): void;
  remove(id: string): void;
  clear(): void;

  /** AABB of the current selection in world coords; null if empty. */
  getBoundingRect(): { x: number; y: number; width: number; height: number } | null;

  /** Render selection visuals into the overlay layer; called by the renderer per tick. */
  renderOverlay(host: HTMLElement, page: GraphicPageNode, renderCtx: GraphicRenderContext): void;

  /** Called by the canvas root pointerdown handler (after tool state vetoes). */
  handlePointerDown(event: PointerEvent, target: HitTarget | null): void;

  /** Cleanup. */
  destroy(): void;
}
```

`HitTarget` is the result of `hit-tester.ts`:

```ts
export type HitTarget =
  | { kind: 'element'; element: GraphicElement }
  | { kind: 'frame'; frame: FrameElement }
  | { kind: 'handle'; handle: HandleId }
  | { kind: 'arrow-edge'; edge: 'top' | 'right' | 'bottom' | 'left'; element: GraphicElement }
  | { kind: 'grip'; element: GraphicElement };

export type HandleId =
  | 'corner-nw' | 'corner-ne' | 'corner-se' | 'corner-sw';

export function hitTest(page: GraphicPageNode, registry: GraphicBlockRegistry, world: { x: number; y: number }, selection: SelectionEntry[]): HitTarget | null;
```

Implement hit-testing as: handles → grip → arrow-edge → element body → frame.
"Handles" / "grip" / "arrow-edge" only fire when their owning element is
selected (handles) or hovered (arrow-edge handles).

`renderOverlay` builds a single child `<div class="idea-graphic-selection">`
containing:

- The dashed bounding rect (`<div class="idea-graphic-selection__rect">`),
  positioned in **screen** coords (compute from world bounds + viewport
  transform). 1px dashed `$color-text` (= near-black).
- Four corner handles (`<div class="idea-graphic-selection__handle idea-graphic-selection__handle--corner-{nw|ne|se|sw}">`) sized 12px (radius 6px).
- The grip icon `<button class="idea-graphic-selection__grip" title="i18n('graphic.handle.move')">` placed at `left: -24px; top: 0;` relative to the dashed rect.
- Edge arrow handles: only when the bounding rect represents a single
  selected non-arrow element AND the pointer is currently within `8px` of
  that element. Hide otherwise. Use `display: none` to avoid layout work.

Re-render on selection change OR viewport change OR doc change.

## Move (drag)

`drag-controller.ts`:

- Triggers when `selection-manager.handlePointerDown` got a `kind: 'element'`,
  `kind: 'frame'`, or `kind: 'grip'` target AND the active tool is the
  selection tool (prompt 08 will set this; for now treat absence-of-tool as
  selection mode).
- Listens to `pointermove` on `window` to apply translation deltas in screen
  coords, dividing by zoom to get world deltas.
- During the drag, mutate element `data.x` / `data.y` directly for visual
  responsiveness BUT ALSO emit a single `MoveSelectionCommand` on
  `pointerup`. Roll back the live mutation if `pointerup` is cancelled.
- Snap-to-grid: 1px (no snapping) by default; provide a `snap?: number`
  option in `MoveSelectionCommand` for future use; document it but do not
  expose in UI yet.

```ts
export class MoveSelectionCommand implements Command {
  constructor(input: { doc: DocumentNode; pageId: string; entries: SelectionEntry[]; dx: number; dy: number });
  // Composite of MoveElementCommand instances per element + frame translation
  // (frame translation also moves attached children — see prompt 09).
}
```

For this prompt, frames don't yet exist as a tool — but frames CAN be in the
document (you've stubbed them). Translating a frame must also translate its
`childElementIds`. Code that explicitly. Prompt 09 adds the FRAME tool /
attach logic and reuses this same translation rule.

## Resize

`resize-controller.ts`:

- Triggers on pointerdown of a corner handle.
- Computes new `width` / `height` (and new `x` / `y` for nw / ne / sw)
  preserving aspect ratio when SHIFT is held.
- Minimum size: `width >= 8 && height >= 8` (clamp).
- On `pointerup`, push a `ResizeElementCommand` (single element only — multi
  resize is out of scope for this iteration; the dashed rect for multi
  selections shows handles but they call only the single-element resize for
  whichever element's local handle is closest under the cursor — wait no,
  for multi-select disable the corner handles entirely. Render them only
  for single-element selection. This matches the AFFiNE / draw.io UX.)
- `ResizeElementCommand` produces 4 `node:update` ops (`x`, `y`, `width`,
  `height`) — emit them in one composite so undo restores all four.

## Lasso

`lasso-controller.ts`:

- Triggers when `pointerdown` on the canvas root with `target === null` from
  hit-tester AND the selection tool is active.
- Renders a `<div class="idea-graphic-lasso">` over the overlay with
  semi-transparent fill `rgba($color-primary, 0.10)` and 1px dashed
  `$color-primary` border.
- On `pointermove`, recompute the screen rect; on `pointerup`, convert to
  world rect and call `selection-manager.setSelection(entries)` with every
  page element whose AABB intersects (use `hit-tester.aabbIntersect`). Hold
  Shift to ADD to existing selection.

## Delete / Backspace

Add a key listener at the canvas root level. On `Delete` or `Backspace`
when:

- Focus is inside the canvas root,
- Active selection is non-empty,
- The event target is NOT a contenteditable / input element,

→ Push a `RemoveElementCommand` for each entry in a single `CompositeCommand`
named `RemoveSelectionCommand` (export it from
`engine/commands/remove-selection-command.ts`). Emit `selection:change` to
empty after.

## Edge arrow handles

When hovering a single-selected non-arrow element (one inside the dashed
rect), show a small `arrow_forward`-icon triangle at the centre of each
edge, OUTSIDE the rect by 8px. On `pointerdown`:

1. Stop event propagation.
2. Emit on the eventBus: `{ type: 'graphic:start-arrow', sourceElementId, edge, anchorWorld }`.
3. Prompt 11 wires the arrow tool to listen for this event and start an
   arrow drag from that anchor.

> Add `'graphic:start-arrow'` to the `EditorEvent` union in
> `packages/core/src/events/event-bus.ts` AND add a unit test that the bus
> emits it. Keep the payload small and self-describing.

## i18n keys (en + uk)

```
graphic.handle.move        Move
graphic.handle.resize-nw   Resize from top-left
graphic.handle.resize-ne   Resize from top-right
graphic.handle.resize-se   Resize from bottom-right
graphic.handle.resize-sw   Resize from bottom-left
graphic.handle.start-arrow Start arrow
```

## Style tokens to add to `_variables.scss` (if not present)

```
$color-graphic-selection: $color-primary;     // bounding rect dashed stroke
$color-graphic-handle-stroke: $black;         // 1px dashed
$color-graphic-handle-fill: $color-primary;   // light blue fill (already monochrome-friendly via primary)
$color-graphic-lasso-bg: rgba($color-primary, 0.1);
```

If `$color-primary` is currently a gray (per the monochrome rule), introduce
a single `$color-graphic-accent` token for the visual blue used by handles
and lasso. Add it both as `$color-graphic-handle-fill` and
`$color-graphic-lasso-bg` to keep a single source. Document the deviation
in `_variables.scss`: this is the lone graphic-editor accent colour.

## Tests

- `selection-manager.test.ts` — set/add/remove/clear; `getBoundingRect` for
  zero / one / many selections; emits `selection:change` exactly when set
  changes.
- `drag-controller.test.ts` — pointermove deltas converted by zoom; on
  pointerup pushes a `MoveSelectionCommand`; cancel via `pointercancel`
  rolls back; frame drag also translates child elements.
- `resize-controller.test.ts` — corner handle drags update x/y/width/height;
  Shift preserves aspect ratio; minimum 8px clamp.
- `hit-tester.test.ts` — handle > grip > edge > body order; `aabbIntersect`
  edge cases (touching edges count as intersect — needed by frame attach).
- `lasso-controller.test.ts` — background drag selects everything inside;
  Shift adds to current selection.
- Integration test for Delete / Backspace → removal command pushed.

## Don'ts

- **Do not** wire selection visuals to the SVG world layer — they live in
  the DOM overlay so handle sizes stay in screen space (12px circles) at any
  zoom.
- **Do not** consume keyboard events when an `<input>` / contenteditable is
  focused inside the overlay (sticker text input). Always check
  `(event.target as HTMLElement).closest('[contenteditable], input, textarea')`.

## Acceptance criteria

- `npm test` green (selection / drag / resize / lasso / hit-tester suites).
- `npm run check:graphic-editor-imports` passes.
- Manual: in dev, single-click selects a shape, dashed rect appears, corner
  handles resize, grip moves the element, Delete removes it; lasso selects
  multiple shapes; multi-selection shows a single bounding rect (no corner
  handles).
