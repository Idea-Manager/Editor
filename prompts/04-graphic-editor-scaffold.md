# Prompt 04 — Graphic editor package scaffold (canvas + viewport)

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 01.

## Goal

Create the `packages/graphic-editor/` package and a working host-agnostic
`GraphicEditor` HTMLElement that:

- Mounts an SVG world group + DOM overlay layer,
- Draws the dotted-grid background described in the roadmap,
- Tracks viewport `{x, y, zoom}` in `GraphicPageNode.viewport`,
- Supports mouse-wheel zoom (cursor-anchored) and middle-mouse / spacebar pan,
- Renders a bottom-right zoom panel `[Zoom: zoom-in zoom-out]`,
- Persists viewport changes through a `Command` so undo / redo restores them.

It does NOT render any blocks yet (prompts 05–06) and has no tools yet
(prompt 08). It is the structural foundation everything else lives on.

## Mirror the text editor architecture

Use `packages/text-editor/src/engine/text-editor.ts` as the structural
reference:

- A custom element `class GraphicEditor extends HTMLElement` with `init(doc,
  eventBus, undoRedoManager, options)`.
- A `GraphicContext` analogous to `EditorContext`.
- A `GraphicRenderContext` analogous to `RenderContext`.
- Style loading via `?inline` SCSS imports (jest mocks already cover
  `\\.scss\\?inline$`).

## Package layout to create

```
packages/graphic-editor/
  src/
    index.ts                       # public API exports
    engine/
      graphic-editor.ts            # custom element, init/render/destroy
      graphic-editor.scss          # canvas + overlay base styles
      graphic-context.ts           # interface
      render-context.ts            # interface
      viewport-controller.ts       # pan/zoom logic, screen<->world transforms
      canvas-renderer.ts           # builds and updates SVG/DOM layers
      selection-manager.ts         # stub for prompt 07 (just typed shell)
      tool-state.ts                # stub for prompt 08 (just typed shell)
      commands/
        set-viewport-command.ts
    layout/
      zoom-panel.ts
      zoom-panel.scss
    i18n/
      keys.ts                      # see below
    __tests__/
      graphic-editor.test.ts
      viewport-controller.test.ts
      set-viewport-command.test.ts
```

## `index.ts` exports

Public surface (additive — others will be added by later prompts):

```ts
export { GraphicEditor } from './engine/graphic-editor';
export type { GraphicEditorOptions } from './engine/graphic-editor';
export type { GraphicContext } from './engine/graphic-context';
export type { GraphicRenderContext } from './engine/render-context';
export { ViewportController } from './engine/viewport-controller';
export type { Viewport, ViewportChangeReason } from './engine/viewport-controller';
export { SetViewportCommand } from './engine/commands/set-viewport-command';
```

## `GraphicEditor` (custom element)

```ts
export interface GraphicEditorOptions {
  locale?: Locale;
  /** Active page id; default: first existing page or auto-create one named "Untitled". */
  pageId?: string;
  /** When false, skip the bundled CSS injection. Default true. */
  includeDefaultStyles?: boolean;
  /** Optional extra style text added per host. */
  extraStyleText?: string;
  /** Optional locale overrides — merged on top of the active locale. */
  i18nOverrides?: Partial<TranslationDictionary>;
}

export class GraphicEditor extends HTMLElement {
  connectedCallback(): void;          // creates root structure
  init(doc: DocumentNode, eventBus: EventBus, undoRedoManager: UndoRedoManager, options?: GraphicEditorOptions): void;
  disconnectedCallback(): void;       // cleanup
  getContext(): GraphicContext;
  getViewport(): Viewport;
  /** Replace document root (e.g. after JSON import). */
  replaceDocument(doc: DocumentNode): void;
  /** Switch to a different graphic page. */
  setPage(pageId: string): void;
}

if (typeof customElements !== 'undefined' && !customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}
```

Style injection: copy the `STYLE_ID` / `EXTRA_STYLE_CLASS` pattern from
`packages/text-editor/src/engine/text-editor.ts`. Use a SEPARATE id
(`idea-graphic-editor-styles`) so the two packages don't collide.

## DOM structure (root → leaves)

```html
<idea-graphic-editor class="idea-graphic-editor">
  <div class="idea-graphic-canvas" tabindex="0">
    <!-- the SVG covers the full canvas; pointer events go to the SVG/overlay -->
    <svg class="idea-graphic-canvas__svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="idea-graphic-dot-grid-{instanceId}"
                 width="20" height="20" patternUnits="userSpaceOnUse">
          <!-- 1.5px circle of $gray-200 in screen space; see "Background" below -->
        </pattern>
      </defs>
      <rect class="idea-graphic-canvas__bg" fill="url(#idea-graphic-dot-grid-{instanceId})" />
      <g class="idea-graphic-canvas__world"></g><!-- shapes/arrows/paths inside -->
    </svg>
    <div class="idea-graphic-canvas__overlay">
      <!-- absolute-positioned DOM that mirrors the world transform -->
    </div>
  </div>
  <div class="idea-graphic-canvas__zoom-panel">…</div>
</idea-graphic-editor>
```

The `.idea-graphic-canvas` element fills the container and is the only thing
the host needs to size.

## Background (dotted grid)

- Fixed in **screen space** (does NOT scale with zoom — matches AFFiNE / draw.io
  feel and stays readable at extreme zooms). Use a CSS background with
  `background-image: radial-gradient(circle, $gray-200 1px, transparent 1.5px); background-size: 20px 20px;` on `.idea-graphic-canvas` (NOT on the SVG `<rect>` — easier to keep screen-space). Translate the background by `-vp.x * vp.zoom % 20px, -vp.y * vp.zoom % 20px` so it appears to drift as the user pans, while staying crisp.

> If implementing the SVG `<pattern>` route is simpler in your hands, that is
> fine — both approaches achieve the same visual. The background MUST stay at
> a constant 20px screen-space spacing. Document the choice in a comment.

## Viewport controller

```ts
export interface Viewport { x: number; y: number; zoom: number; }
export type ViewportChangeReason = 'pan' | 'wheel-zoom' | 'panel-zoom' | 'reset' | 'set';

export class ViewportController {
  constructor(getViewport: () => Viewport, setViewport: (next: Viewport, reason: ViewportChangeReason) => void);

  /** Convert (clientX, clientY) on the canvas root to world coords. */
  clientToWorld(clientX: number, clientY: number, canvas: HTMLElement): { x: number; y: number };
  /** Convert world (x,y) to client coords. */
  worldToClient(x: number, y: number, canvas: HTMLElement): { x: number; y: number };

  /** Wheel-zoom around a screen anchor point. clamps zoom to [0.1, 8]. */
  zoomAt(anchor: { x: number; y: number }, factor: number, canvas: HTMLElement): void;
  /** Pan by a delta in screen pixels. */
  panBy(dx: number, dy: number): void;
  /** Set the zoom anchored at the canvas centre. Used by the zoom panel buttons. */
  zoomBy(factor: number, canvas: HTMLElement): void;

  /** Returns the current world transform applied by the renderer. */
  getWorldTransform(): { translateX: number; translateY: number; scale: number };
}
```

- Wheel zoom factor: `1.1 ^ (-deltaY * 0.01)`. Clamp final zoom to `[0.1, 8]`.
- Pan triggered by:
  - Middle mouse button drag (button === 1),
  - Holding **Space** + left-mouse drag (mirroring Figma / draw.io UX).
- Every viewport change is **persisted** to `GraphicPageNode.viewport` via a
  `SetViewportCommand`. Wheel/pan are coalesced via the `Command.merge`
  protocol so a continuous zoom or pan creates one undo step, not hundreds.

## `SetViewportCommand`

```ts
export class SetViewportCommand implements Command {
  readonly operationRecords: OperationRecord[];
  constructor(
    private readonly doc: DocumentNode,
    private readonly pageId: string,
    private readonly nextViewport: Viewport,
    private readonly reason: ViewportChangeReason,
  );
  execute(): void;
  undo(): void;
  /** Coalesce consecutive viewport changes of the same reason within 500ms. */
  merge(next: Command): boolean;
}
```

- Generate one `OperationRecord` of type `node:update` with
  `path: 'viewport'` and `nodeId: pageId` so future CRDT replay is well-defined.
- `merge` returns `true` only if `next` is also a `SetViewportCommand` with the
  same `pageId` and `reason`, AND fewer than 500 ms have elapsed since this
  command's last update — overwrite `nextViewport` to the new one.

## Page bootstrap

When `init()` runs:

1. If `options.pageId` resolves to an existing page, use it.
2. Otherwise, if `doc.graphicPages` has entries, use the first one.
3. Otherwise, create a new `GraphicPageNode` with `name: i18n.t('graphic.page.untitled')`,
   push it to `doc.graphicPages`, and use it. Don't make this an undoable
   command (it is a bootstrap, not a user action).

Use `createGraphicPage(name)` from `@core/model/factory.ts` if it exists; if
not, just inline an equivalent.

> Note: `createGraphicPage` IS exported from `@core/index` already — use it.

## Zoom panel (DOM)

`.idea-graphic-canvas__zoom-panel` fixed at `bottom: $spacing-md; right:
$spacing-md;` inside the canvas. Two icon buttons:

- `zoom_in` — calls `viewport.zoomBy(1.2, canvas)`
- `zoom_out` — calls `viewport.zoomBy(1 / 1.2, canvas)`

Roadmap structure: `[Zoom: {icon zoom-in} {icon zoom-out}]`. Render the literal
label via `i18n.t('graphic.zoom.label')` followed by the two icon buttons in a
small pill container. Add tooltips via `title=""` attribute using
`i18n.t('graphic.zoom.in')` and `i18n.t('graphic.zoom.out')`.

Optional: a small middle text showing `${Math.round(zoom * 100)}%` updated on
the `viewport:change` event. The roadmap doesn't require it — include it
because it's almost free.

## i18n keys to add (both `en.ts` and `uk.ts`)

```
graphic.page.untitled    Untitled page             Без назви
graphic.zoom.label       Zoom:                      Масштаб:
graphic.zoom.in          Zoom in                    Збільшити
graphic.zoom.out         Zoom out                   Зменшити
graphic.viewport.percent {percent}%                 {percent}%
```

(Adjust Ukrainian wording as appropriate.)

## Events

Emit on `eventBus`:

- `'frame:add' | 'frame:remove' | 'frame:update'` — these already exist in the
  union. **Don't add new event types** unless you must. For viewport changes,
  reuse `'doc:change'` on every committed `SetViewportCommand` (the existing
  text editor already listens to `doc:change`); plus emit a NEW
  `'viewport:change'` event ONLY if you can't avoid it. If you do add it,
  update the `EditorEvent` union in `packages/core/src/events/event-bus.ts`
  with one new member and add a unit test that the bus emits it.

> **Recommendation**: add `'viewport:change'` to the union — it is a true new
> concept and the text editor never used the term. It will save coupling later.

## Webpack / Jest / TS

- The aliases for `@graphic-editor/*` are already in `tsconfig.json`,
  `webpack/webpack.common.js`, and `jest.config.js`.
- Add a Jest project for the new package:

  ```js
  {
    ...sharedConfig,
    displayName: 'graphic-editor',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/packages/graphic-editor'],
  },
  ```

- Mirror the import-guard for the text editor:
  - Update `scripts/check-text-editor-imports.mjs` (or add a sibling
    `scripts/check-graphic-editor-imports.mjs`) that fails if anything in
    `packages/graphic-editor/src/**` imports from the repo root `src/` tree.
  - Add an `npm` script `"check:graphic-editor-imports"` to `package.json`.
  - Make the existing `"test"` task or a CI step run it (a `pretest` hook is
    fine).

## Tests

- `__tests__/viewport-controller.test.ts` — `clientToWorld` / `worldToClient`
  round-trip; `zoomAt` keeps the anchor point fixed in world coords; `panBy`
  applies the inverse-zoom rule; clamp to `[0.1, 8]`.
- `__tests__/set-viewport-command.test.ts` — execute/undo restores prior
  viewport; `merge` coalesces same-reason commands within 500 ms.
- `__tests__/graphic-editor.test.ts` — `init` creates a page when none
  exists; mounts SVG world group and overlay; emits `'doc:change'` and
  `'viewport:change'` after a wheel zoom; `replaceDocument()` rebinds without
  leaks.

## Wire into the demo (smoke check only — not yet routed by toggle)

Do **not** modify `src/layout/app-shell.ts` yet. Instead, add a
`packages/graphic-editor/dev-mount.ts` (excluded from production tree by being
referenced only when a flag is set) — or, simpler: append a temporary import
in `src/main.ts` behind `if (false)` for the duration of this prompt's manual
verification, then remove it before submitting.

The mode toggle and AppShell wiring are the responsibility of prompt 15.

## Don'ts

- **Do not** introduce any block kinds, tools, selection logic, or arrows in
  this prompt — those are prompts 05–11.
- **Do not** import from `src/` inside the package (the new import-guard must
  pass).
- **Do not** modify `document.schema.json`.
- **Do not** create raw SVG icons — use Material Symbols via `createIcon`.

## Acceptance criteria

- `npm test` green (including the three new tests above).
- `npm run check:text-editor-imports` and `npm run check:graphic-editor-imports`
  both pass.
- `npm run build` succeeds.
- Manual: temporarily mount the GraphicEditor in dev, wheel-zoom keeps the
  cursor point fixed, middle-drag pans, the zoom panel buttons step zoom,
  undo / redo restore prior viewports.
