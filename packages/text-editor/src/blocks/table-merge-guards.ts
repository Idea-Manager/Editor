import type { TableData } from '@core/model/interfaces';

/** True if the grid uses merged cells; row/column insert-delete would desync the model without full merge-aware logic. */
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
