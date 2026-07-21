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
/**
 * Simplify and smooth a raw freehand point buffer.
 *
 * Pipeline: RDP → single Chaikin pass.
 * Returns the smoothed point list. Input is not mutated.
 */
export declare function smoothPoints(raw: Point[], options?: SmoothOptions): Point[];
/**
 * Convert a point list to an SVG `d` attribute string.
 *
 * - 0 points → empty string
 * - 1–2 points → `M x y` (or `M x y L x y`)
 * - ≥3 points → quadratic Bézier curves through midpoints for visual smoothness.
 *   Each triple (prev-mid, control-point, next-mid) produces a `Q` segment.
 *   This is the classic "smooth curve through points via midpoints as knots" technique.
 */
export declare function toPathD(points: Point[]): string;
//# sourceMappingURL=smooth-points.d.ts.map