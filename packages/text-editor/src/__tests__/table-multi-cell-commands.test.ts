import { EventBus } from '@core/events/event-bus';
import { UndoRedoManager } from '@core/history/undo-redo-manager';
import type { BlockNode, TableData } from '@core/model/interfaces';
import { createDocument } from '@core/model/factory';
import { buildTableData } from '../blocks/table-data-factory';
import { primaryCellIdsInRange, primaryRowsInRange, primaryColsInRange } from '../blocks/table-range-utils';
import { DeleteRowsCommand } from '../engine/commands/delete-rows-command';
import { DeleteColumnsCommand } from '../engine/commands/delete-columns-command';
import { SetCellsBackgroundCommand } from '../engine/commands/set-cells-background-command';
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

describe('Table multi-cell commands', () => {
  const eventBus = new EventBus();

  it('DeleteRowsCommand removes multiple rows in one undo step', () => {
    const doc = createDocument();
    const data = buildTableData(4, 2, 'all');
    doc.children = [tableBlock(data)];

    const cmd = new DeleteRowsCommand(doc, 'tbl', [0, 2]);
    const ur = new UndoRedoManager(eventBus);
    ur.push(cmd);

    expect(data.rows).toHaveLength(2);
    ur.undo();
    expect(data.rows).toHaveLength(4);
    ur.redo();
    expect(data.rows).toHaveLength(2);
  });

  it('DeleteColumnsCommand removes multiple columns in one undo step', () => {
    const doc = createDocument();
    const data = buildTableData(2, 4, 'all');
    doc.children = [tableBlock(data)];

    const cmd = new DeleteColumnsCommand(doc, 'tbl', [1, 3]);
    const ur = new UndoRedoManager(eventBus);
    ur.push(cmd);

    expect(data.columnWidths).toHaveLength(2);
    expect(data.rows[0].cells).toHaveLength(2);
    ur.undo();
    expect(data.columnWidths).toHaveLength(4);
    ur.redo();
    expect(data.columnWidths).toHaveLength(2);
  });

  it('SetCellsBackgroundCommand updates all listed primaries', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    doc.children = [tableBlock(data)];
    const ids = [data.rows[0].cells[0].id, data.rows[1].cells[1].id];

    const cmd = new SetCellsBackgroundCommand(doc, 'tbl', ids, '#e5e5e5');
    cmd.execute();

    expect(data.rows[0].cells[0].style.background).toBe('#e5e5e5');
    expect(data.rows[1].cells[1].style.background).toBe('#e5e5e5');
    expect(data.rows[0].cells[1].style.background).toBeUndefined();

    cmd.undo();
    expect(data.rows[0].cells[0].style.background).toBeUndefined();
  });

  it('primaryRowsInRange and primaryCellIdsInRange skip absorbed slots in box', () => {
    const doc = createDocument();
    const data = buildTableData(2, 2, 'all');
    doc.children = [tableBlock(data)];

    new MergeCellsCommand(doc, 'tbl', {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1,
    }).execute();

    const range = { startRow: 0, startCol: 0, endRow: 1, endCol: 1 };
    expect(primaryRowsInRange(data, range)).toEqual([0]);
    expect(primaryColsInRange(data, range)).toEqual([0]);
    expect(primaryCellIdsInRange(data, range)).toHaveLength(1);
  });
});
