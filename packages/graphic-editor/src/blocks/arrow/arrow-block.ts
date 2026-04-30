import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import { generateArrowPath, arrowHeads, arrowBounds, arrowMidpoint } from './arrow-geometry';
import { GRAPHIC_BLOCK_ARROW } from '../../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArrowHeading = 'none' | 'stroke' | 'fill';
export type ArrowDirection = 'none' | 'to' | 'from' | 'both';
export type ArrowType = 'line' | 'curve';

export interface ArrowEndpoint {
  /** Either anchored to a target element/pivot, or free at a world point. */
  target?: { elementId: string; pivotId?: string };
  point: { x: number; y: number };
}

export interface ArrowData {
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  arrowType: ArrowType;
  heading: ArrowHeading;
  direction: ArrowDirection;
  color: string;
  thickness: number;
  label?: string;
}

export const ARROW_DEFAULTS: Pick<ArrowData, 'arrowType' | 'heading' | 'direction' | 'color' | 'thickness'> = {
  arrowType: 'curve',
  heading: 'stroke',
  direction: 'to',
  color: '#888888',
  thickness: 2,
};

// ─── ArrowBlock ───────────────────────────────────────────────────────────────

export const ArrowBlock: GraphicBlockDefinition<ArrowData> = {
  type: 'arrow',
  labelKey: GRAPHIC_BLOCK_ARROW,
  icon: 'arrow_right_alt',
  groupKey: undefined,

  defaultData(): ArrowData {
    return {
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
      ...ARROW_DEFAULTS,
    };
  },

  renderSvg(node: GraphicElement<ArrowData>, _ctx: GraphicRenderContext): SVGElement {
    const { from, to, arrowType, heading, direction, color, thickness } = node.data;

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.classList.add('idea-graphic-arrow');

    // Main path
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', generateArrowPath(from, to, arrowType));
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(thickness));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    g.appendChild(path);

    // Arrowheads
    const heads = arrowHeads(from, to, arrowType, heading, direction, thickness);
    for (const head of heads) {
      if (head.heading === 'fill') {
        const polygon = document.createElementNS(SVG_NS, 'polygon');
        polygon.setAttribute('points', head.points);
        polygon.setAttribute('fill', color);
        polygon.setAttribute('stroke', 'none');
        g.appendChild(polygon);
      } else {
        // stroke heading: open arrow via polyline
        const polyline = document.createElementNS(SVG_NS, 'polyline');
        polyline.setAttribute('points', head.points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', color);
        polyline.setAttribute('stroke-width', String(thickness));
        polyline.setAttribute('stroke-linecap', 'round');
        polyline.setAttribute('stroke-linejoin', 'round');
        g.appendChild(polyline);
      }
    }

    return g;
  },

  renderOverlay(node: GraphicElement<ArrowData>, ctx: GraphicRenderContext): HTMLElement | null {
    const { label, from, to, arrowType } = node.data;
    if (!label) return null;

    const mid = arrowMidpoint(from, to, arrowType);
    const div = document.createElement('div');
    div.className = 'idea-graphic-arrow__label';
    div.textContent = label;
    div.style.left = `${mid.x}px`;
    div.style.top = `${mid.y}px`;
    div.style.transform = 'translate(-50%, -50%)';
    div.style.pointerEvents = 'auto';
    ctx.overlayHost.appendChild(div);
    return div;
  },

  // Arrows use FlyoutArrowToolbar instead of the floating properties window
  properties: () => [],

  getBounds(node: GraphicElement<ArrowData>) {
    return arrowBounds(node.data);
  },
};
