import { ArrowController } from '../arrow-controller';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import { registerDefaultBlocks } from '../../blocks/index';
import { GraphicSelectionManager } from '../selection-manager';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { EventBus } from '@core/events/event-bus';
import type { DocumentNode } from '@core/model/interfaces';
import type { GraphicContext } from '../graphic-context';
import type { CanvasRenderer } from '../canvas-renderer';
import { ViewportController } from '../viewport-controller';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeDoc(): DocumentNode {
  return {
    id: 'doc-1',
    type: 'document',
    schemaVersion: 1,
    data: {},
    children: [],
    assets: {},
    graphicPages: [
      {
        id: 'page-1',
        name: 'Page',
        elements: [],
        frames: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
  };
}

function makeCanvas(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.width = '800px';
  el.style.height = '600px';
  document.body.appendChild(el);

  // Mock getBoundingClientRect
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
    x: 0, y: 0, toJSON: () => ({}),
  });

  // jsdom does not implement pointer capture
  el.setPointerCapture = jest.fn();
  el.releasePointerCapture = jest.fn();

  return el;
}

function makeWorldGroup(): SVGGElement {
  return document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGGElement;
}

function makeCanvasRenderer(worldGroup: SVGGElement): CanvasRenderer {
  return {
    getWorldGroup: () => worldGroup,
  } as unknown as CanvasRenderer;
}

function makeViewport(): ViewportController {
  const vp = { x: 0, y: 0, zoom: 1 };
  return new ViewportController(
    () => vp,
    (next) => { Object.assign(vp, next); },
  );
}

function makeCtx(doc: DocumentNode, eventBus: EventBus): GraphicContext {
  const registry = new GraphicBlockRegistry();
  registerDefaultBlocks(registry);
  return {
    document: doc,
    page: doc.graphicPages[0],
    undoRedoManager: new UndoRedoManager(eventBus),
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string) => k } as never,
    viewportController: makeViewport(),
    registry,
  };
}

function makePointerEvent(type: string, x: number, y: number, pointerId = 1): PointerEvent {
  return new PointerEvent(type, {
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    pointerId,
    bubbles: true,
    cancelable: true,
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ArrowController', () => {
  describe('draw flow', () => {
    it('does NOT commit arrow when drag distance < 4 world units', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);

      // Pointer down at (100, 100)
      controller.handlePointerDown(makePointerEvent('pointerdown', 100, 100));
      expect(controller.isDrawing()).toBe(true);

      // Pointer up at nearly the same spot (< 4 px)
      document.dispatchEvent(makePointerEvent('pointerup', 101, 100));

      expect(doc.graphicPages[0].elements).toHaveLength(0);
    });

    it('commits an arrow when drag distance >= 4 world units', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);

      controller.handlePointerDown(makePointerEvent('pointerdown', 0, 0));
      document.dispatchEvent(makePointerEvent('pointermove', 50, 0));
      document.dispatchEvent(makePointerEvent('pointerup', 50, 0));

      expect(doc.graphicPages[0].elements).toHaveLength(1);
      expect(doc.graphicPages[0].elements[0].type).toBe('arrow');
    });

    it('uses "conn" prefix for the arrow element id', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);

      controller.handlePointerDown(makePointerEvent('pointerdown', 0, 0));
      document.dispatchEvent(makePointerEvent('pointerup', 100, 0));

      expect(doc.graphicPages[0].elements[0].id).toMatch(/^conn_/);
    });

    it('cancelDraw aborts without creating an arrow', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);

      controller.handlePointerDown(makePointerEvent('pointerdown', 0, 0));
      document.dispatchEvent(makePointerEvent('pointermove', 100, 0));
      controller.cancelDraw();

      expect(controller.isDrawing()).toBe(false);
      expect(doc.graphicPages[0].elements).toHaveLength(0);
    });

    it('creates a preview SVG group during drawing', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);
      controller.handlePointerDown(makePointerEvent('pointerdown', 0, 0));

      expect(worldGroup.querySelector('.idea-graphic-arrow-preview')).toBeTruthy();

      controller.cancelDraw();
      expect(worldGroup.querySelector('.idea-graphic-arrow-preview')).toBeNull();
    });
  });

  describe('graphic:start-arrow event', () => {
    it('starts a draw when graphic:start-arrow is emitted', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);

      eventBus.emit('graphic:start-arrow', {
        fromPoint: { x: 50, y: 50 },
        fromElementId: 'el-1',
        pointerId: 2,
      });

      expect(controller.isDrawing()).toBe(true);
      controller.cancelDraw();
    });
  });

  describe('destroy', () => {
    it('stops drawing and cleans up without throwing', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const worldGroup = makeWorldGroup();
      const renderer = makeCanvasRenderer(worldGroup);
      const selMgr = new GraphicSelectionManager(ctx);

      const controller = new ArrowController(ctx, canvas, renderer, selMgr);
      controller.handlePointerDown(makePointerEvent('pointerdown', 0, 0));

      expect(() => controller.destroy()).not.toThrow();
      expect(controller.isDrawing()).toBe(false);
    });
  });
});
