import type { DocumentNode, TableData, TableRow } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { tableHasMergedCells } from '../../blocks/table-merge-guards';
import { findTableBlock } from '../block-locator';

export class DeleteRowCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private deletedRow: TableRow | null = null;
  private deletedIndex = -1;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly rowIndex: number,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    if (data.rows.length <= 1) return;
    if (tableHasMergedCells(data)) return;

    this.deletedIndex = this.rowIndex;
    this.deletedRow = data.rows[this.rowIndex];
    data.rows.splice(this.rowIndex, 1);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:delete',
      payload: {
        parentId: block.id,
        index: this.rowIndex,
        nodeId: this.deletedRow.id,
        node: this.deletedRow,
      },
    });
  }

  undo(): void {
    if (!this.deletedRow) return;
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    data.rows.splice(this.deletedIndex, 0, this.deletedRow);
  }
}
