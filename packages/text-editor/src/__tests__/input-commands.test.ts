import { createDocument, createParagraph, createHeading, createTextRun } from '@core/model/factory';
import { InsertTextCommand } from '../engine/commands/insert-text-command';
import { DeleteCharCommand } from '../engine/commands/delete-char-command';
import { SplitBlockCommand } from '../engine/commands/split-block-command';
import { MergeBlocksCommand } from '../engine/commands/merge-blocks-command';

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
