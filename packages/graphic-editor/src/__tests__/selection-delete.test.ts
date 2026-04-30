/**
 * Integration test: Delete / Backspace key removes selected elements.
 */
import { GraphicEditor } from '../engine/graphic-editor';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicSelectionManager } from '../engine/selection-manager';

if (!customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}

function makeElement(x = 50, y = 50): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width: 100, height: 100 } };
}

/** Access private editor internals for testing via unknown cast. */
function getSelectionManager(editor: GraphicEditor): GraphicSelectionManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (editor as unknown as Record<string, unknown>).selectionManager as GraphicSelectionManager;
}

function makeEnv() {
  const doc = createDocument();
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const page = createGraphicPage('Test');
  doc.graphicPages.push(page);

  const editor = document.createElement('idea-graphic-editor') as GraphicEditor;
  document.body.appendChild(editor);
  editor.init(doc, eventBus, undoRedoManager, { skipDefaultBlocks: true });

  const canvas = editor.querySelector<HTMLElement>('.idea-graphic-canvas')!;
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 600,
    width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
  });

  return { doc, eventBus, undoRedoManager, editor, page, canvas };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Delete / Backspace removes selection', () => {
  it('removes selected element on Delete keydown', () => {
    const { page, canvas, undoRedoManager, editor } = makeEnv();
    const el = makeElement();
    page.elements.push(el);

    getSelectionManager(editor).setSelection([{ type: 'element', id: el.id }]);
    expect(page.elements).toHaveLength(1);

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Delete', key: 'Delete', bubbles: true,
    }));

    expect(page.elements).toHaveLength(0);
    expect(undoRedoManager.canUndo).toBe(true);
  });

  it('removes selected element on Backspace keydown', () => {
    const { page, canvas, editor } = makeEnv();
    const el = makeElement();
    page.elements.push(el);

    getSelectionManager(editor).setSelection([{ type: 'element', id: el.id }]);

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Backspace', key: 'Backspace', bubbles: true,
    }));

    expect(page.elements).toHaveLength(0);
  });

  it('does not remove elements when contenteditable is focused', () => {
    const { page, canvas, editor } = makeEnv();
    const el = makeElement();
    page.elements.push(el);

    getSelectionManager(editor).setSelection([{ type: 'element', id: el.id }]);

    // Use setAttribute so jsdom reflects the HTML attribute for closest()
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    canvas.appendChild(editable);

    editable.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Delete', key: 'Delete', bubbles: true,
    }));

    expect(page.elements).toHaveLength(1);
  });

  it('restores the element on undo after delete', () => {
    const { page, canvas, undoRedoManager, editor } = makeEnv();
    const el = makeElement();
    page.elements.push(el);

    getSelectionManager(editor).setSelection([{ type: 'element', id: el.id }]);

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Delete', key: 'Delete', bubbles: true,
    }));

    expect(page.elements).toHaveLength(0);
    undoRedoManager.undo();
    expect(page.elements).toHaveLength(1);
  });

  it('does not push a command when nothing is selected', () => {
    const { canvas, undoRedoManager } = makeEnv();

    canvas.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'Delete', key: 'Delete', bubbles: true,
    }));

    expect(undoRedoManager.canUndo).toBe(false);
  });
});
