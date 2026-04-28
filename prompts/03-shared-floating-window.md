# Prompt 03 — Shared `FloatingWindow` component

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.

## Goal

Add a reusable, draggable + resizable floating window to
`shared/components/floating-window/`. It will be used by the graphic editor as
the "properties of selected block(s)" surface. It contains an `Accordion` (from
prompt 02) inside its body — but this component itself is generic and does not
know about graphic editor concepts.

## Behaviour (verbatim from the roadmap, section "Floating window")

- Draggable across the host area by its title bar.
- Resizable from any border AND any corner. Visible resize-grip icon in the
  bottom-right corner.
- Close button (cross icon) in the top-right of the title bar.
- Min width: **300 px**.
- Min height: depends on content (the body's natural min-content; clamp at
  `200 px` as a hard floor).
- Max height: limited by the bounding parent identified by a CSS selector
  passed in. Default fallback: `window.innerHeight - 32px`.
- Max width: half the bounding parent's width.
- When the window has focus, fire a `onFocusedTargetChange?(targetId)`
  callback so the host (the graphic editor) can outline the target item with a
  light-blue selection ring. When focus is lost, fire it with `null`.

## API

```ts
export interface FloatingWindowConfig {
  /** Title bar text or custom node. */
  title: string | HTMLElement;
  /** Body content (slot). The component owns scrolling inside the body. */
  body: HTMLElement;
  /**
   * CSS selector resolved (closest, then querySelector) at every layout
   * computation to derive the parent bounding rectangle. Default: the host
   * element passed to `mount()`.
   */
  boundsSelector?: string;
  /** Initial size. Default { width: 320, height: 400 }. */
  initialSize?: { width: number; height: number };
  /** Initial position (in client coords relative to host). Default: top-right with 16px margin. */
  initialPosition?: { x: number; y: number };
  /** ID forwarded to `onFocusedTargetChange` so the host can map it back to a graphic element / group. */
  targetId?: string | null;
  /** Fired when the window is closed by the user. */
  onClose?: () => void;
  /**
   * Fired with `targetId` when the window receives focus, and with `null`
   * when it loses focus. Hosts use this to highlight the target.
   */
  onFocusedTargetChange?: (targetId: string | null) => void;
}

export class FloatingWindow {
  readonly element: HTMLElement;
  constructor(config: FloatingWindowConfig);
  mount(host: HTMLElement): void;
  unmount(): void;
  /** Replace title at any time. */
  setTitle(title: string | HTMLElement): void;
  /** Replace body content (e.g. when the selection changes). */
  setBody(body: HTMLElement): void;
  /** Replace targetId without unmounting (e.g. user picked a different element). */
  setTargetId(id: string | null): void;
  /** Programmatically focus and bring to front. */
  focus(): void;
  /** Current rect in client coords. */
  getRect(): DOMRect;
}
```

## DOM

```html
<div class="idea-graphic-floating-window" tabindex="-1" role="dialog" aria-label="…">
  <div class="idea-graphic-floating-window__titlebar">
    <span class="idea-graphic-floating-window__title">…</span>
    <button class="idea-graphic-floating-window__close" aria-label="…">
      <span class="material-symbols-outlined">close</span>
    </button>
  </div>
  <div class="idea-graphic-floating-window__body">…</div>
  <!-- 8 resize handles: 4 sides + 4 corners; bottom-right has a visible grip icon -->
  <div class="idea-graphic-floating-window__resize idea-graphic-floating-window__resize--n"></div>
  <div class="idea-graphic-floating-window__resize idea-graphic-floating-window__resize--s"></div>
  <!-- e, w, ne, nw, se, sw … -->
  <div class="idea-graphic-floating-window__resize idea-graphic-floating-window__resize--se">
    <span class="material-symbols-outlined">drag_handle</span><!-- or: south_east -->
  </div>
</div>
```

> **Icon**: prefer `drag_handle` for the visible grip; if the user requests a
> different glyph in review, swap it. Material Symbols only — do not create
> raw SVG.

## Implementation notes

- Use Pointer Events (`pointerdown` + `setPointerCapture`) for drag and resize.
  Match the pattern used by `shared/components/color-picker/color-picker.ts`'s
  `bindDrag` helper.
- Position is computed relative to the **bounding parent** rect. Clamp on every
  drag/resize so the window cannot escape the parent's box.
- Resize from each border / corner adjusts width / height (and shifts x / y
  for north / west handles) consistent with native window behaviour.
- Recompute max-width / max-height on `window.resize` and when
  `boundsSelector`'s element changes size (use `ResizeObserver` if available;
  fall back to a `resize` listener on `window`).
- Clicking inside the window (titlebar, body, resize handles) sets focus and
  fires `onFocusedTargetChange(targetId)` once. A `mousedown` outside the window
  fires `onFocusedTargetChange(null)`. Don't fire spuriously on internal clicks
  that don't change the focus state.
- z-index: there can be only one focused floating window at a time. The
  component reads the maximum z-index of `.idea-graphic-floating-window`
  elements in the same host on `focus()` and sets itself to `max+1`.

## Files

- `shared/components/floating-window/floating-window.ts`
- `shared/components/floating-window/floating-window.scss` (start with
  `@use '../../../src/styles/variables' as *;`). Use `$color-bg`,
  `$color-border`, `$color-text`, `$gray-200`/`$gray-300`, `rgba($black, 0.1)`
  for shadow, `$spacing-*`. The window panel itself: `border: 1px solid
  $color-border`, `border-radius: 8px`, `box-shadow: 0 8px 24px rgba($black, 0.12)`.
- `shared/components/floating-window/index.ts` — barrel re-exports.

## Tests

`shared/components/floating-window/__tests__/floating-window.test.ts` (jsdom):

- Mounts and renders title + body.
- `setTitle`, `setBody`, `setTargetId` swap content / id without remounting.
- Drag (simulated pointer events) updates position; clamped to parent bounds.
- Resize from each handle (n/s/e/w/ne/nw/se/sw) changes width/height as expected
  and respects the 300px min width and 200px min height.
- `onFocusedTargetChange` fires with `targetId` on focus and `null` on outside
  click.
- `unmount()` removes the element and detaches listeners.

## Don'ts

- **Do not** import from `@text-editor/*`, `@core/*`, or `@graphic-editor/*` —
  this is generic UI.
- **Do not** position the window with `position: fixed`; it must live inside
  the bounding parent (`position: absolute`).
- **Do not** assume there is only one window — support multiple instances and
  per-instance z-index.

## Acceptance criteria

- `import { FloatingWindow } from '@shared/components/floating-window';` works.
- `npm test` green for the `shared` project.
- Manual smoke test: instantiate inside any host (e.g. temporarily in
  `src/main.ts`) and verify drag, resize from every edge / corner, focus
  callback. Revert any temporary changes.
