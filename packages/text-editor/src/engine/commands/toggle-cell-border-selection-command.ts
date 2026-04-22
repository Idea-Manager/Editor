import type { DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findTableBlock } from '../block-locator';
import {
  findCellGridPosition,
  getResolvedBorderValue,
  resolveBorderToggleTargets,
  type BorderSide,
} from '../../blocks/table-border-sync';

export type { BorderSide };

type BorderPatch = { cellId: string; side: BorderSide; oldValue: boolean };

/**
 * Deduplicate resolved (row,col,side) so a shared physical edge is toggled once.
 */
function targetKey(t: { row: number; col: number; side: BorderSide }): string {
  return `${t.row},${t.col},${t.side}`;
}

/**
 * For each unique primary cell, flip that cell’s border side; union over resolved targets, one write per (cell,side).
 */
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
    this.patches = [];

    const recordPatch = (cellId: string, s: BorderSide, oldValue: boolean) => {
      this.patches.push({ cellId, side: s, oldValue });
    };
    const seenTarget = new Set<string>();
    const seenInput = new Set<string>();

    for (const cellId of this.cellIds) {
      if (seenInput.has(cellId)) continue;
      seenInput.add(cellId);
      const pos = findCellGridPosition(data, cellId);
      if (!pos) continue;
      if (data.rows[pos.row].cells[pos.col].absorbed) continue;

      const newValue = !getResolvedBorderValue(data, pos.row, pos.col, this.side);
      for (const t of resolveBorderToggleTargets(data, pos.row, pos.col, this.side)) {
        const k = targetKey(t);
        if (seenTarget.has(k)) continue;
        seenTarget.add(k);
        const c = data.rows[t.row].cells[t.col];
        recordPatch(c.id, t.side, c.style[t.side]);
        c.style[t.side] = newValue;
      }
    }

    if (this.patches.length === 0) return;

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
