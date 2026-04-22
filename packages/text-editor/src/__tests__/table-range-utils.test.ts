import { generateId } from '@core/id';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument } from '@core/model/factory';
import { buildTableData } from '../blocks/table-data-factory';
import { MergeCellsCommand } from '../engine/commands/merge-cells-command';
import { absorbedSlotCoveredBySameRowColspan } from '../blocks/table-range-utils';

function tableBlockFromData(data: TableData): BlockNode<TableData> {
  return {
    id: generateId('blk'),
    type: 'table',
    data,
    children: [],
    meta: { createdAt: Date.now(), version: 1 },
  };
}

/** Mirrors TableBlock grid column walk for one row (for assertions). */
function gridStartColumnsForRow(data: TableData, r: number): number[] {
  const starts: number[] = [];
  let col = 0;
  const rowCells = data.rows[r].cells;
  for (let c = 0; c < rowCells.length; c++) {
    const cell = rowCells[c];
    if (cell.absorbed) {
      if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
        col++;
      }
      continue;
    }
    starts.push(col + 1);
    col += cell.colspan;
  }
  return starts;
}

describe('absorbedSlotCoveredBySameRowColspan / grid column walk', () => {
  it('after merging two cells in a row, trailing primary starts at grid column 3 not 4', () => {
    const doc = createDocument();
    const data = buildTableData(3, 3, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 1,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    }).execute();

    const d = table.data as TableData;
    expect(d.rows[1].cells[0].absorbed).toBe(false);
    expect(d.rows[1].cells[0].colspan).toBe(2);
    expect(d.rows[1].cells[1].absorbed).toBe(true);
    expect(d.rows[1].cells[2].absorbed).toBe(false);

    expect(absorbedSlotCoveredBySameRowColspan(d, 1, 1)).toBe(true);
    expect(absorbedSlotCoveredBySameRowColspan(d, 1, 0)).toBe(false);

    const starts = gridStartColumnsForRow(d, 1);
    expect(starts).toEqual([1, 3]);
  });

  it('row under vertical merge: absorbed cells advance col once per rowspan slot', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    const table = tableBlockFromData(data);
    doc.children = [table];

    new MergeCellsCommand(doc, table.id, {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 0,
    }).execute();

    const d = table.data as TableData;
    expect(absorbedSlotCoveredBySameRowColspan(d, 1, 0)).toBe(false);
    const starts = gridStartColumnsForRow(d, 1);
    expect(starts).toEqual([2]);
  });
});
