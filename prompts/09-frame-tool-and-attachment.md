# Prompt 09 — Frame tool + auto-attach + frame translation

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.
>
> Depends on prompts 07 and 08.

## Goal

Implement the Frame tool and the attach-on-intersect rule that turns frames
into "viewports of a region" suitable for later promotion to a text-editor
block.

User decision (already locked in `00-INDEX.md`):

> Drag on canvas to create a `FrameElement`. On commit, every existing
> `GraphicElement` whose AABB *intersects* the frame's AABB (any overlap, even
> partial) is auto-attached: set `element.frameId = frame.id` and append
> `element.id` to `frame.childElementIds`. Same rule applies to elements
> created later inside the frame. Moving a frame translates all its child
> elements by the same delta.

## Files to add / change

```
packages/graphic-editor/src/engine/commands/
  add-frame-command.ts
  remove-frame-command.ts
  update-frame-command.ts
  attach-to-frame-command.ts
  detach-from-frame-command.ts
  __tests__/{add,remove,update,attach,detach}-frame-command.test.ts
packages/graphic-editor/src/engine/
  frame-controller.ts                # owns the frame-tool drag + commit
  frame-renderer.ts                  # SVG rendering of frames + label
  frame-renderer.scss
  __tests__/frame-controller.test.ts
  __tests__/frame-renderer.test.ts
```

`drag-controller.ts` (from prompt 07) is extended (do NOT duplicate) to call
`translateFrameChildren(frameId, dx, dy)` whenever a frame is moved.

`AddElementCommand` (prompt 05) is extended: if the new element's AABB
intersects any existing frame, the command also attaches the element to that
frame as part of the same composite. (Pick the FIRST frame in document order
when an element straddles multiple — frames don't overlap by design, but
guard against it deterministically.)

## Frame data

`FrameElement.data` is already defined in `@core/model/interfaces.ts`:

```ts
{ x: number; y: number; width: number; height: number;
  background: string; clipContent: boolean; showLabel: boolean; labelFontSize: number; }
```

Default `createFrame()` factory exists in `@core/model/factory.ts`. Reuse it
and set:

- `background: 'rgba(0,0,0,0)'` (transparent body)
- `clipContent: false` (the roadmap doesn't require clipping yet)
- `showLabel: true`
- `labelFontSize: 12`
- `name: 'Frame N'` where N is `page.frames.length + 1`. Localise via
  `i18n.t('graphic.frame.defaultName', { n })`.

## Frame rendering

`frame-renderer.ts` produces, per frame:

- An SVG rect inside the world `<g>`:

  ```xml
  <rect class="idea-graphic-frame__rect" x={x} y={y} width={w} height={h}
        fill="none" stroke={$gray-400} stroke-width=1 stroke-dasharray="6 4"
        data-frame-id={id}/>
  ```

- A DOM overlay label `<div class="idea-graphic-frame__label">{name}</div>`
  positioned in screen coords just OUTSIDE the top-left corner. Uses
  `font-size: $font-size-xs` and `color: $color-text-secondary`. Doesn't
  render when `showLabel: false`.

Frames are rendered BENEATH all elements. In the canvas-renderer iterate
`page.frames` first, then `page.elements`. Frames are still selectable: a
click on the frame's body (between elements) selects the frame; a click on
an element inside the frame selects the element. Hit-tester logic is:

```
elements (top-down) → frame body (top-down) → none
```

Update `hit-tester.ts` accordingly.

## `FrameController` (Frame tool)

Active when `toolState.getTool() === 'frame'`.

- `pointerdown` on the canvas root with no element under the cursor → start
  drawing.
- Render a temporary frame visualisation (1px dashed `$gray-500` + 4px
  square corner indicators) updated on `pointermove`.
- Cancel via Escape.
- On `pointerup`:
  1. Normalise the rect (positive width / height ≥ 8px). If smaller, abort.
  2. Push `AddFrameCommand` with the rect.
  3. After execute, immediately push (in the same composite) one
     `AttachToFrameCommand` per existing element whose AABB intersects.
  4. Tool stays `'frame'` so users can draw multiple frames in a row; ESC
     reverts to selection tool.

## Commands

### `AddFrameCommand`

```ts
class AddFrameCommand implements Command {
  constructor(input: { doc: DocumentNode; pageId: string; rect: Rect; name?: string });
  // Generates frame id (`frm`), appends to page.frames, emits node:insert with parentId=pageId.
}
```

`undo` removes the frame and ALL its `childElementIds` attachments (delegate
to `DetachFromFrameCommand` semantics).

### `RemoveFrameCommand`

- Removes the frame.
- Each child element loses `frameId` (does NOT delete the element).
- Emits `node:delete` for the frame and `node:update` for each child whose
  `frameId` got cleared.

### `UpdateFrameCommand`

Same shape as `UpdateElementCommand` but targeting `FrameElement.data`.
Supports `mergeWindowMs` for drag-resize merging.

### `AttachToFrameCommand`

```ts
class AttachToFrameCommand implements Command {
  constructor(input: { doc: DocumentNode; pageId: string; frameId: string; elementId: string });
}
```

- Sets `element.frameId = frameId`.
- Appends `elementId` to `frame.childElementIds` if not already present.
- Idempotent. Emits one `node:update` for the element and one for the
  frame's `childElementIds`.

### `DetachFromFrameCommand`

- Clears `element.frameId`.
- Removes `elementId` from `frame.childElementIds`.

## Frame translation rule

Update prompt 07's `MoveSelectionCommand`:

When the selection contains a frame `F`, also produce a `MoveElementCommand`
for every element in `F.childElementIds` with the same `(dx, dy)`. Order:
move children FIRST, then move the frame, so that all updates form one
composite undo. (Order doesn't actually matter for correctness because
positions are absolute; pick a deterministic order so tests stay stable.)

When a frame is dragged via its body (no resize handle), the move applies to
the frame and its children. When a child element is dragged individually
(direct selection of just the element), only the element moves and stays
attached. (The user can detach later via prompt 13's group-window controls.)

## `AddElementCommand` extension

When constructing the command, take a snapshot of `page.frames` and find the
first frame whose AABB intersects the element's AABB:

```ts
const frame = findContainingFrame(page, registry.get(type).getBounds(elementSnapshot));
if (frame) compose(this, new AttachToFrameCommand({ doc, pageId, frameId: frame.id, elementId: newId }));
```

Make this composition explicit and unit-tested. Skip composition if
`input.skipFrameAttach === true` so the FrameController itself doesn't
double-attach when it batch-attaches existing children.

## Edge case: frame moved into an element

When a frame is moved (or resized) such that NEW elements now intersect, do
NOT auto-attach new ones. The roadmap says auto-attach happens at frame
creation time and at element creation time. Re-attachment after move is a
manual action (group window in prompt 13). Document this in a comment so
reviewers know it's intentional.

## i18n keys (en + uk)

```
graphic.frame.defaultName    Frame {n}
graphic.frame.label          {name}
```

## Tests

- `add-frame-command` — execute pushes a `frm` node; undo removes it; child
  attachments are also reverted on undo.
- `attach-to-frame-command` — idempotency; correct ops emitted.
- `detach-from-frame-command` — also idempotent.
- `frame-controller.test.ts` — drag → AddFrameCommand pushed with composite
  attachments; abort below 8px; ESC cancels.
- Update `move-selection-command.test.ts` — frame move translates children.
- `add-element-command.test.ts` — placing inside an existing frame causes
  attachment; placing outside doesn't; explicit `skipFrameAttach` opts out.

## Don'ts

- **Do not** clip frame contents (no SVG `clipPath`) yet. Roadmap doesn't
  require it; it's a follow-up.
- **Do not** introduce a "promote frame to text-editor block" action in this
  prompt — that lives in a future text-editor "Frame block" implementation.
- **Do not** allow frames to overlap silently — for now, allow it, but log a
  warning via `console.warn` so future iterations can decide.

## Acceptance criteria

- `npm test` green.
- `npm run build` succeeds.
- Manual: with the Frame tool, drag a rectangle around 2 existing shapes;
  release → a dashed frame appears, dragging the frame moves the shapes
  together, undoing reverts both creation and attachment.
