import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import { SHAPE_DEFAULTS, type ShapeData, appendShapeText, readShapeBounds, getShapeProperties } from './base-shape';
import { GRAPHIC_BLOCK_ELLIPSE } from '../../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
] as const;

export const EllipseBlock: GraphicBlockDefinition<ShapeData> = {
  type: 'ellipse',
  labelKey: GRAPHIC_BLOCK_ELLIPSE,
  icon: 'ellipse',
  pivots: SHAPE_PIVOTS,

  defaultData(): ShapeData {
    return { ...SHAPE_DEFAULTS, border: { ...SHAPE_DEFAULTS.border } };
  },

  renderSvg(node: GraphicElement<ShapeData>): SVGElement {
    const { x, y, width, height, background, border } = node.data;
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${x}, ${y})`);

    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    ellipse.setAttribute('cx', String(width / 2));
    ellipse.setAttribute('cy', String(height / 2));
    ellipse.setAttribute('rx', String(width / 2));
    ellipse.setAttribute('ry', String(height / 2));
    ellipse.setAttribute('fill', background);
    ellipse.setAttribute('stroke', border.color);
    ellipse.setAttribute('stroke-width', String(border.thickness));

    g.appendChild(ellipse);
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
