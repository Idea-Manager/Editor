# DOM reconciler refactor — overview and roadmap

## Idea (from `reconciler-refactor-prompt.md`)

The editor renders `BlockNode` trees by **clearing containers and re-appending** new DOM on every change (`innerHTML = ''` at the document root, and fresh table/cell trees from `BlockDefinition.render`). That **destroys stateful subtrees** (iframes, video, canvas) even when the underlying block data is unchanged.

**Target:** a **DOM-patching reconciler** that aligns a container’s children with a target `HTMLElement[]` using **reference equality** (`===`). Unchanged nodes stay in place (no DOM ops). Moved nodes use `insertBefore` / `appendChild` (moves, not clones). Removed nodes are dropped from the container.

**Why reference equality matters:** blocks like embeds use a **stable-root cache** and return the **same** `HTMLElement` when data is unchanged. The reconciler must never clone those elements.

## Current codebase map (verify while refactoring)

| Area | File(s) | Today |
|------|---------|--------|
| Document root reconcile | `packages/text-editor/src/renderer/block-renderer.ts` (`BlockRenderer.reconcile`) | `rootEl.innerHTML = ''` then `appendRenderedBlockList` |
| Flat list + list groups | Same file (`appendRenderedBlockList`, `appendListGroup`) | Always `appendChild` into parent |
| Table cells | `packages/text-editor/src/blocks/table-block.ts` | New cell inner each `render()`, `appendRenderedBlockList` into `.idea-table-cell__inner` |
| Embed cache / prune | `packages/text-editor/src/blocks/embed-block.ts` | `embedStableRoots`, `pruneEmbedStableRoots` after render |
| Editor hook | `packages/text-editor/src/engine/text-editor.ts` | `blockRenderer.reconcile(...)` on each render |

`appendRenderedBlockList` is only referenced from `block-renderer.ts` and `table-block.ts` (easy to migrate).

## Important nuance: list grouping

Top-level DOM children are **not** always one element per `BlockNode`. Consecutive `list_item` nodes are grouped into a single `<ul>` or `<ol>` (`appendListGroup`). Any refactor must **preserve that grouping algorithm** and reconcile the resulting **sequence of top-level elements** (each block root or one list root per group).

## Architectural invariants (do not violate)

- `BlockDefinition.render()` owns block DOM; the reconciler only **orders children** of a container.
- Do not clone elements returned from `render()`.
- Do not strip or rewrite `contenteditable`, `data-block-id`, or other attributes set in `render()`.
- Undo/redo, selection, and event bus stay in commands / editor — not in the reconciler.

## Phased prompt files (use in order)

1. `reconciler-refactor-01-reconcileChildren.md` — core utility + unit tests  
2. `reconciler-refactor-02-block-renderer-lists.md` — build target child list + wire document reconcile  
3. `reconciler-refactor-03-table-cells.md` — table cell inners  
4. `reconciler-refactor-04-commands-and-dom.md` — audit commands for DOM side effects  
5. `reconciler-refactor-05-stable-roots-and-prune.md` — embed cache, `pruneEmbedStableRoots`, optional other blocks  
6. `reconciler-refactor-06-acceptance-and-followups.md` — acceptance criteria, tests, optional **table stable root** if iframe-in-table still flickers  

## Optional harder follow-up

If acceptance tests show **iframes inside tables** still reload because the **whole table** `render()` builds a new wrapper every time, consider a **stable root for the table block** (cache keyed by `node.id`) and incremental updates — that is **out of scope** for the minimal reconciler swap but may be required for perfect table UX.
