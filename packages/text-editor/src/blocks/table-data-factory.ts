import type { CellBorderStyle, TableCell, TableData, TableRow } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';

export type BorderPreset = 'all' | 'none' | 'outside' | 'inside';

export interface TableSizePickerResult {
  rows: number;
  cols: number;
  borderPreset: BorderPreset;
}

export const DEFAULT_TABLE_COL_WIDTH = 120;
export const DEFAULT_TABLE_COLS = 3;
export const DEFAULT_TABLE_ROWS = 3;

export function cellBorderStyleForPreset(
  preset: BorderPreset,
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
): CellBorderStyle {
  switch (preset) {
    case 'all':
      return { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true };
    case 'none':
      return { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false };
    case 'outside':
      return {
        borderTop: row === 0,
        borderRight: col === totalCols - 1,
        borderBottom: row === totalRows - 1,
        borderLeft: col === 0,
      };
    case 'inside':
      return {
        borderTop: row > 0,
        borderRight: col < totalCols - 1,
        borderBottom: row < totalRows - 1,
        borderLeft: col > 0,
      };
    default:
      return { borderTop: true, borderRight: true, borderBottom: true, borderLeft: true };
  }
}

export function buildTableData(rowCount: number, colCount: number, borderPreset: BorderPreset): TableData {
  const rows: TableRow[] = Array.from({ length: rowCount }, (_, rowIdx) => ({
    id: generateId('row'),
    cells: Array.from({ length: colCount }, (_, colIdx) => {
      const style = cellBorderStyleForPreset(borderPreset, rowIdx, colIdx, rowCount, colCount);
      return {
        id: generateId('cell'),
        blocks: createDefaultCellBlocks(),
        colspan: 1,
        rowspan: 1,
        absorbed: false,
        style,
      } satisfies TableCell;
    }),
  }));
  return {
    rows,
    columnWidths: Array.from({ length: colCount }, () => DEFAULT_TABLE_COL_WIDTH),
  };
}

export function buildTableDataFromSizePicker(result: TableSizePickerResult): TableData {
  return buildTableData(result.rows, result.cols, result.borderPreset);
}

/** Same shape as `TableBlock.defaultData` / empty table from picker with "all" borders. */
export function defaultTableData(): TableData {
  return buildTableData(DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLS, 'all');
}
