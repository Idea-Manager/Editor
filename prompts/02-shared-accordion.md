# Prompt 02 — Shared `Accordion` component

> Read [`prompts/00-INDEX.md`](./00-INDEX.md) first.

## Goal

Add a reusable, **slot-based** Accordion to `shared/components/accordion/`,
matching the project's existing component conventions (`modal`, `color-picker`,
`dropdown-combobox`, `toast`). It will be used by:

- the graphic editor's left panel (block groups + the sticky "Custom" group),
- the floating properties window (property sections),
- the future floating window for graphic frames.

## Design

A vanilla TS class, no framework:

```ts
export interface AccordionItem {
  id: string;
  /** Plain text or any HTMLElement — rendered into the title row. */
  title: string | HTMLElement;
  /** DOM rendered into the collapsible body (slot). */
  content: HTMLElement;
  /** Initial state. Default: false. */
  defaultOpen?: boolean;
  /** Set to true to disable interaction (e.g. empty Custom group). */
  disabled?: boolean;
}

export interface AccordionConfig {
  items: AccordionItem[];
  /**
   * 'single' = at most one item is open at a time (default for left panel).
   * 'multiple' = each item toggles independently (default for property panels).
   */
  mode?: 'single' | 'multiple';
  /** Optional callback fired on every open/close change. */
  onToggle?: (id: string, open: boolean) => void;
}

export class Accordion {
  readonly element: HTMLElement;
  constructor(config: AccordionConfig);
  open(id: string): void;
  close(id: string): void;
  toggle(id: string): void;
  /** Returns the open IDs in the order they were opened. */
  getOpen(): string[];
  /** Replace items wholesale (re-renders, preserves currently-open IDs that still exist). */
  setItems(items: AccordionItem[]): void;
  destroy(): void;
}
```

## Animation

Smooth height animation using `max-height` transition with a sensible default
(e.g. `200ms ease-out`). Avoid using actual measured `scrollHeight` only for
the open transition (it is the standard pattern but works correctly here);
falling back to `auto` once expanded. Reduced motion: respect
`@media (prefers-reduced-motion: reduce)` to skip the animation.

## DOM structure

```html
<div class="idea-accordion" data-mode="single">
  <section class="idea-accordion__item" data-id="…" data-open="true|false">
    <button class="idea-accordion__header" type="button" aria-expanded="…">
      <span class="material-symbols-outlined idea-accordion__chevron">chevron_right</span>
      <span class="idea-accordion__title">…</span>
    </button>
    <div class="idea-accordion__body" role="region">
      <div class="idea-accordion__body-inner"><!-- slotted content --></div>
    </div>
  </section>
  …
</div>
```

When opening, the chevron rotates 90° (`transform: rotate(90deg)`).

## Files to create

- `shared/components/accordion/accordion.ts`
- `shared/components/accordion/accordion.scss` — must start with
  `@use '../../../src/styles/variables' as *;` (matches sibling components).
  Use `$color-border`, `$color-bg`, `$color-bg-subtle`, `$color-text`,
  `$color-text-secondary`, `$spacing-*`, `$font-size-sm`/`base`. No raw hex.
- `shared/components/accordion/index.ts` — `export { Accordion } from './accordion'; export type { AccordionItem, AccordionConfig } from './accordion';`

## Tests

`shared/components/accordion/__tests__/accordion.test.ts` (jsdom):

- Renders items; first item is open if `defaultOpen` is true on it.
- `mode: 'single'` — opening another item closes the previous one.
- `mode: 'multiple'` — multiple items can be open.
- `toggle(id)` flips `aria-expanded` and `data-open`.
- `setItems` preserves `getOpen()` for ids that still exist.
- `onToggle` fires with `(id, true)` on open and `(id, false)` on close.
- `destroy()` removes listeners (verifiable by toggling after destroy doesn't change DOM).

The Accordion test should be added to a Jest project — check `jest.config.js`.
The current config has projects `core` and `text-editor`; this is shared code.
**Add a third project** to `jest.config.js`:

```js
{
  ...sharedConfig,
  displayName: 'shared',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/shared'],
},
```

## Don'ts

- **Do not** import from `packages/text-editor/*` or `packages/core/*` (this is
  generic UI; only `shared/` style imports allowed).
- **Do not** depend on a framework — vanilla TS / DOM only.
- **Do not** hardcode colors. Use SCSS tokens.
- **Do not** require font-family / font-size to be set — let parent context
  control typography unless the component needs a specific weight.

## Acceptance criteria

- `import { Accordion } from '@shared/components/accordion';` works (verify by
  the test file using that path; jest already resolves `@shared/*`).
- `npm test` green for the new `shared` project.
- Visual demo (manual): in a throwaway HTML page or directly in
  `src/main.ts` temporarily, instantiate one and verify open/close animates.
  Revert any temporary `main.ts` change before finalising.
