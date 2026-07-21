import type { TableData } from '@core/model/interfaces';
import type { CellRange } from '../engine/commands/merge-cells-command';
/**
 * True when row r slot c is absorbed as part of a same-row colspan (primary to the left
 * already advanced the grid column cursor). Rowspan-only absorption returns false.
 */
export declare function absorbedSlotCoveredBySameRowColspan(data: TableData, r: number, c: number): boolean;
/** Count primary (non-absorbed) cells in an axis-aligned range. */
export declare function countPrimaryCellsInRange(data: TableData, range: CellRange): number;
/** Distinct row indices that contain a primary cell in the range. */
export declare function primaryRowsInRange(data: TableData, range: CellRange): number[];
/** Distinct column indices that contain a primary cell in the range. */
export declare function primaryColsInRange(data: TableData, range: CellRange): number[];
/** Primary cell ids in range (top-left to bottom-right order). */
export declare function primaryCellIdsInRange(data: TableData, range: CellRange): string[];
//# sourceMappingURL=table-range-utils.d.ts.map