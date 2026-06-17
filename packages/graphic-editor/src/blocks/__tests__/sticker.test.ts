import { StickerBlock, STICKER_DEFAULTS } from '../sticker/sticker';
import { GraphicBlockRegistry } from '../block-registry';
import type { GraphicRenderContext } from '../../engine/render-context';

const EXPECTED_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
];

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
    registry: new GraphicBlockRegistry(),
    overlayHost,
    undoRedoManager: {} as never,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('StickerBlock', () => {
  describe('defaultData', () => {
    it('matches STICKER_DEFAULTS', () => {
      expect(StickerBlock.defaultData()).toEqual(STICKER_DEFAULTS);
    });

    it('deep-clones border so instances are independent', () => {
      const a = StickerBlock.defaultData();
      const b = StickerBlock.defaultData();
      a.border.thickness = 99;
      expect(b.border.thickness).toBe(STICKER_DEFAULTS.border.thickness);
    });

    it('has pastel yellow background', () => {
      expect(StickerBlock.defaultData().background).toBe('#fff8b3');
    });

    it('has no border by default', () => {
      expect(StickerBlock.defaultData().border.thickness).toBe(0);
    });
  });

  describe('properties', () => {
    it('returns exactly 4 entries', () => {
      const props = StickerBlock.properties!(
        { id: 'el-1', type: 'sticker', data: StickerBlock.defaultData() },
        {} as never,
      );
      expect(props).toHaveLength(4);
    });

    it('includes fontSize with min: 14', () => {
      const props = StickerBlock.properties!(
        { id: 'el-1', type: 'sticker', data: StickerBlock.defaultData() },
        {} as never,
      );
      const fontSizeProp = props.find(p => p.kind === 'fontSize');
      expect(fontSizeProp).toBeDefined();
      expect((fontSizeProp as { kind: 'fontSize'; min?: number }).min).toBe(14);
    });

    it('does not include border or extra color props', () => {
      const props = StickerBlock.properties!(
        { id: 'el-1', type: 'sticker', data: StickerBlock.defaultData() },
        {} as never,
      );
      expect(props.some(p => p.kind === 'border')).toBe(false);
      expect(props.some(p => p.kind === 'strokeColor')).toBe(false);
    });
  });

  describe('renderSvg', () => {
    it('returns a <g> containing a rounded <rect>', () => {
      const data = StickerBlock.defaultData();
      const node = { id: 'el-1', type: 'sticker', data };
      const overlayHost = makeOverlayHost();
      const ctx = makeRenderCtx(overlayHost);
      const g = StickerBlock.renderSvg(node, ctx);
      expect(g.tagName.toLowerCase()).toBe('g');
      const rect = g.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('rx')).toBe('8');
      expect(rect?.getAttribute('ry')).toBe('8');
    });

    it('references the sticker shadow filter when instanceId is present on rootElement', () => {
      const data = StickerBlock.defaultData();
      const node = { id: 'el-1', type: 'sticker', data };
      const rootEl = document.createElement('div');
      rootEl.dataset.instanceId = 'test-123';
      const overlayHost = makeOverlayHost();
      const ctx: GraphicRenderContext = {
        ...makeRenderCtx(overlayHost),
        rootElement: rootEl,
      };
      const g = StickerBlock.renderSvg(node, ctx);
      const rect = g.querySelector('rect');
      expect(rect?.getAttribute('filter')).toBe('url(#idea-graphic-sticker-shadow-test-123)');
    });
  });

  describe('pivots', () => {
    it('has the expected 4-tuple of cardinal midpoints', () => {
      expect(StickerBlock.pivots).toEqual(EXPECTED_PIVOTS);
    });
  });

  describe('groupKey', () => {
    it('has no groupKey so it appears in bottom toolbar, not left panel', () => {
      expect(StickerBlock.groupKey).toBeUndefined();
    });
  });
});
