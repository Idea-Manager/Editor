import type { DocumentNode, TableData, CellBorderStyle } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export type BorderSide = 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';

export class ToggleCellBorderCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldValue = true;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellId: string,
    private readonly side: BorderSide,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    for (const row of data.rows) {
      const cell = row.cells.find(c => c.id === this.cellId);
      if (cell) {
        this.oldValue = cell.style[this.side];
        cell.style[this.side] = !this.oldValue;

        this.operationRecords.push({
          id: generateId('op'),
          actorId: 'local',
          timestamp: Date.now(),
          wallClock: Date.now(),
          type: 'node:update',
          payload: {
            nodeId: this.cellId,
            path: `style.${this.side}`,
            oldValue: this.oldValue,
            newValue: cell.style[this.side],
          },
        });
        return;
      }
    }
  }

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    for (const row of data.rows) {
      const cell = row.cells.find(c => c.id === this.cellId);
      if (cell) {
        cell.style[this.side] = this.oldValue;
        return;
      }
    }
  }
}
