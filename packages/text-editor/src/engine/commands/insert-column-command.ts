import type { DocumentNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { insertColumnAtInColspanTable, deleteColumnAtInColspanTable } from '../../blocks/table-column-mutations';
import { findTableBlock } from '../block-locator';

export class InsertColumnCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private newCellIds: string[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly afterColIndex: number,
    /** Column whose cell border styles are copied per row (context-menu anchor column). */
    private readonly referenceColIndex: number,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    if (data.rows.length === 0) return;

    const insertAt = this.afterColIndex + 1;
    const refCol = Math.max(0, Math.min(this.referenceColIndex, data.columnWidths.length - 1));

    if (
      this.newCellIds.length > 0 &&
      this.newCellIds.length === data.rows.length &&
      data.rows.every((row, i) => row.cells[insertAt]?.id === this.newCellIds[i])
    ) {
      return;
    }

    if (!insertColumnAtInColspanTable(data, insertAt, refCol)) {
      return;
    }

    this.newCellIds = data.rows.map(row => row.cells[insertAt]!.id);

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
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const removeAt = this.afterColIndex + 1;
    deleteColumnAtInColspanTable(data, removeAt);
  }
}
