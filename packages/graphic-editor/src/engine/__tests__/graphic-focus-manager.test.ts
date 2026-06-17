import { GraphicFocusManager } from '../graphic-focus-manager';
import { GraphicSelectionManager } from '../selection-manager';
import { ToolState } from '../tool-state';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { ViewportController } from '../viewport-controller';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { GraphicContext } from '../graphic-context';
import type { I18nService } from '@core/i18n/i18n';

function makeSetup() {
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const doc = createDocument();
  const page = createGraphicPage('Test');
  doc.graphicPages.push(page);
  const registry = new GraphicBlockRegistry();
  const vp = new ViewportController(
    () => page.viewport,
    (next) => { page.viewport = next; },
  );
  const toolState = new ToolState(eventBus);

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
  const focusManager = new GraphicFocusManager(selectionManager, toolState);

  return { ctx, toolState, selectionManager, focusManager, eventBus };
}

describe('GraphicFocusManager', () => {
  it('clearCanvasFocus removes selection', () => {
    const { selectionManager, focusManager } = makeSetup();
    selectionManager.setSelection([{ type: 'element', id: 'el1' }]);
    expect(selectionManager.getSelection()).toHaveLength(1);

    focusManager.clearCanvasFocus();
    expect(selectionManager.getSelection()).toHaveLength(0);
  });

  it('armPlacement clears selection then enters placement mode', () => {
    const { selectionManager, focusManager, toolState } = makeSetup();
    selectionManager.setSelection([{ type: 'element', id: 'el1' }]);

    focusManager.armPlacement('triangle');

    expect(selectionManager.getSelection()).toHaveLength(0);
    expect(toolState.getTool()).toBe('placement');
    expect(toolState.getSnapshot().pendingBlockType).toBe('triangle');
  });

  it('activateTool clears selection for non-selection tools', () => {
    const { selectionManager, focusManager, toolState } = makeSetup();
    selectionManager.setSelection([{ type: 'element', id: 'el1' }]);

    focusManager.activateTool('hand');

    expect(selectionManager.getSelection()).toHaveLength(0);
    expect(toolState.getTool()).toBe('hand');
  });

  it('activateTool preserves selection when switching to selection', () => {
    const { selectionManager, focusManager, toolState } = makeSetup();
    selectionManager.setSelection([{ type: 'element', id: 'el1' }]);
    toolState.setTool('hand');

    focusManager.activateTool('selection');

    expect(selectionManager.getSelection()).toHaveLength(1);
    expect(toolState.getTool()).toBe('selection');
  });

  it('activateTool cancels active placement before switching tools', () => {
    const { focusManager, toolState } = makeSetup();
    toolState.beginPlacement('rectangle');
    expect(toolState.getTool()).toBe('placement');

    focusManager.activateTool('frame');

    expect(toolState.getTool()).toBe('frame');
    expect(toolState.getSnapshot().pendingBlockType).toBeUndefined();
  });
});
