import { generateId } from '@core/id';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument, createParagraph } from '@core/model/factory';
import { BlockRegistry } from '../blocks/block-registry';
import { ParagraphBlock } from '../blocks/paragraph-block';
import { TableBlock } from '../blocks/table-block';
import { buildTableData } from '../blocks/table-data-factory';
import { InsertBlockCommand } from '../engine/commands/insert-block-command';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { DeleteColumnCommand } from '../engine/commands/delete-column-command';
import { MergeCellsCommand } from '../engine/commands/merge-cells-command';
import { ToggleCellBorderCommand } from '../engine/commands/toggle-cell-border-command';
import { findBlockLocation } from '../engine/block-locator';
import { bottomGridRowForCell } from '../blocks/table-row-mutations';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('Table insert and merge guards', () => {
  it('InsertBlockCommand uses empty children for table blocks', () => {
    const doc = createDocument();
    doc.children = [createParagraph('')];
    const registry = new BlockRegistry();
    registry.register(new ParagraphBlock());
    registry.register(new TableBlock());

    const cmd = new InsertBlockCommand(doc, doc.children[0].id, 'table', registry);
    cmd.execute();

    const inserted = doc.children.find(b => b.id === cmd.getNewBlockId());
    expect(inserted?.type).toBe('table');
    expect(inserted?.children).toEqual([]);
  });

  it('InsertRowCommand extends rowspan when inserting inside a vertical merge', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    }).execute();

    const d = table.data as TableData;
    expect(d.rows[0]!.cells[0]!.rowspan).toBe(2);
    new InsertRowCommand(doc, table.id, 0, 0).execute();
    expect(d.rows).toHaveLength(3);
    expect(d.rows[0]!.cells[0]!.rowspan).toBe(3);
    expect(d.rows[1]!.cells[0]!.absorbed).toBe(true);
    expect(d.rows[1]!.cells[1]!.absorbed).toBe(true);
  });

  it('InsertRowCommand adds a row and preserves horizontal merge shape in the new row', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 1,
    }).execute();

    new InsertRowCommand(doc, table.id, 0, 0).execute();

    const d = table.data as TableData;
    expect(d.rows).toHaveLength(3);
    const inserted = d.rows[1];
    expect(inserted.cells[0].colspan).toBe(2);
    expect(inserted.cells[0].absorbed).toBe(false);
    expect(inserted.cells[1].absorbed).toBe(true);
  });

  it('bottomGridRowForCell maps rowspan primaries, continuations, and plain cells to same bottom row', () => {
    const doc = createDocument();
    const data = buildTableData(3, 7, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 0,
      endRow: 2,
      endCol: 2,
    }).execute();
    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 3,
      endRow: 2,
      endCol: 5,
    }).execute();

    const d = table.data as TableData;
    expect(bottomGridRowForCell(d, 1, 0)).toBe(2);
    expect(bottomGridRowForCell(d, 1, 3)).toBe(2);
    expect(bottomGridRowForCell(d, 2, 0)).toBe(2);
    expect(bottomGridRowForCell(d, 2, 6)).toBe(2);
  });

  it('InsertRowCommand after two 2x3 vertical merges adds a full non-absorbed row (menu uses bottom row 2)', () => {
    const doc = createDocument();
    const data = buildTableData(3, 7, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 0,
      endRow: 2,
      endCol: 2,
    }).execute();
    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 3,
      endRow: 2,
      endCol: 5,
    }).execute();

    const d = table.data as TableData;
    new InsertRowCommand(doc, table.id, 2, 2).execute();

    expect(d.rows).toHaveLength(4);
    const inserted = d.rows[3];
    expect(inserted.cells).toHaveLength(7);
    expect(inserted.cells.every(c => !c.absorbed && c.colspan === 1)).toBe(true);
  });

  it('InsertRowCommand after merges from primary row still adds full row when after/bottom row is 2', () => {
    const doc = createDocument();
    const data = buildTableData(3, 7, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 0,
      endRow: 2,
      endCol: 2,
    }).execute();
    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 3,
      endRow: 2,
      endCol: 5,
    }).execute();

    const d = table.data as TableData;
    expect(bottomGridRowForCell(d, 1, 0)).toBe(2);
    new InsertRowCommand(doc, table.id, bottomGridRowForCell(d, 1, 0), bottomGridRowForCell(d, 1, 0)).execute();

    expect(d.rows).toHaveLength(4);
    expect(d.rows[3].cells.every(c => !c.absorbed && c.colspan === 1)).toBe(true);
  });

  it('InsertColumnCommand runs when a colspan merge exists (no rowspan)', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 2,
      startCol: 0,
      endRow: 2,
      endCol: 1,
    }).execute();

    new InsertColumnCommand(doc, table.id, 1, 2).execute();

    const d = table.data as TableData;
    expect(d.columnWidths).toHaveLength(4);
    expect(d.rows[2]!.cells).toHaveLength(4);
    expect(d.rows[0]!.cells).toHaveLength(4);
    const merged = d.rows[2]!.cells[0]!;
    expect(merged.colspan).toBe(2);
    expect(d.rows[2]!.cells[1]!.absorbed).toBe(true);
  });

  it('DeleteColumnCommand removes a column in a colspan-only table', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 2,
      startCol: 0,
      endRow: 2,
      endCol: 1,
    }).execute();

    new DeleteColumnCommand(doc, table.id, 2).execute();
    const d = table.data as TableData;
    expect(d.columnWidths).toHaveLength(2);
    d.rows.forEach(r => {
      expect(r.cells).toHaveLength(2);
    });
    const merged = d.rows[2]!.cells[0]!;
    expect(merged.colspan).toBe(2);
    expect(d.rows[2]!.cells[1]!.absorbed).toBe(true);
  });

  it('findBlockLocation finds blocks inside a nested table', () => {
    const doc = createDocument();
    const inner = buildTableData(1, 1, 'all');
    const innerTable = tableBlockFromData(inner);
    const innerPara = inner.rows[0].cells[0].blocks[0];

    const outerData = buildTableData(1, 1, 'all');
    outerData.rows[0].cells[0].blocks = [innerTable];
    const outerTable = tableBlockFromData(outerData);
    doc.children = [outerTable];

    const loc = findBlockLocation(doc, innerPara.id);
    expect(loc).not.toBeNull();
    expect(loc?.block.id).toBe(innerPara.id);
    expect(loc?.tableBlockId).toBe(innerTable.id);
  });

  it('ToggleCellBorderCommand toggles the shared horizontal edge (bottom of selection → next row top)', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    const topLeft = data.rows[0].cells[0];
    const bottomLeft = data.rows[1].cells[0];
    expect(topLeft.style.borderBottom).toBe(false);
    expect(bottomLeft.style.borderTop).toBe(true);

    new ToggleCellBorderCommand(doc, table.id, topLeft.id, 'borderBottom').execute();
    expect(topLeft.style.borderBottom).toBe(false);
    expect(bottomLeft.style.borderTop).toBe(false);
  });

  it('MergeCellsCommand uses one empty paragraph when all merged cells are placeholders', () => {
    const doc = createDocument();
    const data = buildTableData(1, 4, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 3,
    }).execute();

    const merged = data.rows[0].cells[0];
    expect(merged.blocks).toHaveLength(1);
    expect(merged.blocks[0].type).toBe('paragraph');
    expect(merged.blocks[0].children.some(r => r.data.text.length > 0)).toBe(false);
  });

  it('MergeCellsCommand keeps embed and text, drops interior placeholders, adds trailing empty paragraph', () => {
    const doc = createDocument();
    const data = buildTableData(1, 4, 'all');
    data.rows[0].cells[0].blocks = [{
      id: 'emb',
      type: 'embed',
      data: { url: 'https://example.com', title: 'Example' },
      children: [],
      meta: { createdAt: Date.now(), version: 1 },
    }];
    data.rows[0].cells[3].blocks = [createParagraph('body')];

    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 0,
      endCol: 3,
    }).execute();

    const blocks = data.rows[0].cells[0].blocks;
    expect(blocks).toHaveLength(3);
    expect(blocks[0].type).toBe('embed');
    expect(blocks[1].type).toBe('paragraph');
    expect(blocks[1].children[0]?.data.text).toBe('body');
    expect(blocks[2].type).toBe('paragraph');
    expect(blocks[2].children.every(r => r.data.text.length === 0)).toBe(true);
  });
});
