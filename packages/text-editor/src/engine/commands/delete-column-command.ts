import type { DocumentNode, TableCell, TableData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { cloneBlockNodeDeep } from '../document-snapshot';
import { deleteColumnAtInColspanTable } from '../../blocks/table-column-mutations';
import { reconcileBordersAfterDeleteColumn } from '../../blocks/table-border-sync';
import { findTableBlock } from '../block-locator';

function cloneCellForUndo(cell: TableCell): TableCell {
  return {
    ...cell,
    style: { ...cell.style },
    blocks: cell.blocks.map(cloneBlockNodeDeep),
  };
}

export class DeleteColumnCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private deletedCells: TableCell[] = [];
  private deletedWidth = 0;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly colIndex: number,
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    if (data.columnWidths.length <= 1) return;
    if (this.colIndex < 0 || this.colIndex >= data.columnWidths.length) return;

    this.deletedWidth = data.columnWidths[this.colIndex]!;
    this.deletedCells = data.rows.map(row => cloneCellForUndo(row.cells[this.colIndex]!));

    if (!deleteColumnAtInColspanTable(data, this.colIndex)) {
      this.deletedCells = [];
      return;
    }

    reconcileBordersAfterDeleteColumn(data);

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'data.columnWidths',
        oldValue: null,
        newValue: data.columnWidths,
      },
    });
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;
    if (this.deletedCells.length === 0) return;

    const data = block.data as TableData;
    data.columnWidths.splice(this.colIndex, 0, this.deletedWidth);

    for (let i = 0; i < data.rows.length; i++) {
      const cell = this.deletedCells[i];
      if (cell) {
        data.rows[i].cells.splice(this.colIndex, 0, {
          ...cell,
          style: { ...cell.style },
          blocks: cell.blocks.map(cloneBlockNodeDeep),
        });
      }
    }
  }
}
