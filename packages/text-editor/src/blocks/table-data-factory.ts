import type { CellBorderStyle, TableCell, TableData, TableRow } from '@core/model/interfaces';
import { generateId } from '@core/id';
import { createDefaultCellBlocks } from './table-cell-defaults';

export type BorderPreset = 'all' | 'none' | 'outside' | 'inside';

export const DEFAULT_TABLE_BORDER_WIDTH = 1;
export const TABLE_BORDER_WIDTH_MIN = 1;
export const TABLE_BORDER_WIDTH_MAX = 8;

export interface TableSizePickerResult {
  rows: number;
  cols: number;
  borderPreset: BorderPreset;
  borderWidth: number;
}

export const DEFAULT_TABLE_COL_WIDTH = 120;
export const DEFAULT_TABLE_COLS = 3;
export const DEFAULT_TABLE_ROWS = 3;

/** One flag per line: L/T; bottom row has bottom; last column has right. */
export function cellBorderStyleForPreset(
  preset: BorderPreset,
  row: number,
  col: number,
  totalRows: number,
  totalCols: number,
): CellBorderStyle {
  switch (preset) {
    case 'all':
      return {
        borderTop: true,
        borderLeft: true,
        borderBottom: row === totalRows - 1,
        borderRight: col === totalCols - 1,
      };
    case 'none':
      return { borderTop: false, borderRight: false, borderBottom: false, borderLeft: false };
    case 'outside':
      return {
        borderTop: row === 0,
        borderLeft: col === 0,
        borderBottom: row === totalRows - 1,
        borderRight: col === totalCols - 1,
      };
    case 'inside':
      return {
        borderTop: row > 0,
        borderLeft: col > 0,
        borderBottom: false,
        borderRight: false,
      };
    default:
      return {
        borderTop: true,
        borderLeft: true,
        borderBottom: row === totalRows - 1,
        borderRight: col === totalCols - 1,
      };
  }
}

function clampBorderWidth(n: number): number {
  const x = Math.floor(Number(n));
  if (Number.isNaN(x) || x < TABLE_BORDER_WIDTH_MIN) return TABLE_BORDER_WIDTH_MIN;
  if (x > TABLE_BORDER_WIDTH_MAX) return TABLE_BORDER_WIDTH_MAX;
  return x;
}

export function buildTableData(
  rowCount: number,
  colCount: number,
  borderPreset: BorderPreset,
  borderWidth: number = DEFAULT_TABLE_BORDER_WIDTH,
): TableData {
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
    borderWidth: clampBorderWidth(borderWidth),
  };
}

export function buildTableDataFromSizePicker(result: TableSizePickerResult): TableData {
  return buildTableData(
    result.rows,
    result.cols,
    result.borderPreset,
    result.borderWidth ?? DEFAULT_TABLE_BORDER_WIDTH,
  );
}

/** Same shape as `TableBlock.defaultData` / empty table from picker with "all" borders. */
export function defaultTableData(): TableData {
  return buildTableData(DEFAULT_TABLE_ROWS, DEFAULT_TABLE_COLS, 'all', DEFAULT_TABLE_BORDER_WIDTH);
}
