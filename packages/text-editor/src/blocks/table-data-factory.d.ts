import type { CellBorderStyle, TableData } from '@core/model/interfaces';
export type BorderPreset = 'all' | 'none' | 'outside' | 'inside';
export declare const DEFAULT_TABLE_BORDER_WIDTH = 1;
export declare const TABLE_BORDER_WIDTH_MIN = 1;
export declare const TABLE_BORDER_WIDTH_MAX = 8;
export interface TableSizePickerResult {
    rows: number;
    cols: number;
    borderPreset: BorderPreset;
    borderWidth: number;
}
export declare const DEFAULT_TABLE_COL_WIDTH = 120;
export declare const DEFAULT_TABLE_COLS = 3;
export declare const DEFAULT_TABLE_ROWS = 3;
/** One flag per line: L/T; bottom row has bottom; last column has right. */
export declare function cellBorderStyleForPreset(preset: BorderPreset, row: number, col: number, totalRows: number, totalCols: number): CellBorderStyle;
export declare function buildTableData(rowCount: number, colCount: number, borderPreset: BorderPreset, borderWidth?: number): TableData;
export declare function buildTableDataFromSizePicker(result: TableSizePickerResult): TableData;
/** Same shape as `TableBlock.defaultData` / empty table from picker with "all" borders. */
export declare function defaultTableData(): TableData;
//# sourceMappingURL=table-data-factory.d.ts.map