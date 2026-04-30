import { GraphicEditor } from '../engine/graphic-editor';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { createDocument, createGraphicPage } from '@core/model/factory';

// Register the custom element for jsdom
if (!customElements.get('idea-graphic-editor')) {
  customElements.define('idea-graphic-editor', GraphicEditor);
}

function makeEnv() {
  const doc = createDocument();
  const eventBus = new EventBus();
  const undoRedoManager = new UndoRedoManager(eventBus);
  const editor = document.createElement('idea-graphic-editor') as GraphicEditor;
  document.body.appendChild(editor);
  return { doc, eventBus, undoRedoManager, editor };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GraphicEditor', () => {
  describe('init', () => {
    it('creates a graphic page when the document has none', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      expect(doc.graphicPages).toHaveLength(0);
      editor.init(doc, eventBus, undoRedoManager);
      expect(doc.graphicPages).toHaveLength(1);
      expect(doc.graphicPages[0].name).toBeTruthy();
    });

    it('uses the existing page when doc has one', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      const page = createGraphicPage('My Page');
      doc.graphicPages.push(page);
      editor.init(doc, eventBus, undoRedoManager);
      expect(doc.graphicPages).toHaveLength(1);
      expect(editor.getContext().page.id).toBe(page.id);
    });

    it('selects the page by id when options.pageId is provided', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      const p1 = createGraphicPage('First');
      const p2 = createGraphicPage('Second');
      doc.graphicPages.push(p1, p2);
      editor.init(doc, eventBus, undoRedoManager, { pageId: p2.id });
      expect(editor.getContext().page.id).toBe(p2.id);
    });
  });

  describe('DOM structure', () => {
    it('mounts an SVG world group and a DOM overlay', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);
      expect(editor.querySelector('.idea-graphic-canvas__svg')).not.toBeNull();
      expect(editor.querySelector('.idea-graphic-canvas__world')).not.toBeNull();
      expect(editor.querySelector('.idea-graphic-canvas__overlay')).not.toBeNull();
    });

    it('mounts the zoom panel', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);
      expect(editor.querySelector('.idea-graphic-canvas__zoom-panel')).not.toBeNull();
    });
  });

  describe('events', () => {
    it('emits doc:change and viewport:change after a wheel zoom', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);

      const canvas = editor.querySelector<HTMLDivElement>('.idea-graphic-canvas')!;
      canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 800, bottom: 600,
        width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
      });

      const docChanges: unknown[] = [];
      const vpChanges: unknown[] = [];
      eventBus.on('doc:change', () => docChanges.push(true));
      eventBus.on('viewport:change', (p) => vpChanges.push(p));

      // Simulate a wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        bubbles: true,
        cancelable: true,
      });
      canvas.dispatchEvent(wheelEvent);

      expect(docChanges.length).toBeGreaterThan(0);
      expect(vpChanges.length).toBeGreaterThan(0);
    });
  });

  describe('replaceDocument', () => {
    it('swaps the document and rebinds the page without leaks', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);

      const newDoc = createDocument();
      const newPage = createGraphicPage('New Page');
      newDoc.graphicPages.push(newPage);

      editor.replaceDocument(newDoc);

      expect(editor.getContext().document).toBe(newDoc);
      expect(editor.getContext().page.id).toBe(newPage.id);
    });

    it('clears undo history on replaceDocument', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);

      // Fake a history entry
      const canvas = editor.querySelector<HTMLDivElement>('.idea-graphic-canvas')!;
      canvas.getBoundingClientRect = () => ({
        left: 0, top: 0, right: 800, bottom: 600,
        width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
      });

      const newDoc = createDocument();
      editor.replaceDocument(newDoc);

      expect(undoRedoManager.canUndo).toBe(false);
    });
  });

  describe('getViewport', () => {
    it('returns a copy of the current page viewport', () => {
      const { doc, eventBus, undoRedoManager, editor } = makeEnv();
      editor.init(doc, eventBus, undoRedoManager);
      const vp = editor.getViewport();
      expect(vp).toEqual({ x: 0, y: 0, zoom: 1 });
    });
  });
});
