import { GroupController } from '../group-controller';
import { EventBus } from '@core/events/event-bus';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { ViewportController } from '../../engine/viewport-controller';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicContext } from '../../engine/graphic-context';
import type { GraphicElement } from '@core/model/interfaces';
import type { SelectionEntry } from '../../engine/selection-manager';
import type { I18nService } from '@core/i18n/i18n';
import type { GroupPropertiesWindow } from '../../properties/group-properties-window';

function makeEl(type = 'rectangle'): GraphicElement {
  return { id: generateId('el'), type, data: { x: 0, y: 0, width: 100, height: 100 } };
}

function makeCtx(): { ctx: GraphicContext; eventBus: EventBus } {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  doc.graphicPages.push(page);
  const registry = new GraphicBlockRegistry();
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

function makeGroupWindow(): GroupPropertiesWindow {
  return {
    setSelection: jest.fn(),
    destroy: jest.fn(),
  } as unknown as GroupPropertiesWindow;
}

function makeConfig(ctx: GraphicContext, groupWindow: GroupPropertiesWindow) {
  const showPropertiesWindow = jest.fn();
  const hidePropertiesWindow = jest.fn();
  const createGroupPropertiesWindow = jest.fn(() => groupWindow);

  return {
    config: {
      ctx,
      showPropertiesWindow,
      hidePropertiesWindow,
      createGroupPropertiesWindow,
    },
    showPropertiesWindow,
    hidePropertiesWindow,
    createGroupPropertiesWindow,
  };
}

describe('GroupController — selection routing', () => {
  it('closes everything when selection is empty', () => {
    const { ctx, eventBus } = makeCtx();
    const groupWindow = makeGroupWindow();
    const { config, hidePropertiesWindow } = makeConfig(ctx, groupWindow);

    new GroupController(config);

    eventBus.emit<SelectionEntry[]>('selection:change', []);

    expect(hidePropertiesWindow).toHaveBeenCalled();
  });

  it('opens FloatingPropertiesWindow for a single element', () => {
    const { ctx, eventBus } = makeCtx();
    const el = makeEl('rectangle');
    ctx.page.elements.push(el);

    const groupWindow = makeGroupWindow();
    const { config, showPropertiesWindow } = makeConfig(ctx, groupWindow);

    new GroupController(config);

    eventBus.emit<SelectionEntry[]>('selection:change', [{ type: 'element', id: el.id }]);

    expect(showPropertiesWindow).toHaveBeenCalledWith(el);
  });

  it('opens GroupPropertiesWindow for multi-select', () => {
    const { ctx, eventBus } = makeCtx();
    const el1 = makeEl();
    const el2 = makeEl();
    ctx.page.elements.push(el1, el2);

    const groupWindow = makeGroupWindow();
    const { config, createGroupPropertiesWindow, hidePropertiesWindow } =
      makeConfig(ctx, groupWindow);

    new GroupController(config);

    const entries: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];
    eventBus.emit<SelectionEntry[]>('selection:change', entries);

    expect(hidePropertiesWindow).toHaveBeenCalled();
    expect(createGroupPropertiesWindow).toHaveBeenCalledWith(ctx.rootElement);
    expect(groupWindow.setSelection).toHaveBeenCalledWith(entries);
  });

  it('calls setSelection on existing GroupPropertiesWindow when selection changes within multi-select', () => {
    const { ctx, eventBus } = makeCtx();
    const el1 = makeEl();
    const el2 = makeEl();
    const el3 = makeEl();
    ctx.page.elements.push(el1, el2, el3);

    const groupWindow = makeGroupWindow();
    const { config, createGroupPropertiesWindow } = makeConfig(ctx, groupWindow);

    new GroupController(config);

    const first: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ];
    eventBus.emit<SelectionEntry[]>('selection:change', first);
    expect(createGroupPropertiesWindow).toHaveBeenCalledTimes(1);

    const second: SelectionEntry[] = [
      { type: 'element', id: el1.id },
      { type: 'element', id: el3.id },
    ];
    eventBus.emit<SelectionEntry[]>('selection:change', second);
    expect(createGroupPropertiesWindow).toHaveBeenCalledTimes(1);
    expect(groupWindow.setSelection).toHaveBeenLastCalledWith(second);
  });

  it('destroys group window when transitioning back to single-select', () => {
    const { ctx, eventBus } = makeCtx();
    const el1 = makeEl();
    const el2 = makeEl();
    ctx.page.elements.push(el1, el2);

    const groupWindow = makeGroupWindow();
    const { config } = makeConfig(ctx, groupWindow);

    new GroupController(config);

    eventBus.emit<SelectionEntry[]>('selection:change', [
      { type: 'element', id: el1.id },
      { type: 'element', id: el2.id },
    ]);

    eventBus.emit<SelectionEntry[]>('selection:change', [{ type: 'element', id: el1.id }]);

    expect(groupWindow.destroy).toHaveBeenCalled();
  });

  it('destroy() stops listening for selection:change', () => {
    const { ctx, eventBus } = makeCtx();
    const el = makeEl();
    ctx.page.elements.push(el);

    const groupWindow = makeGroupWindow();
    const { config, showPropertiesWindow } = makeConfig(ctx, groupWindow);

    const controller = new GroupController(config);
    controller.destroy();

    eventBus.emit<SelectionEntry[]>('selection:change', [{ type: 'element', id: el.id }]);

    expect(showPropertiesWindow).not.toHaveBeenCalled();
  });
});
