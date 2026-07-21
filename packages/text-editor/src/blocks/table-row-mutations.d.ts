import type { TableData, TableCell } from '@core/model/interfaces';
/** Primary cell that owns grid slot (r,c), or null. */
export declare function primaryCellCovering(data: TableData, r: number, c: number): {
    row: number;
    col: number;
    cell: TableCell;
} | null;
/** Bottom grid row index covered by the primary that owns slot `(r, c)`. */
export declare function bottomGridRowForCell(data: TableData, r: number, c: number): number;
/**
 * Inserts a row after `afterRowIndex`, copying styles from `referenceRowIndex`.
 * Extends rowspans when the new row is inside an existing vertical merge.
 */
export declare function insertRowAfterInTable(data: TableData, afterRowIndex: number, referenceRowIndex: number): boolean;
/**
 * Deletes row `rowIndex`, adjusting rowspans and promoting the first continuation row when needed.
 */
export declare function deleteRowAtInTable(data: TableData, rowIndex: number): boolean;
//# sourceMappingURL=table-row-mutations.d.ts.map