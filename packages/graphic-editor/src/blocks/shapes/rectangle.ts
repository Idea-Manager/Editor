import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import { SHAPE_DEFAULTS, type ShapeData, appendShapeText, readShapeBounds, getShapeProperties } from './base-shape';
import { GRAPHIC_BLOCK_RECTANGLE } from '../../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
] as const;

export const RectangleBlock: GraphicBlockDefinition<ShapeData> = {
  type: 'rectangle',
  labelKey: GRAPHIC_BLOCK_RECTANGLE,
  icon: 'rectangle',
  pivots: SHAPE_PIVOTS,

  defaultData(): ShapeData {
    return { ...SHAPE_DEFAULTS, border: { ...SHAPE_DEFAULTS.border } };
  },

  renderSvg(node: GraphicElement<ShapeData>): SVGElement {
    const { x, y, width, height, background, border } = node.data;
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${x}, ${y})`);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('fill', background);
    rect.setAttribute('stroke', border.color);
    rect.setAttribute('stroke-width', String(border.thickness));

    g.appendChild(rect);
    return g;
  },

  renderOverlay(node: GraphicElement<ShapeData>, ctx: GraphicRenderContext): HTMLElement | null {
    return appendShapeText(ctx.overlayHost, node, ctx, readShapeBounds(node));
  },

  properties: getShapeProperties,

  getBounds(node: GraphicElement<ShapeData>) {
    return readShapeBounds(node);
  },
};
