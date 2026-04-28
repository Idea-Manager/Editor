# Prompt 10 — Pen tool (freehand path)

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 08.

## Goal

Add the Pen tool. Drag draws a freehand stroke that becomes a single
`GraphicElement` of `type: 'path'` with smoothed point list.

User decision (locked in `00-INDEX.md`):

> Freehand only for now. Each stroke is one `GraphicElement` of `type:
> 'path'`, data `{ points, stroke, strokeWidth, ... }`.

## Files to add

```
packages/graphic-editor/src/blocks/path/
  path-block.ts                    # GraphicBlockDefinition for type 'path'
  path-block.scss
  smooth-points.ts                 # Catmull-Rom or Chaikin smoothing helper
  __tests__/path-block.test.ts
  __tests__/smooth-points.test.ts
packages/graphic-editor/src/engine/
  pen-controller.ts
  __tests__/pen-controller.test.ts
packages/graphic-editor/src/engine/commands/
  add-path-command.ts
  __tests__/add-path-command.test.ts
```

## `PathData`

```ts
export interface PathData {
  /** World-space points along the stroke; already smoothed. */
  points: Array<{ x: number; y: number }>;
  /** Stroke colour, defaults to $color-text-secondary at creation time. */
  stroke: string;
  /** Stroke thickness in px (constant; no pressure curves yet). */
  strokeWidth: number;
  /** Optional rounded line caps. Default 'round'. */
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  /** AABB cached for hit-testing; recomputed when points change. */
  bounds: { x: number; y: number; width: number; height: number };
}

export const PATH_DEFAULTS = {
  stroke: '#444444',
  strokeWidth: 2,
  lineCap: 'round',
  lineJoin: 'round',
};
```

> Hex literals on data defaults are allowed (see prompt 06).

## `PathBlock`

A `GraphicBlockDefinition<PathData>` registered for `type: 'path'`.
Properties:

- `type: 'path'`
- `labelKey: 'graphic.block.path'`
- `icon: 'edit'`
- `groupKey: undefined` — not in the left panel; created only via the Pen
  tool.
- `defaultData()` returns `{ points: [], stroke: PATH_DEFAULTS.stroke, strokeWidth: PATH_DEFAULTS.strokeWidth, lineCap, lineJoin, bounds: { x: 0, y: 0, width: 0, height: 0 } }`.
- `renderSvg(node)` returns:

  ```xml
  <g data-element-id={id}>
    <path d={toPathD(points)} fill="none"
          stroke={stroke} stroke-width={strokeWidth}
          stroke-linecap={lineCap} stroke-linejoin={lineJoin}/>
  </g>
  ```

  `toPathD(points)` produces an `M`/`L` polyline (or `Q` quadratic curves
  through smoothed control points — see smoothing).

- `renderOverlay()` returns `null` (paths have no text).
- `properties()` returns:

  ```ts
  [
    { kind: 'fill',     colorPath: 'data.stroke' },           // labelled "Color" in the property panel
    { kind: 'fontSize', path: 'data.strokeWidth', min: 1, max: 20, unit: 'px' }, // reuse fontSize control as a "thickness" numeric, see prompt 12 note
  ]
  ```

  > Prompt 12 specialises labels so this still reads as "Color" / "Thickness".

- `getBounds(node)` returns `node.data.bounds`.

## Smoothing

`smooth-points.ts` provides:

```ts
export function smoothPoints(raw: Array<{x:number;y:number}>, options?: { tolerance?: number }): Array<{x:number;y:number}>;
export function toPathD(points: Array<{x:number;y:number}>): string;
```

- `smoothPoints` runs Ramer–Douglas–Peucker simplification with default
  `tolerance = 0.6` (world units), then a single pass of Chaikin smoothing
  (or Catmull-Rom interpolation of choice). Whatever you implement, document
  the choice and stay deterministic for tests.
- `toPathD` returns `M x y L x y …` with at least an `M` for the first
  point. For ≥3 points emit quadratic curves through midpoints (Catmull
  style) for visual smoothness. Tests will assert the resulting `d` string
  starts with `M` and contains the right number of segments.

## `PenController`

Active when `toolState.getTool() === 'pen'`.

- `pointerdown` on the canvas root → start a new stroke. Capture the
  pointer (`canvas.setPointerCapture(event.pointerId)`).
- `pointermove` → push converted-to-world coords to a buffer. Throttle to
  the animation frame; render a temporary `<path>` in the world `<g>` with
  the running buffer (no smoothing during drag — show raw points; smooth on
  commit so it feels responsive).
- `pointerup`:
  1. If the buffer has fewer than 3 points, abort (treat as a misclick).
  2. Run `smoothPoints(buffer)`.
  3. Compute `bounds` from min/max across the smoothed points.
  4. Push `AddPathCommand` with the smoothed points.
- ESC during drawing aborts and removes the temporary path.

## `AddPathCommand`

```ts
class AddPathCommand implements Command {
  constructor(input: {
    doc: DocumentNode;
    pageId: string;
    points: Array<{x:number;y:number}>;
    overrides?: Partial<PathData>;     // for future preference plumbing
  });
}
```

- Generates a new id with `generateId('el')`.
- Builds `PathData` from `PATH_DEFAULTS` + `overrides` + the points + bounds.
- Pushes the element via the same code path as `AddElementCommand` so it
  can also auto-attach to an enclosing frame (prompt 09 rule). To avoid
  duplicating logic, internally call `new AddElementCommand({ … })` with
  `dataOverride: pathData` and let the existing composite handle frame
  attach. Confirm by inspecting the operation log in the test.

## Hit-testing for paths

Update `hit-tester.ts` to detect path elements via either:

- AABB pre-filter using `data.bounds` plus a per-segment line distance test
  (proximity within `max(strokeWidth, 4)` world units), OR
- A simpler box test if line-distance is not feasible in the time budget;
  document the choice. Lasso uses AABB intersection only (matches other
  blocks).

Selection visuals for paths reuse the dashed bounding rect from prompt 07.
Corner resize handles are NOT shown for paths in this iteration (resizing a
path is non-trivial and out of scope). Document this and add an `if
(element.type === 'path') return` guard in the resize-handle renderer.

## i18n keys (en + uk)

```
graphic.block.path           Drawing
graphic.props.color          Color
graphic.props.thickness      Thickness
graphic.tool.pen.hint        Drag to draw a freehand stroke
```

## Tests

- `smooth-points.test.ts` — RDP collapses collinear points; Chaikin pass
  produces deterministic intermediate points; `toPathD` starts with `M`.
- `path-block.test.ts` — defaults; `getBounds` returns `data.bounds`;
  `renderSvg` outputs `<path>` with attributes from data.
- `pen-controller.test.ts` — pointerdown→move sequence builds a buffer;
  pointerup with <3 points aborts; pointerup with ≥3 points pushes
  `AddPathCommand` with smoothed points and computed bounds; ESC cancels.
- `add-path-command.test.ts` — element added to page; attaches to enclosing
  frame; undo restores prior state.

## Don'ts

- **Do not** add Bezier control points or the geometric "Pen tool" UX
  (click-to-place anchors). The roadmap explicitly chose freehand for now.
- **Do not** persist pressure or velocity yet — `strokeWidth` is constant.

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual: with the Pen tool active, dragging the canvas draws a smooth
  stroke; the stroke is selectable; undo removes it; clicking elsewhere
  with the pen still active starts a new stroke without disturbing the
  previous one.
