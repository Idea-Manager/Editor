export function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container === 'string') {
    const el = document.querySelector<HTMLElement>(container);
    if (!el) {
      throw new Error(`IdeaEditor: container not found for selector "${container}"`);
    }
    return el;
  }
  return container;
}
