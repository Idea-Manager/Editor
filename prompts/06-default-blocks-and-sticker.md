# Prompt 06 — Default geometric blocks + Sticker

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompts 04 and 05.

## Goal

Implement five built-in `GraphicBlockDefinition`s, register them by default,
and have them render correctly inside the existing SVG world layer + DOM
overlay (no selection or tool wiring yet — that comes in prompts 07–08).

Built-in block kinds:

1. `rectangle`
2. `triangle`
3. `circle`
4. `ellipse`
5. `sticker`

Roadmap references: "Basic blocks" section, plus the Sticker behaviour spec
in the "Bottom panel" section.

## Where things live

```
packages/graphic-editor/src/blocks/
  index.ts                 # registerDefaultBlocks(registry)
  shapes/
    rectangle.ts
    triangle.ts
    circle.ts
    ellipse.ts
    base-shape.ts          # shared helpers (border + bg + text overlay)
    base-shape.scss
  sticker/
    sticker.ts
    sticker.scss
```

## Shared shape data shape

Every shape (rectangle / triangle / circle / ellipse) shares the same
`TData`:

```ts
export interface ShapeData {
  x: number;
  y: number;
  width: number;
  height: number;
  border: { thickness: number; color: string };
  background: string;             // fill of the shape body
  fill: string;                   // optional accent fill (used by future styles; default = background)
  text: string;                   // user input text (default '')
  textColor: string;              // default $color-text token resolved at render
  fontSize: number;               // pt; default 14
}

export const SHAPE_DEFAULTS: ShapeData = {
  x: 0, y: 0, width: 160, height: 100,
  border: { thickness: 1, color: '#000000' },
  background: '#ffffff',
  fill: '#ffffff',
  text: '',
  textColor: '#111111',
  fontSize: 14,
};
```

> The hex fallbacks above are the ROADMAP defaults ("border 1px solid black,
> background white, font-size 14pt"). The renderer must use these literals as
> defaults — but every property is rebindable through the floating window in
> prompt 12. SCSS files for these blocks must still go through design tokens;
> the colour values are stored on the model, not on the stylesheet.

The `defaultData()` for each shape returns `SHAPE_DEFAULTS` shallow-cloned
(deep-clone `border`).

## `base-shape.ts` helpers

Provide:

```ts
export function appendShapeText(
  overlayHost: HTMLElement,
  node: GraphicElement<ShapeData>,
  ctx: GraphicRenderContext,
  bounds: { x: number; y: number; width: number; height: number },
): HTMLElement;

export function readShapeBounds(node: GraphicElement<ShapeData>): { x; y; width; height };

export function getShapeProperties(node: GraphicElement<ShapeData>, ctx: GraphicRenderContext): GraphicBlockProperty[];
```

`appendShapeText` builds a contenteditable `<div class="idea-graphic-shape__text">` placed in
the overlay layer at world coords `(x, y)` size `(width, height)`. Its CSS
applies:

- `display: flex; align-items: center; justify-content: center;`
- `padding: $spacing-sm`
- `text-align: center; word-break: break-word; white-space: pre-wrap;`
- Font size = `node.data.fontSize`pt, color = `node.data.textColor`,
  `font-family: $font-family-base`.
- `outline: none;` always — selection ring is drawn separately.
- Text grows in width up to the bounds, then wraps; height overflow is
  visible (`overflow: visible`) so it can spill below the shape (matches the
  Sticker behaviour). Roadmap: "text could overflow the sticker block and
  should be visible outside of it".

Typing into this `<div>` schedules a debounced `UpdateElementCommand` for
`data.text` (use `mergeWindowMs: 600` so a typing burst becomes a single
undo step). Use `input` event, not `keydown`. On blur, flush any pending
merge by recording an immediate non-merging update.

`getShapeProperties` returns the standard property list used by the floating
window in prompt 12:

```ts
[
  { kind: 'border',     thicknessPath: 'data.border.thickness', colorPath: 'data.border.color' },
  { kind: 'background', colorPath: 'data.background' },
  { kind: 'fill',       colorPath: 'data.fill' },
  { kind: 'textColor',  colorPath: 'data.textColor' },
  { kind: 'fontSize',   path: 'data.fontSize', min: 5, max: 80, unit: 'pt' },
  { kind: 'text',       path: 'data.text', placeholderKey: 'graphic.props.text.placeholder' },
]
```

## Per-shape SVG rendering

Each block file exports a single object via:

```ts
export const RectangleBlock: GraphicBlockDefinition<ShapeData> = { … };
```

`renderSvg` returns an SVGElement positioned at `(x, y)`:

- **Rectangle**: `<rect x="0" y="0" width=w height=h fill={background} stroke={border.color} stroke-width={border.thickness}>` wrapped in a `<g transform="translate(x, y)">`.
- **Triangle**: `<polygon points="w/2,0 w,h 0,h">` (apex up). Same fill/stroke.
- **Circle**: `<circle cx=w/2 cy=h/2 r=Math.min(w,h)/2>`. (Width and height
  are kept independent so the bounding box is symmetric; if `w !== h`, the
  circle stays inscribed in the box and the user can stretch the box, but
  the rendered shape stays a true circle. Document this in a comment.)
- **Ellipse**: `<ellipse cx=w/2 cy=h/2 rx=w/2 ry=h/2>`.

Every shape SVG element MUST set `data-element-id={node.id}` on the outer
`<g>` so the selection manager (prompt 07) can hit-test by event target.

`renderOverlay` returns the result of `appendShapeText(...)` for every
shape — text input is the default content per roadmap.

`pivots` defaults: 4 cardinal points (top, right, bottom, left) at the
midpoint of each edge. Encoded as `[ {x:0.5,y:0,id:'top'}, {x:1,y:0.5,id:'right'}, {x:0.5,y:1,id:'bottom'}, {x:0,y:0.5,id:'left'} ]`.

`getBounds` returns `{ x: data.x, y: data.y, width: data.width, height: data.height }`.

## Sticker block

`packages/graphic-editor/src/blocks/sticker/sticker.ts`:

`StickerData extends ShapeData` with the sticker palette defaults:

```ts
export const STICKER_DEFAULTS: StickerData = {
  ...SHAPE_DEFAULTS,
  width: 180,
  height: 140,
  background: '#fff8b3',  // pastel yellow per roadmap
  border: { thickness: 0, color: '#000000' },  // sticker has no border by default
  textColor: '#111111',
  fontSize: 14,
};
```

- `renderSvg`: a `<rect>` with `rx=8 ry=8` and a soft drop-shadow filter
  defined once in the SVG `<defs>` (see "Filter setup" below).
- `renderOverlay`: same `appendShapeText`, but the `<div>` has the
  `idea-graphic-sticker__text` class which mirrors the same flex/center
  rules and applies a min font of `14pt` (roadmap: "set 14pt as minimal").
  Implement this by clamping `node.data.fontSize` at render time to be at
  least 14 unless the user explicitly chose a different value through the
  floating window — but per "shapes" the floating-window control already
  enforces min 5pt / max 80pt. So for the **sticker** prefer min 14pt; the
  prop spec emitted from `properties()` overrides shapes':

  ```ts
  { kind: 'fontSize', path: 'data.fontSize', min: 14, max: 80, unit: 'pt' }
  ```

- `properties()` returns the sticker-specific list:

  ```ts
  [
    { kind: 'text', path: 'data.text', placeholderKey: 'graphic.props.text.placeholder' },
    { kind: 'background', colorPath: 'data.background' },
    { kind: 'textColor', colorPath: 'data.textColor' },
    { kind: 'fontSize', path: 'data.fontSize', min: 14, max: 80, unit: 'pt' },
  ]
  ```

  No border / fill props — the sticker doesn't use them.

- Sticker `groupKey` is intentionally `undefined` so the sticker shows up in
  the bottom-toolbar Stickers tool (prompt 08), not in the left-panel
  "Shapes" group.

### Filter setup

In `canvas-renderer.ts`, when initialising the `<svg>`, append a `<defs>`
containing:

```xml
<filter id="idea-graphic-sticker-shadow-{instanceId}" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgb(0,0,0)" flood-opacity="0.18"/>
</filter>
```

Sticker `<rect>` references this filter via `filter="url(#idea-graphic-sticker-shadow-{instanceId})"`.
Use the same `instanceId` already issued by `canvas-renderer.ts` for the dot
grid pattern.

## Default block group registration

Add `registerDefaultBlocks(registry: GraphicBlockRegistry)` in
`packages/graphic-editor/src/blocks/index.ts`:

```ts
export function registerDefaultBlocks(registry: GraphicBlockRegistry): void {
  registry.register({ ...RectangleBlock, groupKey: 'shapes' });
  registry.register({ ...TriangleBlock, groupKey: 'shapes' });
  registry.register({ ...CircleBlock, groupKey: 'shapes' });
  registry.register({ ...EllipseBlock, groupKey: 'shapes' });
  registry.register({ ...StickerBlock /* no groupKey on purpose */ });
}
```

`GraphicEditor.init()` (prompt 04) must construct a `GraphicBlockRegistry`
and call `registerDefaultBlocks(registry)` unless
`options.skipDefaultBlocks === true`. Add that option:

```ts
GraphicEditorOptions {
  …existing fields…;
  skipDefaultBlocks?: boolean;
  /** Custom blocks to register in addition to (or instead of) the defaults. */
  blocks?: GraphicBlockDefinition[];
}
```

`init()` flow:

1. Create `registry`.
2. If `!options.skipDefaultBlocks`, call `registerDefaultBlocks(registry)`.
3. Register every entry of `options.blocks ?? []`.
4. Stash the registry on the `GraphicContext`.

Update prompt 04's `GraphicContext` to expose `registry: GraphicBlockRegistry`
(this prompt does the wiring).

## Renderer integration

Extend `canvas-renderer.ts` with:

```ts
class CanvasRenderer {
  /** Re-render the active page. Idempotent; called on every relevant event. */
  renderPage(page: GraphicPageNode): void;
}
```

- Iterate `page.elements`. For each element, look up
  `registry.get(element.type)` and call `renderSvg`. Append to the world
  `<g>`. If `renderOverlay` returns a non-null node, append it to the
  overlay layer with `position: absolute; left:0; top:0; transform:
  translate(${data.x * zoom - vp.x*zoom}px, ${data.y * zoom - vp.y*zoom}px) scale(${zoom})`;
  set width/height in style.
- Maintain a cache `Map<elementId, { svg, overlay }>` and reuse / patch
  rather than fully re-creating on each tick. For this prompt, a full
  rebuild on `doc:change` is acceptable for correctness; mark with a
  `// TODO(perf):` comment.
- React to events on the bus: `'element:add' | 'element:remove' | 'element:update' | 'frame:add' | 'frame:remove' | 'frame:update' | 'doc:change' | 'viewport:change'`. Re-render on each. Frames have no visual representation yet (added in prompt 09 stub: a 1px dashed `$gray-400` rect with a name label) — for this prompt you may render frames as the same dashed-rect placeholder so debugging is easier; prompt 09 will refine.

## i18n keys to add (en + uk)

```
graphic.block.rectangle    Rectangle
graphic.block.triangle     Triangle
graphic.block.circle       Circle
graphic.block.ellipse      Ellipse
graphic.block.sticker      Sticker
graphic.group.shapes       Shapes
graphic.props.text.placeholder   Type something…
graphic.props.border       Border
graphic.props.background   Background
graphic.props.fill         Fill
graphic.props.textColor    Text color
graphic.props.fontSize     Font size
```

Provide Ukrainian equivalents.

## Tests

- `__tests__/shapes.test.ts` — every shape definition: defaultData clone is
  independent (mutating one's `border` doesn't affect another's); `getBounds`
  matches `data`; `renderSvg` returns an `<g>` with `data-element-id`; pivots
  array is the expected 4-tuple.
- `__tests__/sticker.test.ts` — `StickerBlock` defaults match
  `STICKER_DEFAULTS`; `properties()` returns 4-entry list with `min: 14`;
  `renderSvg` references the shadow filter.
- `__tests__/register-default-blocks.test.ts` — calling
  `registerDefaultBlocks` produces the expected `getGroups()` result:
  one `shapes` group with 4 entries plus an `__ungrouped` group containing
  Sticker.
- `__tests__/canvas-renderer.test.ts` — given a page with two rectangles and
  one sticker, `renderPage` populates the world `<g>` with three SVG nodes
  and the overlay with three text nodes, all positioned at the right
  world-space transform. (Mock the viewport at `{x:0,y:0,zoom:1}`.)

## Don'ts

- **Do not** introduce selection rectangles, resize circles, or arrow edge
  handles here — that is prompt 07.
- **Do not** wire the bottom toolbar — that is prompt 08.
- **Do not** add the floating properties window — that is prompt 12.
- **Do not** add per-block-type style memory layering — prompt 12 introduces
  it via `AddElementCommand`'s `dataOverride` argument.
- **Do not** add raw colour hexes to SCSS files; SCSS goes through tokens.
  Hex literals in `.ts` defaults are ALLOWED because they live in the
  document model.

## Acceptance criteria

- `npm test` green.
- `npm run check:graphic-editor-imports` and `npm run check:text-editor-imports` pass.
- `npm run build` succeeds.
- A graphic page programmatically containing one of each block kind renders
  visually correct: shapes have black 1px border + white bg; sticker has
  pastel yellow + soft shadow + 14pt centred text input.
