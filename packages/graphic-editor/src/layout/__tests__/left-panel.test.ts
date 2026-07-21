import {
  LeftPanel,
  computeTileLayout,
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MAX_WIDTH,
  LEFT_PANEL_MIN_WIDTH,
} from '../left-panel';
import type { LeftPanelOptions } from '../left-panel';
import { GraphicBlockRegistry, CUSTOM_BLOCK_GROUP_KEY } from '../../blocks/block-registry';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { ToolState } from '../../engine/tool-state';
import { ViewportController } from '../../engine/viewport-controller';
import { GraphicSelectionManager } from '../../engine/selection-manager';
import { GraphicFocusManager } from '../../engine/graphic-focus-manager';
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
    icon: '<rect x="4" y="4" width="16" height="16"/>',
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
  };
}

function makeCtx(registry?: GraphicBlockRegistry): {
  ctx: GraphicContext;
  eventBus: EventBus;
  toolState: ToolState;
  selectionManager: GraphicSelectionManager;
  focusManager: GraphicFocusManager;
} {
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

  const selectionManager = new GraphicSelectionManager(ctx);
  const focusManager = new GraphicFocusManager(selectionManager, toolState);
  ctx.focusManager = focusManager;

  return { ctx, eventBus, toolState, selectionManager, focusManager };
}

function makePanel(options?: LeftPanelOptions, registry?: GraphicBlockRegistry) {
  const { ctx, eventBus, toolState, selectionManager, focusManager } = makeCtx(registry);
  const host = document.createElement('div');
  const panel = new LeftPanel(host, ctx, options);
  panel.mount();

  // flush the rAF-debounced refresh (jsdom: requestAnimationFrame fires synchronously in some envs)
  // wait for the microtask/macrotask queue
  return { panel, host, ctx, eventBus, toolState, selectionManager, focusManager };
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
    it('calls focusManager.armPlacement with the block type on tile pointerdown', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { host, focusManager, selectionManager } = makePanel(undefined, registry);
      flushRaf();

      selectionManager.setSelection([{ type: 'element', id: 'el-existing' }]);
      const armSpy = jest.spyOn(focusManager, 'armPlacement');

      const tileBtn = host.querySelector<HTMLButtonElement>('.idea-graphic-block-tile')!;
      tileBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));

      expect(armSpy).toHaveBeenCalledWith('rectangle');
      expect(selectionManager.getSelection()).toHaveLength(0);
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

    it('removes the panel width CSS variable from the host', () => {
      const { host, panel } = makePanel();
      flushRaf();
      expect(host.style.getPropertyValue('--idea-graphic-left-panel-width')).not.toBe('');
      panel.destroy();
      expect(host.style.getPropertyValue('--idea-graphic-left-panel-width')).toBe('');
    });
  });

  describe('toolbar', () => {
    it('mounts a sort input and three icon buttons', () => {
      const { host } = makePanel();
      flushRaf();

      expect(host.querySelector('.idea-graphic-left-panel__sort-input')).not.toBeNull();
      const buttons = host.querySelectorAll('.idea-graphic-left-panel__toolbar-btn');
      expect(buttons).toHaveLength(3);
      expect(host.querySelector('.idea-graphic-left-panel__view-mode-btn')).not.toBeNull();
    });

    it('defaults to tiles view mode', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const aside = host.querySelector('aside.idea-graphic-left-panel')!;
      expect(aside.getAttribute('data-view-mode')).toBe('tiles');
      expect(host.querySelector('.idea-graphic-left-panel__blocks--tiles')).not.toBeNull();

      const viewModeBtn = host.querySelector<HTMLButtonElement>(
        '.idea-graphic-left-panel__view-mode-btn',
      )!;
      expect(viewModeBtn.querySelector('.material-symbols-outlined')?.textContent).toBe('grid_view');
      expect(viewModeBtn.getAttribute('title')).toBe('graphic.leftPanel.viewTiles');
    });

    it('switches to list view and updates the toggle icon and tooltip', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const viewModeBtn = host.querySelector<HTMLButtonElement>(
        '.idea-graphic-left-panel__view-mode-btn',
      )!;
      viewModeBtn.click();

      expect(host.querySelector('.idea-graphic-left-panel__blocks--list')).not.toBeNull();
      expect(host.querySelector('.idea-graphic-block-tile--list')).not.toBeNull();
      expect(viewModeBtn.querySelector('.material-symbols-outlined')?.textContent).toBe('list');
      expect(viewModeBtn.getAttribute('title')).toBe('graphic.leftPanel.viewList');
    });

    it('expand all opens every accordion', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'connectors'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const expandBtn = host.querySelectorAll<HTMLButtonElement>(
        '.idea-graphic-left-panel__toolbar-btn',
      )[0]!;
      expandBtn.click();

      const headers = host.querySelectorAll<HTMLButtonElement>('.idea-accordion__header');
      for (const header of headers) {
        expect(header.getAttribute('aria-expanded')).toBe('true');
      }
    });

    it('collapse all closes every accordion', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'connectors'));

      const { host } = makePanel(undefined, registry);
      flushRaf();

      const expandBtn = host.querySelectorAll<HTMLButtonElement>(
        '.idea-graphic-left-panel__toolbar-btn',
      )[0]!;
      expandBtn.click();

      const collapseBtn = host.querySelectorAll<HTMLButtonElement>(
        '.idea-graphic-left-panel__toolbar-btn',
      )[1]!;
      collapseBtn.click();

      const headers = host.querySelectorAll<HTMLButtonElement>('.idea-accordion__header');
      for (const header of headers) {
        expect(header.getAttribute('aria-expanded')).toBe('false');
      }
    });
  });

  describe('chapter sorting', () => {
    function makeSortingI18n(): I18nService {
      const map: Record<string, string> = {
        'graphic.group.shapes': 'Shapes',
        'graphic.group.connectors': 'Connectors',
        'graphic.group.zebra': 'Zebra',
        'graphic.group.alpha': 'Alpha',
        'graphic.group.custom': 'Custom',
        'graphic.group.empty': 'Empty',
      };
      return { t: (k: string) => map[k] ?? k } as unknown as I18nService;
    }

    function makeSortingPanel(registry: GraphicBlockRegistry) {
      const { ctx, eventBus, toolState } = makeCtx(registry);
      ctx.i18n = makeSortingI18n();
      const host = document.createElement('div');
      const panel = new LeftPanel(host, ctx);
      panel.mount();
      return { panel, host, ctx, eventBus, toolState };
    }

    function scrollGroupKeys(host: HTMLElement): string[] {
      return Array.from(
        host.querySelectorAll<HTMLElement>('.idea-graphic-left-panel__scroll [data-group-key]'),
      ).map((el) => el.dataset.groupKey!);
    }

    it('keeps registry insertion order when sort input has fewer than 2 characters', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'zebra'));
      registry.register(makeDef('circle', 'alpha'));

      const { host } = makeSortingPanel(registry);
      flushRaf();

      expect(scrollGroupKeys(host)).toEqual(['zebra', 'alpha']);
    });

    it('sorts chapters alphanumerically when sort input has at least 2 characters', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'zebra'));
      registry.register(makeDef('circle', 'alpha'));

      const { host, panel } = makeSortingPanel(registry);
      flushRaf();

      const sortInput = host.querySelector<HTMLInputElement>(
        '.idea-graphic-left-panel__sort-input',
      )!;
      sortInput.value = 'ab';
      sortInput.dispatchEvent(new Event('input', { bubbles: true }));
      flushRaf();

      expect(scrollGroupKeys(host)).toEqual(['alpha', 'zebra']);
    });

    it('keeps Custom in the sticky section regardless of sort', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'zebra'));
      registry.register(makeDef('circle', 'alpha'));
      registry.register(makeDef('sticker'));

      const { host } = makeSortingPanel(registry);
      flushRaf();

      const sortInput = host.querySelector<HTMLInputElement>(
        '.idea-graphic-left-panel__sort-input',
      )!;
      sortInput.value = 'zz';
      sortInput.dispatchEvent(new Event('input', { bubbles: true }));
      flushRaf();

      expect(
        host.querySelector(`.idea-graphic-left-panel__sticky [data-group-key="${CUSTOM_BLOCK_GROUP_KEY}"]`),
      ).not.toBeNull();
      expect(scrollGroupKeys(host)).not.toContain(CUSTOM_BLOCK_GROUP_KEY);
    });
  });

  describe('resizable width', () => {
    it('sets the default panel width CSS variable on mount', () => {
      const { host } = makePanel();
      flushRaf();
      expect(host.style.getPropertyValue('--idea-graphic-left-panel-width')).toBe(
        `${LEFT_PANEL_DEFAULT_WIDTH}px`,
      );
    });

    it('clamps resize drag to min and max width', () => {
      const { host } = makePanel();
      flushRaf();

      const handle = host.querySelector<HTMLElement>(
        '.idea-graphic-left-panel__resize-handle',
      )!;

      handle.setPointerCapture = jest.fn();
      handle.hasPointerCapture = jest.fn().mockReturnValue(true);
      handle.releasePointerCapture = jest.fn();

      jest.spyOn(host, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 800,
        bottom: 600,
        width: 800,
        height: 600,
        toJSON: () => ({}),
      });

      handle.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }),
      );

      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 100, pointerId: 1 }),
      );
      expect(host.style.getPropertyValue('--idea-graphic-left-panel-width')).toBe(
        `${LEFT_PANEL_MIN_WIDTH}px`,
      );

      window.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 500, pointerId: 1 }),
      );
      expect(host.style.getPropertyValue('--idea-graphic-left-panel-width')).toBe(
        `${LEFT_PANEL_MAX_WIDTH}px`,
      );

      window.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 1 }),
      );
    });
  });

  describe('tile layout', () => {
    it('computeTileLayout returns max columns that fit at a given panel width', () => {
      expect(computeTileLayout(280)).toBe(3);
      expect(computeTileLayout(400)).toBe(4);
    });

    it('computeTileLayout caps columns by item count', () => {
      expect(computeTileLayout(400, 3)).toBe(3);
      expect(computeTileLayout(280, 2)).toBe(2);
    });

    it('sets --tile-cols on blocks containers capped by item count', () => {
      const registry = new GraphicBlockRegistry();
      registry.register(makeDef('rectangle', 'shapes'));
      registry.register(makeDef('circle', 'shapes'));
      registry.register(makeDef('triangle', 'shapes'));

      const { host } = makePanel({ defaultPanelWidth: 400 }, registry);
      flushRaf();

      const blocks = host.querySelector<HTMLElement>(
        '.idea-graphic-left-panel__blocks--tiles',
      )!;
      expect(blocks.style.getPropertyValue('--tile-cols')).toBe('3');
    });
  });
});
