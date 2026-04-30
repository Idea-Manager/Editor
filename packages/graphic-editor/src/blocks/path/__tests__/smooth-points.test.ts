import { smoothPoints, toPathD } from '../smooth-points';
import type { Point } from '../smooth-points';

// ─── smoothPoints ────────────────────────────────────────────────────────────

describe('smoothPoints', () => {
  it('returns empty array for empty input', () => {
    expect(smoothPoints([])).toEqual([]);
  });

  it('returns a single point unchanged', () => {
    const result = smoothPoints([{ x: 1, y: 2 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ x: 1, y: 2 });
  });

  it('returns two points for two-point input', () => {
    const result = smoothPoints([{ x: 0, y: 0 }, { x: 10, y: 0 }]);
    expect(result).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const raw: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }];
    const copy = raw.map(p => ({ ...p }));
    smoothPoints(raw);
    expect(raw).toEqual(copy);
  });

  describe('RDP simplification', () => {
    it('collapses collinear points (all on the same horizontal line)', () => {
      // 10 collinear points — after RDP only the two endpoints should remain
      const raw: Point[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 0 }));
      const simplified = smoothPoints(raw, { tolerance: 0.5 });
      // After Chaikin on [start, end] we still get a simple 2-point segment
      expect(simplified.length).toBeLessThan(raw.length);
    });

    it('keeps points that deviate significantly from the line', () => {
      // Triangle shape: the apex should survive RDP
      const raw: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: -50 }, // apex — large perpendicular deviation
        { x: 100, y: 0 },
      ];
      const result = smoothPoints(raw, { tolerance: 0.5 });
      // After RDP all 3 points survive; Chaikin then adds intermediate points
      expect(result.length).toBeGreaterThan(2);
    });

    it('respects a custom tolerance', () => {
      // With a very high tolerance, even slightly off-axis points collapse
      const raw: Point[] = [
        { x: 0, y: 0 },
        { x: 50, y: 1 },   // deviation = 1 world unit
        { x: 100, y: 0 },
      ];
      const looseResult = smoothPoints(raw, { tolerance: 5 });
      const strictResult = smoothPoints(raw, { tolerance: 0 });
      expect(looseResult.length).toBeLessThanOrEqual(strictResult.length);
    });
  });

  describe('Chaikin smoothing determinism', () => {
    it('produces the same output for the same input (deterministic)', () => {
      const raw: Point[] = [
        { x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }, { x: 30, y: 5 }, { x: 40, y: 0 },
      ];
      const r1 = smoothPoints(raw);
      const r2 = smoothPoints(raw);
      expect(r1).toEqual(r2);
    });

    it('Chaikin pass inserts intermediate points for a 3-point input', () => {
      // 3 distinct points survive RDP at tolerance 0
      const raw: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
      const result = smoothPoints(raw, { tolerance: 0 });
      // After one Chaikin pass: [p0, q0, q1, q2, q3, p2] — 6 points
      expect(result.length).toBeGreaterThan(3);
    });

    it('first and last points of Chaikin output match original endpoints', () => {
      const raw: Point[] = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }];
      const result = smoothPoints(raw, { tolerance: 0 });
      expect(result[0]).toMatchObject({ x: 0, y: 0 });
      expect(result[result.length - 1]).toMatchObject({ x: 100, y: 0 });
    });
  });
});

// ─── toPathD ─────────────────────────────────────────────────────────────────

describe('toPathD', () => {
  it('returns empty string for empty input', () => {
    expect(toPathD([])).toBe('');
  });

  it('starts with "M" for any non-empty input', () => {
    expect(toPathD([{ x: 5, y: 10 }])).toMatch(/^M/);
    expect(toPathD([{ x: 0, y: 0 }, { x: 10, y: 0 }])).toMatch(/^M/);
    expect(toPathD([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }])).toMatch(/^M/);
  });

  it('returns "M x y" for a single point', () => {
    expect(toPathD([{ x: 3, y: 7 }])).toBe('M 3 7');
  });

  it('returns "M x y L x y" for two points', () => {
    const d = toPathD([{ x: 0, y: 0 }, { x: 10, y: 5 }]);
    expect(d).toMatch(/^M 0 0 L 10 5$/);
  });

  it('contains "Q" quadratic curve segments for ≥3 points', () => {
    const d = toPathD([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }]);
    expect(d).toContain('Q');
  });

  it('produces the correct number of Q segments for ≥3 points', () => {
    // n points → (n-2) Q segments
    const pts: Point[] = Array.from({ length: 5 }, (_, i) => ({ x: i * 10, y: i % 2 === 0 ? 0 : 5 }));
    const d = toPathD(pts);
    const qCount = (d.match(/Q/g) ?? []).length;
    expect(qCount).toBe(pts.length - 2);
  });

  it('output is deterministic', () => {
    const pts: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 3 }, { x: 10, y: 0 }];
    expect(toPathD(pts)).toBe(toPathD(pts));
  });
});
