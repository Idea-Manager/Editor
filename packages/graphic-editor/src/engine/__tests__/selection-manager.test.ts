import { GraphicSelectionManager, type SelectionEntry } from '../selection-manager';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicBlockDefinition } from '../../blocks/block-definition';
import type { GraphicContext } from '../graphic-context';
import { ViewportController } from '../viewport-controller';
import type { GraphicElement } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';

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
    getBounds: (node) => ({ x: node.data.x, y: node.data.y, width: node.data.width, height: node.data.height }),
  };
  registry.register(def);
  return registry;
}

function makeCtx(extraElements: GraphicElement[] = []): { ctx: GraphicContext; eventBus: EventBus } {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  page.elements.push(...extraElements);
  doc.graphicPages.push(page);
  const registry = makeRegistry();
  const vp = new ViewportController(() => page.viewport, (next) => { page.viewport = next; });
  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string) => k } as unknown as I18nService,
    viewportController: vp,
    registry,
  };
  return { ctx, eventBus };
}

function sel(id: string): SelectionEntry {
  return { type: 'element', id };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GraphicSelectionManager', () => {
  describe('setSelection / getSelection', () => {
    it('stores the given entries', () => {
      const { ctx } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel('a'), sel('b')]);
      expect(sm.getSelection()).toEqual([sel('a'), sel('b')]);
    });

    it('replaces previous selection', () => {
      const { ctx } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel('a')]);
      sm.setSelection([sel('b')]);
      expect(sm.getSelection()).toEqual([sel('b')]);
    });

    it('emits selection:change when set changes', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));

      sm.setSelection([sel('a')]);
      expect(changes).toHaveLength(1);
    });

    it('does not emit when the selection is unchanged', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      sm.setSelection([sel('a')]);
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.setSelection([sel('a')]); // same
      expect(changes).toHaveLength(0);
    });
  });

  describe('add', () => {
    it('appends entry and emits', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.add(sel('a'));
      expect(sm.has('a')).toBe(true);
      expect(changes).toHaveLength(1);
    });

    it('does not add duplicate', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      sm.add(sel('a'));
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.add(sel('a'));
      expect(changes).toHaveLength(0);
      expect(sm.getSelection()).toHaveLength(1);
    });
  });

  describe('remove', () => {
    it('removes the entry and emits', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel('a'), sel('b')]);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.remove('a');
      expect(sm.has('a')).toBe(false);
      expect(sm.has('b')).toBe(true);
      expect(changes).toHaveLength(1);
    });

    it('does not emit when id not in selection', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.remove('nonexistent');
      expect(changes).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('empties the selection and emits', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel('a'), sel('b')]);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.clear();
      expect(sm.getSelection()).toHaveLength(0);
      expect(changes).toHaveLength(1);
    });

    it('does not emit when already empty', () => {
      const { ctx, eventBus } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const changes: unknown[] = [];
      eventBus.on('selection:change', (p) => changes.push(p));
      sm.clear();
      expect(changes).toHaveLength(0);
    });
  });

  describe('getBoundingRect', () => {
    it('returns null when selection is empty', () => {
      const { ctx } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      expect(sm.getBoundingRect()).toBeNull();
    });

    it('returns the element bounds for a single selection', () => {
      const el = makeElement(10, 20, 80, 60);
      const { ctx } = makeCtx([el]);
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel(el.id)]);
      expect(sm.getBoundingRect()).toEqual({ x: 10, y: 20, width: 80, height: 60 });
    });

    it('returns the union bounds for multiple selections', () => {
      const el1 = makeElement(0, 0, 100, 100);
      const el2 = makeElement(200, 200, 50, 50);
      const { ctx } = makeCtx([el1, el2]);
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel(el1.id), sel(el2.id)]);
      const bounds = sm.getBoundingRect();
      expect(bounds).toEqual({ x: 0, y: 0, width: 250, height: 250 });
    });
  });

  describe('handlePointerDown', () => {
    it('selects a single element on click (no shift)', () => {
      const el = makeElement();
      const { ctx } = makeCtx([el]);
      const sm = new GraphicSelectionManager(ctx);
      const ev = new PointerEvent('pointerdown', { shiftKey: false });
      sm.handlePointerDown(ev, { kind: 'element', element: el });
      expect(sm.has(el.id)).toBe(true);
    });

    it('clears selection on empty canvas click (no shift)', () => {
      const el = makeElement();
      const { ctx } = makeCtx([el]);
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel(el.id)]);
      const ev = new PointerEvent('pointerdown', { shiftKey: false });
      sm.handlePointerDown(ev, null);
      expect(sm.getSelection()).toHaveLength(0);
    });

    it('toggles element in/out on shift+click', () => {
      const el = makeElement();
      const { ctx } = makeCtx([el]);
      const sm = new GraphicSelectionManager(ctx);
      sm.setSelection([sel(el.id)]);
      const ev = new PointerEvent('pointerdown', { shiftKey: true });
      sm.handlePointerDown(ev, { kind: 'element', element: el });
      expect(sm.has(el.id)).toBe(false);
    });

    it('calls registered pointer down handlers', () => {
      const { ctx } = makeCtx();
      const sm = new GraphicSelectionManager(ctx);
      const calls: unknown[] = [];
      sm.registerPointerDownHandler((ev, tgt) => calls.push({ ev, tgt }));
      const ev = new PointerEvent('pointerdown', {});
      sm.handlePointerDown(ev, null);
      expect(calls).toHaveLength(1);
    });

    it('ignores pointerdown when tool is not selection', () => {
      const { ctx, eventBus } = makeCtx();
      const { ToolState } = require('../tool-state');
      const toolState = new ToolState(eventBus);
      toolState.setTool('frame');
      ctx.toolState = toolState;

      const sm = new GraphicSelectionManager(ctx);
      const el = makeElement();
      ctx.page.elements.push(el);

      const calls: unknown[] = [];
      sm.registerPointerDownHandler((ev, tgt) => calls.push({ ev, tgt }));

      const ev = new PointerEvent('pointerdown', {});
      sm.handlePointerDown(ev, { kind: 'element', element: el });

      expect(sm.getSelection()).toHaveLength(0);
      expect(calls).toHaveLength(0);
    });
  });
});
