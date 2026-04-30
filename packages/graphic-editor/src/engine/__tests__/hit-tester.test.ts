import { hitTest, aabbIntersect, combinedAABB } from '../hit-tester';
import type { GraphicPageNode, GraphicElement } from '@core/model/interfaces';
import { createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import type { SelectionEntry } from '../selection-manager';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SimpleData = { x: number; y: number; width: number; height: number };

function makeElement(x: number, y: number, width: number, height: number): GraphicElement<SimpleData> {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x, y, width, height },
  };
}

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition<SimpleData> = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'rectangle',
    defaultData: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGElement,
    getBounds: (node) => ({ x: node.data.x, y: node.data.y, width: node.data.width, height: node.data.height }),
  };
  registry.register(def);
  return registry;
}

function makePage(elements: GraphicElement[]): GraphicPageNode {
  const page = createGraphicPage('Test');
  page.elements.push(...elements);
  return page;
}

function sel(el: GraphicElement): SelectionEntry {
  return { type: 'element', id: el.id };
}

// ─── aabbIntersect ───────────────────────────────────────────────────────────

describe('aabbIntersect', () => {
  it('returns true for overlapping rects', () => {
    expect(aabbIntersect(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 50, y: 50, width: 100, height: 100 },
    )).toBe(true);
  });

  it('returns true for touching edges (shared border)', () => {
    // Right edge of A touches left edge of B
    expect(aabbIntersect(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 100, y: 0, width: 100, height: 100 },
    )).toBe(true);
  });

  it('returns false for non-overlapping rects separated horizontally', () => {
    expect(aabbIntersect(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 100, y: 0, width: 50, height: 50 },
    )).toBe(false);
  });

  it('returns false for non-overlapping rects separated vertically', () => {
    expect(aabbIntersect(
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 0, y: 100, width: 50, height: 50 },
    )).toBe(false);
  });

  it('returns true for one rect fully inside another', () => {
    expect(aabbIntersect(
      { x: 0, y: 0, width: 200, height: 200 },
      { x: 50, y: 50, width: 50, height: 50 },
    )).toBe(true);
  });
});

// ─── combinedAABB ─────────────────────────────────────────────────────────────

describe('combinedAABB', () => {
  it('returns null for empty array', () => {
    expect(combinedAABB([])).toBeNull();
  });

  it('returns the rect itself for a single rect', () => {
    const r = { x: 10, y: 20, width: 30, height: 40 };
    expect(combinedAABB([r])).toEqual(r);
  });

  it('returns the union of multiple rects', () => {
    const result = combinedAABB([
      { x: 0, y: 0, width: 50, height: 50 },
      { x: 100, y: 100, width: 50, height: 50 },
    ]);
    expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });
});

// ─── hitTest — priority order ────────────────────────────────────────────────

describe('hitTest', () => {
  const registry = makeRegistry();

  it('returns null when nothing is at the point', () => {
    const page = makePage([makeElement(0, 0, 100, 100)]);
    const result = hitTest(page, registry, { x: 200, y: 200 }, []);
    expect(result).toBeNull();
  });

  it('returns element when clicking inside element body (no selection)', () => {
    const el = makeElement(0, 0, 100, 100);
    const page = makePage([el]);
    const result = hitTest(page, registry, { x: 50, y: 50 }, []);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('element');
    if (result!.kind === 'element') {
      expect(result!.element.id).toBe(el.id);
    }
  });

  it('returns corner handle when clicking near a selected element corner', () => {
    const el = makeElement(0, 0, 100, 100);
    const page = makePage([el]);
    // Click exactly on the SE corner (100, 100) — within handle radius at zoom=1
    const result = hitTest(page, registry, { x: 100, y: 100 }, [sel(el)], 1);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('handle');
    if (result!.kind === 'handle') {
      expect(result!.handle).toBe('corner-se');
    }
  });

  it('handle takes priority over element body', () => {
    const el = makeElement(0, 0, 100, 100);
    const page = makePage([el]);
    // Click near NW corner (0, 0) — should be handle, not element
    const result = hitTest(page, registry, { x: 1, y: 1 }, [sel(el)], 1);
    expect(result!.kind).toBe('handle');
  });

  it('returns grip when clicking in the grip area of a selected element', () => {
    const el = makeElement(50, 50, 100, 100);
    const page = makePage([el]);
    // Grip is at x: bounds.x - gripSize..bounds.x, y: bounds.y..bounds.y+gripSize (world)
    // gripSize = 24/zoom (at zoom=1, 24px). Click at (40, 60) should be in grip zone.
    const result = hitTest(page, registry, { x: 40, y: 60 }, [sel(el)], 1);
    expect(result!.kind).toBe('grip');
  });

  it('returns element when clicking inside non-selected element (no handles)', () => {
    const el = makeElement(0, 0, 100, 100);
    const page = makePage([el]);
    // No selection → no handle hit
    const result = hitTest(page, registry, { x: 0, y: 0 }, []);
    expect(result!.kind).toBe('element');
  });

  it('last element in array (top render layer) wins when stacked', () => {
    const el1 = makeElement(0, 0, 100, 100);
    const el2 = makeElement(0, 0, 100, 100);
    const page = makePage([el1, el2]);
    const result = hitTest(page, registry, { x: 50, y: 50 }, []);
    expect(result!.kind).toBe('element');
    if (result!.kind === 'element') {
      expect(result!.element.id).toBe(el2.id);
    }
  });

  it('returns frame when clicking inside a frame and no element is there', () => {
    const page = createGraphicPage('Test');
    page.frames.push({
      id: 'frame1',
      name: 'Frame',
      data: { x: 0, y: 0, width: 200, height: 200, background: '#fff', clipContent: false, showLabel: true, labelFontSize: 12 },
      childElementIds: [],
    });
    const result = hitTest(page, registry, { x: 100, y: 100 }, []);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('frame');
  });

  it('handles are only shown for the single selected element', () => {
    const el1 = makeElement(0, 0, 100, 100);
    const el2 = makeElement(200, 0, 100, 100);
    const page = makePage([el1, el2]);
    // Both selected → corner handles disabled (multi-select)
    // Click well inside el1's body, away from grip zone and handle positions
    const result = hitTest(page, registry, { x: 50, y: 50 }, [sel(el1), sel(el2)], 1);
    // Should return element body, not handle
    expect(result!.kind).toBe('element');
  });
});
