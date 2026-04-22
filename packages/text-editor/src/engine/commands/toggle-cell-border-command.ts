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

export class ToggleCellBorderCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private patches: BorderPatch[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellId: string,
    private readonly side: BorderSide,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const pos = findCellGridPosition(data, this.cellId);
    if (!pos) return;

    const before = getResolvedBorderValue(data, pos.row, pos.col, this.side);
    const targets = resolveBorderToggleTargets(data, pos.row, pos.col, this.side);
    if (targets.length === 0) return;

    const newValue = !before;

    this.patches = [];
    const recordPatch = (cellId: string, side: BorderSide, oldValue: boolean) => {
      this.patches.push({ cellId, side, oldValue });
    };
    for (const t of targets) {
      const c = data.rows[t.row].cells[t.col];
      recordPatch(c.id, t.side, c.style[t.side]);
      c.style[t.side] = newValue;
    }

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: this.cellId,
        path: `style.${this.side}`,
        oldValue: before,
        newValue,
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
