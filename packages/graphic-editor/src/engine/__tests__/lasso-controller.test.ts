import { LassoController } from '../lasso-controller';
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

function makeElement(x: number, y: number, width = 50, height = 50): GraphicElement<SimpleData> {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width, height } };
}

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition<SimpleData> = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'rectangle',
    defaultData: () => ({ x: 0, y: 0, width: 50, height: 50 }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGElement,
    getBounds: (n) => ({ x: n.data.x, y: n.data.y, width: n.data.width, height: n.data.height }),
  };
  registry.register(def);
  return registry;
}

function makeSetup(elements: GraphicElement[] = []) {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  elements.forEach(el => page.elements.push(el));
  doc.graphicPages.push(page);

  const rootElement = document.createElement('div');
  const canvas = document.createElement('div');
  canvas.className = 'idea-graphic-canvas';
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });
  rootElement.appendChild(canvas);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement,
    i18n: { t: (k: string) => k } as unknown as I18nService,
    viewportController: new ViewportController(
      () => page.viewport,
      (next) => { page.viewport = next; },
    ),
    registry: makeRegistry(),
  };

  const selectionLayer = document.createElement('div');
  const sm = new GraphicSelectionManager(ctx);
  const lc = new LassoController(ctx, sm, selectionLayer);
  return { ctx, sm, lc, selectionLayer, page };
}

function startLasso(sm: GraphicSelectionManager, x: number, y: number, shiftKey = false) {
  const ev = new PointerEvent('pointerdown', { clientX: x, clientY: y, button: 0, shiftKey });
  sm.handlePointerDown(ev, null); // null = empty canvas
}

function moveLasso(x: number, y: number) {
  window.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y }));
}

function endLasso(x: number, y: number, shiftKey = false) {
  window.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, shiftKey }));
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LassoController', () => {
  afterEach(() => {
    window.dispatchEvent(new PointerEvent('pointercancel', {}));
    document.body.innerHTML = '';
  });

  it('selects elements inside the lasso rect', () => {
    const el1 = makeElement(10, 10, 50, 50); // inside lasso
    const el2 = makeElement(300, 300, 50, 50); // outside
    const { sm } = makeSetup([el1, el2]);

    startLasso(sm, 0, 0);
    moveLasso(100, 100);
    endLasso(100, 100);

    // el1 is at world (10..60, 10..60), lasso world rect is (0..100, 0..100)
    expect(sm.has(el1.id)).toBe(true);
    expect(sm.has(el2.id)).toBe(false);
  });

  it('selects nothing when lasso covers empty area', () => {
    const el = makeElement(500, 500, 50, 50);
    const { sm } = makeSetup([el]);

    startLasso(sm, 0, 0);
    endLasso(100, 100);

    expect(sm.getSelection()).toHaveLength(0);
  });

  it('adds to existing selection when Shift is held', () => {
    const el1 = makeElement(10, 10, 50, 50);
    const el2 = makeElement(300, 10, 50, 50);
    const { sm } = makeSetup([el1, el2]);

    // First select el1
    sm.setSelection([{ type: 'element', id: el1.id }]);

    // Lasso el2 with Shift
    startLasso(sm, 250, 0, true);
    endLasso(400, 100, true);

    expect(sm.has(el1.id)).toBe(true);
    expect(sm.has(el2.id)).toBe(true);
  });

  it('replaces selection when Shift is NOT held', () => {
    const el1 = makeElement(10, 10, 50, 50);
    const el2 = makeElement(300, 10, 50, 50);
    const { sm } = makeSetup([el1, el2]);

    sm.setSelection([{ type: 'element', id: el1.id }]);

    // Lasso el2 without Shift
    startLasso(sm, 250, 0, false);
    endLasso(400, 100, false);

    expect(sm.has(el1.id)).toBe(false);
    expect(sm.has(el2.id)).toBe(true);
  });

  it('creates a lasso div in the selection layer during drag', () => {
    const { sm, selectionLayer } = makeSetup([]);

    startLasso(sm, 0, 0);
    moveLasso(50, 50);

    expect(selectionLayer.querySelector('.idea-graphic-lasso')).not.toBeNull();
  });

  it('removes the lasso div after pointerup', () => {
    const { sm, selectionLayer } = makeSetup([]);

    startLasso(sm, 0, 0);
    moveLasso(50, 50);
    endLasso(50, 50);

    expect(selectionLayer.querySelector('.idea-graphic-lasso')).toBeNull();
  });
});
