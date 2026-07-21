import type { TableData } from '@core/model/interfaces';
/**
 * Inserts a table column at `insertAt` (0..width).
 * Expands colspan when inserting inside a same-row horizontal merge; otherwise splices a new cell
 * (including when the slot was rowspan-absorbed from a row above).
 */
export declare function insertColumnAtInColspanTable(data: TableData, insertAt: number, refColIndex: number): boolean;
/**
 * Deletes column `k` in each row. Handles colspan and rowspan (vertical merge) participation.
 */
export declare function deleteColumnAtInColspanTable(data: TableData, k: number): boolean;
//# sourceMappingURL=table-column-mutations.d.ts.map