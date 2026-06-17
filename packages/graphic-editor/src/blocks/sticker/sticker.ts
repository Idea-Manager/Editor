import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import type { GraphicBlockProperty } from '../properties';
import { SHAPE_DEFAULTS, type ShapeData, appendShapeText } from '../shapes/base-shape';
import { GRAPHIC_BLOCK_STICKER, GRAPHIC_PROPS_TEXT_PLACEHOLDER } from '../../i18n/keys';

export interface StickerData extends ShapeData {
  // Inherits all ShapeData fields; sticker-specific defaults are set below.
}

export const STICKER_DEFAULTS: StickerData = {
  ...SHAPE_DEFAULTS,
  background: '#fff8b3',
  border: { thickness: 0, color: '#000000' },
  textColor: '#111111',
  fontSize: 14,
};

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
] as const;

export const StickerBlock: GraphicBlockDefinition<StickerData> = {
  type: 'sticker',
  labelKey: GRAPHIC_BLOCK_STICKER,
  icon: '<rect x="6" y="5" width="12" height="14" rx="1"/>',
  // groupKey intentionally omitted — sticker appears in the bottom-toolbar
  // Stickers tool (prompt 08), not in the left-panel Shapes accordion.
  pivots: SHAPE_PIVOTS,

  defaultData(): StickerData {
    return { ...STICKER_DEFAULTS, border: { ...STICKER_DEFAULTS.border } };
  },

  renderSvg(node: GraphicElement<StickerData>, ctx: GraphicRenderContext): SVGElement {
    const { x, y, width, height, background } = node.data;
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${x}, ${y})`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', background);
    rect.setAttribute('stroke', 'none');

    // Shadow filter id is injected by CanvasRenderer.build() into the SVG defs.
    // The instanceId is stored on the root element via data-instance-id.
    const instanceId = ctx.rootElement?.dataset?.instanceId;
    if (instanceId) {
      rect.setAttribute('filter', `url(#idea-graphic-sticker-shadow-${instanceId})`);
    }

    g.appendChild(rect);
    return g;
  },

  renderOverlay(node: GraphicElement<StickerData>, ctx: GraphicRenderContext): HTMLElement | null {
    const bounds = { x: node.data.x, y: node.data.y, width: node.data.width, height: node.data.height };
    // Clamp font size at 14pt minimum for stickers; the property editor enforces
    // this too via the properties() descriptor below.
    const effectiveFontSize = Math.max(14, node.data.fontSize);
    const patchedNode: GraphicElement<StickerData> = {
      ...node,
      data: { ...node.data, fontSize: effectiveFontSize },
    };
    return appendShapeText(ctx.overlayHost, patchedNode, ctx, bounds, 'idea-graphic-sticker__text');
  },

  properties(_node: GraphicElement<StickerData>, _ctx: GraphicRenderContext): GraphicBlockProperty[] {
    return [
      { kind: 'text', path: 'data.text', placeholderKey: GRAPHIC_PROPS_TEXT_PLACEHOLDER },
      { kind: 'background', colorPath: 'data.background' },
      { kind: 'textColor', colorPath: 'data.textColor' },
      { kind: 'fontSize', path: 'data.fontSize', min: 14, max: 80, unit: 'pt' },
    ];
  },

  getBounds(node: GraphicElement<StickerData>) {
    const { x, y, width, height } = node.data;
    return { x, y, width, height };
  },
};
