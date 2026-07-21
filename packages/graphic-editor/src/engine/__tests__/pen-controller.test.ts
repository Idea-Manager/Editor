import { PenController } from '../pen-controller';
import { ToolState } from '../tool-state';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import { PathBlock } from '../../blocks/path/path-block';
import { ViewportController } from '../viewport-controller';
import { createDocument, createGraphicPage } from '@core/model/factory';
import type { GraphicContext } from '../graphic-context';
import type { I18nService } from '@core/i18n/i18n';
import type { CanvasRenderer } from '../canvas-renderer';

const SVG_NS = 'http://www.w3.org/2000/svg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  registry.register({ ...PathBlock });
  return registry;
}

function makeCanvas(): HTMLElement {
  const canvas = document.createElement('div');
  canvas.className = 'idea-graphic-canvas';
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });
  // jsdom does not implement pointer capture; stub it out
  canvas.setPointerCapture = jest.fn();
  canvas.releasePointerCapture = jest.fn();
  return canvas;
}

function makeWorldGroup(): SVGGElement {
  return document.createElementNS(SVG_NS, 'g') as SVGGElement;
}

function makeCanvasRenderer(worldGroup: SVGGElement): CanvasRenderer {
  return {
    getWorldGroup: () => worldGroup,
  } as unknown as CanvasRenderer;
}

function makeSetup() {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  doc.graphicPages.push(page);
  const registry = makeRegistry();
  const vp = new ViewportController(
    () => page.viewport,
    (next) => { page.viewport = next; },
  );
  const toolState = new ToolState(eventBus);
  const canvas = makeCanvas();
  const worldGroup = makeWorldGroup();
  const canvasRenderer = makeCanvasRenderer(worldGroup);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string) => k } as unknown as I18nService,
    viewportController: vp,
    registry,
    toolState,
  };

  const controller = new PenController(ctx, canvas, canvasRenderer);

  return { controller, ctx, canvas, worldGroup, eventBus, undoRedoManager, page, doc };
}

function firePointerDown(canvas: HTMLElement, clientX: number, clientY: number) {
  const ev = new PointerEvent('pointerdown', { clientX, clientY, button: 0, pointerId: 1, bubbles: true });
  canvas.dispatchEvent(ev);
  return ev;
}

function firePointerMove(canvas: HTMLElement, clientX: number, clientY: number) {
  const ev = new PointerEvent('pointermove', { clientX, clientY, button: 0, pointerId: 1, bubbles: true });
  canvas.dispatchEvent(ev);
  return ev;
}

function firePointerUp(canvas: HTMLElement, clientX: number, clientY: number) {
  const ev = new PointerEvent('pointerup', { clientX, clientY, button: 0, pointerId: 1, bubbles: true });
  canvas.dispatchEvent(ev);
  return ev;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PenController', () => {
  describe('isDrawing', () => {
    it('starts as false', () => {
      const { controller } = makeSetup();
      expect(controller.isDrawing()).toBe(false);
    });

    it('is true after pointerdown', () => {
      const { controller, canvas } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 }));
      expect(controller.isDrawing()).toBe(true);
    });

    it('is false after cancelDraw', () => {
      const { controller } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 }));
      controller.cancelDraw();
      expect(controller.isDrawing()).toBe(false);
    });
  });

  describe('pointer capture', () => {
    it('calls setPointerCapture on pointerdown', () => {
      const { controller, canvas } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 }));
      expect(canvas.setPointerCapture).toHaveBeenCalledWith(1);
    });

    it('calls releasePointerCapture on cancelDraw', () => {
      const { controller, canvas } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 }));
      controller.cancelDraw();
      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(1);
    });
  });

  describe('live preview', () => {
    it('appends a preview group to the world group on pointerdown', () => {
      const { controller, worldGroup } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      const preview = worldGroup.querySelector('.idea-graphic-pen-preview');
      expect(preview).not.toBeNull();
    });

    it('removes the preview group on cancelDraw', () => {
      const { controller, worldGroup } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      controller.cancelDraw();
      const preview = worldGroup.querySelector('.idea-graphic-pen-preview');
      expect(preview).toBeNull();
    });
  });

  describe('abort on < 3 points', () => {
    it('does NOT add an element when fewer than 3 points are buffered (2 points: down + up)', () => {
      const { controller, canvas, page } = makeSetup();
      // pointerdown = 1 point, pointerup = 1 point → 2 total, below threshold
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerUp(canvas, 5, 5);
      expect(page.elements).toHaveLength(0);
    });

    it('does NOT push a command when only pointerdown and immediate pointerup', () => {
      const { controller, canvas, page, undoRedoManager } = makeSetup();
      const spy = jest.spyOn(undoRedoManager, 'push');

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerUp(canvas, 1, 1); // 2 points total → below threshold

      expect(spy).not.toHaveBeenCalled();
      expect(page.elements).toHaveLength(0);
    });
  });

  describe('commit with ≥3 points', () => {
    it('adds a path element to the page on pointerup with enough points', () => {
      const { controller, canvas, page } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerMove(canvas, 30, 5);
      firePointerUp(canvas, 40, 0);

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('path');
    });

    it('path element has non-empty points array', () => {
      const { controller, canvas, page } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerUp(canvas, 30, 5);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = page.elements[0].data as any;
      expect(data.points.length).toBeGreaterThan(0);
    });

    it('path element has computed bounds', () => {
      const { controller, canvas, page } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 20, 0);
      firePointerMove(canvas, 40, 0);
      firePointerUp(canvas, 60, 0);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { bounds } = page.elements[0].data as any;
      expect(bounds).toBeDefined();
      expect(typeof bounds.width).toBe('number');
    });

    it('pushes a command to the undo manager', () => {
      const { controller, canvas, undoRedoManager } = makeSetup();
      const spy = jest.spyOn(undoRedoManager, 'push');

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerUp(canvas, 30, 5);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits element:add and doc:change on commit', () => {
      const { controller, canvas, eventBus } = makeSetup();
      const addSpy = jest.fn();
      const changeSpy = jest.fn();
      eventBus.on('element:add', addSpy);
      eventBus.on('doc:change', changeSpy);

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerUp(canvas, 30, 5);

      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(changeSpy).toHaveBeenCalledTimes(1);
    });

    it('removes the preview group after commit', () => {
      const { controller, canvas, worldGroup } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerUp(canvas, 30, 5);

      expect(worldGroup.querySelector('.idea-graphic-pen-preview')).toBeNull();
    });

    it('isDrawing is false after commit', () => {
      const { controller, canvas } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerUp(canvas, 30, 5);

      expect(controller.isDrawing()).toBe(false);
    });
  });

  describe('cancelDraw (ESC behaviour)', () => {
    it('does NOT add an element when cancelled mid-stroke', () => {
      const { controller, canvas, page } = makeSetup();

      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      firePointerMove(canvas, 10, 5);
      firePointerMove(canvas, 20, 0);
      firePointerMove(canvas, 30, 5);
      controller.cancelDraw();

      expect(page.elements).toHaveLength(0);
    });

    it('is a no-op when not drawing', () => {
      const { controller } = makeSetup();
      expect(() => controller.cancelDraw()).not.toThrow();
    });
  });

  describe('right-button is ignored', () => {
    it('does not start drawing on non-left-button pointerdown', () => {
      const { controller } = makeSetup();
      controller.handlePointerDown(new PointerEvent('pointerdown', { button: 2, clientX: 0, clientY: 0, pointerId: 1 }));
      expect(controller.isDrawing()).toBe(false);
    });
  });
});
