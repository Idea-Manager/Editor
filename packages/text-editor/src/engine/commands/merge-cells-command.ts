import type { BlockNode, DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { cloneBlockNodeDeep } from '../document-snapshot';
import { createDefaultCellBlocks } from '../../blocks/table-cell-defaults';

export interface CellRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export class MergeCellsCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private snapshot: { row: number; col: number; cell: TableCell }[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly range: CellRange,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    const { startRow, startCol, endRow, endCol } = this.range;

    this.snapshot = [];
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = data.rows[r].cells[c];
        this.snapshot.push({
          row: r,
          col: c,
          cell: {
            ...cell,
            blocks: cell.blocks.map(cloneBlockNodeDeep),
            style: { ...cell.style },
          },
        });
      }
    }

    const primaryCell = data.rows[startRow].cells[startCol];
    const mergedBlocks: BlockNode[] = [];

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = data.rows[r].cells[c];
        for (const b of cell.blocks) {
          mergedBlocks.push(cloneBlockNodeDeep(b));
        }
      }
    }

    primaryCell.colspan = endCol - startCol + 1;
    primaryCell.rowspan = endRow - startRow + 1;
    primaryCell.blocks = mergedBlocks.length > 0 ? mergedBlocks : createDefaultCellBlocks();

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r === startRow && c === startCol) continue;
        data.rows[r].cells[c].absorbed = true;
        data.rows[r].cells[c].blocks = [];
      }
    }

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

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;
    for (const snap of this.snapshot) {
      data.rows[snap.row].cells[snap.col] = {
        ...snap.cell,
        blocks: snap.cell.blocks.map(cloneBlockNodeDeep),
        style: { ...snap.cell.style },
      };
    }
  }
}
