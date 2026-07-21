import { TextEditor } from '../text-editor';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createParagraph } from '@core/model/factory';

if (!customElements.get('idea-text-editor')) {
  customElements.define('idea-text-editor', TextEditor);
}

function makeEnv() {
  const doc = createDocument();
  doc.children = [createParagraph('Hello')];
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  return { doc, eventBus, undoRedoManager };
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('TextEditor.init — lifecycle safety', () => {
  it('does not throw when init() is called before the element is inserted into the DOM', () => {
    const { doc, eventBus, undoRedoManager } = makeEnv();
    const editor = new TextEditor();
    // Deliberately NOT appended to document before init
    expect(() => editor.init(doc, eventBus, undoRedoManager)).not.toThrow();
  });

  it('creates this.container defensively inside init() when connectedCallback has not run', () => {
    const { doc, eventBus, undoRedoManager } = makeEnv();
    const editor = new TextEditor();
    editor.init(doc, eventBus, undoRedoManager);
    // Container must exist and have the right class
    const container = editor.querySelector('.idea-text-editor');
    expect(container).not.toBeNull();
  });

  it('is fully functional after a deferred connection (replaceDocument and getContext)', () => {
    const { doc, eventBus, undoRedoManager } = makeEnv();
    const editor = new TextEditor();
    editor.init(doc, eventBus, undoRedoManager);
    document.body.appendChild(editor);

    const newDoc = createDocument();
    newDoc.children = [createParagraph('Updated')];
    expect(() => editor.replaceDocument(newDoc)).not.toThrow();
    expect(editor.getContext().document).toBe(newDoc);
  });
});

describe('TextEditor.connectedCallback — idempotency', () => {
  it('calling connectedCallback twice does not create a duplicate .idea-text-editor container', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    // First call fires from appendChild; explicitly call again.
    editor.connectedCallback();
    const containers = editor.querySelectorAll('.idea-text-editor');
    expect(containers).toHaveLength(1);
  });

  it('idea-editor class is not duplicated by a second connectedCallback', () => {
    const editor = new TextEditor();
    document.body.appendChild(editor);
    editor.connectedCallback();
    // className.split returns at most one 'idea-editor' token when deduplicated by classList
    const count = Array.from(editor.classList).filter(c => c === 'idea-editor').length;
    expect(count).toBe(1);
  });
});

describe('TextEditor.onHostResize', () => {
  it('is a no-op and does not throw', () => {
    const { doc, eventBus, undoRedoManager } = makeEnv();
    const editor = new TextEditor();
    document.body.appendChild(editor);
    editor.init(doc, eventBus, undoRedoManager);
    expect(() => editor.onHostResize()).not.toThrow();
  });
});
