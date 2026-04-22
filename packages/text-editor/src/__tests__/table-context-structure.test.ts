import { createDocument } from '@core/model/factory';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { buildTableData } from '../blocks/table-data-factory';
import { DeleteColumnCommand } from '../engine/commands/delete-column-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { MergeCellsCommand } from '../engine/commands/merge-cells-command';

function tableBlock(data: TableData): BlockNode<TableData> {
  return {
    id: 'tbl',
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('Merged table structure (rowspan + colspan)', () => {
  it('delete first column preserves grid after horizontal and vertical merges', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    doc.children = [tableBlock(data)];

    new MergeCellsCommand(doc, 'tbl', { startRow: 1, startCol: 0, endRow: 1, endCol: 1 }).execute();
    new MergeCellsCommand(doc, 'tbl', { startRow: 0, startCol: 2, endRow: 1, endCol: 2 }).execute();

    expect(data.columnWidths).toHaveLength(3);
    new DeleteColumnCommand(doc, 'tbl', 0).execute();

    expect(data.columnWidths).toHaveLength(2);
    data.rows.forEach(r => expect(r.cells).toHaveLength(2));
    // Former column 2 (rowspan 3–6) is now column index 1.
    expect(data.rows[0]!.cells[1]!.rowspan).toBe(2);
    expect(data.rows[1]!.cells[1]!.absorbed).toBe(true);
  });

  it('insert column after first column with rowspan + colspan merges', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    doc.children = [tableBlock(data)];

    new MergeCellsCommand(doc, 'tbl', { startRow: 1, startCol: 0, endRow: 1, endCol: 1 }).execute();
    new MergeCellsCommand(doc, 'tbl', { startRow: 0, startCol: 2, endRow: 1, endCol: 2 }).execute();

    new InsertColumnCommand(doc, 'tbl', 0, 0).execute();

    expect(data.columnWidths).toHaveLength(4);
    data.rows.forEach(r => expect(r.cells).toHaveLength(4));
    // Rowspan primary shifts right: was col 2, after insert at 1 it is col 3.
    const rowspanPrimary = data.rows[0]!.cells[3]!;
    expect(rowspanPrimary.rowspan).toBe(2);
    expect(rowspanPrimary.colspan).toBe(1);
    expect(data.rows[1]!.cells[3]!.absorbed).toBe(true);
  });
});
