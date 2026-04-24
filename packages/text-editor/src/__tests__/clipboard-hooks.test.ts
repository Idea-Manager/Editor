import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { createDocument, createParagraph } from '@core/model/factory';
import { generateId } from '@core/id';
import type { BlockNode } from '@core/model/interfaces';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { BlockRenderer } from '../renderer/block-renderer';
import { SelectionManager } from '../engine/selection-manager';
import { SelectionSync } from '../engine/selection-sync';
import { ClipboardHandler } from '../engine/clipboard-handler';
import type { EditorContext } from '../engine/editor-context';

function makeFixture(clipboardOptions?: import('../engine/clipboard-options').TextEditorClipboardOptions) {
  const eventBus = new EventBus();
  const doc = createDocument();
  doc.children = [createParagraph('Hello world')];
  const blockId = doc.children[0].id;

  const registry = new BlockRegistry();
  registry.register(new ParagraphBlock());

  const root = document.createElement('div');
  document.body.appendChild(root);

  const selectionManager = new SelectionManager(eventBus);
  const undoRedoManager = new UndoRedoManager(eventBus);
  selectionManager.setCollapsed(blockId, 5);

  const ctx: EditorContext = {
    document: doc,
    selectionManager,
    undoRedoManager,
    eventBus,
    blockRegistry: registry,
    rootElement: root,
    i18n: new I18nService('en'),
  };

  const blockRenderer = new BlockRenderer(registry);
  const selectionSync = new SelectionSync();
  const handler = new ClipboardHandler(ctx, blockRenderer, selectionSync, clipboardOptions);

  return { ctx, root, doc, blockId, handler, undoRedoManager, selectionManager };
}

function makeMockDataTransfer(setup: (d: { setData: (t: string, v: string) => void }) => void): DataTransfer {
  const store: Record<string, string> = {};
  const d = {
    getData: (type: string) => store[type] ?? '',
    setData: (type: string, value: string) => {
      store[type] = value;
    },
  };
  setup(d);
  return d as unknown as DataTransfer;
}

function makePasteEvent(setup: (d: { setData: (t: string, v: string) => void }) => void): ClipboardEvent {
  const dt = makeMockDataTransfer(setup);
  const e = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(e, 'clipboardData', { value: dt, configurable: true });
  return e as ClipboardEvent;
}

describe('ClipboardHandler options (Phase D)', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('uses transformPaste when it returns a non-empty block list', () => {
    const custom: BlockNode = {
      id: generateId('blk'),
      type: 'paragraph',
      data: { align: 'left' as const },
      children: [
        { id: generateId('txt'), type: 'text', data: { text: 'FROM_TRANSFORM', marks: [] } },
      ],
      meta: { createdAt: 1, version: 1 },
    };

    const { root, doc, handler, undoRedoManager } = makeFixture({
      transformPaste: () => [custom],
    });
    const push = jest.spyOn(undoRedoManager, 'push');

    root.dispatchEvent(
      makePasteEvent(d => {
        d.setData('text/plain', 'SHOULD_NOT_USE');
      }),
    );

    expect(push).toHaveBeenCalledTimes(1);
    const text = doc.children.map(b => b.children.map(r => r.data.text).join('')).join('');
    expect(text).toContain('FROM_TRANSFORM');
    expect(text).not.toContain('SHOULD_NOT_USE');

    handler.destroy();
  });

  it('falls back to default pipeline when transformPaste returns null', () => {
    const { root, doc, handler } = makeFixture({
      transformPaste: () => null,
    });

    root.dispatchEvent(
      makePasteEvent(d => {
        d.setData('text/plain', 'plainline');
      }),
    );

    const flat = doc.children.map(b => b.children.map(r => r.data.text).join('')).join('\n');
    expect(flat).toContain('plainline');

    handler.destroy();
  });

  it('uses text/plain when pasteDataSources is plain-only, ignoring html', () => {
    const { root, doc, handler } = makeFixture({
      pasteDataSources: ['text/plain'],
    });

    root.dispatchEvent(
      makePasteEvent(d => {
        d.setData('text/html', '<p>FROM_HTML</p>');
        d.setData('text/plain', 'from_plain_source');
      }),
    );

    const flat = doc.children.map(b => b.children.map(r => r.data.text).join('')).join('\n');
    expect(flat).toContain('from_plain_source');
    expect(flat).not.toContain('FROM_HTML');

    handler.destroy();
  });
});
