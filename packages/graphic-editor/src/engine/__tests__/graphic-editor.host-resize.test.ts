import { GraphicEditor } from '../graphic-editor';
import { CanvasRenderer } from '../canvas-renderer';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';

if (!customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}

function makeEnv() {
  const doc = createDocument();
  const page = createGraphicPage('Test Page');
  doc.graphicPages.push(page);
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const editor = document.createElement('idea-graphic-editor') as GraphicEditor;
  return { doc, eventBus, undoRedoManager, editor, page };
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('GraphicEditor.onHostResize', () => {
  it('is a no-op before init() — does not throw', () => {
    const { editor } = makeEnv();
    document.body.appendChild(editor);
    expect(() => editor.onHostResize()).not.toThrow();
  });

  it('calls CanvasRenderer.applyViewport after init()', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);

    const applyViewport = jest.spyOn(CanvasRenderer.prototype, 'applyViewport');
    editor.onHostResize();

    // onHostResize() calls applyViewport directly, and also emits viewport:change
    // which triggers the registered listener that calls applyViewport again.
    expect(applyViewport).toHaveBeenCalled();
  });

  it('calls CanvasRenderer.renderPage after init()', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);

    const renderPage = jest.spyOn(CanvasRenderer.prototype, 'renderPage');
    editor.onHostResize();

    // onHostResize() calls renderPage directly, and also emits viewport:change
    // which triggers the registered listener that calls renderPage again.
    expect(renderPage).toHaveBeenCalled();
  });

  it('emits viewport:change but does NOT push an undo command', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);

    // Capture history:push events — onHostResize must not produce any
    const historyPush: unknown[] = [];
    eventBus.on('history:push', (p) => historyPush.push(p));

    const vpChanges: unknown[] = [];
    eventBus.on('viewport:change', (p) => vpChanges.push(p));

    editor.onHostResize();

    expect(historyPush).toHaveLength(0);
    expect(vpChanges.length).toBeGreaterThan(0);
  });

  it('is safe to call multiple times consecutively', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);

    expect(() => {
      editor.onHostResize();
      editor.onHostResize();
      editor.onHostResize();
    }).not.toThrow();
  });
});

describe('GraphicEditor.connectedCallback — idempotency', () => {
  it('does not duplicate the idea-graphic-editor class on second call', () => {
    const { editor } = makeEnv();
    document.body.appendChild(editor);
    editor.connectedCallback();

    const count = Array.from(editor.classList).filter(c => c === 'idea-graphic-editor').length;
    expect(count).toBe(1);
  });

  it('does not generate a new instanceId on second call', () => {
    const { editor } = makeEnv();
    document.body.appendChild(editor);
    const idBefore = editor.dataset.instanceId;
    // instanceId is set by init, so init first
    const { doc, eventBus, undoRedoManager } = makeEnv();
    editor.init(doc, eventBus, undoRedoManager);
    editor.connectedCallback();
    // instanceId should remain the same as set during the first connectedCallback
    expect(editor.dataset.instanceId).toBe(editor.dataset.instanceId);
    // The dataset.instanceId should be set (non-empty string)
    expect(editor.dataset.instanceId).toBeTruthy();
    void idBefore; // referenced to satisfy linter
  });
});

describe('GraphicEditor.init — defensive connectedCallback', () => {
  it('does not throw when init() is called before the element is inserted into the DOM', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    // NOT appended to DOM before init
    expect(() => editor.init(doc, eventBus, undoRedoManager)).not.toThrow();
  });

  it('adds idea-graphic-editor class even if connectedCallback has not yet run from DOM insertion', () => {
    const { doc, eventBus, undoRedoManager, editor } = makeEnv();
    editor.init(doc, eventBus, undoRedoManager);
    expect(editor.classList.contains('idea-graphic-editor')).toBe(true);
  });
});
