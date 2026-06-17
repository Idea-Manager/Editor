import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicRenderContext } from '../../engine/render-context';
import type { GraphicBlockDefinition } from '../block-definition';
import type { GraphicBlockProperty } from '../properties';
import { toPathD } from './smooth-points';
import { GRAPHIC_BLOCK_PATH } from '../../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── PathData ────────────────────────────────────────────────────────────────

export interface PathData {
  /** World-space points along the stroke; already smoothed. */
  points: Array<{ x: number; y: number }>;
  /** Stroke colour. Hex literal is allowed for data defaults (see project convention). */
  stroke: string;
  /** Stroke thickness in px (constant; no pressure curves). */
  strokeWidth: number;
  /** Line cap style. Default 'round'. */
  lineCap?: 'butt' | 'round' | 'square';
  /** Line join style. Default 'round'. */
  lineJoin?: 'miter' | 'round' | 'bevel';
  /** AABB cached for hit-testing; recomputed by PenController when the stroke is committed. */
  bounds: { x: number; y: number; width: number; height: number };
}

export const PATH_DEFAULTS = {
  stroke: '#444444',
  strokeWidth: 2,
  lineCap: 'round' as const,
  lineJoin: 'round' as const,
};

// ─── PathBlock ───────────────────────────────────────────────────────────────

export const PathBlock: GraphicBlockDefinition<PathData> = {
  type: 'path',
  labelKey: GRAPHIC_BLOCK_PATH,
  icon: '<path d="M4 20 L8 6 L14 14 L20 4"/>',
  // No groupKey — paths are created exclusively via the Pen tool, not the left panel.

  defaultData(): PathData {
    return {
      points: [],
      stroke: PATH_DEFAULTS.stroke,
      strokeWidth: PATH_DEFAULTS.strokeWidth,
      lineCap: PATH_DEFAULTS.lineCap,
      lineJoin: PATH_DEFAULTS.lineJoin,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    };
  },

  renderSvg(node: GraphicElement<PathData>): SVGElement {
    const { points, stroke, strokeWidth, lineCap, lineJoin } = node.data;

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', toPathD(points));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', String(strokeWidth));
    path.setAttribute('stroke-linecap', lineCap ?? PATH_DEFAULTS.lineCap);
    path.setAttribute('stroke-linejoin', lineJoin ?? PATH_DEFAULTS.lineJoin);

    g.appendChild(path);
    return g;
  },

  renderOverlay(): null {
    return null;
  },

  properties(_node: GraphicElement<PathData>, _ctx: GraphicRenderContext): GraphicBlockProperty[] {
    return [
      { kind: 'strokeColor', colorPath: 'data.stroke' },
      { kind: 'fontSize', path: 'data.strokeWidth', min: 1, max: 20, unit: 'px' },
    ];
  },

  getBounds(node: GraphicElement<PathData>) {
    return node.data.bounds;
  },
};
