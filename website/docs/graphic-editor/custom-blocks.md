---
sidebar_position: 5
---

# Custom blocks

Custom blocks let you save a group of elements as a reusable template and place copies of it on the canvas with a single click.

## Creating a custom block

1. Select one or more elements on the canvas.
2. Open the **Group Properties** window (it appears automatically when multiple elements are selected, or you can open it from the right-click context).
3. Give the group a name in the **Create new block** input and press Enter.
4. A success toast confirms the block was saved: `"{name}" saved to Custom`.

The new block appears in the **Custom** section of the left panel immediately.

## How the snapshot is stored

When you create a custom block the editor calls `CreateCustomBlockCommand`, which:

1. Serialises the selected elements into a `CustomBlock` object:
   - `id` — stable nanoid
   - `name` — user-supplied name
   - `elements` — a deep copy of the element objects (geometry + data)
   - `width`, `height` — bounding box of the group
2. Pushes the `CustomBlock` into `document.data.customBlocks`.

The command is undoable: undo removes the block from the store; redo adds it back.

```ts
// packages/graphic-editor/src/groups/custom-block-store.ts
export interface CustomBlock {
  id: string;
  name: string;
  elements: GraphicElement[];
  width: number;
  height: number;
}
```

## Placing a custom block

Click the block's tile in the left panel. The editor enters ghost-placement mode (`ToolState.beginPlacement('custom:' + id)`) and a ghost outline follows the pointer. Clicking commits `InstantiateCustomBlockCommand`, which deep-clones all stored elements, assigns them new IDs, and offsets their positions to the clicked world point.

## What is not saved

- **Text content inside sticker blocks** — sticker text is part of the element's `data.text` field and _is_ saved.
- **Selection or lock state** — the snapshot captures only geometry and visual data.
- **Viewport position** — the block is always placed relative to the click point, not its original position.
- **Frames** — frame membership is not included in the snapshot; placed copies are free-floating elements.

## Deleting a custom block

Open the **Group Properties** window, switch to the **Custom** tab, and click the delete icon next to the block. This calls `DeleteCustomBlockCommand` (undoable).

## Future ideas

- **Nesting** — custom blocks containing other custom blocks.
- **Sharing** — exporting/importing `customBlocks` via the document JSON, or a separate registry file.
- **Parameterisation** — user-editable placeholder fields that let each instance carry different text or color values.
- **Versioning** — updating existing placed instances when the source block changes.
