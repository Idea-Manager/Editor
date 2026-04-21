/**
 * Aligns `container`'s element children to match `elements` in order using reference equality.
 * Unchanged nodes at an index are left untouched. Duplicate references in `elements` are undefined behavior.
 */
export function reconcileChildren(
  container: HTMLElement,
  elements: readonly HTMLElement[],
): void {
  for (const child of Array.from(container.children)) {
    if (!elements.includes(child as HTMLElement)) {
      container.removeChild(child);
    }
  }

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const current = container.children[i] as HTMLElement | undefined;
    if (current === el) continue;
    if (current) {
      container.insertBefore(el, current);
    } else {
      container.appendChild(el);
    }
  }
}
