import type { DocumentNode, TableData, TableRow } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { insertRowAfterInTable } from '../../blocks/table-row-mutations';
import { cloneTableData } from '../document-snapshot';
import { findTableBlock } from '../block-locator';

export class InsertRowCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private insertedRowId = '';
  private beforeData: TableData | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly afterRowIndex: number,
    /** Row whose per-cell border styles are copied (context-menu anchor row). */
    private readonly referenceRowIndex: number,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    if (data.rows.length === 0) return;

    if (this.insertedRowId && data.rows.some(r => r.id === this.insertedRowId)) {
      return;
    }

    this.beforeData = cloneTableData(data);
    if (!insertRowAfterInTable(data, this.afterRowIndex, this.referenceRowIndex)) {
      this.beforeData = null;
      return;
    }

    const ins = this.afterRowIndex + 1;
    const newRow = data.rows[ins] as TableRow;
    this.insertedRowId = newRow.id;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:insert',
      payload: {
        parentId: block.id,
        index: ins,
        node: newRow,
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
    this.insertedRowId = '';
  }
}
