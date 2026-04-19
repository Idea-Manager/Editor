import { generateId } from '@core/id';
import type { BlockNode, DocumentNode, TableData } from '@core/model/interfaces';
import { createDocument, createParagraph, createHeading, createTextRun } from '@core/model/factory';
import { InsertTextCommand } from '../engine/commands/insert-text-command';
import { DeleteCharCommand } from '../engine/commands/delete-char-command';
import { SplitBlockCommand } from '../engine/commands/split-block-command';
import { MergeBlocksCommand } from '../engine/commands/merge-blocks-command';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';

describe('InsertTextCommand', () => {
  it('inserts a single character', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new InsertTextCommand(doc, doc.children[0].id, 5, '!');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hello!');
    expect(cmd.operationRecords).toHaveLength(1);
    expect(cmd.operationRecords[0].type).toBe('text:insert');
  });

  it('inserts at the beginning', () => {
    const doc = createDocument();
    doc.children = [createParagraph('World')];

    const cmd = new InsertTextCommand(doc, doc.children[0].id, 0, 'Hello ');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hello World');
  });

  it('inserts in the middle', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Helo')];

    const cmd = new InsertTextCommand(doc, doc.children[0].id, 2, 'l');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hello');
  });

  it('inserts into an empty block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    doc.children[0].children = [];

    const cmd = new InsertTextCommand(doc, doc.children[0].id, 0, 'A');
    cmd.execute();

    expect(doc.children[0].children).toHaveLength(1);
    expect(doc.children[0].children[0].data.text).toBe('A');
  });

  it('undo removes the inserted text', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new InsertTextCommand(doc, doc.children[0].id, 5, '!');
    cmd.execute();
    cmd.undo();

    expect(doc.children[0].children[0].data.text).toBe('Hello');
  });

  it('merge coalesces adjacent inserts', () => {
    const doc = createDocument();
    doc.children = [createParagraph('H')];

    const cmd1 = new InsertTextCommand(doc, doc.children[0].id, 1, 'e');
    cmd1.execute();

    const cmd2 = new InsertTextCommand(doc, doc.children[0].id, 2, 'l');
    const merged = cmd1.merge(cmd2);

    expect(merged).toBe(true);
    expect(doc.children[0].children[0].data.text).toBe('Hel');
  });

  it('merge rejects inserts in different blocks', () => {
    const doc = createDocument();
    doc.children = [createParagraph('A'), createParagraph('B')];

    const cmd1 = new InsertTextCommand(doc, doc.children[0].id, 1, 'x');
    cmd1.execute();

    const cmd2 = new InsertTextCommand(doc, doc.children[1].id, 1, 'y');
    expect(cmd1.merge(cmd2)).toBe(false);
  });

  it('handles multiple text runs at run boundary', () => {
    const doc = createDocument();
    const block = createParagraph('');
    block.children = [
      createTextRun('Hello'),
      createTextRun(' World'),
    ];
    doc.children = [block];

    const cmd = new InsertTextCommand(doc, block.id, 5, '!');
    cmd.execute();

    // Should insert at end of first run
    expect(block.children[0].data.text).toBe('Hello!');
    expect(block.children[1].data.text).toBe(' World');
  });
});

describe('DeleteCharCommand', () => {
  it('deletes backward', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new DeleteCharCommand(doc, doc.children[0].id, 5, 'backward');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hell');
    expect(cmd.operationRecords).toHaveLength(1);
    expect(cmd.operationRecords[0].type).toBe('text:delete');
  });

  it('deletes forward', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new DeleteCharCommand(doc, doc.children[0].id, 0, 'forward');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('ello');
  });

  it('does nothing for backward at offset 0', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new DeleteCharCommand(doc, doc.children[0].id, 0, 'backward');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hello');
    expect(cmd.operationRecords).toHaveLength(0);
  });

  it('does nothing for forward at end', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new DeleteCharCommand(doc, doc.children[0].id, 5, 'forward');
    cmd.execute();

    expect(doc.children[0].children[0].data.text).toBe('Hello');
  });

  it('undo restores deleted character', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];

    const cmd = new DeleteCharCommand(doc, doc.children[0].id, 3, 'backward');
    cmd.execute();
    expect(doc.children[0].children[0].data.text).toBe('Helo');

    cmd.undo();
    expect(doc.children[0].children[0].data.text).toBe('Hello');
  });
});

describe('SplitBlockCommand', () => {
  it('splits paragraph in the middle', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 5);
    cmd.execute();

    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].children[0].data.text).toBe('Hello');
    expect(doc.children[1].children[0].data.text).toBe(' World');
    expect(doc.children[1].type).toBe('paragraph');
    expect(cmd.operationRecords).toHaveLength(2);
  });

  it('splits at the beginning creates empty first block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 0);
    cmd.execute();

    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].children[0].data.text).toBe('');
    expect(doc.children[1].children[0].data.text).toBe('Hello');
  });

  it('splits at end creates empty second block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 5);
    cmd.execute();

    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].children[0].data.text).toBe('Hello');
    expect(doc.children[1].children[0].data.text).toBe('');
  });

  it('heading at end splits into paragraph', () => {
    const doc = createDocument();
    doc.children = [createHeading(1, 'Title')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 5);
    cmd.execute();

    expect(doc.children[0].type).toBe('heading');
    expect(doc.children[1].type).toBe('paragraph');
  });

  it('heading in middle splits to same type', () => {
    const doc = createDocument();
    doc.children = [createHeading(2, 'Title')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 2);
    cmd.execute();

    expect(doc.children[0].type).toBe('heading');
    expect(doc.children[1].type).toBe('heading');
  });

  it('undo restores original block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const cmd = new SplitBlockCommand(doc, blockId, 5);
    cmd.execute();
    expect(doc.children).toHaveLength(2);

    cmd.undo();
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].children[0].data.text).toBe('Hello World');
  });

  it('redo keeps stable ids so a second split command can redo after both undos', () => {
    const doc = createDocument();
    doc.children = [createParagraph('abc')];
    const firstId = doc.children[0].id;

    const split1 = new SplitBlockCommand(doc, firstId, 1);
    split1.execute();
    const secondId = doc.children[1].id;

    const split2 = new SplitBlockCommand(doc, secondId, 1);
    split2.execute();
    expect(doc.children).toHaveLength(3);

    split2.undo();
    split1.undo();

    split1.execute();
    expect(doc.children[1].id).toBe(secondId);

    split2.execute();
    expect(doc.children).toHaveLength(3);
    expect(doc.children[1].children[0].data.text).toBe('b');
    expect(doc.children[2].children[0].data.text).toBe('c');
  });
});

describe('Table cell nested blocks', () => {
  function documentWithSingleCellTable(text: string): {
    doc: DocumentNode;
    cellParagraphId: string;
  } {
    const doc = createDocument();
    const p = createParagraph(text);
    const table: BlockNode<TableData> = {
      id: generateId('blk'),
      type: 'table',
      data: {
        rows: [
          {
            id: generateId('row'),
            cells: [
              {
                id: generateId('cell'),
                blocks: [p],
                colspan: 1,
                rowspan: 1,
                absorbed: false,
                style: {
                  borderTop: true,
                  borderRight: true,
                  borderBottom: true,
                  borderLeft: true,
                },
              },
            ],
          },
        ],
        columnWidths: [120],
      },
      children: [],
      meta: { createdAt: Date.now(), version: 1 },
    };
    doc.children = [table];
    return { doc, cellParagraphId: p.id };
  }

  it('splits a paragraph inside a table cell into two blocks', () => {
    const { doc, cellParagraphId } = documentWithSingleCellTable('Hi');
    const cmd = new SplitBlockCommand(doc, cellParagraphId, 1);
    cmd.execute();

    const table = doc.children[0];
    expect(table.type).toBe('table');
    const cell = (table.data as TableData).rows[0].cells[0];
    expect(cell.blocks).toHaveLength(2);
    expect(cell.blocks[0].children[0].data.text).toBe('H');
    expect(cell.blocks[1].children[0].data.text).toBe('i');
  });

  it('inserts a block after a block inside a table cell', () => {
    const { doc, cellParagraphId } = documentWithSingleCellTable('Hi');
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());

    const cmd = new InsertBlockCommand(doc, cellParagraphId, 'paragraph', registry);
    cmd.execute();

    const table = doc.children[0];
    const cell = (table.data as TableData).rows[0].cells[0];
    expect(cell.blocks).toHaveLength(2);
    expect(cell.blocks[0].children[0].data.text).toBe('Hi');
    expect(cell.blocks[1].type).toBe('paragraph');
  });
});

describe('InsertBlockCommand redo', () => {
  it('reuses the same new block id so chained inserts redo in order', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());

    const ins1 = new InsertBlockCommand(doc, doc.children[0].id, 'paragraph', registry);
    ins1.execute();
    const midId = ins1.getNewBlockId();

    const ins2 = new InsertBlockCommand(doc, midId, 'paragraph', registry);
    ins2.execute();

    ins2.undo();
    ins1.undo();
    expect(doc.children).toHaveLength(1);

    ins1.execute();
    expect(doc.children[1].id).toBe(midId);

    ins2.execute();
    expect(doc.children).toHaveLength(3);
  });
});

describe('MergeBlocksCommand', () => {
  it('merges two paragraphs', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('Hello'),
      createParagraph(' World'),
    ];
    const secondBlockId = doc.children[1].id;

    const cmd = new MergeBlocksCommand(doc, secondBlockId);
    cmd.execute();

    expect(doc.children).toHaveLength(1);
    const text = doc.children[0].children.map(r => r.data.text).join('');
    expect(text).toBe('Hello World');
    expect(cmd.operationRecords).toHaveLength(2);
  });

  it('does nothing for the first block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Only')];

    const cmd = new MergeBlocksCommand(doc, doc.children[0].id);
    cmd.execute();

    expect(doc.children).toHaveLength(1);
    expect(cmd.operationRecords).toHaveLength(0);
  });

  it('undo restores both blocks', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('Hello'),
      createParagraph(' World'),
    ];
    const secondBlockId = doc.children[1].id;

    const cmd = new MergeBlocksCommand(doc, secondBlockId);
    cmd.execute();
    expect(doc.children).toHaveLength(1);

    cmd.undo();
    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].children[0].data.text).toBe('Hello');
    expect(doc.children[1].children[0].data.text).toBe(' World');
  });

  it('provides merge offset for cursor positioning', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('Hello'),
      createParagraph(' World'),
    ];
    const secondBlockId = doc.children[1].id;

    const cmd = new MergeBlocksCommand(doc, secondBlockId);
    cmd.execute();

    expect(cmd.getMergeOffset()).toBe(5);
  });
});
