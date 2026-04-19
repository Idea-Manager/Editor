import { createDocument, createParagraph } from '@core/model/factory';
import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import { I18nService } from '@core/i18n/i18n';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { HeadingBlock } from '../blocks/heading-block';
import { ChangeBlockTypeCommand } from '../engine/commands/change-block-type-command';
import type { EditorContext } from '../engine/editor-context';

describe('ChangeBlockTypeCommand', () => {
  let registry: BlockRegistry;

  beforeEach(() => {
    registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new HeadingBlock());
  });

  it('changes block type from paragraph to heading', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;

    const cmd = new ChangeBlockTypeCommand(doc, blockId, 'heading', registry);
    cmd.execute();

    expect(doc.children[0].type).toBe('heading');
    expect(doc.children[0].data).toEqual({ level: 1, align: 'left' });
    expect(cmd.operationRecords).toHaveLength(2);
  });

  it('preserves block children', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;
    const originalText = doc.children[0].children[0].data.text;

    const cmd = new ChangeBlockTypeCommand(doc, blockId, 'heading', registry);
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe(originalText);
  });

  it('undo restores original type and data', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;

    const cmd = new ChangeBlockTypeCommand(doc, blockId, 'heading', registry);
    cmd.execute();
    expect(doc.children[0].type).toBe('heading');

    cmd.undo();
    expect(doc.children[0].type).toBe('paragraph');
    expect(doc.children[0].data).toEqual({ align: 'left' });
  });
});

describe('SlashPalette (integration)', () => {
  let ctx: EditorContext;

  beforeEach(() => {
    const eventBus = new EventBus();
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new HeadingBlock());

    const doc = createDocument();
    doc.children = [createParagraph('')];

    ctx = {
      document: doc,
      selectionManager: {
        get: () => null,
        set: jest.fn(),
        clear: jest.fn(),
        setCollapsed: jest.fn(),
        extend: jest.fn(),
        isCollapsed: true,
      } as any,
      undoRedoManager: new UndoRedoManager(eventBus),
      eventBus,
      blockRegistry: registry,
      rootElement: document.createElement('div'),
      i18n: new I18nService('en'),
    };
  });

  it('block registry returns all types for palette', () => {
    const items = ctx.blockRegistry.getAll();
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.map(d => d.type)).toContain('paragraph');
    expect(items.map(d => d.type)).toContain('heading');
  });

  it('fuzzy filter matches partial label', () => {
    const items = ctx.blockRegistry.getAll();
    const query = 'hea';
    const filtered = items.filter(def =>
      ctx.i18n.t(def.labelKey).toLowerCase().includes(query) ||
      def.type.toLowerCase().includes(query),
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('heading');
  });

  it('fuzzy filter returns empty for no match', () => {
    const items = ctx.blockRegistry.getAll();
    const query = 'xyz';
    const filtered = items.filter(def =>
      ctx.i18n.t(def.labelKey).toLowerCase().includes(query) ||
      def.type.toLowerCase().includes(query),
    );

    expect(filtered).toHaveLength(0);
  });
});
