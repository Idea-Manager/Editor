import type { DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export class DeleteColumnCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private deletedCells: TableCell[] = [];
  private deletedWidth = 0;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly colIndex: number,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    if (data.columnWidths.length <= 1) return;

    this.deletedWidth = data.columnWidths[this.colIndex];
    data.columnWidths.splice(this.colIndex, 1);

    this.deletedCells = [];
    for (const row of data.rows) {
      this.deletedCells.push(row.cells[this.colIndex]);
      row.cells.splice(this.colIndex, 1);
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
    data.columnWidths.splice(this.colIndex, 0, this.deletedWidth);

    for (let i = 0; i < data.rows.length; i++) {
      data.rows[i].cells.splice(this.colIndex, 0, this.deletedCells[i]);
    }
  }
}
