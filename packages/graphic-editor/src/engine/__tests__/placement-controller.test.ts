import { PlacementController } from '../placement-controller';
import { ToolState } from '../tool-state';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { GraphicSelectionManager } from '../selection-manager';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import { ViewportController } from '../viewport-controller';
import { createDocument, createGraphicPage } from '@core/model/factory';
import type { GraphicContext } from '../graphic-context';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import type { I18nService } from '@core/i18n/i18n';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRegistry(): GraphicBlockRegistry {
  const registry = new GraphicBlockRegistry();
  const def: GraphicBlockDefinition = {
    type: 'rectangle',
    labelKey: 'graphic.block.rectangle',
    icon: 'rectangle',
    defaultData: () => ({ x: 0, y: 0, width: 100, height: 100 }),
    renderSvg: (_node, _ctx) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '100');
      return rect as unknown as SVGElement;
    },
    getBounds: (node) => {
      const d = node.data as { x: number; y: number; width: number; height: number };
      return { x: d.x, y: d.y, width: d.width, height: d.height };
    },
  };
  registry.register(def);

  const stickerDef: GraphicBlockDefinition = {
    type: 'sticker',
    labelKey: 'graphic.block.sticker',
    icon: 'sticky_note_2',
    defaultData: () => ({ x: 0, y: 0, width: 120, height: 120, text: '' }),
    renderSvg: (_node, _ctx) => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as unknown as SVGElement,
    getBounds: (node) => {
      const d = node.data as { x: number; y: number; width: number; height: number };
      return { x: d.x, y: d.y, width: d.width, height: d.height };
    },
  };
  registry.register(stickerDef);

  return registry;
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

  const canvas = document.createElement('div');
  canvas.className = 'idea-graphic-canvas';
  // Mock getBoundingClientRect for the canvas
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });

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

  const selectionManager = new GraphicSelectionManager(ctx);
  const controller = new PlacementController(ctx, selectionManager, canvas);

  return { ctx, eventBus, toolState, canvas, selectionManager, controller, page };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PlacementController', () => {
  describe('ghost lifecycle', () => {
    it('creates a ghost element when entering placement mode', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      const ghost = canvas.querySelector('.idea-graphic-ghost');
      expect(ghost).not.toBeNull();
    });

    it('removes the ghost when placement is consumed', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      toolState.consumePlacement();
      // tool:change fires after consume — ghost should be removed
      expect(canvas.querySelector('.idea-graphic-ghost')).toBeNull();
    });

    it('removes the ghost when placement is cancelled', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      toolState.cancelPlacement();
      expect(canvas.querySelector('.idea-graphic-ghost')).toBeNull();
    });

    it('updates ghost position on pointermove', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      const ghost = canvas.querySelector<HTMLElement>('.idea-graphic-ghost')!;

      canvas.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, clientX: 200, clientY: 150,
      }));

      expect(ghost.style.left).toBe('200px');
      expect(ghost.style.top).toBe('150px');
    });

    it('removes the ghost on destroy', () => {
      const { canvas, toolState, controller } = makeSetup();
      toolState.beginPlacement('rectangle');
      controller.destroy();
      expect(canvas.querySelector('.idea-graphic-ghost')).toBeNull();
    });
  });

  describe('placement commit', () => {
    it('pushes an AddElementCommand on pointerdown in placement mode', () => {
      const { canvas, toolState, page } = makeSetup();
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 100, clientY: 100,
      }));

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('rectangle');
    });

    it('positions the new element at the clicked world coords', () => {
      const { canvas, toolState, page } = makeSetup();
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 50, clientY: 80,
      }));

      const data = page.elements[0].data as { x: number; y: number };
      // viewport: zoom=1, x=0, y=0 — world = screen
      expect(data.x).toBe(50);
      expect(data.y).toBe(80);
    });

    it('selects the newly placed element', () => {
      const { canvas, toolState, selectionManager } = makeSetup();
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 100, clientY: 100,
      }));

      expect(selectionManager.getSelection()).toHaveLength(1);
    });

    it('emits graphic:request-properties-window after placement', () => {
      const { canvas, toolState, eventBus } = makeSetup();
      const events: unknown[] = [];
      eventBus.on('graphic:request-properties-window', (p) => events.push(p));
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 100, clientY: 100,
      }));

      expect(events).toHaveLength(1);
    });

    it('removes the ghost after commit', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 100, clientY: 100,
      }));

      expect(canvas.querySelector('.idea-graphic-ghost')).toBeNull();
    });

    it('reverts tool to previous tool after placement', () => {
      const { canvas, toolState } = makeSetup();
      toolState.setTool('pen');
      toolState.beginPlacement('rectangle');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 100, clientY: 100,
      }));

      expect(toolState.getTool()).toBe('pen');
    });
  });

  describe('sticker mode', () => {
    it('places a sticker on pointerdown in sticker mode', () => {
      const { canvas, toolState, page } = makeSetup();
      toolState.setTool('sticker');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 200, clientY: 200,
      }));

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('sticker');
    });

    it('centres the sticker on the cursor', () => {
      const { canvas, toolState, page } = makeSetup();
      toolState.setTool('sticker');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 200, clientY: 200,
      }));

      const data = page.elements[0].data as { x: number; y: number };
      expect(data.x).toBe(140);
      expect(data.y).toBe(140);
    });

    it('keeps the sticker tool active after placement', () => {
      const { canvas, toolState } = makeSetup();
      toolState.setTool('sticker');

      canvas.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, button: 0, clientX: 200, clientY: 200,
      }));

      expect(toolState.getTool()).toBe('sticker');
    });

    it('does not create a ghost in sticker mode', () => {
      const { canvas, toolState } = makeSetup();
      toolState.setTool('sticker');
      expect(canvas.querySelector('.idea-graphic-ghost')).toBeNull();
    });
  });

  describe('canvas cursor classes', () => {
    it('adds placement cursor class in placement mode', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      expect(canvas.classList.contains('idea-graphic-canvas--placement')).toBe(true);
    });

    it('adds sticker cursor class in sticker mode', () => {
      const { canvas, toolState } = makeSetup();
      toolState.setTool('sticker');
      expect(canvas.classList.contains('idea-graphic-canvas--sticker')).toBe(true);
    });

    it('removes cursor classes when returning to selection', () => {
      const { canvas, toolState } = makeSetup();
      toolState.beginPlacement('rectangle');
      toolState.cancelPlacement();
      expect(canvas.classList.contains('idea-graphic-canvas--placement')).toBe(false);
    });
  });
});
