import { generateId } from '@core/id';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument } from '@core/model/factory';
import { buildTableData } from '../blocks/table-data-factory';
import { getResolvedBorderValue } from '../blocks/table-border-sync';
import { InsertRowCommand } from '../engine/commands/insert-row-command';
import { InsertColumnCommand } from '../engine/commands/insert-column-command';
import { DeleteRowCommand } from '../engine/commands/delete-row-command';
import { DeleteColumnCommand } from '../engine/commands/delete-column-command';
import { MergeCellsCommand } from '../engine/commands/merge-cells-command';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

describe('table border reconciliation after structure edits', () => {
  it('insert row above on "all": new top row has no top border; former first row gains top', () => {
    const doc = createDocument();
    const data = buildTableData(2, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new InsertRowCommand(doc, table.id, -1, 0).execute();

    expect(data.rows[0].cells.every(c => c.style.borderTop === false)).toBe(true);
    expect(data.rows[1].cells.every(c => c.style.borderTop === true)).toBe(true);
  });

  it('insert column left on "inside": new col has no left border; former first col gains left', () => {
    const doc = createDocument();
    const data = buildTableData(2, 3, 'inside');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new InsertColumnCommand(doc, table.id, -1, 0).execute();

    expect(data.rows.every(row => row.cells[0].style.borderLeft === false)).toBe(true);
    expect(data.rows.every(row => row.cells[1].style.borderLeft === true)).toBe(true);
  });

  it('insert column left on "all": new col has no left border; former first col gains left', () => {
    const doc = createDocument();
    const data = buildTableData(2, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new InsertColumnCommand(doc, table.id, -1, 0).execute();

    expect(data.rows.every(row => row.cells[0].style.borderLeft === false)).toBe(true);
    expect(data.rows.every(row => row.cells[1].style.borderLeft === true)).toBe(true);
  });

  it('delete last row promotes full bottom border on new last row', () => {
    const doc = createDocument();
    const data = buildTableData(2, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    expect(data.rows[0].cells.some(c => c.style.borderBottom === true)).toBe(false);

    new DeleteRowCommand(doc, table.id, 1).execute();

    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].cells.every(c => c.style.borderBottom === true)).toBe(true);
  });

  it('delete last column promotes full right border on new last column', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    expect(data.rows.some(row => row.cells[0].style.borderRight === true)).toBe(false);

    new DeleteColumnCommand(doc, table.id, 2).execute();

    expect(data.columnWidths).toHaveLength(2);
    expect(data.rows.every(row => row.cells[1].style.borderRight === true)).toBe(true);
  });

  it('merge horizontal strip applies union outline to primary', () => {
    const doc = createDocument();
    const data = buildTableData(2, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 1,
      endRow: 0,
      endCol: 2,
    }).execute();

    const merged = data.rows[0].cells[1];
    expect(merged.colspan).toBe(2);
    expect(merged.style.borderTop).toBe(true);
    expect(merged.style.borderBottom).toBe(false);
    expect(merged.style.borderLeft).toBe(true);
    expect(merged.style.borderRight).toBe(true);
  });

  it('merge 2x2 block applies union outline to primary', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    }).execute();

    const merged = data.rows[0].cells[0];
    expect(merged.rowspan).toBe(2);
    expect(merged.colspan).toBe(2);
    expect(getResolvedBorderValue(data, 0, 0, 'borderTop')).toBe(true);
    expect(getResolvedBorderValue(data, 0, 0, 'borderLeft')).toBe(true);
    expect(getResolvedBorderValue(data, 0, 0, 'borderBottom')).toBe(true);
    expect(getResolvedBorderValue(data, 0, 0, 'borderRight')).toBe(true);
  });
});
