# Refactor Task: DOM-Patching Reconciler for Stateful Block Rendering

## Context

This is a web-component-based rich-text/block editor. The document tree consists of typed
`BlockNode<TData>` nodes. Each block type implements a `BlockDefinition<TData>` interface with a
`render(node, ctx): HTMLElement` method. Table cells can host multiple child blocks, each rendered
into a container `div`.

The current reconciler (wherever cell or document block lists are re-rendered) clears its container
(`innerHTML = ''` or equivalent) and re-appends freshly rendered elements on every change. This
tears down stateful DOM — iframes (Figma, YouTube), `<video>`, `<canvas>`, etc. — even when the
relevant block's data has not changed.

The fix is to move to a **DOM-patching reconciler**: diff the container's current children against
the newly rendered set, and only insert, reorder, or remove nodes that actually changed. Nodes whose
rendered element is already in the correct position must not be touched.

---

## Architectural Invariants to Preserve

- `BlockDefinition.render()` is the single source of truth for a block's DOM. The reconciler is
  only responsible for placing those elements correctly; it must not mutate them.
- Block definitions that implement stable-root caching (e.g. embed blocks) return **the same
  `HTMLElement` reference** when data is unchanged. The reconciler's identity check relies on
  reference equality (`===`), so never clone returned elements.
- `contenteditable`, `data-block-id`, and any other attributes set by `render()` must be untouched
  by the reconciler.
- Undo/redo, event bus emissions, and selection management are concerns of commands and block
  definitions — not the reconciler.

---

## What to Refactor

### 1. Core Reconciler Function

Create (or replace) a shared utility function used everywhere blocks are written into a DOM
container:

```ts
/**
 * Reconciles `container`'s children to exactly match `elements`, using
 * reference-equality to detect unchanged nodes. Stateful DOM (iframes,
 * canvas, video) survives if its element reference is reused.
 *
 * Rules:
 *  - Elements already present at the correct index → no-op (zero DOM ops).
 *  - Elements present but at the wrong index → insertBefore (moves, not clones).
 *  - Elements not present at all → insertBefore / appendChild (new nodes).
 *  - Children no longer in `elements` → removed.
 */
export function reconcileChildren(
  container: HTMLElement,
  elements: HTMLElement[],
): void {
  // 1. Remove children that are no longer needed.
  for (const child of Array.from(container.children)) {
    if (!elements.includes(child as HTMLElement)) {
      container.removeChild(child);
    }
  }

  // 2. Insert/reorder remaining children into correct positions.
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const current = container.children[i] as HTMLElement | undefined;
    if (current === el) continue;                    // already correct — skip
    if (current) {
      container.insertBefore(el, current);           // move to correct position
    } else {
      container.appendChild(el);                     // append at end
    }
  }
}
```

Place this in a shared engine utility module (e.g. `engine/reconciler.ts` or `engine/dom-utils.ts`).

### 2. All Render Sites

Find every location where a list of `BlockNode` objects is rendered into a container element.
Replace the clear-and-rebuild pattern with `reconcileChildren`. Common patterns to search for:

```ts
// ❌ Patterns to replace:
container.innerHTML = '';
children.forEach(node => container.appendChild(render(node, ctx)));

// ❌ Also covers:
while (container.firstChild) container.removeChild(container.firstChild);
nodes.map(n => render(n, ctx)).forEach(el => container.appendChild(el));

// ✅ Replace all of them with:
const elements = nodes.map(node => registry.get(node.type)!.render(node, ctx));
reconcileChildren(container, elements);
```

Locations likely include (verify against actual file structure):

- **Document-level renderer** — the root render loop that renders `document.children` into the
  editor's root element.
- **Table block definition** — the cell render loop that renders `cell.blocks` into each `<td>` or
  cell `div`. This is the highest-priority fix.
- **Any block that hosts child blocks** — e.g. column layouts, group blocks, or any composite block
  whose `render()` contains an inner loop over child block nodes.
- **Full reconcile triggers** — any function named `reconcile`, `rerender`, `renderDocument`,
  `renderCell`, `refresh`, or similar that rebuilds block DOM from scratch.

### 3. Commands that Trigger Re-renders

Commands do not render DOM directly, but they emit `doc:change` or call render hooks. Verify that:

- No command clears DOM before emitting the change event. The clearing should be entirely gone —
  owned by the old reconciler, not by commands.
- `InsertBlockCommand`, `DeleteBlockCommand`, `MoveBlockCommand`, and any command operating on
  table cells all emit `doc:change` (or call the render callback) after mutating the document tree.
  The new reconciler handles DOM updates from that event alone.
- If any command manually removes or appends DOM nodes as a side effect (outside of the block's own
  `render()`), remove that side effect. DOM is the reconciler's responsibility.

### 4. Block Definitions with Stable-Root Caches

The embed block already implements stable-root caching (`embedStableRoots` map keyed by `node.id`).
With the new reconciler in place, verify and if necessary update any such caching blocks so that:

- `render()` returns the **same `HTMLElement` reference** when data has not changed (already done
  for embed).
- The cached element is **not detached** before `render()` is called. With the new reconciler this
  is guaranteed — the old pattern that could detach via `innerHTML = ''` is gone.
- Any other block that holds stateful DOM (video player blocks, canvas blocks, etc.) should adopt
  the same stable-root pattern as the embed block.

### 5. `pruneEmbedStableRoots` (and equivalent cleanup hooks)

`pruneEmbedStableRoots(presentBlockIds)` is currently called to clean up stale cache entries.
Ensure it (and any similar cleanup for other block types) is still called after the document tree
changes so that removed blocks do not leak cached DOM. The call site is in the render pipeline, not
in individual commands — keep it there.

---

## What NOT to Change

- The `BlockDefinition` interface (`render`, `serialize`, `deserialize`, `onEnter`, `onDelete`).
- The `RenderContext` / `EditorContext` shape.
- The `embedStableRoots` cache logic inside `EmbedBlock` — it is correct and must stay.
- The `SetEmbedUrlCommand`, `DeleteBlockCommand`, or any other command's mutation logic.
- Selection management, undo/redo stack, or event bus wiring.

---

## Acceptance Criteria

1. Editing text in one table cell does not reload or flicker an iframe in another cell.
2. A Figma or YouTube embed that is in the viewport survives any document change that does not
   affect that embed's own `node.data`.
3. Inserting, deleting, and reordering blocks in the document or within a table cell works
   correctly — no duplicate nodes, no missing nodes, correct DOM order.
4. Undo and redo correctly restore block lists (the reconciler will patch to the restored state).
5. No call site uses `innerHTML = ''` or any equivalent full-clear on a block-list container.
