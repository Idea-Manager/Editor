import { PathBlock, PATH_DEFAULTS } from '../path-block';
import type { PathData } from '../path-block';
import type { GraphicElement } from '@core/model/interfaces';
import { generateId } from '@core/id';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeElement(data: Partial<PathData> = {}): GraphicElement<PathData> {
  const defaults = PathBlock.defaultData();
  return {
    id: generateId('el'),
    type: 'path',
    data: { ...defaults, ...data },
  };
}

// ─── PathBlock ────────────────────────────────────────────────────────────────

describe('PathBlock', () => {
  describe('type & metadata', () => {
    it('has type "path"', () => {
      expect(PathBlock.type).toBe('path');
    });

    it('has icon "edit"', () => {
      expect(PathBlock.icon).toBe('edit');
    });

    it('has no groupKey (created via pen tool, not left panel)', () => {
      expect(PathBlock.groupKey).toBeUndefined();
    });
  });

  describe('defaultData', () => {
    it('returns empty points array', () => {
      const data = PathBlock.defaultData();
      expect(data.points).toEqual([]);
    });

    it('uses PATH_DEFAULTS for stroke values', () => {
      const data = PathBlock.defaultData();
      expect(data.stroke).toBe(PATH_DEFAULTS.stroke);
      expect(data.strokeWidth).toBe(PATH_DEFAULTS.strokeWidth);
      expect(data.lineCap).toBe(PATH_DEFAULTS.lineCap);
      expect(data.lineJoin).toBe(PATH_DEFAULTS.lineJoin);
    });

    it('returns zero-sized bounds', () => {
      const data = PathBlock.defaultData();
      expect(data.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it('each call returns a new object (no shared references)', () => {
      const a = PathBlock.defaultData();
      const b = PathBlock.defaultData();
      expect(a).not.toBe(b);
      a.points.push({ x: 1, y: 1 });
      expect(b.points).toHaveLength(0);
    });
  });

  describe('getBounds', () => {
    it('returns data.bounds directly', () => {
      const bounds = { x: 10, y: 20, width: 100, height: 50 };
      const el = makeElement({ bounds });
      expect(PathBlock.getBounds(el)).toBe(bounds);
    });

    it('returns the zero bounds from default data when no points', () => {
      const el = makeElement();
      const b = PathBlock.getBounds(el);
      expect(b).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
  });

  describe('renderSvg', () => {
    it('returns an SVGElement', () => {
      const el = makeElement();
      const svg = PathBlock.renderSvg(el, {} as never);
      expect(svg).toBeInstanceOf(SVGElement);
    });

    it('contains a <path> child element', () => {
      const el = makeElement({ points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] });
      const g = PathBlock.renderSvg(el, {} as never);
      const path = g.querySelector('path');
      expect(path).not.toBeNull();
    });

    it('path has fill="none"', () => {
      const el = makeElement({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
      const g = PathBlock.renderSvg(el, {} as never);
      const path = g.querySelector('path')!;
      expect(path.getAttribute('fill')).toBe('none');
    });

    it('path uses data.stroke for stroke attribute', () => {
      const el = makeElement({ stroke: '#ff0000', points: [{ x: 0, y: 0 }] });
      const g = PathBlock.renderSvg(el, {} as never);
      const path = g.querySelector('path')!;
      expect(path.getAttribute('stroke')).toBe('#ff0000');
    });

    it('path uses data.strokeWidth for stroke-width attribute', () => {
      const el = makeElement({ strokeWidth: 5 });
      const g = PathBlock.renderSvg(el, {} as never);
      const path = g.querySelector('path')!;
      expect(path.getAttribute('stroke-width')).toBe('5');
    });

    it('d attribute starts with "M" for non-empty points', () => {
      const el = makeElement({ points: [{ x: 5, y: 5 }, { x: 15, y: 10 }, { x: 25, y: 5 }] });
      const g = PathBlock.renderSvg(el, {} as never);
      const path = g.querySelector('path')!;
      expect(path.getAttribute('d')).toMatch(/^M/);
    });
  });

  describe('renderOverlay', () => {
    it('returns null', () => {
      const el = makeElement();
      expect(PathBlock.renderOverlay!(el, {} as never)).toBeNull();
    });
  });

  describe('properties', () => {
    it('returns two property descriptors', () => {
      const el = makeElement();
      const props = PathBlock.properties!(el, {} as never);
      expect(props).toHaveLength(2);
    });

    it('first property is fill for stroke color', () => {
      const el = makeElement();
      const props = PathBlock.properties!(el, {} as never);
      expect(props[0]).toMatchObject({ kind: 'fill', colorPath: 'data.stroke' });
    });

    it('second property is fontSize for strokeWidth', () => {
      const el = makeElement();
      const props = PathBlock.properties!(el, {} as never);
      expect(props[1]).toMatchObject({ kind: 'fontSize', path: 'data.strokeWidth' });
    });
  });
});
