# Step 2 — Refactor `block-renderer.ts` (lists + document root)

## Goal

Remove **`rootEl.innerHTML = ''`** from `BlockRenderer.reconcile` and replace “clear + append” with **build desired top-level `HTMLElement[]` + `reconcileChildren`**.

Preserve **list grouping**: consecutive `list_item` blocks still produce a single `<ul>`/`<ol>` root per group (same structure as `appendListGroup` today).

## Prompt (copy to agent)

```
Context: packages/text-editor/src/renderer/block-renderer.ts currently:
- Clears root with innerHTML in BlockRenderer.reconcile
- appendRenderedBlockList / appendListGroup only appendChild

Tasks:

1. Import reconcileChildren from the module created in step 1.

2. Refactor so list-building logic produces an array of top-level HTMLElement nodes:
- Extract from appendListGroup the logic that builds ONE list root element (with nested structure) without requiring a parent append; return that element and the next index (same as today).
- For appendRenderedBlockList, either:
  (a) rename to something like collectRenderedBlockListElements(...) -> HTMLElement[], and have a thin wrapper that calls reconcileChildren(parent, elements), OR
  (b) keep appendRenderedBlockList as reconcileChildren(parent, collect...) for backward compatibility.

3. BlockRenderer.reconcile must:
- NOT set rootEl.innerHTML.
- Build the HTMLElement[] for doc.children using the SAME grouping rules as before.
- Call reconcileChildren(rootEl, elements).
- Still call pruneEmbedStableRoots(collectDataBlockIds(rootEl)) after DOM is aligned (keep this in the render pipeline, not in commands).

4. Preserve renderedVersions / versionMap behavior if still needed; if the Map is dead (only cleared and filled but never read), either wire it to a real consumer or remove it in a minimal follow-up — prefer minimal change: keep filling if tests or future code expect it.

5. Update packages/text-editor/src/__tests__/block-registry.test.ts BlockRenderer tests if needed; add at least one test that two reconcile passes with an embed-stable mock (or a stub block that returns the same element reference when data unchanged) proves the DOM node identity at that index is preserved. If EmbedBlock is too heavy for the test, use a tiny fake BlockDefinition registered only in the test.

Do not change BlockDefinition interfaces or RenderContext.
```

## Verification

- [ ] Grep `packages/text-editor`: no `innerHTML = ''` on the editor block list root (document container) — toolbar/palette UI may still use innerHTML; that is OK.
- [ ] Existing `BlockRenderer` tests pass; new identity-preservation test passes.

## Risk

- `appendListGroup` wraps list items by moving children from `blockEl` into `<li>`; keep that behavior identical or list editing will break.
