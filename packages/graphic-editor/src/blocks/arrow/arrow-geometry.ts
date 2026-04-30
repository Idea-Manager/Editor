import type { ArrowData, ArrowEndpoint, ArrowDirection, ArrowHeading } from './arrow-block';

// ─── Path generation ─────────────────────────────────────────────────────────

/**
 * Generates the SVG `d` attribute for an arrow path.
 * - 'line': straight segment from `from.point` to `to.point`
 * - 'curve': quadratic bezier; control point is perpendicular to the midpoint,
 *   offset by `min(dist * 0.25, 80)` in the direction of the perpendicular.
 *   The perpendicular direction is always the left-normal of the from→to vector
 *   (normalised: (-dy, dx)), making the formula fully deterministic for tests.
 */
export function generateArrowPath(
  from: ArrowEndpoint,
  to: ArrowEndpoint,
  arrowType: 'line' | 'curve',
): string {
  const { x: ax, y: ay } = from.point;
  const { x: bx, y: by } = to.point;

  if (arrowType === 'line') {
    return `M ${ax} ${ay} L ${bx} ${by}`;
  }

  // Quadratic bezier control point
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(dist * 0.25, 80);

  let cpx = mx;
  let cpy = my;

  if (dist > 0) {
    // Left-normal of the from→to vector (−dy, dx), normalised
    const nx = -dy / dist;
    const ny = dx / dist;
    cpx = mx + nx * offset;
    cpy = my + ny * offset;
  }

  return `M ${ax} ${ay} Q ${cpx} ${cpy} ${bx} ${by}`;
}

/**
 * Returns the path midpoint (t = 0.5) for a line or curve.
 * Used for label positioning and flyout toolbar anchoring.
 */
export function arrowMidpoint(
  from: ArrowEndpoint,
  to: ArrowEndpoint,
  arrowType: 'line' | 'curve',
): { x: number; y: number } {
  const { x: ax, y: ay } = from.point;
  const { x: bx, y: by } = to.point;

  if (arrowType === 'line') {
    return { x: (ax + bx) / 2, y: (ay + by) / 2 };
  }

  // Quadratic bezier midpoint at t=0.5: 0.25*P0 + 0.5*CP + 0.25*P1
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = Math.min(dist * 0.25, 80);

  let cpx = mx;
  let cpy = my;

  if (dist > 0) {
    const nx = -dy / dist;
    const ny = dx / dist;
    cpx = mx + nx * offset;
    cpy = my + ny * offset;
  }

  return {
    x: 0.25 * ax + 0.5 * cpx + 0.25 * bx,
    y: 0.25 * ay + 0.5 * cpy + 0.25 * by,
  };
}

// ─── Arrowhead geometry ───────────────────────────────────────────────────────

/**
 * Computes the arrowhead size based on stroke thickness.
 * Returns width (perpendicular half-span) and length (along direction) in world units.
 */
function headSize(thickness: number): { w: number; len: number } {
  const base = Math.max(6, thickness * 3);
  return { w: base * 0.6, len: base };
}

/**
 * Returns points for one arrowhead as a polygon (filled) or polyline (stroke).
 *
 * The arrowhead is an isoceles triangle pointing in the direction `dx, dy`
 * (must be normalised). `tip` is the arrow tip position.
 */
function headPoints(
  tip: { x: number; y: number },
  dx: number,
  dy: number,
  thickness: number,
): string {
  const { w, len } = headSize(thickness);
  // Base centre = tip − len * direction
  const bx = tip.x - dx * len;
  const by = tip.y - dy * len;
  // Perpendicular
  const px = -dy;
  const py = dx;
  const p1x = bx + px * w;
  const p1y = by + py * w;
  const p2x = bx - px * w;
  const p2y = by - py * w;
  return `${tip.x},${tip.y} ${p1x},${p1y} ${p2x},${p2y}`;
}

export interface ArrowHeadSpec {
  points: string;
  heading: ArrowHeading;
}

/**
 * Returns the arrowhead specs to render according to `heading` and `direction`.
 * Each entry says where to draw (points) and what visual type (heading).
 */
export function arrowHeads(
  from: ArrowEndpoint,
  to: ArrowEndpoint,
  arrowType: 'line' | 'curve',
  heading: ArrowHeading,
  direction: ArrowDirection,
  thickness: number,
): ArrowHeadSpec[] {
  if (heading === 'none' || direction === 'none') return [];

  const { x: ax, y: ay } = from.point;
  const { x: bx, y: by } = to.point;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return [];

  const ndx = dx / dist;
  const ndy = dy / dist;

  const specs: ArrowHeadSpec[] = [];

  if (direction === 'to' || direction === 'both') {
    specs.push({
      points: headPoints(to.point, ndx, ndy, thickness),
      heading,
    });
  }
  if (direction === 'from' || direction === 'both') {
    specs.push({
      points: headPoints(from.point, -ndx, -ndy, thickness),
      heading,
    });
  }

  // For curved arrows the tangent at the endpoint differs from the chord direction,
  // but for a deterministic approximation we use the chord for test stability.
  // Future: compute tangent from control point for pixel-perfect heads.
  return specs;
}

// ─── Bounds ───────────────────────────────────────────────────────────────────

/**
 * Returns the AABB for an arrow element, extended by `thickness + 6` to
 * account for arrowhead extents and hit-testing tolerance.
 */
export function arrowBounds(data: ArrowData): { x: number; y: number; width: number; height: number } {
  const { x: ax, y: ay } = data.from.point;
  const { x: bx, y: by } = data.to.point;

  let minX = Math.min(ax, bx);
  let minY = Math.min(ay, by);
  let maxX = Math.max(ax, bx);
  let maxY = Math.max(ay, by);

  // For curves include an approximation of the control point bulge
  if (data.arrowType === 'curve') {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(dist * 0.25, 80);
    if (dist > 0) {
      const nx = -dy / dist;
      const ny = dx / dist;
      const cpx = mx + nx * offset;
      const cpy = my + ny * offset;
      minX = Math.min(minX, cpx);
      minY = Math.min(minY, cpy);
      maxX = Math.max(maxX, cpx);
      maxY = Math.max(maxY, cpy);
    }
  }

  const margin = data.thickness + 6;
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
}
