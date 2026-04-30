import { ArrowBlock, ARROW_DEFAULTS } from '../arrow-block';
import type { ArrowData } from '../arrow-block';
import type { GraphicRenderContext } from '../../../engine/render-context';

function makeOverlayHost(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeRenderCtx(overlayHost: HTMLElement): GraphicRenderContext {
  return {
    document: {} as never,
    page: { id: 'p-1', name: 'Page', elements: [], frames: [], viewport: { x: 0, y: 0, zoom: 1 } },
    eventBus: { emit: jest.fn(), on: jest.fn(() => () => {}) } as never,
    i18n: {} as never,
    overlayHost,
    undoRedoManager: {} as never,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ArrowBlock', () => {
  describe('defaultData', () => {
    it('matches ARROW_DEFAULTS values', () => {
      const data = ArrowBlock.defaultData();
      expect(data.arrowType).toBe(ARROW_DEFAULTS.arrowType);
      expect(data.heading).toBe(ARROW_DEFAULTS.heading);
      expect(data.direction).toBe(ARROW_DEFAULTS.direction);
      expect(data.color).toBe(ARROW_DEFAULTS.color);
      expect(data.thickness).toBe(ARROW_DEFAULTS.thickness);
    });

    it('uses curve as default arrowType', () => {
      expect(ArrowBlock.defaultData().arrowType).toBe('curve');
    });

    it('uses stroke as default heading', () => {
      expect(ArrowBlock.defaultData().heading).toBe('stroke');
    });

    it('uses "to" as default direction', () => {
      expect(ArrowBlock.defaultData().direction).toBe('to');
    });

    it('uses gray #888888 as default color', () => {
      expect(ArrowBlock.defaultData().color).toBe('#888888');
    });

    it('uses 2 as default thickness', () => {
      expect(ArrowBlock.defaultData().thickness).toBe(2);
    });

    it('has no label by default', () => {
      expect(ArrowBlock.defaultData().label).toBeUndefined();
    });

    it('from.point is {x:0, y:0}', () => {
      expect(ArrowBlock.defaultData().from.point).toEqual({ x: 0, y: 0 });
    });

    it('to.point is {x:100, y:0}', () => {
      expect(ArrowBlock.defaultData().to.point).toEqual({ x: 100, y: 0 });
    });

    it('deep-clones so instances are independent', () => {
      const a = ArrowBlock.defaultData();
      const b = ArrowBlock.defaultData();
      a.from.point.x = 999;
      expect(b.from.point.x).toBe(0);
    });
  });

  describe('meta', () => {
    it('has no groupKey (not in left panel)', () => {
      expect(ArrowBlock.groupKey).toBeUndefined();
    });

    it('has type "arrow"', () => {
      expect(ArrowBlock.type).toBe('arrow');
    });

    it('icon is arrow_right_alt', () => {
      expect(ArrowBlock.icon).toBe('arrow_right_alt');
    });

    it('properties() returns empty array (uses flyout toolbar instead)', () => {
      const node = { id: 'conn-1', type: 'arrow', data: ArrowBlock.defaultData() };
      const result = ArrowBlock.properties!(node, {} as never);
      expect(result).toEqual([]);
    });
  });

  describe('renderSvg', () => {
    function makeNode(overrides?: Partial<ArrowData>) {
      return {
        id: 'conn-1',
        type: 'arrow',
        data: { ...ArrowBlock.defaultData(), ...overrides },
      };
    }

    it('returns a <g> element', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode(), ctx);
      expect(g.tagName.toLowerCase()).toBe('g');
    });

    it('contains a <path> child', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode(), ctx);
      const path = g.querySelector('path');
      expect(path).toBeTruthy();
    });

    it('path has correct stroke color', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode({ color: '#ff0000' }), ctx);
      const path = g.querySelector('path');
      expect(path?.getAttribute('stroke')).toBe('#ff0000');
    });

    it('path has stroke-width matching thickness', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode({ thickness: 4 }), ctx);
      const path = g.querySelector('path');
      expect(path?.getAttribute('stroke-width')).toBe('4');
    });

    it('renders a polygon for fill heading', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode({ heading: 'fill', direction: 'to' }), ctx);
      const polygon = g.querySelector('polygon');
      expect(polygon).toBeTruthy();
    });

    it('renders a polyline for stroke heading', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode({ heading: 'stroke', direction: 'to' }), ctx);
      const polyline = g.querySelector('polyline');
      expect(polyline).toBeTruthy();
    });

    it('renders no head for heading=none', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = ArrowBlock.renderSvg(makeNode({ heading: 'none' }), ctx);
      expect(g.querySelector('polygon')).toBeNull();
      expect(g.querySelector('polyline')).toBeNull();
    });
  });

  describe('renderOverlay', () => {
    it('returns null when no label', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const node = { id: 'conn-1', type: 'arrow', data: ArrowBlock.defaultData() };
      expect(ArrowBlock.renderOverlay!(node, ctx)).toBeNull();
    });

    it('returns a div with label text when label is set', () => {
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const node = {
        id: 'conn-1',
        type: 'arrow',
        data: { ...ArrowBlock.defaultData(), label: 'Hello' },
      };
      const el = ArrowBlock.renderOverlay!(node, ctx);
      expect(el).toBeTruthy();
      expect(el?.textContent).toBe('Hello');
      expect(el?.classList.contains('idea-graphic-arrow__label')).toBe(true);
    });
  });

  describe('getBounds', () => {
    it('returns a rect wider than zero for a horizontal arrow', () => {
      const node = { id: 'conn-1', type: 'arrow', data: ArrowBlock.defaultData() };
      const bounds = ArrowBlock.getBounds(node);
      expect(bounds.width).toBeGreaterThan(0);
    });
  });
});
