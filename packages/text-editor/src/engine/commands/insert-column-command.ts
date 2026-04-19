import type { DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from '../../blocks/table-cell-defaults';

const DEFAULT_COL_WIDTH = 120;

export class InsertColumnCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly afterColIndex: number,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    const insertAt = this.afterColIndex + 1;

    data.columnWidths.splice(insertAt, 0, DEFAULT_COL_WIDTH);

    for (const row of data.rows) {
      const newCell: TableCell = {
        id: generateId('cell'),
        blocks: createDefaultCellBlocks(),
        colspan: 1,
        rowspan: 1,
        absorbed: false,
        style: { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true },
      };
      row.cells.splice(insertAt, 0, newCell);
    }

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'data.columnWidths',
        oldValue: null,
        newValue: data.columnWidths,
      },
    });
  }

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    const removeAt = this.afterColIndex + 1;

    data.columnWidths.splice(removeAt, 1);
    for (const row of data.rows) {
      row.cells.splice(removeAt, 1);
    }
  }
}
