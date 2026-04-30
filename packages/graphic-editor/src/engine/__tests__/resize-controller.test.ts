import { ResizeController } from '../resize-controller';
import { GraphicSelectionManager } from '../selection-manager';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import type { GraphicContext } from '../graphic-context';
import { ViewportController } from '../viewport-controller';
import type { I18nService } from '@core/i18n/i18n';
import type { GraphicElement } from '@core/model/interfaces';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SimpleData = { x: number; y: number; width: number; height: number };

function makeElement(x = 0, y = 0, width = 100, height = 100): GraphicElement<SimpleData> {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width, height } };
}

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition<SimpleData> = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'rectangle',
    defaultData: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGElement,
    getBounds: (n) => ({ x: n.data.x, y: n.data.y, width: n.data.width, height: n.data.height }),
  };
  registry.register(def);
  return registry;
}

function makeSetup(el: GraphicElement) {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  page.elements.push(el);
  doc.graphicPages.push(page);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string) => k } as unknown as I18nService,
    viewportController: new ViewportController(
      () => page.viewport,
      (next) => { page.viewport = next; },
    ),
    registry: makeRegistry(),
  };

  const sm = new GraphicSelectionManager(ctx);
  const rc = new ResizeController(ctx, sm);
  return { ctx, sm, rc, undoRedoManager, page };
}

function getBoundsFromPage(page: import('@core/model/interfaces').GraphicPageNode, id: string) {
  const el = page.elements.find(e => e.id === id)!;
  const d = el.data as SimpleData;
  return { x: d.x, y: d.y, width: d.width, height: d.height };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ResizeController', () => {
  afterEach(() => {
    window.dispatchEvent(new PointerEvent('pointercancel', {}));
  });

  describe('SE corner drag', () => {
    it('increases width and height from SE corner', () => {
      const el = makeElement(0, 0, 100, 100);
      const { sm, undoRedoManager, page } = makeSetup(el);
      sm.setSelection([{ type: 'element', id: el.id }]);

      const pdEv = new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'handle', handle: 'corner-se', element: el });

      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 150, clientY: 120, shiftKey: false }));

      expect(undoRedoManager.canUndo).toBe(true);
      const b = getBoundsFromPage(page, el.id);
      expect(b.width).toBeCloseTo(150);
      expect(b.height).toBeCloseTo(120);
      expect(b.x).toBeCloseTo(0);
      expect(b.y).toBeCloseTo(0);
    });
  });

  describe('NW corner drag', () => {
    it('moves top-left corner and adjusts x, y, width, height', () => {
      const el = makeElement(0, 0, 100, 100);
      const { sm, page } = makeSetup(el);
      sm.setSelection([{ type: 'element', id: el.id }]);

      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'handle', handle: 'corner-nw', element: el });

      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 20, clientY: 20, shiftKey: false }));

      const b = getBoundsFromPage(page, el.id);
      expect(b.x).toBeCloseTo(20);
      expect(b.y).toBeCloseTo(20);
      expect(b.width).toBeCloseTo(80);
      expect(b.height).toBeCloseTo(80);
    });
  });

  describe('minimum size clamp', () => {
    it('clamps width and height to minimum 8px', () => {
      const el = makeElement(0, 0, 100, 100);
      const { sm, page } = makeSetup(el);
      sm.setSelection([{ type: 'element', id: el.id }]);

      const pdEv = new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'handle', handle: 'corner-se', element: el });

      // Drag far to the left/up to collapse below minimum
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 95, clientY: 95, shiftKey: false }));

      const b = getBoundsFromPage(page, el.id);
      expect(b.width).toBeGreaterThanOrEqual(8);
      expect(b.height).toBeGreaterThanOrEqual(8);
    });
  });

  describe('Shift key preserves aspect ratio', () => {
    it('keeps width/height ratio when Shift is held on SE drag', () => {
      const el = makeElement(0, 0, 100, 50); // 2:1 ratio
      const { sm, page } = makeSetup(el);
      sm.setSelection([{ type: 'element', id: el.id }]);

      const pdEv = new PointerEvent('pointerdown', { clientX: 100, clientY: 50, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'handle', handle: 'corner-se', element: el });

      // Drag mostly horizontally (dominant axis = x)
      window.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 60, shiftKey: true }));

      const b = getBoundsFromPage(page, el.id);
      // At 2:1 ratio with width=200, height should be ~100
      const ratio = b.width / b.height;
      expect(ratio).toBeCloseTo(2, 0);
    });
  });
});
