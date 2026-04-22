import type { TableData, TableCell } from '@core/model/interfaces';
import { absorbedSlotCoveredBySameRowColspan } from './table-range-utils';

export type BorderSide = 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';

/** Axis-aligned merge range (same shape as merge-cells-command). */
export interface MergeBorderRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface MergeRangeOutline {
  borderTop: boolean;
  borderLeft: boolean;
  borderBottom: boolean;
  borderRight: boolean;
}

function findCellGridPosition(data: TableData, cellId: string): { row: number; col: number } | null {
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < data.rows[r].cells.length; c++) {
      if (data.rows[r].cells[c].id === cellId) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

/**
 * One logical line per flag: L/T for internals; bottom on last row; right on last col.
 * Strips legacy mirrored borderBottom / borderRight on non-owner cells.
 */
export function normalizeTableBorders(data: TableData): void {
  const numRows = data.rows.length;
  const numCols = data.columnWidths.length;
  for (let r = 0; r < numRows; r++) {
    let col = 0;
    const rowCells = data.rows[r].cells;
    for (let c = 0; c < rowCells.length; c++) {
      const cell = rowCells[c];
      if (cell.absorbed) {
        if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
          col++;
        }
        continue;
      }
      const rs = cell.rowspan ?? 1;
      const cs = cell.colspan ?? 1;
      const lastRow = r + rs - 1;
      const lastCol = col + cs - 1;
      if (lastRow < numRows - 1) {
        cell.style.borderBottom = false;
      }
      if (lastCol < numCols - 1) {
        cell.style.borderRight = false;
      }
      col += cs;
    }
  }
}

export interface BorderToggleTarget {
  row: number;
  col: number;
  side: BorderSide;
}

/**
 * User-facing “top/left/…” of the primary cell at (row, col) → canonical storage
 * (single owner per table edge, supports rowspan / colspan like prior sync).
 */
export function resolveBorderToggleTargets(
  data: TableData,
  row: number,
  col: number,
  userSide: BorderSide,
): BorderToggleTarget[] {
  const numRows = data.rows.length;
  const numCols = data.columnWidths.length;
  const cell = data.rows[row].cells[col];
  if (cell.absorbed) return [];
  const rs = cell.rowspan ?? 1;
  const cs = cell.colspan ?? 1;

  switch (userSide) {
    case 'borderTop':
      return [{ row, col, side: 'borderTop' }];
    case 'borderLeft':
      return [{ row, col, side: 'borderLeft' }];
    case 'borderRight': {
      if (col + cs < numCols) {
        return [{ row, col: col + cs, side: 'borderLeft' }];
      }
      return [{ row, col, side: 'borderRight' }];
    }
    case 'borderBottom': {
      if (row + rs < numRows) {
        const out: BorderToggleTarget[] = [];
        const nextRow = data.rows[row + rs].cells;
        for (let cc = col; cc < col + cs && cc < numCols; cc++) {
          const n = nextRow[cc];
          if (!n.absorbed) {
            out.push({ row: row + rs, col: cc, side: 'borderTop' });
          }
        }
        return out;
      }
      return [{ row, col, side: 'borderBottom' }];
    }
    default:
      return [];
  }
}

export function getResolvedBorderValue(
  data: TableData,
  row: number,
  col: number,
  userSide: BorderSide,
): boolean {
  const targets = resolveBorderToggleTargets(data, row, col, userSide);
  if (targets.length === 0) return false;
  return targets.every(t => !!data.rows[t.row].cells[t.col].style[t.side]);
}

function forEachPrimaryStartingAtRow(data: TableData, rowIndex: number, fn: (cell: TableCell) => void): void {
  const rowCells = data.rows[rowIndex]?.cells;
  if (!rowCells) return;
  for (let c = 0; c < rowCells.length; c++) {
    const cell = rowCells[c]!;
    if (cell.absorbed) {
      if (!absorbedSlotCoveredBySameRowColspan(data, rowIndex, c)) {
        // rowspan-absorbed slot; no primary on this row
      }
      continue;
    }
    fn(cell);
  }
}

function forEachPrimaryCoveringGridCol(data: TableData, gridCol: number, fn: (cell: TableCell) => void): void {
  const numRows = data.rows.length;
  for (let r = 0; r < numRows; r++) {
    let col = 0;
    const rowCells = data.rows[r]!.cells;
    for (let c = 0; c < rowCells.length; c++) {
      const cell = rowCells[c]!;
      if (cell.absorbed) {
        if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
          col++;
        }
        continue;
      }
      const cs = cell.colspan ?? 1;
      if (gridCol >= col && gridCol < col + cs) {
        fn(cell);
        break;
      }
      col += cs;
    }
  }
}

/**
 * After inserting a row at `insertIndex`, fix top/bottom outer edges vs internal horizontal lines.
 */
export function reconcileBordersAfterInsertRowAt(data: TableData, insertIndex: number): void {
  const numRows = data.rows.length;
  if (numRows < 2 || insertIndex < 0 || insertIndex >= numRows) return;

  if (insertIndex === 0) {
    forEachPrimaryStartingAtRow(data, 0, cell => {
      cell.style.borderTop = false;
    });
    forEachPrimaryStartingAtRow(data, 1, cell => {
      cell.style.borderTop = true;
    });
  }

  if (insertIndex === numRows - 1) {
    for (let r = 0; r < numRows; r++) {
      let col = 0;
      const rowCells = data.rows[r]!.cells;
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c]!;
        if (cell.absorbed) {
          if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
            col++;
          }
          continue;
        }
        const rs = cell.rowspan ?? 1;
        if (r + rs - 1 === numRows - 1) {
          cell.style.borderBottom = true;
        }
        col += cell.colspan ?? 1;
      }
    }
  }

  normalizeTableBorders(data);
}

/**
 * After inserting a column at `insertIndex`, fix left/right outer edges vs internal vertical lines.
 */
export function reconcileBordersAfterInsertColumnAt(data: TableData, insertIndex: number): void {
  const numCols = data.columnWidths.length;
  if (numCols < 2 || insertIndex < 0 || insertIndex >= numCols) return;

  if (insertIndex === 0) {
    forEachPrimaryCoveringGridCol(data, 0, cell => {
      cell.style.borderLeft = false;
    });
    forEachPrimaryCoveringGridCol(data, 1, cell => {
      cell.style.borderLeft = true;
    });
  }

  if (insertIndex === numCols - 1) {
    for (let r = 0; r < data.rows.length; r++) {
      let col = 0;
      const rowCells = data.rows[r]!.cells;
      for (let c = 0; c < rowCells.length; c++) {
        const cell = rowCells[c]!;
        if (cell.absorbed) {
          if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
            col++;
          }
          continue;
        }
        const cs = cell.colspan ?? 1;
        if (col + cs - 1 === numCols - 1) {
          cell.style.borderRight = true;
        }
        col += cs;
      }
    }
  }

  normalizeTableBorders(data);
}

/** After deleting a row, ensure cells on the new bottom edge own `borderBottom`. */
export function reconcileBordersAfterDeleteRow(data: TableData): void {
  const numRows = data.rows.length;
  const numCols = data.columnWidths.length;
  if (numRows === 0) return;

  for (let r = 0; r < numRows; r++) {
    let col = 0;
    const rowCells = data.rows[r]!.cells;
    for (let c = 0; c < rowCells.length; c++) {
      const cell = rowCells[c]!;
      if (cell.absorbed) {
        if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
          col++;
        }
        continue;
      }
      const rs = cell.rowspan ?? 1;
      const cs = cell.colspan ?? 1;
      const lastRow = r + rs - 1;
      if (lastRow === numRows - 1) {
        cell.style.borderBottom = true;
      }
      col += cs;
    }
  }

  normalizeTableBorders(data);
}

/** After deleting a column, ensure cells on the new right edge own `borderRight`. */
export function reconcileBordersAfterDeleteColumn(data: TableData): void {
  const numRows = data.rows.length;
  const numCols = data.columnWidths.length;
  if (numCols === 0) return;

  for (let r = 0; r < numRows; r++) {
    let col = 0;
    const rowCells = data.rows[r]!.cells;
    for (let c = 0; c < rowCells.length; c++) {
      const cell = rowCells[c]!;
      if (cell.absorbed) {
        if (!absorbedSlotCoveredBySameRowColspan(data, r, c)) {
          col++;
        }
        continue;
      }
      const cs = cell.colspan ?? 1;
      const lastCol = col + cs - 1;
      if (lastCol === numCols - 1) {
        cell.style.borderRight = true;
      }
      col += cs;
    }
  }

  normalizeTableBorders(data);
}

/** Call before mutating the grid in MergeCellsCommand. */
export function collectMergeRangeOutline(data: TableData, range: MergeBorderRange): MergeRangeOutline {
  const { startRow, startCol, endRow, endCol } = range;
  let borderTop = false;
  for (let c = startCol; c <= endCol; c++) {
    if (getResolvedBorderValue(data, startRow, c, 'borderTop')) borderTop = true;
  }
  let borderLeft = false;
  for (let r = startRow; r <= endRow; r++) {
    if (getResolvedBorderValue(data, r, startCol, 'borderLeft')) borderLeft = true;
  }
  let borderBottom = false;
  for (let c = startCol; c <= endCol; c++) {
    if (getResolvedBorderValue(data, endRow, c, 'borderBottom')) borderBottom = true;
  }
  let borderRight = false;
  for (let r = startRow; r <= endRow; r++) {
    if (getResolvedBorderValue(data, r, endCol, 'borderRight')) borderRight = true;
  }
  return { borderTop, borderLeft, borderBottom, borderRight };
}

/** Apply outline to the merge primary at range top-left (after merge). */
export function applyMergeOutlineToPrimary(data: TableData, range: MergeBorderRange, outline: MergeRangeOutline): void {
  const cell = data.rows[range.startRow]?.cells[range.startCol];
  if (!cell || cell.absorbed) return;
  cell.style.borderTop = outline.borderTop;
  cell.style.borderLeft = outline.borderLeft;
  cell.style.borderBottom = outline.borderBottom;
  cell.style.borderRight = outline.borderRight;
  normalizeTableBorders(data);
}

export { findCellGridPosition };
