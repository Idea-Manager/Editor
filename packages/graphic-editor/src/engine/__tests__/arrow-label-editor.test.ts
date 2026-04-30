import { ArrowLabelEditor } from '../arrow-label-editor';
import { AddArrowCommand } from '../commands/add-arrow-command';
import { GraphicBlockRegistry } from '../../blocks/block-registry';
import { registerDefaultBlocks } from '../../blocks/index';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { EventBus } from '@core/events/event-bus';
import type { DocumentNode } from '@core/model/interfaces';
import type { GraphicContext } from '../graphic-context';
import { ViewportController } from '../viewport-controller';
import type { ArrowData } from '../../blocks/arrow/arrow-block';

function makeDoc(): DocumentNode {
  return {
    id: 'doc-1',
    type: 'document',
    schemaVersion: 1,
    data: {},
    children: [],
    assets: {},
    graphicPages: [
      {
        id: 'page-1',
        name: 'Page',
        elements: [],
        frames: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
  };
}

function makeCanvas(): HTMLDivElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600,
    x: 0, y: 0, toJSON: () => ({}),
  });
  return el;
}

function makeCtx(doc: DocumentNode, eventBus: EventBus): GraphicContext {
  const registry = new GraphicBlockRegistry();
  registerDefaultBlocks(registry);
  const vp = { x: 0, y: 0, zoom: 1 };
  return {
    document: doc,
    page: doc.graphicPages[0],
    undoRedoManager: new UndoRedoManager(eventBus),
    eventBus,
    rootElement: document.createElement('div'),
    i18n: { t: (k: string) => k } as never,
    viewportController: new ViewportController(() => vp, (n) => Object.assign(vp, n)),
    registry,
  };
}

function insertArrow(doc: DocumentNode, ctx: GraphicContext): string {
  const cmd = new AddArrowCommand({
    doc,
    pageId: 'page-1',
    registry: ctx.registry,
    from: { point: { x: 0, y: 0 } },
    to: { point: { x: 100, y: 0 } },
  });
  cmd.execute();
  return doc.graphicPages[0].elements[0].id;
}

afterEach(() => {
  document.body.innerHTML = '';
  jest.restoreAllMocks();
});

describe('ArrowLabelEditor', () => {
  describe('open', () => {
    it('appends an input element to the canvas', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);

      expect(canvas.querySelector('input')).toBeTruthy();
      expect(editor.isOpen()).toBe(true);
    });

    it('shows the existing label value in the input', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      // Set a label on the element
      ((doc.graphicPages[0].elements[0].data as unknown as ArrowData)).label = 'existing';

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);

      expect((canvas.querySelector('input') as HTMLInputElement).value).toBe('existing');
    });

    it('no-ops when opened for a non-arrow element', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open('non-existent-id');

      expect(canvas.querySelector('input')).toBeNull();
    });
  });

  describe('commit on Enter', () => {
    it('pushes an UpdateElementCommand for data.label on Enter', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);

      const input = canvas.querySelector('input') as HTMLInputElement;
      input.value = 'My Label';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const el = doc.graphicPages[0].elements[0];
      expect((el.data as unknown as ArrowData).label).toBe('My Label');
      expect(editor.isOpen()).toBe(false);
    });

    it('sets label to undefined when committed with empty string', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);

      const input = canvas.querySelector('input') as HTMLInputElement;
      input.value = '   '; // whitespace only
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      const el = doc.graphicPages[0].elements[0];
      expect((el.data as unknown as ArrowData).label).toBeUndefined();
    });
  });

  describe('close', () => {
    it('removes the input on Escape without committing', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);

      const input = canvas.querySelector('input') as HTMLInputElement;
      input.value = 'should not commit';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(canvas.querySelector('input')).toBeNull();
      expect(editor.isOpen()).toBe(false);
      // Label should remain unchanged
      expect(((doc.graphicPages[0].elements[0].data as unknown as ArrowData)).label).toBeUndefined();
    });
  });

  describe('destroy', () => {
    it('cleans up the editor', () => {
      const doc = makeDoc();
      const eventBus = new EventBus();
      const ctx = makeCtx(doc, eventBus);
      const canvas = makeCanvas();
      const elementId = insertArrow(doc, ctx);

      const editor = new ArrowLabelEditor(ctx, canvas);
      editor.open(elementId);
      editor.destroy();

      expect(editor.isOpen()).toBe(false);
    });
  });
});
