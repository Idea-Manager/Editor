# Step 4 — Commands audit (no DOM clearing / manual block tree surgery)

## Goal

Rendering and child ordering are **only** via `BlockRenderer` + `reconcileChildren` paths. Commands mutate the document model and emit lifecycle events; they must not **`innerHTML` / clear** editor block containers or **manually** add/remove block host nodes outside `render()`.

## Prompt (copy to agent)

```
1. Search the repo for patterns that affect the editor document DOM:
- innerHTML = '' or innerHTML =
- removeChild / replaceChild on elements that host blocks (especially text-editor package, engine, blocks)
- while (container.firstChild) container.removeChild(...)
- querySelector on editor root then destructive DOM ops

2. Focus on packages/text-editor/src/engine/commands/** and any code invoked on doc:change / render hooks.

3. For each hit:
- If it targets the rich-text block tree container (document root or cell inners), remove or relocate that logic so reconciliation owns updates.
- Toolbar / modal / palette innerHTML is generally fine if it is not the block list host.

4. Confirm InsertBlockCommand, DeleteBlockCommand, MoveBlockCommand, and table-related commands still emit the same events after model mutation so TextEditor’s render() runs once and reconciles.

5. Document findings in a short comment in the PR description or in reconciler-refactor-06 if something must stay for a non-obvious reason.

Do not change command semantics (what the document model does), only illegal DOM side effects on block hosts.
```

## Verification

- [ ] No command clears `TextEditor`’s main block container or table cell inner hosts.
- [ ] Integration / unit tests for insert, delete, move, undo/redo still pass.
