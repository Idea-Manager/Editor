import type { TableData, TableCell, TableRow } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';
import { DEFAULT_TABLE_COL_WIDTH } from './table-data-factory';
import { absorbedSlotCoveredBySameRowColspan } from './table-range-utils';

function primaryIndexForSlot(row: TableRow, slotIndex: number): number {
  for (let i = slotIndex; i >= 0; i--) {
    const c = row.cells[i];
    if (c && !c.absorbed) return i;
  }
  return 0;
}

/**
 * Inserts a table column at `insertAt` (0..width).
 * Expands colspan when inserting inside a same-row horizontal merge; otherwise splices a new cell
 * (including when the slot was rowspan-absorbed from a row above).
 */
export function insertColumnAtInColspanTable(
  data: TableData,
  insertAt: number,
  refColIndex: number,
): boolean {
  const w = data.columnWidths.length;
  if (w === 0 || insertAt < 0 || insertAt > w) return false;

  const refClamped = Math.max(0, Math.min(refColIndex, w - 1));
  if (!data.rows.every(r => r.cells.length === w)) return false;

  data.columnWidths.splice(insertAt, 0, DEFAULT_TABLE_COL_WIDTH);

  for (let ri = 0; ri < data.rows.length; ri++) {
    const row = data.rows[ri]!;
    const styleRef = row.cells[refClamped]!;

    const slot = insertAt < row.cells.length ? row.cells[insertAt] : undefined;
    if (slot?.absorbed && absorbedSlotCoveredBySameRowColspan(data, ri, insertAt)) {
      const p = primaryIndexForSlot(row, insertAt);
      const primary = row.cells[p]!;
      primary.colspan += 1;
      const blank: TableCell = {
        id: generateId('cell'),
        blocks: [],
        colspan: 1,
        rowspan: 1,
        absorbed: true,
        style: { ...styleRef.style },
      };
      row.cells.splice(insertAt, 0, blank);
    } else {
      const n: TableCell = {
        id: generateId('cell'),
        blocks: createDefaultCellBlocks(),
        colspan: 1,
        rowspan: 1,
        absorbed: false,
        style: { ...styleRef.style },
      };
      row.cells.splice(insertAt, 0, n);
    }
  }
  return true;
}

/** Row index of the primary cell covering slot (r,c) via rowspan from above, or -1. */
function rowspanPrimaryRowForSlot(data: TableData, r: number, c: number): number {
  for (let r2 = r - 1; r2 >= 0; r2--) {
    const cell = data.rows[r2]!.cells[c]!;
    if (cell.absorbed) continue;
    if (cell.rowspan > 1 && r < r2 + cell.rowspan) return r2;
  }
  return -1;
}

/**
 * Deletes column `k` in each row. Handles colspan and rowspan (vertical merge) participation.
 */
export function deleteColumnAtInColspanTable(data: TableData, k: number): boolean {
  const w = data.columnWidths.length;
  if (w <= 1 || k < 0 || k >= w) return false;
  if (!data.rows.every(r => r.cells.length === w)) return false;

  data.columnWidths.splice(k, 1);

  let r = 0;
  while (r < data.rows.length) {
    const row = data.rows[r]!;
    const c = row.cells[k]!;

    if (!c.absorbed && c.rowspan > 1) {
      const span = c.rowspan;
      for (let r2 = 0; r2 < span && r + r2 < data.rows.length; r2++) {
        data.rows[r + r2]!.cells.splice(k, 1);
      }
      r += span;
      continue;
    }

    if (c.absorbed && absorbedSlotCoveredBySameRowColspan(data, r, k)) {
      const p = primaryIndexForSlot(row, k);
      const pr = row.cells[p]!;
      pr.colspan = Math.max(1, pr.colspan - 1);
      row.cells.splice(k, 1);
      r += 1;
      continue;
    }

    if (c.absorbed) {
      const pr = rowspanPrimaryRowForSlot(data, r, k);
      if (pr >= 0) {
        const prim = data.rows[pr]!.cells[k]!;
        if (prim.rowspan > 1) prim.rowspan -= 1;
      }
      row.cells.splice(k, 1);
      r += 1;
      continue;
    }

    if (c.colspan > 1) {
      c.colspan -= 1;
      if (k + 1 < row.cells.length && row.cells[k + 1]!.absorbed) {
        row.cells.splice(k + 1, 1);
      }
      r += 1;
      continue;
    }

    row.cells.splice(k, 1);
    r += 1;
  }
  return true;
}
