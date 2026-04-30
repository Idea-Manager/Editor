import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import { SHAPE_DEFAULTS, type ShapeData, appendShapeText, readShapeBounds, getShapeProperties } from './base-shape';
import { GRAPHIC_BLOCK_TRIANGLE } from '../../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
] as const;

export const TriangleBlock: GraphicBlockDefinition<ShapeData> = {
  type: 'triangle',
  labelKey: GRAPHIC_BLOCK_TRIANGLE,
  icon: 'change_history',
  pivots: SHAPE_PIVOTS,

  defaultData(): ShapeData {
    return { ...SHAPE_DEFAULTS, border: { ...SHAPE_DEFAULTS.border } };
  },

  renderSvg(node: GraphicElement<ShapeData>): SVGElement {
    const { x, y, width, height, background, border } = node.data;
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('transform', `translate(${x}, ${y})`);

    // Apex-up triangle: top-center, bottom-right, bottom-left
    const points = `${width / 2},0 ${width},${height} 0,${height}`;
    const polygon = document.createElementNS(SVG_NS, 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', background);
    polygon.setAttribute('stroke', border.color);
    polygon.setAttribute('stroke-width', String(border.thickness));

    g.appendChild(polygon);
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
