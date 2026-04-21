# Step 5 — Stable roots, `pruneEmbedStableRoots`, other block types

## Goal

Ensure **embed** (and any future stateful blocks) stay correct with reconciliation:

- `render()` returns the **same** `HTMLElement` when `node.data` is unchanged.
- Cached nodes are not **cloned** by the reconciler (reference identity).
- **`pruneEmbedStableRoots(presentBlockIds)`** still runs after a full editor reconcile so deleted blocks do not leak DOM nodes in the cache.

## Prompt (copy to agent)

```
1. Read packages/text-editor/src/blocks/embed-block.ts:
- Confirm embedStableRoots cache keying by node.id is correct.
- Confirm render() paths return cached wrapper when appropriate.
- Note any wrapper.innerHTML = '' inside render — that is intentional when rebuilding embed chrome; do not move that to the reconciler.

2. Verify pruneEmbedStableRoots is still invoked once per reconcile after the DOM reflects the document (packages/text-editor/src/renderer/block-renderer.ts BlockRenderer.reconcile). If the call moved, ensure collectDataBlockIds still scans the post-reconcile tree.

3. Search for other blocks that might hold heavy DOM (future: video, canvas). If none, add a brief TODO in code or architecture note. If any exist, apply the same stable-root pattern as embed (same reference on unchanged data).

4. Optional test: create document with embed, reconcile twice without changing embed node data, assert iframe element (or wrapper) is identical reference and still connected to document.

Do not change SetEmbedUrlCommand / DeleteBlockCommand mutation logic beyond what is required to remove DOM side effects (step 4).
```

## Verification

- [ ] `pruneEmbedStableRoots` still called from the render pipeline with IDs from the live DOM.
- [ ] No double-prune that would break mid-render unless intentionally justified.
