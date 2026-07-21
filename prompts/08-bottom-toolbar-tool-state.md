# Prompt 08 — Bottom toolbar, tool state machine, ghost placement

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompt 07.

## Goal

Add the bottom-centre tool palette and the `ToolState` machine that
coordinates which controller handles pointer events. Also implement
**ghost placement**: when the user clicks a block in the left panel
(prompt 14 wires that source) or chooses a tool that requires placement,
the cursor carries a translucent preview that lands on the next canvas
click. ESC cancels and restores the previous tool.

This prompt does not implement Frame, Pen, or Arrow drawing logic — those
are prompts 09, 10, 11 respectively. It does add the **buttons** for them
and the **tool state** they will plug into.

## Tool roster

```ts
export type ToolId = 'selection' | 'frame' | 'arrow' | 'pen' | 'sticker' | 'placement';
```

`'placement'` is a special transient tool entered when a `pendingBlock` is
queued (e.g. by clicking a left-panel block). It carries one
`pendingBlockType: string`. After placement (or ESC) the tool reverts to the
previous tool (defaulting to `'selection'`).

Roadmap mapping:

- Selection tool — `'selection'`. Default.
- Frame tool — `'frame'`. Drag draws a frame; commits via prompt 09.
- Arrow tool — `'arrow'`. Click starts an arrow drag; FlyoutArrowToolbar opens
  on the toolbar button (prompt 11).
- Pen tool — `'pen'`. Implemented in prompt 10.
- Stickers tool — `'sticker'`. Click places a sticker; this prompt CAN
  implement sticker placement directly (a single-click placement, no drag)
  because the Sticker block already exists from prompt 06.

## Files to add

```
packages/graphic-editor/src/engine/
  tool-state.ts                      # full machine (replace stub)
  tool-state.scss
  __tests__/tool-state.test.ts
packages/graphic-editor/src/layout/
  bottom-toolbar.ts
  bottom-toolbar.scss
  __tests__/bottom-toolbar.test.ts
packages/graphic-editor/src/engine/placement-controller.ts
packages/graphic-editor/src/engine/__tests__/placement-controller.test.ts
```

## `ToolState`

```ts
export interface ToolStateSnapshot { tool: ToolId; pendingBlockType?: string; previousTool?: ToolId; }

export class ToolState {
  constructor(eventBus: EventBus);

  getTool(): ToolId;
  getSnapshot(): ToolStateSnapshot;

  setTool(tool: ToolId, opts?: { silent?: boolean }): void;

  /** Begin placement mode for a particular block type; remembers the previous tool. */
  beginPlacement(blockType: string): void;
  /** Exit placement mode; restores the remembered previous tool. */
  cancelPlacement(): void;
  /** Confirm placement; restores the remembered previous tool (placement is consumed). */
  consumePlacement(): string | null;

  onChange(listener: (snap: ToolStateSnapshot) => void): () => void;
}
```

Behavioral rules:

- `setTool('placement')` directly is illegal — placement only enters via
  `beginPlacement`.
- `beginPlacement('rectangle')` while another placement is in progress
  REPLACES the pending block; previousTool is preserved from the first call
  so consecutive left-panel clicks behave naturally.
- `cancelPlacement()` and `consumePlacement()` clear `pendingBlockType` and
  restore `previousTool ?? 'selection'`.
- All transitions emit a NEW event on the eventBus: `tool:change` with the
  full snapshot. ADD `tool:change` to the `EditorEvent` union and update its
  test.

## Bottom toolbar

`bottom-toolbar.ts` builds:

```html
<div class="idea-graphic-toolbar idea-graphic-toolbar--bottom">
  <button class="idea-graphic-toolbar__btn" data-tool="selection" title="…"><span class="material-symbols-outlined">arrow_selector_tool</span></button>
  <button data-tool="frame"><span>crop_landscape</span></button>
  <button data-tool="arrow"><span>arrow_right_alt</span></button>
  <button data-tool="pen"><span>edit</span></button>
  <button data-tool="sticker"><span>sticky_note_2</span></button>
</div>
```

Use `createIcon(name)` for each glyph. Active tool button gets the
`is-active` modifier (background `$gray-200`). All buttons are 32×32.

Container styling: fixed at `bottom: $spacing-lg` centred horizontally
inside `.idea-graphic-canvas` (use `left: 50%; transform: translateX(-50%)`).
Pill background `$white`, 1px border `$color-border`, soft shadow via
`rgba($black, 0.08)`.

The toolbar listens to `tool:change` and updates the active modifier.
Pointer events in the toolbar must NOT propagate to the canvas (otherwise
clicking a tool would also fire a click on the canvas underneath); add
`event.stopPropagation()` and `event.preventDefault()` to each button's
pointerdown.

> Note: the Arrow button needs to additionally open the FlyoutArrowToolbar
> for setting **defaults**. Prompt 11 will wire that open-on-click. For this
> prompt, just call `toolState.setTool('arrow')` and emit a placeholder
> `'graphic:open-arrow-defaults'` event on click — prompt 11 listens for it.

## Placement controller

`placement-controller.ts` listens to `tool:change` and `pointer*` on the
canvas root.

- When `tool === 'placement'`:

  1. Build a "ghost" overlay element using
     `registry.get(pendingBlockType).renderSvg(...)` with default data and
     position derived from current pointer in world coords. Append to the
     overlay layer with `pointer-events: none; opacity: 0.6;`.
  2. Update the ghost position on every `pointermove`.
  3. On `pointerdown` (left button) on the canvas:
     - Compute world coords.
     - `consumePlacement()` returns the block type.
     - Push an `AddElementCommand` with `dataOverride: { x, y }`.
     - Select the new element via `selectionManager.setSelection([{ type: 'element', id }])`.
     - Emit `'graphic:request-properties-window'` so prompt 12 can open the
       floating properties window for the freshly placed block (add this
       event to the `EditorEvent` union).
  4. `Escape` key while in placement mode → `cancelPlacement()` and remove
     the ghost.

- When `tool === 'sticker'`:

  Treat single click as placement of a `sticker` block (no ghost — just an
  immediate `AddElementCommand` at the clicked world point with the default
  sticker size centred on the cursor). Active tool stays `'sticker'` so the
  user can drop multiple stickers without re-selecting. ESC reverts to the
  selection tool.

- When `tool === 'frame'` / `'arrow'` / `'pen'` — defer to prompts 09 / 11 /
  10 respectively; this controller should NOT consume those events.

## Selection-tool gating

Update prompt 07's controllers to read the active tool from `ToolState` and
ignore pointer events when the tool is anything other than `'selection'` or
`'placement'` (handles still work in `'selection'` only).

## Keyboard shortcuts

Use `@core/shortcut-manager` (already exists). Register inside
`GraphicEditor.init`:

| Key                  | Action                                                  |
| -------------------- | ------------------------------------------------------- |
| `V`                  | `toolState.setTool('selection')`                        |
| `F`                  | `toolState.setTool('frame')`                            |
| `A`                  | `toolState.setTool('arrow')`                            |
| `P`                  | `toolState.setTool('pen')`                              |
| `S`                  | `toolState.setTool('sticker')`                          |
| `Escape`             | `cancelPlacement()` else `clearSelection()`             |
| `Delete` / `Backspace` | already handled in prompt 07                          |
| `Cmd/Ctrl + Z` / `Y` | already handled by global `UndoRedoManager` integration |

Skip key handling when focus is in a contenteditable / input.

## i18n keys (en + uk)

```
graphic.tool.selection   Selection
graphic.tool.frame       Frame
graphic.tool.arrow       Arrow
graphic.tool.pen         Pen
graphic.tool.sticker     Sticker
graphic.placement.cancel Press ESC to cancel placement
```

Each toolbar button uses `i18n.t('graphic.tool.<tool>')` as `title`.

## Tests

- `tool-state.test.ts` — state transitions; placement begin/cancel/consume;
  emits `tool:change`.
- `bottom-toolbar.test.ts` — clicking a button calls `setTool`; active
  modifier reflects state; clicking the active button does NOT fire change.
- `placement-controller.test.ts` — ghost is created on placement entry,
  follows pointermove, removed on commit/cancel; commit pushes
  `AddElementCommand` and selects the new element.
- Update `selection-manager.test.ts` with a case verifying it ignores
  pointerdown when `tool !== 'selection'`.

## Don'ts

- **Do not** implement Frame / Pen / Arrow draw logic here — only the
  toolbar buttons that switch the tool. (The Arrow button additionally
  emits the open-defaults event.)
- **Do not** mount the toolbar from `app-shell.ts` — the GraphicEditor
  itself owns its toolbar lifecycle.

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual: bottom toolbar visible centred at the bottom; clicking each tool
  highlights its button; pressing `V/F/A/P/S` does the same; ESC during
  placement removes the ghost; clicking left-panel block (mocked test
  trigger via `toolState.beginPlacement('rectangle')`) shows a ghost that
  drops on click and immediately becomes selected.
