/**
 * Smoothing helpers for freehand pen strokes.
 *
 * Pipeline: raw buffer → RDP simplification → Chaikin corner-cutting → SVG path string
 *
 * Algorithm choices:
 * - Ramer–Douglas–Peucker (RDP) removes redundant collinear/near-collinear points.
 *   Default tolerance = 0.6 world units — keeps fine detail while cutting noise.
 * - One pass of Chaikin corner-cutting smooths the remaining polyline.
 *   Each edge is replaced by two new points at 1/4 and 3/4 of the original edge.
 *   Single pass is sufficient; additional passes over-smooth short strokes.
 * - Both functions are pure and deterministic, which makes them straightforward to test.
 */

export interface Point {
  x: number;
  y: number;
}

export interface SmoothOptions {
  /**
   * RDP perpendicular-distance tolerance in world units.
   * Points within this distance of the simplified line are removed.
   * @default 0.6
   */
  tolerance?: number;
}

// ─── Ramer–Douglas–Peucker ────────────────────────────────────────────────────

/** Perpendicular distance from point `p` to the line through `a` and `b`. */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    // Degenerate segment — return point-to-point distance
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  // Area of triangle × 2 / base length
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.hypot(dx, dy);
}

/** Recursive RDP simplification over the slice `points[start..end]` (inclusive). */
function rdpSlice(points: Point[], start: number, end: number, tolerance: number, keep: boolean[]): void {
  if (end <= start + 1) return;

  let maxDist = 0;
  let maxIndex = start;

  for (let i = start + 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[start], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIndex = i;
    }
  }

  if (maxDist > tolerance) {
    keep[maxIndex] = true;
    rdpSlice(points, start, maxIndex, tolerance, keep);
    rdpSlice(points, maxIndex, end, tolerance, keep);
  }
}

/** Apply Ramer–Douglas–Peucker simplification to a polyline. */
function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return [...points];

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  rdpSlice(points, 0, points.length - 1, tolerance, keep);

  return points.filter((_, i) => keep[i]);
}

// ─── Chaikin corner-cutting ───────────────────────────────────────────────────

/**
 * One pass of Chaikin corner-cutting.
 * Each edge [A, B] is replaced by two points: A + 0.25*(B-A) and A + 0.75*(B-A).
 * The first and last points of an open polyline are preserved unchanged.
 */
function chaikin(points: Point[]): Point[] {
  if (points.length <= 2) return [...points];

  const result: Point[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    result.push(
      { x: a.x + 0.25 * (b.x - a.x), y: a.y + 0.25 * (b.y - a.y) },
      { x: a.x + 0.75 * (b.x - a.x), y: a.y + 0.75 * (b.y - a.y) },
    );
  }

  result.push(points[points.length - 1]);
  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Simplify and smooth a raw freehand point buffer.
 *
 * Pipeline: RDP → single Chaikin pass.
 * Returns the smoothed point list. Input is not mutated.
 */
export function smoothPoints(raw: Point[], options?: SmoothOptions): Point[] {
  if (raw.length === 0) return [];
  if (raw.length === 1) return [{ ...raw[0] }];

  const tolerance = options?.tolerance ?? 0.6;
  const simplified = rdp(raw, tolerance);
  return chaikin(simplified);
}

/**
 * Convert a point list to an SVG `d` attribute string.
 *
 * - 0 points → empty string
 * - 1–2 points → `M x y` (or `M x y L x y`)
 * - ≥3 points → quadratic Bézier curves through midpoints for visual smoothness.
 *   Each triple (prev-mid, control-point, next-mid) produces a `Q` segment.
 *   This is the classic "smooth curve through points via midpoints as knots" technique.
 */
export function toPathD(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${fmt(points[0].x)} ${fmt(points[0].y)}`;
  if (points.length === 2) {
    return `M ${fmt(points[0].x)} ${fmt(points[0].y)} L ${fmt(points[1].x)} ${fmt(points[1].y)}`;
  }

  // ≥3 points: quadratic Bézier through midpoints
  // Start at the midpoint of the first segment
  const first = midpoint(points[0], points[1]);
  let d = `M ${fmt(first.x)} ${fmt(first.y)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const cp = points[i];
    const end = midpoint(points[i], points[i + 1]);
    d += ` Q ${fmt(cp.x)} ${fmt(cp.y)} ${fmt(end.x)} ${fmt(end.y)}`;
  }

  // Final line to the last point
  const last = points[points.length - 1];
  d += ` L ${fmt(last.x)} ${fmt(last.y)}`;

  return d;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Format a number to at most 3 decimal places, trimming trailing zeros. */
function fmt(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}
