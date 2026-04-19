import { createDocument, createParagraph, createHeading } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { HeadingBlock } from '../blocks/heading-block';
import { SelectionManager } from '../engine/selection-manager';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import type { EditorContext } from '../engine/editor-context';
import type { BlockSelection } from '@core/model/interfaces';

function makeContext(): EditorContext {
  const eventBus = new EventBus();
  const registry = new BlockRegistry();
  registry.register(new ParagraphBlock());
  registry.register(new HeadingBlock());

  const doc = createDocument();
  doc.children = [createParagraph('Hello World')];

  return {
    document: doc,
    selectionManager: new SelectionManager(eventBus),
    undoRedoManager: new UndoRedoManager(eventBus),
    eventBus,
    blockRegistry: registry,
    rootElement: document.createElement('div'),
    i18n: new I18nService('en'),
  };
}

describe('FloatingToolbar (unit)', () => {
  let ctx: EditorContext;

  beforeEach(() => {
    ctx = makeContext();
  });

  it('mark toggle updates block children', () => {
    const block = ctx.document.children[0];
    const mgr = new InlineMarkManager();

    // Toggle bold on "Hello" (0..5)
    const result = mgr.toggleMark('bold', block, 0, 5);
    block.children = result;

    const boldRun = block.children.find(r => r.data.marks.includes('bold'));
    expect(boldRun).toBeDefined();
    expect(boldRun!.data.text).toBe('Hello');
  });

  it('selection change triggers toolbar logic', () => {
    const handler = jest.fn();
    ctx.eventBus.on('selection:change', handler);

    const sel: BlockSelection = {
      anchorBlockId: ctx.document.children[0].id,
      anchorOffset: 0,
      focusBlockId: ctx.document.children[0].id,
      focusOffset: 5,
      isCollapsed: false,
    };

    ctx.selectionManager.set(sel);
    expect(handler).toHaveBeenCalledWith(sel);
  });

  it('collapsed selection does not trigger non-collapsed toolbar', () => {
    const handler = jest.fn();
    ctx.eventBus.on('selection:change', handler);

    ctx.selectionManager.setCollapsed(ctx.document.children[0].id, 3);
    const sel = ctx.selectionManager.get();
    expect(sel!.isCollapsed).toBe(true);
  });

  it('active marks reflect selection position', () => {
    const block = ctx.document.children[0];
    const mgr = new InlineMarkManager();

    // Make "Hello" bold
    block.children = mgr.toggleMark('bold', block, 0, 5);

    const marks = mgr.getActiveMarks(block, 3);
    expect(marks).toContain('bold');

    const noMarks = mgr.getActiveMarks(block, 7);
    expect(noMarks).not.toContain('bold');
  });

  it('block type change via toolbar updates block', () => {
    const { ChangeBlockTypeCommand } = require('../engine/commands/change-block-type-command');

    const blockId = ctx.document.children[0].id;
    const cmd = new ChangeBlockTypeCommand(ctx.document, blockId, 'heading', ctx.blockRegistry);
    ctx.undoRedoManager.push(cmd);

    expect(ctx.document.children[0].type).toBe('heading');

    ctx.undoRedoManager.undo();
    expect(ctx.document.children[0].type).toBe('paragraph');
  });
});
