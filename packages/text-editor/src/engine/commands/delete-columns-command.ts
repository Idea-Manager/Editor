import type { DocumentNode, TableData, TableCell } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { cloneBlockNodeDeep } from '../document-snapshot';
import { deleteColumnAtInColspanTable } from '../../blocks/table-column-mutations';
import { findTableBlock } from '../block-locator';

function cloneCell(cell: TableCell): TableCell {
  return {
    ...cell,
    style: { ...cell.style },
    blocks: cell.blocks.map(cloneBlockNodeDeep),
  };
}

export class DeleteColumnsCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  /** Ascending column index for undo. */
  private removed: { colIndex: number; width: number; cells: TableCell[] }[] = [];

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly colIndices: number[],
  ) {}

  execute(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    const n = data.columnWidths.length;
    const unique = [...new Set(this.colIndices)].filter(i => i >= 0 && i < n).sort((a, b) => a - b);
    if (unique.length === 0) return;
    if (n - unique.length < 1) return;

    const toRemoveDesc = [...unique].sort((a, b) => b - a);
    this.removed = [];
    for (const c of toRemoveDesc) {
      const width = data.columnWidths[c]!;
      const cells = data.rows.map(row => cloneCell(row.cells[c]!));
      if (!deleteColumnAtInColspanTable(data, c)) {
        for (const r of [...this.removed].sort((a, b) => a.colIndex - b.colIndex)) {
          data.columnWidths.splice(r.colIndex, 0, r.width);
          for (let i = 0; i < data.rows.length; i++) {
            const cell = r.cells[i];
            if (cell) data.rows[i].cells.splice(r.colIndex, 0, cloneCell(cell));
          }
        }
        this.removed = [];
        return;
      }
      this.removed.push({ colIndex: c, width, cells });
    }
    this.removed.sort((a, b) => a.colIndex - b.colIndex);

    if (this.operationRecords.length === 0) {
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
  }

  undo(): void {
    const block = findTableBlock(this.doc, this.blockId);
    if (!block) return;

    const data = block.data as TableData;
    for (const { colIndex, width, cells } of this.removed) {
      data.columnWidths.splice(colIndex, 0, width);
      for (let i = 0; i < data.rows.length; i++) {
        const cell = cells[i];
        if (cell) {
          data.rows[i].cells.splice(colIndex, 0, cloneCell(cell));
        }
      }
    }
  }
}
