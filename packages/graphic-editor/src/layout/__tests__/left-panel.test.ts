import { LeftPanel } from '../left-panel';
import type { LeftPanelOptions } from '../left-panel';
import { GraphicBlockRegistry, CUSTOM_BLOCK_GROUP_KEY } from '../../blocks/block-registry';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { ToolState } from '../../engine/tool-state';
import { ViewportController } from '../../engine/viewport-controller';
import type { GraphicContext } from '../../engine/graphic-context';
import type { I18nService } from '@core/i18n/i18n';
import type { AnyGraphicBlockDefinition } from '../../blocks/block-registry';
import { DOCUMENT_DATA_KEYS } from '@core/model/document-data';
import type { CustomBlockDefinition } from '@core/model/graphic-preferences';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeI18n(): I18nService {
  return { t: (k: string) => k } as unknown as I18nService;
}

function makeDef(type: string, groupKey?: string): AnyGraphicBlockDefinition {
  return {
    type,
    labelKey: `graphic.block.${type}`,
    icon: 'square',
    groupKey,
    defaultData: () => ({}),
    renderSvg: () => document.createElementNS('http://www.w3.org/2000/svg', 'rect') as SVGElement,
    getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
  };
}

function makeCustomBlockDef(id: string): CustomBlockDefinition {
  return {
    id,
    name: `Custom ${id}`,
    createdAt: new Date().toISOString(),
    source: { width: 100, height: 100 },
    elements: [],
    arrows: [],
  };
}

function makeCtx(registry?: GraphicBlockRegistry): { ctx: GraphicContext; eventBus: EventBus; toolState: ToolState } {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  doc.graphicPages.push(page);
  const reg = registry ?? new GraphicBlockRegistry();
  const vp = new ViewportController(() => page.viewport, (next) => { page.viewport = next; });
  const toolState = new ToolState(eventBus);

  const ctx: GraphicContext = {
    document: doc,
    page,
    undoRedoManager,
    eventBus,
    rootElement: document.createElement('div'),
    i18n: makeI18n(),
    viewportController: vp,
    registry: reg,
    toolState,
  };
  return { ctx, eventBus, toolState };
}

function makePanel(options?: LeftPanelOptions, registry?: GraphicBlockRegistry) {
  const { ctx, eventBus, toolState } = makeCtx(registry);
  const host = document.createElement('div');
  const panel = new LeftPanel(host, ctx, options);
  panel.mount();

  // flush the rAF-debounced refresh (jsdom: requestAnimationFrame fires synchronously in some envs)
  // wait for the microtask/macrotask queue
  return { panel, host, ctx, eventBus, toolState };
}

// Flush pending rAF scheduled in refresh()
function flushRaf() {
  jest.runAllTimers();
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  document.body.innerHTML = '';
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LeftPanel', () => {
  describe('basic structure', () => {
    it('mounts an aside with the correct class', () => {
      const { host } = makePanel();
      flushRaf();
      expect(host.querySelector('aside.idea-graphic-left-panel')).not.toBeNull();
    });

    it('aside is the first child of the host (before existing children)', () => {
      const registry = new GraphicBlockRegistry();
      const { ctx } = makeCtx(registry);
      const host = document.createElement('div');
      const canvas = document.createElement('div');
      canvas.className = 'idea-graphic-canvas';
      host.appendChild(canvas);

      const panel = new LeftPanel(host, ctx);
      panel.mount();
      flushRaf();

      expect(host.firstElementChild?.tagName).toBe('ASIDE');
    });
  });

  describe('named-group accordions', () => {
    it('renders one accordion per named group, excluding __custom and __ungrouped', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'shapes'));
      registry.register(makeDef('connector', 'connectors'));
      // ungrouped — should not appear in scroll
      registry.register(makeDef('sticker'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const groups = host.querySelectorAll('.idea-graphic-left-panel__scroll [data-group-key]');
      const keys = Array.from(groups).map(el => (el as HTMLElement).dataset.groupKey);

      expect(keys).toContain('shapes');
      expect(keys).toContain('connectors');
      expect(keys).not.toContain('__ungrouped');
      expect(keys).not.toContain(CUSTOM_BLOCK_GROUP_KEY);
    });

    it('expands the first accordion and collapses the rest by default', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'connectors'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const headers = host.querySelectorAll<HTMLButtonElement>('.idea-accordion__header');
      // First group opened → first header aria-expanded=true
      expect(headers[0]?.getAttribute('aria-expanded')).toBe('true');
      expect(headers[1]?.getAttribute('aria-expanded')).toBe('false');
    });

    it('renders BlockTile buttons for each definition in a group', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'shapes'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const tiles = host.querySelectorAll('.idea-graphic-block-tile');
      expect(tiles).toHaveLength(2);
    });
  });

  describe('hiddenGroups option', () => {
    it('omits groups listed in hiddenGroups', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('connector', 'connectors'));

      const { host } = makePanel({ hiddenGroups: ['connectors'] }, registry);
      flushRaf();

      const keys = Array.from(
        host.querySelectorAll<HTMLElement>('[data-group-key]'),
      ).map(el => el.dataset.groupKey);

      expect(keys).not.toContain('connectors');
      expect(keys).toContain('shapes');
    });
  });

  describe('initiallyExpandedGroups option', () => {
    it('opens the specified group instead of the first', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'connectors'));

      const { host } = makePanel({ initiallyExpandedGroups: ['connectors'] }, registry);
      flushRaf();

      const shapesHeader = host.querySelector<HTMLButtonElement>(
        '[data-group-key="shapes"] .idea-accordion__header',
      );
      const connectorsHeader = host.querySelector<HTMLButtonElement>(
        '[data-group-key="connectors"] .idea-accordion__header',
      );

      expect(shapesHeader?.getAttribute('aria-expanded')).toBe('false');
      expect(connectorsHeader?.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('sticky Custom section', () => {
    it('hides the sticky container when no custom or ungrouped entries exist', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const sticky = host.querySelector<HTMLElement>('.idea-graphic-left-panel__sticky')!;
      expect(sticky.style.display).toBe('none');
    });

    it('shows the sticky container when a custom:* definition is present', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlockDef('blk_001')];
      registry.syncCustomBlocks(doc);

      const { ctx } = makeCtx(registry);
      // Replace context document with the one that has custom blocks
      (ctx as { document: typeof doc }).document = doc;

      const host = document.createElement('div');
      const panel = new LeftPanel(host, ctx);
      panel.mount();
      flushRaf();

      const sticky = host.querySelector<HTMLElement>('.idea-graphic-left-panel__sticky')!;
      expect(sticky.style.display).not.toBe('none');
    });

    it('shows the sticky container when ungrouped definitions are present', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('sticker')); // no groupKey → __ungrouped

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const sticky = host.querySelector<HTMLElement>('.idea-graphic-left-panel__sticky')!;
      expect(sticky.style.display).not.toBe('none');
    });

    it('sticky custom accordion has groupKey __custom', () => {
      const registry = new GraphicBlockRegistry();
      const doc = createDocument();
      doc.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlockDef('blk_002')];
      registry.syncCustomBlocks(doc);

      const { ctx } = makeCtx(registry);
      (ctx as { document: typeof doc }).document = doc;

      const host = document.createElement('div');
      const panel = new LeftPanel(host, ctx);
      panel.mount();
      flushRaf();

      const stickyAccordion = host.querySelector<HTMLElement>(
        `.idea-graphic-left-panel__sticky [data-group-key="${CUSTOM_BLOCK_GROUP_KEY}"]`,
      );
      expect(stickyAccordion).not.toBeNull();
    });
  });

  describe('live refresh after doc:change', () => {
    it('shows the custom tile after registry.syncCustomBlocks + panel.refresh()', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { ctx, host, panel } = (() => {
        const c = makeCtx(registry);
        const h = document.createElement('div');
        const p = new LeftPanel(h, c.ctx);
        p.mount();
        flushRaf();
        return { ctx: c.ctx, host: h, panel: p };
      })();

      // Initially no custom tiles in sticky
      let sticky = host.querySelector<HTMLElement>('.idea-graphic-left-panel__sticky')!;
      expect(sticky.style.display).toBe('none');

      // Add a custom block to the document and sync
      ctx.document.data[DOCUMENT_DATA_KEYS.customBlocks] = [makeCustomBlockDef('blk_live')];
      registry.syncCustomBlocks(ctx.document);
      panel.refresh();
      flushRaf();

      sticky = host.querySelector<HTMLElement>('.idea-graphic-left-panel__sticky')!;
      expect(sticky.style.display).not.toBe('none');
    });
  });

  describe('block tile activation', () => {
    it('calls toolState.beginPlacement with the block type on tile pointerdown', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { host, toolState } = makePanel(undefined, registry);
      flushRaf();

      const beginSpy = jest.spyOn(toolState, 'beginPlacement');

      const tileBtn = host.querySelector<HTMLButtonElement>('.idea-graphic-block-tile')!;
      tileBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(beginSpy).toHaveBeenCalledWith('rectangle');
    });
  });

  describe('destroy', () => {
    it('removes the aside from the host', () => {
      const { host, panel } = makePanel();
      flushRaf();

      expect(host.querySelector('aside')).not.toBeNull();
      panel.destroy();
      expect(host.querySelector('aside')).toBeNull();
    });
  });
});
