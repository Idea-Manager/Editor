import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import { SHAPE_DEFAULTS, type ShapeData, appendShapeText, readShapeBounds, getShapeProperties } from './base-shape';
import { GRAPHIC_BLOCK_CIRCLE } from '../../i18n/keys';
import { CIRCLE_TILE_ICON } from './shape-icons';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
] as const;

export const CircleBlock: GraphicBlockDefinition<ShapeData> = {
  type: 'circle',
  labelKey: GRAPHIC_BLOCK_CIRCLE,
  icon: CIRCLE_TILE_ICON,
  pivots: SHAPE_PIVOTS,

  defaultData(): ShapeData {
    return { ...SHAPE_DEFAULTS, border: { ...SHAPE_DEFAULTS.border } };
  },

  renderSvg(node: GraphicElement<ShapeData>): SVGElement {
    const { x, y, width, height, background, border } = node.data;
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${x}, ${y})`);

    // The circle stays inscribed within the bounding box. Uniform corner resize
    // keeps width and height equal by default; the radius is half the side so
    // the rendered shape remains a true circle (not an ellipse).
    const r = Math.min(width, height) / 2;
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', String(width / 2));
    circle.setAttribute('cy', String(height / 2));
    circle.setAttribute('r', String(r));
    circle.setAttribute('fill', background);
    circle.setAttribute('stroke', border.color);
    circle.setAttribute('stroke-width', String(border.thickness));

    g.appendChild(circle);
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
