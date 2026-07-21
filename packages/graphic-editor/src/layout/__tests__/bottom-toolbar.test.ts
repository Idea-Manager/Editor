import { BottomToolbar } from '../bottom-toolbar';
import { EventBus } from '@core/events/event-bus';
import { ToolState } from '../../engine/tool-state';
import type { ToolStateSnapshot } from '../../engine/tool-state';
import type { I18nService } from '@core/i18n/i18n';

function makeI18n(): I18nService {
  return { t: (k: string) => k } as unknown as I18nService;
}

function makeSetup(initialTool: 'selection' | 'frame' | 'pen' | 'sticker' = 'selection') {
  const eventBus = new EventBus();
  const toolState = new ToolState(eventBus);
  const selected: string[] = [];

  const toolbar = new BottomToolbar(eventBus, makeI18n(), {
    onToolSelect: (tool) => {
      selected.push(tool);
      toolState.setTool(tool as never);
    },
    initialTool,
  });

  const container = document.createElement('div');
  toolbar.mount(container);

  return { eventBus, toolState, toolbar, container, selected };
}

describe('BottomToolbar', () => {
  describe('rendering', () => {
    it('renders 5 tool buttons', () => {
      const { container } = makeSetup();
      const buttons = container.querySelectorAll<HTMLButtonElement>('[data-tool]');
      expect(buttons).toHaveLength(5);
    });

    it('marks the initial active tool button', () => {
      const { container } = makeSetup('selection');
      const activeBtn = container.querySelector<HTMLButtonElement>('[data-tool="selection"]')!;
      expect(activeBtn.classList.contains('is-active')).toBe(true);
    });

    it('sets correct data-tool attributes', () => {
      const { container } = makeSetup();
      const tools = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-tool]'))
        .map(b => b.dataset.tool);
      expect(tools).toEqual(['selection', 'hand', 'frame', 'pen', 'sticker']);
    });
  });

  describe('button click', () => {
    it('calls onToolSelect with the clicked tool id', () => {
      const { container, selected } = makeSetup();
      const frameBtn = container.querySelector<HTMLButtonElement>('[data-tool="frame"]')!;
      frameBtn.click();
      expect(selected).toContain('frame');
    });

    it('updates active modifier to reflect new tool', () => {
      const { container, eventBus } = makeSetup();
      eventBus.emit<ToolStateSnapshot>('tool:change', { tool: 'pen' });
      const penBtn = container.querySelector<HTMLButtonElement>('[data-tool="pen"]')!;
      const selBtn = container.querySelector<HTMLButtonElement>('[data-tool="selection"]')!;
      expect(penBtn.classList.contains('is-active')).toBe(true);
      expect(selBtn.classList.contains('is-active')).toBe(false);
    });

    it('does not change active state when placement tool:change fires', () => {
      const { container, eventBus } = makeSetup();
      const selBtn = container.querySelector<HTMLButtonElement>('[data-tool="selection"]')!;
      eventBus.emit<ToolStateSnapshot>('tool:change', { tool: 'placement', pendingBlockType: 'rectangle', previousTool: 'selection' });
      expect(selBtn.classList.contains('is-active')).toBe(true);
    });
  });

  describe('pointer event propagation', () => {
    it('prevents default and stops propagation on pointerdown', () => {
      const { container } = makeSetup();
      const btn = container.querySelector<HTMLButtonElement>('[data-tool="selection"]')!;
      let propagated = false;
      container.addEventListener('pointerdown', () => { propagated = true; });

      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      btn.dispatchEvent(event);

      expect(propagated).toBe(false);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('destroy', () => {
    it('removes the toolbar element from DOM', () => {
      const { container, toolbar } = makeSetup();
      expect(container.querySelector('.idea-graphic-toolbar--bottom')).not.toBeNull();
      toolbar.destroy();
      expect(container.querySelector('.idea-graphic-toolbar--bottom')).toBeNull();
    });

    it('stops listening to tool:change after destroy', () => {
      const { container, toolbar, eventBus } = makeSetup();
      const penBtn = container.querySelector<HTMLButtonElement>('[data-tool="pen"]')!;
      toolbar.destroy();
      eventBus.emit<ToolStateSnapshot>('tool:change', { tool: 'pen' });
      expect(penBtn.classList.contains('is-active')).toBe(false);
    });
  });
});
