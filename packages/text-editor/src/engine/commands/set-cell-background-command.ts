import type { DocumentNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findTableBlock } from '../block-locator';

export class SetCellBackgroundCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldBackground: string | undefined;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellId: string,
    private readonly background: string | undefined,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (const row of data.rows) {
      const cell = row.cells.find(c => c.id === this.cellId);
      if (cell) {
        this.oldBackground = cell.style.background;
        cell.style.background = this.background;

        this.operationRecords.push({
          id: generateId('op'),
          actorId: 'local',
          timestamp: Date.now(),
          wallClock: Date.now(),
          type: 'node:update',
          payload: {
            nodeId: this.cellId,
            path: 'style.background',
            oldValue: this.oldBackground,
            newValue: this.background,
          },
        });
        return;
      }
    }
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (const row of data.rows) {
      const cell = row.cells.find(c => c.id === this.cellId);
      if (cell) {
        cell.style.background = this.oldBackground;
        return;
      }
    }
  }
}
