import { DragController } from '../drag-controller';
import { GraphicSelectionManager, type SelectionEntry } from '../selection-manager';
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

function makeElement(x = 0, y = 0): GraphicElement<SimpleData> {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width: 100, height: 100 } };
}

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition<SimpleData> = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: '<rect x="4" y="4" width="16" height="16"/>',
    defaultData: () => ({ x: 0, y: 0, width: 100, height: 100 }),
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
  const dc = new DragController(ctx, sm);
  return { ctx, sm, dc, eventBus, undoRedoManager, page, doc };
}

function firePointerDown(target: EventTarget, clientX: number, clientY: number, button = 0) {
  const ev = new PointerEvent('pointerdown', { clientX, clientY, button, bubbles: true });
  target.dispatchEvent(ev);
  return ev;
}

function firePointerMove(clientX: number, clientY: number) {
  const ev = new PointerEvent('pointermove', { clientX, clientY, bubbles: true });
  window.dispatchEvent(ev);
  return ev;
}

function firePointerUp(clientX: number, clientY: number) {
  const ev = new PointerEvent('pointerup', { clientX, clientY, bubbles: true });
  window.dispatchEvent(ev);
  return ev;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DragController', () => {
  afterEach(() => {
    // Cleanup any lingering window listeners by cancelling
    window.dispatchEvent(new PointerEvent('pointercancel', {}));
  });

  describe('pointermove deltas converted by zoom', () => {
    it('converts screen deltas to world deltas using viewport zoom', () => {
      const el = makeElement(0, 0);
      const { sm, page } = makeSetup([el]);
      page.viewport.zoom = 2;

      sm.setSelection([{ type: 'element', id: el.id }]);

      // Simulate pointerdown via handlePointerDown
      const pdEv = new PointerEvent('pointerdown', { clientX: 100, clientY: 100, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'element', element: el });

      // Move 40px in screen → should be 20px in world at zoom=2
      firePointerMove(140, 100);

      // Live mutation updates el.data directly (no setAtPath, same reference)
      const liveEl = page.elements.find(e => e.id === el.id)!;
      const data = liveEl.data as Record<string, unknown>;
      expect(data.x as number).toBeCloseTo(20);
    });
  });

  describe('pointerup pushes MoveSelectionCommand', () => {
    it('pushes a command on pointerup', () => {
      const el = makeElement(0, 0);
      const { sm, undoRedoManager } = makeSetup([el]);

      sm.setSelection([{ type: 'element', id: el.id }]);
      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'element', element: el });

      firePointerMove(20, 10);
      const canUndo = () => undoRedoManager.canUndo;

      expect(canUndo()).toBe(false);
      firePointerUp(20, 10);
      expect(canUndo()).toBe(true);
    });

    it('applies the final world position after pointerup', () => {
      const el = makeElement(0, 0);
      const { sm, page } = makeSetup([el]);

      sm.setSelection([{ type: 'element', id: el.id }]);
      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'element', element: el });

      firePointerUp(50, 30); // 50px screen → 50px world at zoom=1

      // Use page.elements reference (setAtPath creates a new object)
      const current = page.elements.find(e => e.id === el.id)!.data as Record<string, unknown>;
      expect(current.x as number).toBeCloseTo(50);
      expect(current.y as number).toBeCloseTo(30);
    });
  });

  describe('pointercancel rolls back', () => {
    it('restores original position on pointercancel', () => {
      const el = makeElement(10, 20);
      const { sm, page } = makeSetup([el]);

      sm.setSelection([{ type: 'element', id: el.id }]);
      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'element', element: el });

      firePointerMove(50, 50);
      window.dispatchEvent(new PointerEvent('pointercancel', {}));

      // Rollback mutates directly; read from page
      const current = page.elements.find(e => e.id === el.id)!.data as Record<string, unknown>;
      expect(current.x as number).toBe(10);
      expect(current.y as number).toBe(20);
    });

    it('does not push a command on pointercancel', () => {
      const el = makeElement(0, 0);
      const { sm, undoRedoManager } = makeSetup([el]);

      sm.setSelection([{ type: 'element', id: el.id }]);
      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'element', element: el });

      firePointerMove(50, 50);
      window.dispatchEvent(new PointerEvent('pointercancel', {}));

      expect(undoRedoManager.canUndo).toBe(false);
    });
  });

  describe('frame drag also translates child elements', () => {
    it('moves frame children when frame is dragged', () => {
      const doc = createDocument();
      const page = createGraphicPage('Test');
      const child = makeElement(50, 50);
      page.elements.push(child);
      page.frames.push({
        id: 'frame1',
        name: 'Frame',
        data: { x: 0, y: 0, width: 200, height: 200, background: '#fff', clipContent: false, showLabel: true, labelFontSize: 12 },
        childElementIds: [child.id],
      });
      doc.graphicPages.push(page);

      const eventBus = new EventBus();
      const undoRedoManager = new UndoRedoManager(eventBus);
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
      new DragController(ctx, sm);

      sm.setSelection([{ type: 'frame', id: 'frame1' }]);
      const pdEv = new PointerEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
      sm.handlePointerDown(pdEv, { kind: 'frame', frame: page.frames[0] });

      firePointerUp(30, 20);

      expect(page.frames[0].data.x).toBeCloseTo(30);
      // setAtPath creates a new element object; read from page.elements
      const currentChild = page.elements.find(e => e.id === child.id)!.data as Record<string, unknown>;
      expect(currentChild.x as number).toBeCloseTo(80);
      expect(currentChild.y as number).toBeCloseTo(70);
    });
  });
});
