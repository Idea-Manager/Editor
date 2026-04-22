import { createDocument, createHeading, createParagraph, createTextRun } from '@core/model/factory';
import { DeleteSelectionCommand } from '../engine/commands/delete-selection-command';
import { PasteCommand } from '../engine/commands/paste-command';
import { ClipboardHandler } from '../engine/clipboard-handler';
import {
  parseIdeaEditorClipboardPayload,
  serializeIdeaEditorClipboardPayload,
} from '../engine/clipboard-idea';
import { getBlockById } from '../engine/block-locator';
import { buildTableData } from '../blocks/table-data-factory';
import type { BlockNode, BlockSelection, HeadingData, TableData } from '@core/model/interfaces';
import { generateId } from '@core/id';

describe('DeleteSelectionCommand', () => {
  it('deletes within a single block', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const sel: BlockSelection = {
      anchorBlockId: blockId,
      anchorOffset: 5,
      focusBlockId: blockId,
      focusOffset: 11,
      isCollapsed: false,
    };

    const cmd = new DeleteSelectionCommand(doc, sel);
    cmd.execute();

    const text = doc.children[0].children.map(r => r.data.text).join('');
    expect(text).toBe('Hello');
  });

  it('deletes across blocks', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('Hello'),
      createParagraph('Middle'),
      createParagraph('World'),
    ];

    const sel: BlockSelection = {
      anchorBlockId: doc.children[0].id,
      anchorOffset: 3,
      focusBlockId: doc.children[2].id,
      focusOffset: 2,
      isCollapsed: false,
    };

    const cmd = new DeleteSelectionCommand(doc, sel);
    cmd.execute();

    expect(doc.children).toHaveLength(1);
    const text = doc.children[0].children.map(r => r.data.text).join('');
    expect(text).toBe('Helrld');
  });

  it('undo restores all blocks', () => {
    const doc = createDocument();
    doc.children = [
      createParagraph('Hello'),
      createParagraph('World'),
    ];
    const origLen = doc.children.length;

    const sel: BlockSelection = {
      anchorBlockId: doc.children[0].id,
      anchorOffset: 3,
      focusBlockId: doc.children[1].id,
      focusOffset: 2,
      isCollapsed: false,
    };

    const cmd = new DeleteSelectionCommand(doc, sel);
    cmd.execute();
    expect(doc.children).toHaveLength(1);

    cmd.undo();
    expect(doc.children).toHaveLength(origLen);
    expect(doc.children[0].children[0].data.text).toBe('Hello');
    expect(doc.children[1].children[0].data.text).toBe('World');
  });

  it('handles reversed selection (focus before anchor)', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const sel: BlockSelection = {
      anchorBlockId: blockId,
      anchorOffset: 8,
      focusBlockId: blockId,
      focusOffset: 2,
      isCollapsed: false,
    };

    const cmd = new DeleteSelectionCommand(doc, sel);
    cmd.execute();

    const text = doc.children[0].children.map(r => r.data.text).join('');
    expect(text).toBe('Herld');
  });
});

describe('PasteCommand', () => {
  it('pastes a single block inline', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const pasteBlock: BlockNode = {
      id: generateId('blk'),
      type: 'paragraph',
      data: { align: 'left' },
      children: [{ id: generateId('txt'), type: 'text', data: { text: ' Beautiful', marks: [] } }],
    };

    const cmd = new PasteCommand(doc, blockId, 5, [pasteBlock]);
    cmd.execute();

    const text = doc.children[0].children.map(r => r.data.text).join('');
    expect(text).toBe('Hello Beautiful World');
    expect(doc.children).toHaveLength(1);
  });

  it('pastes multiple blocks', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello World')];
    const blockId = doc.children[0].id;

    const pasteBlocks: BlockNode[] = [
      {
        id: generateId('blk'),
        type: 'paragraph',
        data: { align: 'left' },
        children: [{ id: generateId('txt'), type: 'text', data: { text: ' first', marks: [] } }],
      },
      {
        id: generateId('blk'),
        type: 'paragraph',
        data: { align: 'left' },
        children: [{ id: generateId('txt'), type: 'text', data: { text: 'second ', marks: [] } }],
      },
    ];

    const cmd = new PasteCommand(doc, blockId, 5, pasteBlocks);
    cmd.execute();

    expect(doc.children).toHaveLength(2);
    const text1 = doc.children[0].children.map(r => r.data.text).join('');
    const text2 = doc.children[1].children.map(r => r.data.text).join('');
    expect(text1).toBe('Hello first');
    expect(text2).toBe('second  World');
  });

  it('undo restores original state', () => {
    const doc = createDocument();
    doc.children = [createParagraph('Hello')];
    const blockId = doc.children[0].id;

    const pasteBlock: BlockNode = {
      id: generateId('blk'),
      type: 'paragraph',
      data: { align: 'left' },
      children: [{ id: generateId('txt'), type: 'text', data: { text: ' World', marks: [] } }],
    };

    const cmd = new PasteCommand(doc, blockId, 5, [pasteBlock]);
    cmd.execute();
    cmd.undo();

    expect(doc.children[0].children[0].data.text).toBe('Hello');
  });
});

describe('ClipboardHandler HTML parsing', () => {
  it('parses plain text into paragraph blocks', () => {
    // Use the static method via prototype for testing
    const handler = Object.create(ClipboardHandler.prototype) as ClipboardHandler;

    const blocks = handler.parsePlainText('Line 1\nLine 2\nLine 3');
    expect(blocks).toHaveLength(3);
    expect(blocks[0].children[0].data.text).toBe('Line 1');
    expect(blocks[1].children[0].data.text).toBe('Line 2');
    expect(blocks[2].children[0].data.text).toBe('Line 3');
  });

  it('parses single line plain text', () => {
    const handler = Object.create(ClipboardHandler.prototype) as ClipboardHandler;

    const blocks = handler.parsePlainText('Just one line');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].children[0].data.text).toBe('Just one line');
  });

  it('parses HTML with bold and italic', () => {
    const handler = Object.create(ClipboardHandler.prototype) as ClipboardHandler;

    const blocks = handler.parseHtml('<p><strong>Bold</strong> and <em>italic</em></p>');
    expect(blocks).toHaveLength(1);

    const runs = blocks[0].children;
    expect(runs.find(r => r.data.text === 'Bold')?.data.marks).toContain('bold');
    expect(runs.find(r => r.data.text === 'italic')?.data.marks).toContain('italic');
  });

  it('strips unsupported styles from HTML', () => {
    const handler = Object.create(ClipboardHandler.prototype) as ClipboardHandler;

    const blocks = handler.parseHtml('<p><span style="color:red;font-size:20px">Text</span></p>');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].children[0].data.text).toBe('Text');
    expect(blocks[0].children[0].data.marks).toEqual([]);
  });
});

function tableFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('Idea editor clipboard + typed paste', () => {
  it('round-trips through JSON payload and remaps ids', () => {
    const h = createHeading(2, 'X');
    const json = serializeIdeaEditorClipboardPayload([h]);
    const out = parseIdeaEditorClipboardPayload(json);
    expect(out).toHaveLength(1);
    expect(out![0].id).not.toBe(h.id);
    expect(out![0].type).toBe('heading');
    expect((out![0].data as HeadingData).level).toBe(2);
  });

  it('pastes a heading into a table cell with heading type', () => {
    const doc = createDocument();
    const data = buildTableData(1, 1, 'all');
    const table = tableFromData(data);
    doc.children = [table];
    const cellBlock = data.rows[0].cells[0].blocks[0];
    if (!cellBlock) throw new Error('expected cell block');

    const heading = createHeading(3, 'In cell');
    const blocks = parseIdeaEditorClipboardPayload(
      serializeIdeaEditorClipboardPayload([heading]),
    );
    if (!blocks) throw new Error('expected blocks');

    new PasteCommand(doc, cellBlock.id, 0, blocks).execute();
    const b = getBlockById(doc, cellBlock.id);
    expect(b?.type).toBe('heading');
    expect((b?.data as HeadingData).level).toBe(3);
    expect(b?.children.map(r => r.data.text).join('')).toBe('In cell');
  });

  it('replaces an empty top-level paragraph with a pasted table', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const t = tableFromData(buildTableData(1, 1, 'all'));
    const blocks = parseIdeaEditorClipboardPayload(serializeIdeaEditorClipboardPayload([t]));
    if (!blocks) throw new Error('expected blocks');

    new PasteCommand(doc, doc.children[0].id, 0, blocks).execute();
    expect(doc.children).toHaveLength(1);
    expect(doc.children[0].type).toBe('table');
  });

  it('dropping only table blocks in a cell (simulated filter) leaves nothing to insert', () => {
    const t = tableFromData(buildTableData(1, 1, 'all'));
    const blocks = parseIdeaEditorClipboardPayload(serializeIdeaEditorClipboardPayload([t]))!;
    const filtered = blocks.filter(b => b.type !== 'table');
    expect(filtered).toHaveLength(0);
  });

  it('when filtering tables in a cell, keeps non-table blocks', () => {
    const t = tableFromData(buildTableData(1, 1, 'all'));
    const h = createHeading(1, 'Keep');
    const blocks = parseIdeaEditorClipboardPayload(serializeIdeaEditorClipboardPayload([t, h]))!;
    const filtered = blocks.filter(b => b.type !== 'table');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('heading');
  });

  it('pastes an embed in a document and in a table cell', () => {
    const embed: BlockNode = {
      id: generateId('blk'),
      type: 'embed',
      data: { url: 'https://v.example/1', title: 'V' },
      children: [],
      meta: { createdAt: Date.now(), version: 1 },
    };

    const doc1 = createDocument();
    doc1.children = [createParagraph('')];
    const p1 = parseIdeaEditorClipboardPayload(serializeIdeaEditorClipboardPayload([embed]))!;
    new PasteCommand(doc1, doc1.children[0].id, 0, p1).execute();
    expect(doc1.children[0].type).toBe('embed');
    expect((doc1.children[0].data as { url: string }).url).toBe('https://v.example/1');

    const doc2 = createDocument();
    const data = buildTableData(1, 1, 'all');
    doc2.children = [tableFromData(data)];
    const cellBlock = data.rows[0].cells[0].blocks[0]!;
    const p2 = parseIdeaEditorClipboardPayload(serializeIdeaEditorClipboardPayload([embed]))!;
    new PasteCommand(doc2, cellBlock.id, 0, p2).execute();
    const b = getBlockById(doc2, cellBlock.id);
    expect(b?.type).toBe('embed');
  });
});
