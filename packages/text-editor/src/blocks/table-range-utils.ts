import type { TableData } from '@core/model/interfaces';
import type { CellRange } from '../engine/commands/merge-cells-command';

/**
 * True when row r slot c is absorbed as part of a same-row colspan (primary to the left
 * already advanced the grid column cursor). Rowspan-only absorption returns false.
 */
export function absorbedSlotCoveredBySameRowColspan(data: TableData, r: number, c: number): boolean {
  const row = data.rows[r]?.cells;
  if (!row || !row[c]?.absorbed) return false;
  for (let j = c - 1; j >= 0; j--) {
    const left = row[j];
    if (left.absorbed) continue;
    if (c < j + left.colspan) return true;
  }
  return false;
}

/** Count primary (non-absorbed) cells in an axis-aligned range. */
export function countPrimaryCellsInRange(data: TableData, range: CellRange): number {
  let n = 0;
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      if (!data.rows[r]?.cells[c]?.absorbed) n++;
    }
  }
  return n;
}

/** Distinct row indices that contain a primary cell in the range. */
export function primaryRowsInRange(data: TableData, range: CellRange): number[] {
  const rows = new Set<number>();
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const cell = data.rows[r]?.cells[c];
      if (cell && !cell.absorbed) rows.add(r);
    }
  }
  return [...rows].sort((a, b) => a - b);
}

/** Distinct column indices that contain a primary cell in the range. */
export function primaryColsInRange(data: TableData, range: CellRange): number[] {
  const cols = new Set<number>();
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const cell = data.rows[r]?.cells[c];
      if (cell && !cell.absorbed) cols.add(c);
    }
  }
  return [...cols].sort((a, b) => a - b);
}

/** Primary cell ids in range (top-left to bottom-right order). */
export function primaryCellIdsInRange(data: TableData, range: CellRange): string[] {
  const ids: string[] = [];
  for (let r = range.startRow; r <= range.endRow; r++) {
    for (let c = range.startCol; c <= range.endCol; c++) {
      const cell = data.rows[r]?.cells[c];
      if (cell && !cell.absorbed) ids.push(cell.id);
    }
  }
  return ids;
}
