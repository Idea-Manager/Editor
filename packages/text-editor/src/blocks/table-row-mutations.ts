import type { TableData, TableCell, TableRow } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';
import { absorbedSlotCoveredBySameRowColspan } from './table-range-utils';
import { cloneBlockNodeDeep } from '../engine/document-snapshot';

/** Primary cell that owns grid slot (r,c), or null. */
export function primaryCellCovering(
  data: TableData,
  r: number,
  c: number,
): { row: number; col: number; cell: TableCell } | null {
  const row = data.rows[r]?.cells;
  if (!row || !row[c]) return null;
  const cell = row[c]!;
  if (!cell.absorbed) return { row: r, col: c, cell };

  for (let j = c - 1; j >= 0; j--) {
    const left = data.rows[r]!.cells[j]!;
    if (left.absorbed) continue;
    if (c < j + left.colspan) return { row: r, col: j, cell: left };
  }
  for (let r2 = r - 1; r2 >= 0; r2--) {
    const up = data.rows[r2]!.cells[c]!;
    if (up.absorbed) {
      const nested = primaryCellCovering(data, r2, c);
      if (
        nested &&
        !nested.cell.absorbed &&
        nested.cell.rowspan > 1 &&
        r < nested.row + nested.cell.rowspan
      ) {
        return nested;
      }
      continue;
    }
    if (up.rowspan > 1 && r < r2 + up.rowspan) return { row: r2, col: c, cell: up };
  }
  return null;
}

function rowspanPrimaryRowForSlot(data: TableData, r: number, c: number): number {
  for (let r2 = r - 1; r2 >= 0; r2--) {
    const cell = data.rows[r2]!.cells[c]!;
    if (cell.absorbed) continue;
    if (cell.rowspan > 1 && r < r2 + cell.rowspan) return r2;
  }
  return -1;
}

/**
 * True when inserting a new row between `afterRowIndex` and `afterRowIndex + 1` falls inside
 * an existing vertical merge (so the new row's cell in column c is absorbed).
 */
function insertSplitsRowspan(
  data: TableData,
  afterRowIndex: number,
  c: number,
): { pr: number; pc: number; primary: TableCell } | null {
  const rBelow = afterRowIndex + 1;
  if (rBelow >= data.rows.length) return null;
  const cov = primaryCellCovering(data, rBelow, c);
  if (!cov || cov.cell.rowspan <= 1) return null;
  const { row: pr, col: pc, cell: primary } = cov;
  if (pr <= afterRowIndex && afterRowIndex + 1 < pr + primary.rowspan) {
    return { pr, pc, primary };
  }
  return null;
}

/**
 * Inserts a row after `afterRowIndex`, copying styles from `referenceRowIndex`.
 * Extends rowspans when the new row is inside an existing vertical merge.
 */
export function insertRowAfterInTable(data: TableData, afterRowIndex: number, referenceRowIndex: number): boolean {
  if (data.rows.length === 0 || afterRowIndex < -1 || afterRowIndex >= data.rows.length) return false;
  const w = data.columnWidths.length;
  if (!data.rows.every(r => r.cells.length === w)) return false;

  const refIdx = Math.max(0, Math.min(referenceRowIndex, data.rows.length - 1));
  const refRow = data.rows[refIdx]!;
  const ins = afterRowIndex + 1;
  const newRow: TableRow = { id: generateId('row'), cells: [] };
  const incremented = new Set<string>();

  for (let c = 0; c < w; c++) {
    const split = insertSplitsRowspan(data, afterRowIndex, c);
    const styleRef = refRow.cells[c]!;
    if (split) {
      const key = `${split.pr},${split.pc}`;
      if (!incremented.has(key)) {
        split.primary.rowspan += 1;
        incremented.add(key);
      }
      newRow.cells.push({
        id: generateId('cell'),
        blocks: [],
        colspan: 1,
        rowspan: 1,
        absorbed: true,
        style: { ...styleRef.style },
      });
    } else {
      const refCell = refRow.cells[c]!;
      newRow.cells.push({
        id: generateId('cell'),
        blocks: refCell.absorbed ? [] : createDefaultCellBlocks(),
        colspan: refCell.colspan,
        rowspan: 1,
        absorbed: refCell.absorbed,
        style: { ...styleRef.style },
      });
    }
  }

  data.rows.splice(ins, 0, newRow);
  return true;
}

/**
 * Deletes row `rowIndex`, adjusting rowspans and promoting the first continuation row when needed.
 */
export function deleteRowAtInTable(data: TableData, rowIndex: number): boolean {
  if (data.rows.length <= 1 || rowIndex < 0 || rowIndex >= data.rows.length) return false;
  const w = data.columnWidths.length;
  if (!data.rows.every(r => r.cells.length === w)) return false;

  const row = data.rows[rowIndex]!;
  const promoted = new Set<string>();
  const decremented = new Set<string>();

  for (let c = 0; c < w; ) {
    const cell = row.cells[c]!;
    if (cell.absorbed && absorbedSlotCoveredBySameRowColspan(data, rowIndex, c)) {
      c += 1;
      continue;
    }

    if (!cell.absorbed && cell.rowspan > 1) {
      const key = `${rowIndex},${c}`;
      if (promoted.has(key)) {
        c += cell.colspan;
        continue;
      }
      promoted.add(key);
      const span = cell.rowspan;
      const cs = cell.colspan;
      if (rowIndex + 1 < data.rows.length) {
        for (let dc = 0; dc < cs; dc++) {
          const below = data.rows[rowIndex + 1]!.cells[c + dc]!;
          if (dc === 0) {
            below.absorbed = false;
            below.blocks = cell.blocks.map(cloneBlockNodeDeep);
            below.rowspan = Math.max(1, span - 1);
            below.colspan = cell.colspan;
            below.style = { ...cell.style };
          } else {
            const stillSpan = span - 1 > 1;
            below.absorbed = stillSpan;
            below.blocks = stillSpan ? [] : createDefaultCellBlocks();
            below.rowspan = 1;
            below.colspan = 1;
            below.style = { ...cell.style };
          }
        }
      }
      c += cs;
      continue;
    }

    if (cell.absorbed && !absorbedSlotCoveredBySameRowColspan(data, rowIndex, c)) {
      const pr = rowspanPrimaryRowForSlot(data, rowIndex, c);
      if (pr >= 0 && pr < rowIndex) {
        const origin = primaryCellCovering(data, rowIndex, c);
        if (origin) {
          const dkey = `${origin.row},${origin.col}`;
          if (!decremented.has(dkey)) {
            if (origin.cell.rowspan > 1) origin.cell.rowspan -= 1;
            decremented.add(dkey);
          }
        }
      }
    }
    c += 1;
  }

  data.rows.splice(rowIndex, 1);
  return true;
}
