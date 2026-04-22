import type { DocumentNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { deleteRowAtInTable } from '../../blocks/table-row-mutations';
import { cloneTableData } from '../document-snapshot';
import { findTableBlock } from '../block-locator';

export class DeleteRowsCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private beforeData: TableData | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly rowIndices: number[],
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const unique = [...new Set(this.rowIndices)].filter(i => i >= 0 && i < data.rows.length).sort((a, b) => a - b);
    if (unique.length === 0) return;
    if (data.rows.length - unique.length < 1) return;

    this.beforeData = cloneTableData(data);
    const toRemoveDesc = [...unique].sort((a, b) => b - a);
    for (const idx of toRemoveDesc) {
      if (!deleteRowAtInTable(data, idx)) {
        const restored = cloneTableData(this.beforeData);
        data.rows = restored.rows;
        data.columnWidths = restored.columnWidths;
        this.beforeData = null;
        return;
      }
    }

    if (this.operationRecords.length === 0) {
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'data.rows',
          oldValue: null,
          newValue: null,
        },
      });
    }
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
  }
}
