import type { DocumentNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { deleteRowAtInTable } from '../../blocks/table-row-mutations';
import { reconcileBordersAfterDeleteRow } from '../../blocks/table-border-sync';
import { cloneTableData } from '../document-snapshot';
import { findTableBlock } from '../block-locator';

export class DeleteRowCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private beforeData: TableData | null = null;
  private deletedRowId = '';
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

    this.deletedIndex = this.rowIndex;
    this.deletedRowId = data.rows[this.rowIndex]!.id;
    this.beforeData = cloneTableData(data);

    if (!deleteRowAtInTable(data, this.rowIndex)) {
      this.beforeData = null;
      this.deletedRowId = '';
      return;
    }

    reconcileBordersAfterDeleteRow(data);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:delete',
      payload: {
        parentId: block.id,
        index: this.rowIndex,
        nodeId: this.deletedRowId,
        node: this.beforeData.rows[this.rowIndex]!,
      },
    });
  }

  undo(): void {
    if (!this.beforeData) return;
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const restored = cloneTableData(this.beforeData);
    data.rows = restored.rows;
    data.columnWidths = restored.columnWidths;
    this.beforeData = null;
    this.deletedRowId = '';
  }
}
