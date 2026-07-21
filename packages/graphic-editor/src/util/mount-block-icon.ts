import type { GraphicBlockIcon } from '../blocks/block-definition';

const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFAULT_TILE_SVG_ATTRS = {
  xmlns: SVG_NS,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.5',
} as const;

function toTileSvgMarkup(icon: string): string {
  const trimmed = icon.trim();
  if (trimmed.toLowerCase().startsWith('<svg')) {
    return trimmed;
  }
  return `<svg xmlns="${DEFAULT_TILE_SVG_ATTRS.xmlns}" viewBox="${DEFAULT_TILE_SVG_ATTRS.viewBox}" fill="${DEFAULT_TILE_SVG_ATTRS.fill}" stroke="${DEFAULT_TILE_SVG_ATTRS.stroke}" stroke-width="${DEFAULT_TILE_SVG_ATTRS['stroke-width']}">${trimmed}</svg>`;
}

function createDefaultTileSvgShell(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  for (const [key, value] of Object.entries(DEFAULT_TILE_SVG_ATTRS)) {
    svg.setAttribute(key, value);
  }
  return svg;
}

function resolveSvgElement(icon: SVGElement): SVGSVGElement {
  if (icon instanceof SVGSVGElement) {
    return icon;
  }
  const shell = createDefaultTileSvgShell();
  shell.appendChild(icon.cloneNode(true));
  return shell;
}

function mountSvgString(icon: string, target: HTMLElement): void {
  const markup = toTileSvgMarkup(icon);
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');

  if (doc.querySelector('parsererror')) {
    console.error('mountBlockIcon: invalid SVG string provided.');
    return;
  }

  const root = doc.documentElement;
  if (!(root instanceof SVGSVGElement)) {
    console.error('mountBlockIcon: invalid SVG string provided.');
    return;
  }

  target.appendChild(root);
}

function mountSvgElement(icon: SVGElement, target: HTMLElement): void {
  target.appendChild(resolveSvgElement(icon).cloneNode(true));
}

/**
 * Mounts a block tile icon into `target`, accepting inline SVG markup or a live node.
 */
export function mountBlockIcon(icon: GraphicBlockIcon, target: HTMLElement): void {
  target.replaceChildren();

  if (typeof icon === 'string') {
    mountSvgString(icon, target);
    return;
  }

  if (icon instanceof SVGElement) {
    mountSvgElement(icon, target);
    return;
  }

  console.error('mountBlockIcon: icon must be a string or SVGElement.');
}
