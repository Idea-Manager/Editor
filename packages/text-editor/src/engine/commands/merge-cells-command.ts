import type { DocumentNode, TableData, TableCell, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

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
            content: cell.content.map(run => ({ ...run, data: { ...run.data, marks: [...run.data.marks] } })),
            style: { ...cell.style },
          },
        });
      }
    }

    const primaryCell = data.rows[startRow].cells[startCol];
    const mergedContent: TextRun[] = [];

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = data.rows[r].cells[c];
        const text = cell.content.map(run => run.data.text).join('');
        if (text.length > 0) {
          mergedContent.push(...cell.content);
        }
      }
    }

    primaryCell.colspan = endCol - startCol + 1;
    primaryCell.rowspan = endRow - startRow + 1;
    primaryCell.content = mergedContent.length > 0 ? mergedContent : [{
      id: generateId('txt'), type: 'text', data: { text: '', marks: [] },
    }];

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        if (r === startRow && c === startCol) continue;
        data.rows[r].cells[c].absorbed = true;
        data.rows[r].cells[c].content = [];
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
        content: snap.cell.content.map(run => ({ ...run, data: { ...run.data, marks: [...run.data.marks] } })),
        style: { ...snap.cell.style },
      };
    }
  }
}
