import { FrameController } from '../frame-controller';
import { CanvasRenderer } from '../canvas-renderer';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import type { GraphicContext } from '../graphic-context';
import { ToolState } from '../tool-state';
import { ViewportController } from '../viewport-controller';
import type { GraphicElement, Rect } from '@core/model/interfaces';
import { generateId } from '@core/id';

function makeRegistry(
  bounds: Rect = { x: 0, y: 0, width: 100, height: 100 },
): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'square',
    defaultData: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect'),
    getBounds: (el) => {
      const d = el.data as Record<string, unknown>;
      return {
        x: (d.x as number) ?? bounds.x,
        y: (d.y as number) ?? bounds.y,
        width: (d.width as number) ?? bounds.width,
        height: (d.height as number) ?? bounds.height,
      };
    },
  };
  registry.register(def);
  return registry;
}

function makeElement(x = 50, y = 50): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width: 100, height: 100 } };
}

function makeEnv() {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  doc.graphicPages.push(page);

  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const viewport = page.viewport;
  const viewportController = new ViewportController(
    () => viewport,
    () => {},
  );

  const registry = makeRegistry();
  const toolState = new ToolState(eventBus);
  toolState.setTool('frame');

  const canvas = document.createElement('div');
  document.body.appendChild(canvas);

  // Mock getBoundingClientRect for clientToWorld calculations
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600,
    x: 0, y: 0,
    toJSON: () => ({}),
  });

  const canvasRenderer = new CanvasRenderer();
  canvasRenderer.build(canvas, 'test-inst');

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: canvas,
    i18n: { t: (key: string, params?: Record<string, string | number>) => {
      let v = key;
      if (params) {
        for (const [k, val] of Object.entries(params)) {
          v = v.split(`{${k}}`).join(String(val));
        }
      }
      return v;
    }} as never,
    viewportController,
    registry,
    toolState,
  };

  const controller = new FrameController(ctx, canvas, canvasRenderer);
  return { doc, page, ctx, controller, undoRedoManager, canvas };
}

afterEach(() => {
  document.body.innerHTML = '';
});

function pointerEvent(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, button: 0, bubbles: true });
}

describe('FrameController', () => {
  describe('drawing state', () => {
    it('is not drawing initially', () => {
      const { controller } = makeEnv();
      expect(controller.isDrawing()).toBe(false);
    });

    it('starts drawing on pointerdown while frame tool is active', () => {
      const { controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 10, 10));
      expect(controller.isDrawing()).toBe(true);
    });

    it('does nothing when tool is not frame', () => {
      const { ctx, controller } = makeEnv();
      ctx.toolState!.setTool('selection');
      controller.handlePointerDown(pointerEvent('pointerdown', 10, 10));
      expect(controller.isDrawing()).toBe(false);
    });
  });

  describe('cancelDraw', () => {
    it('stops drawing without committing', () => {
      const { controller, undoRedoManager } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      controller.cancelDraw();
      expect(controller.isDrawing()).toBe(false);
      expect(undoRedoManager.undoStackSize).toBe(0);
    });

    it('cancelDraw is safe to call when not drawing', () => {
      const { controller } = makeEnv();
      expect(() => controller.cancelDraw()).not.toThrow();
    });
  });

  describe('commit on pointerup', () => {
    it('adds a frame to the page when drag is >= 8px', () => {
      const { page, controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 100, 100));

      expect(page.frames).toHaveLength(1);
    });

    it('aborts when dragged less than 8px in width', () => {
      const { page, controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 5, 100));

      expect(page.frames).toHaveLength(0);
    });

    it('aborts when dragged less than 8px in height', () => {
      const { page, controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 100, 4));

      expect(page.frames).toHaveLength(0);
    });

    it('normalises the rect when dragging from bottom-right to top-left', () => {
      const { page, controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 100, 100));
      window.dispatchEvent(pointerEvent('pointerup', 0, 0));

      expect(page.frames[0].data.x).toBe(0);
      expect(page.frames[0].data.y).toBe(0);
      expect(page.frames[0].data.width).toBe(100);
      expect(page.frames[0].data.height).toBe(100);
    });

    it('tool stays frame after commit', () => {
      const { ctx, controller } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 100, 100));
      expect(ctx.toolState!.getTool()).toBe('frame');
    });

    it('pushes an undo entry on commit', () => {
      const { controller, undoRedoManager } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 100, 100));
      expect(undoRedoManager.undoStackSize).toBe(1);
    });

    it('undo removes the committed frame', () => {
      const { page, controller, undoRedoManager } = makeEnv();
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 200, 200));
      undoRedoManager.undo();
      expect(page.frames).toHaveLength(0);
    });
  });

  describe('auto-attach intersecting elements', () => {
    it('attaches existing elements whose AABB intersects the new frame', () => {
      const { doc, page, controller } = makeEnv();
      const el = makeElement(50, 50); // at (50,50) with 100×100
      page.elements.push(el);

      // Frame from (0,0) to (200,200) — element is inside
      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 200, 200));

      expect(el.frameId).toBe(page.frames[0].id);
      expect(page.frames[0].childElementIds).toContain(el.id);
    });

    it('does NOT attach elements outside the frame', () => {
      const { page, controller } = makeEnv();
      const el = makeElement(500, 500); // far away
      page.elements.push(el);

      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 200, 200));

      expect(el.frameId).toBeUndefined();
    });

    it('undo reverts both frame creation and element attachment', () => {
      const { page, controller, undoRedoManager } = makeEnv();
      const el = makeElement(50, 50);
      page.elements.push(el);

      controller.handlePointerDown(pointerEvent('pointerdown', 0, 0));
      window.dispatchEvent(pointerEvent('pointerup', 200, 200));
      undoRedoManager.undo();

      expect(page.frames).toHaveLength(0);
      expect(el.frameId).toBeUndefined();
    });
  });
});
