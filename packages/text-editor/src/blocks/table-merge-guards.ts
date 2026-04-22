import type { TableData } from '@core/model/interfaces';

/** True if the grid uses merged cells; column insert/delete are not merge-aware. */
export function tableHasMergedCells(data: TableData): boolean {
  for (const row of data.rows) {
    for (const cell of row.cells) {
      if (cell.absorbed || cell.colspan > 1 || cell.rowspan > 1) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True if any **primary** cell spans more than one row. Row insert/delete would need rowspan-aware
 * grid surgery; horizontal (colspan-only) merges do not set this.
 */
export function tableHasRowspanMerges(data: TableData): boolean {
  for (const row of data.rows) {
    for (const cell of row.cells) {
      if (!cell.absorbed && cell.rowspan > 1) {
        return true;
      }
    }
  }
  return false;
}
