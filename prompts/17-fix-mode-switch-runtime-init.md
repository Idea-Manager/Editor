# Prompt 17 — Fix mode-switch runtime: Custom Element init race + Graphic editor lays out off-screen on first show

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first for shared project context (path aliases, document model, style/i18n rules, "do not destroy on toggle" constraint).
>
> Depends on prompt 15 (Text/Graphic mode toggle + AppShell wiring).
>
> This is a **bug-fix prompt**. Do not introduce new product features. Investigate, design a minimal architectural fix, then implement.

---

## 1. What the user is seeing right now

After running `npm run dev`:

1. The **Text editor renders correctly** at first paint.
2. Switching to **Graphic mode via the top-bar toggle visually does nothing** — the canvas, left panel, and bottom toolbar do not appear in the viewport.
3. DOM inspector shows the graphic editor IS in the DOM. The bottom toolbar exists at:

   ```
   div#app
     > div.app-shell.app-shell--graphic-mode
       > div.app-shell__editor-area
         > idea-graphic-editor.app-shell__editor.app-shell__editor--graphic
           > div.idea-graphic-canvas
             > div.idea-graphic-toolbar.idea-graphic-toolbar--bottom
   ```

   …but its computed position is `top: 1494px, left: 334px, width: 186px, height: 42px` — far below the viewport. Same for the canvas: it is laid out off-screen, not where the user expects (filling the editor area).

4. The browser console persists this error from the previous session, even though Text mode currently appears to work:

   ```
   input-interceptor.ts:51 Uncaught TypeError: Cannot read properties of undefined (reading 'addEventListener')
       at InputInterceptor.attach (input-interceptor.ts:51:10)
       at new InputInterceptor (input-interceptor.ts:32:10)
       at TextEditor.init (text-editor.ts:161:29)
       at AppShell.build (app-shell.ts:101:21)
       at AppShell.mount (app-shell.ts:40:10)
       at ./src/main.ts (main.ts:20:7)
   ```

   The error means `this.ctx.rootElement` (i.e. `TextEditor.container`) was `undefined` when `InputInterceptor.attach` ran. `container` is created inside `TextEditor.connectedCallback()`, which only fires when the custom element is **inserted into a connected document tree**.

Both classes of failure point at the same architectural seam: **how the AppShell mounts and toggles two Custom Elements that each rely on `connectedCallback` and on having real layout dimensions when their `init()` runs.**

---

## 2. Architectural facts you need

### 2.1 Both editors are Custom Elements

- `packages/text-editor/src/engine/text-editor.ts`:
  - `class TextEditor extends HTMLElement`
  - `connectedCallback()` lazily creates `this.container` (the contenteditable `<div>`) and appends it to `this`.
  - `init(doc, eventBus, undoRedoManager, options)` reads `this.container` to build the `EditorContext` (`rootElement: this.container`) and constructs `InputInterceptor`. **If `init()` runs before `connectedCallback()`, `this.container` is `undefined` and `InputInterceptor.attach()` crashes.**

- `packages/graphic-editor/src/engine/graphic-editor.ts`:
  - `class GraphicEditor extends HTMLElement`
  - `connectedCallback()` adds the `.idea-graphic-editor` class and assigns `this.instanceId`.
  - `init(...)` builds the canvas, viewport, controllers, ZoomPanel, BottomToolbar, LeftPanel. The LeftPanel and the canvas are placed into the editor element directly, in two grid columns (`grid-template-columns: 240px 1fr`).

- Custom Elements lifecycle rule we depend on: `connectedCallback` fires synchronously during `parent.appendChild(el)` **only when the parent is itself in a connected document tree**. Otherwise it is deferred until the parent (or one of its ancestors) is connected.

### 2.2 Current `AppShell` & `main.ts` (after recent fixes)

`src/layout/app-shell.ts` (current shape):

```ts
constructor(config) {
  this.config = config;
  this.currentMode = getActiveMode(config.doc);
  this.element = document.createElement('div');
  this.element.classList.add('app-shell');
}

mount() { this.build(); }

private build() {
  // ...top bar appended to this.element...

  const editorArea = document.createElement('div');
  editorArea.classList.add('app-shell__editor-area');
  this.element.appendChild(editorArea);

  this.textEditor = new TextEditor();
  this.textEditor.classList.add('app-shell__editor', 'app-shell__editor--text');
  editorArea.appendChild(this.textEditor);
  this.textEditor.init(doc, eventBus, undoRedoManager, { locale: i18n.locale });

  this.graphicEditor = new GraphicEditor();
  this.graphicEditor.classList.add('app-shell__editor', 'app-shell__editor--graphic');
  editorArea.appendChild(this.graphicEditor);
  this.graphicEditor.init(doc, eventBus, undoRedoManager, { locale: i18n.locale });

  // ...status bar...

  this.element.classList.toggle('app-shell--graphic-mode', this.currentMode === 'graphic');
}
```

`src/main.ts`:

```ts
const shell = new AppShell({ doc, eventBus: bus, undoRedoManager: history, i18n, shortcuts });
app.appendChild(shell.element);
shell.mount();
shell.setMode(getActiveMode(doc));
```

The `mount()` split was added so the shell element is already connected before `build()` runs. That makes `connectedCallback` for the inner editors fire synchronously during their `appendChild`. The fact that the `input-interceptor` error still appears in the console means **at least one path still calls `init()` before `connectedCallback` has populated `this.container`**.

Possible reasons to investigate:
- The `customElements.define('idea-text-editor', TextEditor)` registration is a **side effect** of an import. If `new TextEditor()` runs before the module that defines the custom element has fully evaluated (e.g. circular import order, a stale dist build, or a code path that creates the element before the registration call), the element is created as a generic `HTMLUnknownElement` and `connectedCallback` never fires. Verify the registration call's location and that it runs at module top level. Check **both** packages for the same risk.
- `mount()` is called once from `main.ts`. Confirm `AppShell` is not constructed/built twice (e.g. by HMR).
- Verify there is no remaining `this.build()` call inside the `AppShell` constructor (a previous edit may have left a duplicate).

### 2.3 Layout: where the off-screen toolbar comes from

CSS chain:

- `src/layout/app-shell.scss`:
  ```scss
  .app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .app-shell__editor-area { flex: 1; overflow: hidden; position: relative; display: flex; flex-direction: column; }
  .app-shell__editor { width: 100%; height: 100%; display: block; }
  .app-shell__editor--graphic { display: none; }
  .app-shell--graphic-mode .app-shell__editor--text { display: none; }
  .app-shell--graphic-mode .app-shell__editor--graphic { display: block; }
  ```

- `packages/graphic-editor/src/engine/graphic-editor.scss`:
  ```scss
  :host,
  .idea-graphic-editor {
    display: grid;
    grid-template-columns: 240px 1fr;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  ```

- `packages/graphic-editor/src/layout/left-panel.scss`: `min-width: 240px; width: 240px; height: 100%;`
- `packages/graphic-editor/src/engine/canvas-renderer.ts` builds `<div class="idea-graphic-canvas">` and appends it to the editor element (column 2 of the grid). The canvas SCSS sets `width: 100%; height: 100%; position: relative;`.
- `packages/graphic-editor/src/layout/bottom-toolbar.scss`:
  ```scss
  .idea-graphic-toolbar--bottom {
    position: absolute;
    bottom: $spacing-lg;
    left: 50%;
    transform: translateX(-50%);
    /* ... */
  }
  ```

The bottom toolbar is positioned absolutely against its nearest positioned ancestor — the canvas. If the canvas does not get a definite height when the toolbar's position is computed, the toolbar lands far below the visible region.

Two compounding suspects to check:

1. `:host` only matches inside Shadow DOM. `GraphicEditor` does NOT use Shadow DOM. So the `:host` selector in `graphic-editor.scss` is dead code — the actual layout comes only from the `.idea-graphic-editor` rule. That class is added inside `connectedCallback`. If `connectedCallback` never ran (see §2.2), the element has **no class, no display: grid, no height: 100%** — at which point children with `height: 100%` resolve against an unconstrained parent and you get the "everything off-screen" layout the user sees.
2. The grid only declares `grid-template-columns`, not `grid-template-rows`. With `height: 100%` on the editor element this normally produces a single 1fr row. Verify in DevTools whether the row track actually fills the editor-area when the class is applied.

### 2.4 Init while invisible

Even if (2.2) and (2.3) are fixed and `connectedCallback` definitely fires, there is a separate failure mode: when `setMode('text')` is the initial mode, `app-shell__editor--graphic` is `display: none` while `GraphicEditor.init()` runs. While `display: none`:

- `getBoundingClientRect()` and `clientWidth/clientHeight` return 0.
- ResizeObserver does not deliver a useful first entry.
- Any controller that caches a size during init (zoom anchoring, hit-test bounding rects, frame placement defaults, etc.) will cache `0×0`.

When the user toggles to graphic mode later, those controllers are running with stale dimensions. That can also reproduce as "switching does nothing" — the editor is technically visible, but pointer hits, viewport math, and overlay placement are all relative to a 0×0 measurement.

The roadmap rule from prompt 15 is: **do not destroy / re-mount the editors on toggle**. So we cannot solve this by lazy-constructing on first show. The fix must keep both editors alive but recover their layout on (a) first display, and (b) every subsequent toggle in case the host is resized while hidden.

---

## 3. Files to read before proposing a fix

Use Lumora MCP (preferred) or `Read` to examine. Do **not** edit blindly.

Required reading:

```
src/main.ts
src/layout/app-shell.ts
src/layout/app-shell.scss
src/layout/top-bar.ts                                # to confirm how setMode is invoked
src/util/active-mode.ts
packages/text-editor/src/engine/text-editor.ts       # connectedCallback / init / customElements.define
packages/text-editor/src/engine/input-interceptor.ts # the throwing site
packages/graphic-editor/src/engine/graphic-editor.ts # connectedCallback / init / customElements.define / disconnectedCallback
packages/graphic-editor/src/engine/graphic-editor.scss
packages/graphic-editor/src/engine/canvas-renderer.ts
packages/graphic-editor/src/engine/viewport-controller.ts
packages/graphic-editor/src/layout/bottom-toolbar.ts
packages/graphic-editor/src/layout/bottom-toolbar.scss
packages/graphic-editor/src/layout/left-panel.ts
packages/graphic-editor/src/layout/left-panel.scss
packages/graphic-editor/src/layout/zoom-panel.ts
packages/graphic-editor/src/index.ts                 # confirm side-effect import order
packages/text-editor/src/index.ts                    # confirm side-effect import order
prompts/15-mode-toggle-app-shell.md                  # original constraints (do not violate)
```

Optional but useful (confirm the entire chain):

```
packages/graphic-editor/src/engine/tool-state.ts
packages/graphic-editor/src/engine/selection-manager.ts
packages/graphic-editor/src/engine/placement-controller.ts
packages/graphic-editor/src/engine/frame-controller.ts
packages/graphic-editor/src/engine/pen-controller.ts
packages/graphic-editor/src/engine/arrow-controller.ts
```

---

## 4. Required investigation, in order

Carry these out, document your findings briefly in the PR description, then implement the fix.

### 4.1 Verify `customElements.define` runs before construction

For each package:

- Confirm the file that calls `customElements.define('idea-text-editor', …)` and `customElements.define('idea-graphic-editor', …)` is at the bottom of `engine/<editor>.ts`, with no `if (typeof window === 'undefined')` guards that could be hit in the browser.
- Confirm `packages/<editor>/src/index.ts` re-exports the class so importing the package triggers the registration side effect.
- Reproduce the order of operations in `AppShell.build`:
  1. `this.element` is in the live document (because `mount()` was called after `app.appendChild(shell.element)`).
  2. `editorArea` is appended to `this.element` BEFORE editors are appended to it.
  3. `new TextEditor()` runs.
  4. `editorArea.appendChild(this.textEditor)` should fire `connectedCallback` synchronously.
  5. `this.textEditor.init(...)` then sees `this.container`.

  If step (4) does not fire `connectedCallback`, the most common root cause is that `customElements.define` had not run yet at step (3). Add a `customElements.whenDefined('idea-text-editor')`-based smoke check in dev mode (or simply `console.log` inside `connectedCallback`) and confirm.

- If timing is the cause: ensure both editor packages eagerly register on import. Adding `customElements.define` inside a side-effect block at module top level is sufficient as long as the import is reached before construction. Do not lazy-define on first construction.

### 4.2 Confirm `AppShell` is not double-built

- Search for any remaining `this.build()` call inside the constructor. There should be exactly one entry point: `mount()`.
- If a previous edit left both, fix it; double-building would re-call `init()` on both editors and might explain the residual error.

### 4.3 Trace why the graphic toolbar lands at `top: 1494px`

In a paused browser (`debugger`) or via Chrome DevTools layout inspector:

- After `setMode('graphic')`, check:
  - `idea-graphic-editor` element: does it have `class="idea-graphic-editor"` (i.e. did `connectedCallback` run)?
  - Computed style on `.idea-graphic-editor`: is `display: grid`, `height: 100%` actually applied? What is its `clientHeight`?
  - Computed style and `getBoundingClientRect()` on `.idea-graphic-canvas`: is its height equal to the editor area's height, or is it zero / content-driven?
  - Computed style on the bottom toolbar: what positioned ancestor is it resolving against?
- This reveals whether the issue is (a) `connectedCallback` never ran (no class → no grid → no height) or (b) layout ran while hidden and was never recomputed.

### 4.4 Check init-while-hidden behaviour

- Verify whether `GraphicEditor.init()` (or any controller it spawns) caches `getBoundingClientRect()` or `clientWidth/clientHeight` of the canvas. Document each call site you find. The likely candidates are `ViewportController` (zoom anchoring), `LassoController`, `PlacementController`, `BottomToolbar`/`ZoomPanel` mounting math.
- If anything caches dimensions at init time, those stale values are the second source of "switching does nothing".

---

## 5. Required architectural fix

Implement the following. Keep changes minimal and additive.

### 5.1 Make `connectedCallback` reliably run before `init()`

Pick **one** of the two approaches and apply consistently to BOTH `TextEditor` and `GraphicEditor`. Do not pick different approaches per editor.

**Approach A — make `init()` defensive (preferred, smallest blast radius).**

In each editor's `init()`, if `this.container` (or its graphic equivalent) is `undefined`, run the `connectedCallback` body synchronously by invoking it explicitly, then proceed. This guards against any future host that constructs the element off-tree and calls `init()` before connecting.

```ts
init(doc, bus, history, options) {
  if (!this.container) {
    // Defensive: connectedCallback may not have run if the host called init()
    // before inserting us into a connected tree. Idempotent.
    this.connectedCallback();
  }
  // ...existing body...
}
```

`connectedCallback` must therefore be **idempotent**: re-running it must not duplicate the container or listeners. Add a guard like `if (this.container) return;`.

**Approach B — split DOM creation from `init()` cleanly.**

Move container creation out of `connectedCallback` and into a private `ensureDom()` helper called at the top of both `connectedCallback` and `init()`. Both calls must be safe to run more than once.

Either way, **document the invariant** in a code comment: "`init()` may be called from a host that has not yet inserted the element. We tolerate that by ensuring the DOM exists at the top of `init()`. Deletion is still tied to `disconnectedCallback`."

### 5.2 Ensure `customElements.define` runs eagerly

For both packages:

- Place the `customElements.define(...)` call at module top level in `engine/<editor>.ts` (already so — verify).
- Make sure `packages/<editor>/src/index.ts` imports the engine module **for its side effects**, not just for type re-exports. A `import { GraphicEditor } from './engine/graphic-editor';` already pulls the module, so the side effect runs — confirm there is no import path that skips this.

### 5.3 Recompute layout after every mode toggle

Add a dimension-refresh step to `AppShell.setMode`. Plan:

1. Add a public method on `GraphicEditor` (and a no-op equivalent on `TextEditor` for symmetry):

   ```ts
   /**
    * Called by the host after the editor element transitions from hidden
    * (e.g. display: none) to visible. Re-measures the canvas, re-applies the
    * viewport transform, and re-renders the active page so absolutely
    * positioned overlays (zoom panel, bottom toolbar, selection layer) land
    * in the right place.
    *
    * Idempotent and safe to call any time after init().
    */
   onHostResize(): void;
   ```

   Implementation:
   - Re-apply the viewport transform (`canvasRenderer.applyViewport(viewportController)`).
   - Trigger a re-render of the active page (`canvasRenderer.renderPage(this.activePage, this.ctx, this._makeSelectionRenderer())`).
   - Emit a `'viewport:change'` event so any controller that listens (frame, lasso, placement) refreshes its cached geometry. Do NOT push an undo command for this.

2. In `AppShell.setMode`, after toggling the visibility class:

   ```ts
   setMode(mode) {
     this.currentMode = mode;
     this.element.classList.toggle('app-shell--graphic-mode', mode === 'graphic');
     this.config.shortcuts.setScope(mode);
     setActiveMode(this.config.doc, mode);
     this.config.eventBus.emit('mode:change', { mode });
     this.topBar.setMode(mode);

     // Let the newly-visible editor recover layout. Use rAF so the toggled
     // class has applied and getBoundingClientRect returns real values.
     requestAnimationFrame(() => {
       if (mode === 'graphic') this.graphicEditor.onHostResize();
       else this.textEditor.onHostResize?.();
     });
   }
   ```

3. Optional but recommended: install a `ResizeObserver` inside `GraphicEditor` that calls the same internal refresh whenever the host element's box changes (window resize, side-panel toggle, etc.). Disconnect it in `disconnectedCallback`. This makes the editor robust beyond the mode switch.

### 5.4 Fix the dead `:host` selector in graphic-editor SCSS

`packages/graphic-editor/src/engine/graphic-editor.scss` references `:host` even though the element is not in Shadow DOM. Remove the `:host,` part; keep only the `.idea-graphic-editor` rule. Same file, no other changes.

While at it, add `grid-template-rows: 1fr;` to the `.idea-graphic-editor` rule to make the row-sizing intent explicit. It already works in practice when the parent has `height: 100%` and the editor has `height: 100%`, but the explicit declaration prevents future breakage if a host wraps the editor in a non-flex / non-grid container.

### 5.5 Don'ts (must not regress)

- Do **not** destroy / re-init either editor on toggle. They must keep selection, viewport, history references, and ephemeral UI state across mode switches (per prompt 15).
- Do **not** change the public APIs of `TextEditor` or `GraphicEditor` beyond adding the new `onHostResize()` method. No breaking changes.
- Do **not** introduce Shadow DOM. Style isolation is handled by class-name prefixes (`idea-graphic-`, `idea-text-editor`).
- Do **not** add new event-bus members unless strictly necessary. `'viewport:change'` already exists; reuse it.
- Do **not** modify the document model, `OperationRecord` shapes, or the JSON schema.
- Do **not** lazy-define custom elements on first construction; keep the eager `customElements.define` pattern.

---

## 6. Tests to add / update

Add these under existing `__tests__` directories, using jsdom (default for these projects).

### 6.1 `packages/text-editor/src/engine/__tests__/text-editor.init.test.ts` (new)

- `init()` called before insertion into the document does NOT throw. After a subsequent `appendChild`, the editor is fully functional (`replaceDocument`, `getDocument`).
- `connectedCallback` is idempotent: calling it twice does not duplicate `this.container` or attach duplicate listeners.

### 6.2 `packages/graphic-editor/src/engine/__tests__/graphic-editor.host-resize.test.ts` (new)

- After `init()` while the host is `display: none`, calling `onHostResize()` once the host becomes visible re-applies the viewport transform and re-renders the page (assert via spies on `CanvasRenderer.applyViewport` and `renderPage`).
- `onHostResize()` does NOT push an undoable command (assert no `history:push` event).
- `onHostResize()` is safe to call before `init()` has been invoked (no-op or guarded throw — pick one and document).

### 6.3 `src/layout/__tests__/app-shell.mode-switch.test.ts` (new or extend existing)

- Mounting `AppShell` and constructing while text mode is active does NOT log the `input-interceptor` error (use a `console.error` spy).
- `setMode('graphic')` calls `graphicEditor.onHostResize()` after a microtask / `requestAnimationFrame`. Use a stub `rAF`.
- `setMode('text')` after `setMode('graphic')` does NOT destroy the graphic editor (assert the same instance reference is still in the DOM).
- The graphic editor's bottom toolbar lands inside the editor-area's rect after a toggle. With jsdom this is hard to verify pixel-exactly; instead assert that `onHostResize` was called and that the toolbar element has class `idea-graphic-toolbar--bottom` and is a descendant of the canvas.

### 6.4 Lint / build

- `npm test` green.
- `npm run build` succeeds.
- `npm run check:text-editor-imports` and `npm run check:graphic-editor-imports` (if it exists) pass.
- `npm run dev` reproduces the manual acceptance criteria below.

---

## 7. Manual acceptance criteria

Run `npm run dev` and verify ALL of the following:

1. The browser console is **clean** — no `input-interceptor.ts` `addEventListener of undefined` error, no warnings about unknown custom elements.
2. The page boots in **Text mode**; the contenteditable text area is focusable and types as expected.
3. Click **Graphic** in the top-bar segmented control:
   - The text editor disappears.
   - The graphic editor's left panel (240px wide) is visible at the left edge of the editor area.
   - The dotted-grid canvas fills the rest of the editor area horizontally and vertically.
   - The **bottom toolbar** is centred horizontally and sits ~`$spacing-lg` above the bottom edge of the canvas — fully inside the viewport.
   - The **zoom panel** is at the bottom-right inside the canvas.
   - Mouse-wheel zoom works; middle-click / spacebar drag pans.
4. Toggle back to **Text** — the text editor reappears with its prior state (selection, scroll position, history) preserved.
5. Toggle to **Graphic** again — the canvas, toolbar, zoom panel are still in the right places (no re-init regression).
6. Resize the window in either mode — both editors re-layout correctly without overflow into / out of the viewport.
7. Importing a JSON document saved while in Graphic mode reopens directly in Graphic mode and the canvas is laid out correctly on first paint (no "needs to toggle once to fix" hack).

---

## 8. Deliverables checklist

- [ ] Brief summary in the PR description: "What was wrong (root cause)" + "How the fix addresses it".
- [ ] Defensive `init()` (or `ensureDom()`) for both editors with idempotent `connectedCallback`.
- [ ] `onHostResize()` on `GraphicEditor` (+ no-op or symmetric on `TextEditor`).
- [ ] `AppShell.setMode` calls `onHostResize()` on the now-visible editor inside `requestAnimationFrame`.
- [ ] `:host` removed from `graphic-editor.scss`; explicit `grid-template-rows: 1fr;` added.
- [ ] Optional but recommended: ResizeObserver in `GraphicEditor`.
- [ ] Tests listed in §6 added and green.
- [ ] `npm test`, `npm run build`, manual acceptance in §7 all pass.
- [ ] No public-API breakage; no document-model or schema changes; no destroy-on-toggle.
