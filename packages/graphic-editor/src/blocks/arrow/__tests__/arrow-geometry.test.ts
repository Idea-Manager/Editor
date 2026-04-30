import {
  generateArrowPath,
  arrowMidpoint,
  arrowHeads,
  arrowBounds,
} from '../arrow-geometry';
import type { ArrowData, ArrowEndpoint } from '../arrow-block';
import { ARROW_DEFAULTS } from '../arrow-block';

function ep(x: number, y: number): ArrowEndpoint {
  return { point: { x, y } };
}

// ─── generateArrowPath ───────────────────────────────────────────────────────

describe('generateArrowPath', () => {
  it('produces a straight line path for type=line', () => {
    const d = generateArrowPath(ep(0, 0), ep(100, 0), 'line');
    expect(d).toBe('M 0 0 L 100 0');
  });

  it('produces a quadratic bezier path for type=curve', () => {
    const d = generateArrowPath(ep(0, 0), ep(100, 0), 'curve');
    // Horizontal line: from=(0,0) to=(100,0): dx=100, dy=0, dist=100
    // left-normal = (-dy/dist, dx/dist) = (0, 1), offset = min(25,80) = 25
    // CP = (50 + 0*25, 0 + 1*25) = (50, 25)
    expect(d).toBe('M 0 0 Q 50 25 100 0');
  });

  it('curve: control point offset is capped at 80 for very long arrows', () => {
    // dist = 1000, offset = min(250, 80) = 80
    // left-normal = (0, 1), CP = (500, 80)
    const d = generateArrowPath(ep(0, 0), ep(1000, 0), 'curve');
    expect(d).toBe('M 0 0 Q 500 80 1000 0');
  });

  it('curve: degenerate (zero length) returns M…Q at same point', () => {
    const d = generateArrowPath(ep(50, 50), ep(50, 50), 'curve');
    expect(d).toBe('M 50 50 Q 50 50 50 50');
  });

  it('line path is deterministic for vertical arrows', () => {
    const d = generateArrowPath(ep(0, 0), ep(0, 100), 'line');
    expect(d).toBe('M 0 0 L 0 100');
  });

  it('curve: vertical arrow control point is to the left', () => {
    // from=(0,0), to=(0,100): dx=0, dy=100, dist=100
    // left-normal = (-dy/dist, dx/dist) = (-100/100, 0/100) = (-1, 0)
    // offset = min(25, 80) = 25
    // CP = (0 + (-1)*25, 50 + 0*25) = (-25, 50)
    const d = generateArrowPath(ep(0, 0), ep(0, 100), 'curve');
    expect(d).toBe('M 0 0 Q -25 50 0 100');
  });
});

// ─── arrowMidpoint ────────────────────────────────────────────────────────────

describe('arrowMidpoint', () => {
  it('returns midpoint of a straight line', () => {
    const mid = arrowMidpoint(ep(0, 0), ep(100, 0), 'line');
    expect(mid).toEqual({ x: 50, y: 0 });
  });

  it('returns bezier midpoint at t=0.5 for curve', () => {
    // from=(0,0), to=(100,0): CP=(50,25) (left-normal of horizontal = (0,1))
    // at t=0.5: 0.25*0 + 0.5*50 + 0.25*100 = 50; y: 0.25*0 + 0.5*25 + 0.25*0 = 12.5
    const mid = arrowMidpoint(ep(0, 0), ep(100, 0), 'curve');
    expect(mid.x).toBeCloseTo(50);
    expect(mid.y).toBeCloseTo(12.5);
  });
});

// ─── arrowHeads ───────────────────────────────────────────────────────────────

describe('arrowHeads', () => {
  it('returns empty array for heading=none', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'none', 'to', 2);
    expect(heads).toHaveLength(0);
  });

  it('returns empty array for direction=none', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'stroke', 'none', 2);
    expect(heads).toHaveLength(0);
  });

  it('returns one head at "to" endpoint for direction=to', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'stroke', 'to', 2);
    expect(heads).toHaveLength(1);
    expect(heads[0].heading).toBe('stroke');
  });

  it('returns one head at "from" endpoint for direction=from', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'fill', 'from', 2);
    expect(heads).toHaveLength(1);
    expect(heads[0].heading).toBe('fill');
  });

  it('returns two heads for direction=both', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'stroke', 'both', 2);
    expect(heads).toHaveLength(2);
  });

  it('returns empty array when endpoints are coincident', () => {
    const heads = arrowHeads(ep(0, 0), ep(0, 0), 'line', 'fill', 'to', 2);
    expect(heads).toHaveLength(0);
  });

  it('head points string contains the tip coordinates', () => {
    const heads = arrowHeads(ep(0, 0), ep(100, 0), 'line', 'fill', 'to', 2);
    expect(heads[0].points).toContain('100,0');
  });
});

// ─── arrowBounds ─────────────────────────────────────────────────────────────

describe('arrowBounds', () => {
  function makeData(
    ax: number, ay: number,
    bx: number, by: number,
    overrides?: Partial<ArrowData>,
  ): ArrowData {
    return {
      from: ep(ax, ay),
      to: ep(bx, by),
      ...ARROW_DEFAULTS,
      ...overrides,
    };
  }

  it('extends AABB by thickness+6 for a line arrow', () => {
    const data = makeData(0, 0, 100, 0, { arrowType: 'line', thickness: 2 });
    const bounds = arrowBounds(data);
    const margin = 2 + 6; // 8
    expect(bounds.x).toBe(0 - margin);
    expect(bounds.y).toBe(0 - margin);
    expect(bounds.width).toBe(100 + margin * 2);
    expect(bounds.height).toBe(0 + margin * 2);
  });

  it('thickness affects the margin', () => {
    const thin = arrowBounds(makeData(0, 0, 100, 0, { arrowType: 'line', thickness: 1 }));
    const thick = arrowBounds(makeData(0, 0, 100, 0, { arrowType: 'line', thickness: 8 }));
    expect(thick.x).toBeLessThan(thin.x);
    expect(thick.width).toBeGreaterThan(thin.width);
  });

  it('includes control point bulge for curve', () => {
    // horizontal line from (0,0) to (100,0):
    // left-normal of (dx=100,dy=0) = (-dy/dist, dx/dist) = (0, 1)
    // offset = min(25, 80) = 25 → CP = (50, 25)
    // So maxY expands to 25, and bounds includes that
    const data = makeData(0, 0, 100, 0, { arrowType: 'curve', thickness: 2 });
    const bounds = arrowBounds(data);
    const margin = 8;
    // The curve bulges downward (y=25), so height should be larger than for line
    const lineData = makeData(0, 0, 100, 0, { arrowType: 'line', thickness: 2 });
    const lineBounds = arrowBounds(lineData);
    expect(bounds.height).toBeGreaterThan(lineBounds.height);
    // maxY includes the CP y coordinate (25) + margin
    expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(25 + margin);
  });
});
