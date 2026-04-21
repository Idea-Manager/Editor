# Step 6 — Acceptance criteria, regression tests, follow-ups

## Acceptance criteria (from original prompt)

1. Editing text in **one table cell** does not reload or visibly flicker an **iframe in another cell**.
2. A **Figma or YouTube** embed in the viewport survives document changes that **do not** change that embed’s `node.data`.
3. **Insert / delete / reorder** blocks at document level and inside table cells: correct order, no duplicates, no missing nodes.
4. **Undo / redo** restores block lists; DOM matches after reconcile.
5. **No** `innerHTML = ''` (or equivalent full clear) on **block-list containers** (document root, cell inners).

## Prompt (copy to agent)

```
1. Manual QA checklist (run the app):
- Document with paragraph + embed + paragraph: type in paragraph; embed should not reload.
- Table: cell A = paragraph, cell B = embed; type in A; B’s iframe should stay stable (no full flash).
- Reorder blocks (drag or commands); structure OK.
- Undo/redo after structural edits.

2. Automated tests to add or strengthen:
- reconciler unit tests (step 1).
- BlockRenderer preserves stable element reference where render() returns same instance (step 2).
- Grep-based CI guard OR a short dev-only script: fail if innerHTML is assigned on known block host selectors (optional; only if team wants enforcement).

3. Search repo for block-list clears:
  rg "innerHTML\\s*=" packages/text-editor/src --glob "*.ts"
  rg "firstChild" packages/text-editor/src/renderer packages/text-editor/src/blocks/table-block.ts

4. If table embed still flickers after steps 1–5:
- Implement TableBlock stable-root cache keyed by table node.id: reuse wrapper + grid shell where possible, reconcile per-cell inners only, OR document why full table replace is required and consider smaller patches (out of scope for v1).

5. Update exports in packages/text-editor/src/index.ts if reconcileChildren is part of the public API; otherwise keep internal.

Keep BlockDefinition and RenderContext public shapes unchanged unless a separate API milestone is approved.
```

## Definition of done

- [ ] All steps 1–5 complete.
- [ ] Acceptance manual checks pass.
- [ ] Test suite green.
- [ ] No full clears on block-list hosts; embed prune still wired.

## Reference

Full specification: `reconciler-refactor-prompt.md`.
