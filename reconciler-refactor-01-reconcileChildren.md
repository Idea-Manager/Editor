# Step 1 — Implement `reconcileChildren` (+ tests)

## Goal

Add a shared, well-tested `reconcileChildren(container, elements)` that implements the algorithm from `reconciler-refactor-prompt.md`:

1. Remove container children whose `HTMLElement` is **not** in `elements` (reference check).
2. Walk `elements` in order; at index `i`, if `container.children[i] === elements[i]`, skip; else `insertBefore(el, current)` or `appendChild`.

## Prompt (copy to agent)

```
You are working in the IdeaEditor monorepo.

1. Add a new module `packages/text-editor/src/engine/reconciler.ts` (or `renderer/reconciler.ts` if you prefer colocation with block-renderer; pick one and export from `packages/text-editor/src/index.ts` if other packages need it).

2. Implement:

export function reconcileChildren(container: HTMLElement, elements: readonly HTMLElement[]): void

Behavior:
- After the call, `container.childNodes` should match `elements` in order (only element children; ignore comment nodes if any — prefer iterating `container.children` which is elements only).
- Use reference equality only; never clone nodes.
- Moving a node already under `container` must use DOM move semantics (insertBefore/appendChild), not recreate.
- Empty `elements` should leave the container with no element children.

3. Add focused unit tests (e.g. `packages/text-editor/src/__tests__/reconciler.test.ts`) using the existing test runner patterns in this repo:
- noop when target matches current children exactly (spy or count mutations if practical).
- append when container empty.
- remove extras.
- reorder: [A,B,C] -> [C,A,B] with stable node references.
- idempotent second call with same `elements` array.

Do not touch BlockRenderer or table block in this step.
```

## Verification

- [ ] `pnpm` / `npm` test (or project equivalent) passes for the new file.
- [ ] No new lint issues.

## Notes

- Duplicate references in `elements` are undefined behavior; document in a one-line comment if you do not assert on it.
