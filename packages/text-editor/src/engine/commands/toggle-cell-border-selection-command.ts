import type { DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findTableBlock } from '../block-locator';
import {
  applyBorderWithAdjacentSync,
  findCellGridPosition,
  type BorderSide,
} from '../../blocks/table-border-sync';

export type { BorderSide };

type BorderPatch = { cellId: string; side: BorderSide; oldValue: boolean };

/** Toggle one border side on each listed primary cell (per-cell XOR), with adjacent sync; single undo. */
export class ToggleCellBorderSelectionCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private patches: BorderPatch[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellIds: string[],
    private readonly side: BorderSide,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const seen = new Set<string>();
    this.patches = [];

    const recordPatch = (cellId: string, side: BorderSide, oldValue: boolean) => {
      this.patches.push({ cellId, side, oldValue });
    };

    const apply = (target: TableCell, s: BorderSide, v: boolean) => {
      target.style[s] = v;
    };

    for (const cellId of this.cellIds) {
      if (seen.has(cellId)) continue;
      seen.add(cellId);

      const pos = findCellGridPosition(data, cellId);
      if (!pos) continue;

      const cell = data.rows[pos.row].cells[pos.col];
      if (cell.absorbed) continue;

      const oldPrimary = cell.style[this.side];
      const newValue = !oldPrimary;

      recordPatch(cell.id, this.side, oldPrimary);
      cell.style[this.side] = newValue;
      applyBorderWithAdjacentSync(data, pos.row, pos.col, this.side, newValue, recordPatch, apply);
    }

    if (this.patches.length === 0) return;

    if (this.operationRecords.length === 0) {
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: `style.${this.side}`,
          oldValue: null,
          newValue: null,
        },
      });
    }
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (let i = this.patches.length - 1; i >= 0; i--) {
      const { cellId, side, oldValue } = this.patches[i]!;
      for (const row of data.rows) {
        const c = row.cells.find(x => x.id === cellId);
        if (c) {
          c.style[side] = oldValue;
          break;
        }
      }
    }
  }
}
