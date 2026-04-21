# Step 3 — Table cell block lists

## Goal

Every table cell inner host uses the same **reconcile** pattern as the document root: **no full clear** of the cell’s block container; **`reconcileChildren(inner, elements)`** after building the desired list with the shared list-grouping helper from step 2.

Today: `packages/text-editor/src/blocks/table-block.ts` calls `appendRenderedBlockList(registry, cell.blocks, inner, ctx)` on a **new** `inner` div each time `TableBlock.render` runs.

## Prompt (copy to agent)

```
1. In packages/text-editor/src/blocks/table-block.ts, replace the appendRenderedBlockList call with the same API used after step 2: build HTMLElement[] for cell.blocks (including list grouping) and reconcileChildren(inner, elements).

2. Import reconcileChildren (or the shared "render block list into container" helper) from the canonical place — avoid duplicating list logic in table-block.ts; reuse the same collect/reconcile path as block-renderer.

3. Ensure RenderContext / registry usage stays identical (still require ctx.blockRegistry).

4. Add or extend a test that renders a table with two cells, each with blocks; mutate text in one cell’s model and reconcile; assert the other cell’s block root elements (by data-block-id) remain the same HTMLElement instances if the block definitions return stable references. If the project has no DOM-capable test env for tables, add a lighter test: mock block returning stable HTMLElement and assert reconcile preserves it in a cell inner.

No changes to table data model or merge logic in this step.
```

## Verification

- [ ] Table insert/delete row/column/cell tests still pass.
- [ ] No `innerHTML = ''` on `.idea-table-cell__inner` (there should be none today; keep it that way).

## Note on whole-table rebuild

`TableBlock.render` still creates a **new** grid wrapper each time. Embeds may survive via **stable element references** moved into new inners; if QA shows iframe reload, see `reconciler-refactor-06-acceptance-and-followups.md` for a table stable-root follow-up.
