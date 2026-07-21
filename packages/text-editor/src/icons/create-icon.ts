/**
 * Renders a Material Symbols Outlined glyph. Base styles load the matching font.
 */
export function createIcon(name: string): HTMLSpanElement {
  const el = document.createElement('span');
  el.classList.add('material-symbols-outlined');
  el.textContent = name;
  return el;
}
