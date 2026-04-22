import type { DocumentNode, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findTableBlock } from '../block-locator';

export class SetCellsBackgroundCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldByCellId: Record<string, string | undefined> = {};

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellIds: string[],
    private readonly background: string | undefined,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const idSet = new Set(this.cellIds);
    const firstRun = Object.keys(this.oldByCellId).length === 0;

    if (firstRun) {
      for (const row of data.rows) {
        for (const cell of row.cells) {
          if (idSet.has(cell.id)) {
            this.oldByCellId[cell.id] = cell.style.background;
          }
        }
      }
    }

    for (const row of data.rows) {
      for (const cell of row.cells) {
        if (idSet.has(cell.id)) {
          cell.style.background = this.background;
        }
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
          path: 'style.background',
          oldValue: this.oldByCellId,
          newValue: this.background,
        },
      });
    }
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (const row of data.rows) {
      for (const cell of row.cells) {
        if (cell.id in this.oldByCellId) {
          cell.style.background = this.oldByCellId[cell.id];
        }
      }
    }
  }
}
