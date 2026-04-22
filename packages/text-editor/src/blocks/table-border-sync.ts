import type { TableData, TableCell } from '@core/model/interfaces';
import { absorbedSlotCoveredBySameRowColspan } from './table-range-utils';

export type BorderSide = 'borderTop' | 'borderRight' | 'borderBottom' | 'borderLeft';

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

export { findCellGridPosition };
