import type { DocumentNode, TableData, TableRow, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from '../../blocks/table-cell-defaults';
import { tableHasMergedCells } from '../../blocks/table-merge-guards';
import { findTableBlock } from '../block-locator';

export class InsertRowCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private insertedRowId = '';

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly afterRowIndex: number,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    if (tableHasMergedCells(data)) return;
    const colCount = data.columnWidths.length;

    const newRow: TableRow = {
      id: generateId('row'),
      cells: Array.from({ length: colCount }, (): TableCell => ({
        id: generateId('cell'),
        blocks: createDefaultCellBlocks(),
        colspan: 1,
        rowspan: 1,
        absorbed: false,
        style: { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true },
      })),
    };

    this.insertedRowId = newRow.id;
    data.rows.splice(this.afterRowIndex + 1, 0, newRow);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:insert',
      payload: {
        parentId: block.id,
        index: this.afterRowIndex + 1,
        node: newRow,
      },
    });
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const idx = data.rows.findIndex(r => r.id === this.insertedRowId);
    if (idx !== -1) data.rows.splice(idx, 1);
  }
}
