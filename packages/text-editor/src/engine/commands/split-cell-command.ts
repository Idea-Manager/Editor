import type { DocumentNode, TableData, TableCell, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export class SplitCellCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldColspan = 1;
  private oldRowspan = 1;
  private oldContent: TextRun[] = [];
  private cellRow = -1;
  private cellCol = -1;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly cellId: string,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'table') return;

    const data = block.data as TableData;

    let foundRow = -1;
    let foundCol = -1;
    for (let r = 0; r < data.rows.length; r++) {
      for (let c = 0; c < data.rows[r].cells.length; c++) {
        if (data.rows[r].cells[c].id === this.cellId) {
          foundRow = r;
          foundCol = c;
          break;
        }
      }
      if (foundRow !== -1) break;
    }
    if (foundRow === -1) return;

    this.cellRow = foundRow;
    this.cellCol = foundCol;

    const cell = data.rows[foundRow].cells[foundCol];
    this.oldColspan = cell.colspan;
    this.oldRowspan = cell.rowspan;
    this.oldContent = cell.content.map(r => ({ ...r, data: { ...r.data, marks: [...r.data.marks] } }));

    if (cell.colspan === 1 && cell.rowspan === 1) return;

    for (let r = foundRow; r < foundRow + cell.rowspan; r++) {
      for (let c = foundCol; c < foundCol + cell.colspan; c++) {
        if (r === foundRow && c === foundCol) continue;
        const absorbed = data.rows[r].cells[c];
        absorbed.absorbed = false;
        absorbed.colspan = 1;
        absorbed.rowspan = 1;
        absorbed.content = [{ id: generateId('txt'), type: 'text', data: { text: '', marks: [] } }];
      }
    }

    cell.colspan = 1;
    cell.rowspan = 1;

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
    if (this.cellRow === -1) return;

    const cell = data.rows[this.cellRow].cells[this.cellCol];
    cell.colspan = this.oldColspan;
    cell.rowspan = this.oldRowspan;
    cell.content = this.oldContent.map(r => ({ ...r, data: { ...r.data, marks: [...r.data.marks] } }));

    for (let r = this.cellRow; r < this.cellRow + this.oldRowspan; r++) {
      for (let c = this.cellCol; c < this.cellCol + this.oldColspan; c++) {
        if (r === this.cellRow && c === this.cellCol) continue;
        data.rows[r].cells[c].absorbed = true;
        data.rows[r].cells[c].content = [];
      }
    }
  }
}
