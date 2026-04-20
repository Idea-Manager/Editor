import { createDocument, createParagraph } from '@core/model/factory';
import type { BlockNode, BlockSelection, TableData } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { buildTableData } from '../blocks/table-data-factory';
import {
  flattenBlocksInReadingOrder,
  getSelectionSpansInDocumentOrder,
} from '../engine/block-locator';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('getSelectionSpansInDocumentOrder', () => {
  it('returns one span for a single block', () => {
    const doc = createDocument();
    const p = createParagraph('Hello');
    doc.children = [p];

    const sel: BlockSelection = {
      anchorBlockId: p.id,
      anchorOffset: 1,
      focusBlockId: p.id,
      focusOffset: 4,
      isCollapsed: false,
    };

    const spans = getSelectionSpansInDocumentOrder(doc, sel);
    expect(spans).toEqual([{ block: p, start: 1, end: 4 }]);
  });

  it('spans two top-level blocks in order', () => {
    const doc = createDocument();
    const a = createParagraph('AA');
    const b = createParagraph('BB');
    doc.children = [a, b];

    const sel: BlockSelection = {
      anchorBlockId: a.id,
      anchorOffset: 1,
      focusBlockId: b.id,
      focusOffset: 1,
      isCollapsed: false,
    };

    const spans = getSelectionSpansInDocumentOrder(doc, sel);
    expect(spans).toEqual([
      { block: a, start: 1, end: 2 },
      { block: b, start: 0, end: 1 },
    ]);
  });

  it('spans two table cells (different parent lists)', () => {
    const doc = createDocument();
    const data = buildTableData(1, 2, 'all');
    data.rows[0].cells[0].blocks = [createParagraph('Hello')];
    data.rows[0].cells[1].blocks = [createParagraph('World')];
    const table = tableBlockFromData(data);
    doc.children = [table];

    const left = data.rows[0].cells[0].blocks[0];
    const right = data.rows[0].cells[1].blocks[0];

    const sel: BlockSelection = {
      anchorBlockId: left.id,
      anchorOffset: 1,
      focusBlockId: right.id,
      focusOffset: 3,
      isCollapsed: false,
    };

    const spans = getSelectionSpansInDocumentOrder(doc, sel);
    expect(spans).toEqual([
      { block: left, start: 1, end: 5 },
      { block: right, start: 0, end: 3 },
    ]);
  });

  it('flattenBlocksInReadingOrder skips table wrappers and follows row-major cells', () => {
    const doc = createDocument();
    const data = buildTableData(1, 2, 'all');
    data.rows[0].cells[0].blocks = [createParagraph('A')];
    data.rows[0].cells[1].blocks = [createParagraph('B')];
    const table = tableBlockFromData(data);
    doc.children = [createParagraph('P'), table];

    const flat = flattenBlocksInReadingOrder(doc);
    expect(flat.map(b => b.children.map(r => r.data.text).join(''))).toEqual(['P', 'A', 'B']);
  });
});
