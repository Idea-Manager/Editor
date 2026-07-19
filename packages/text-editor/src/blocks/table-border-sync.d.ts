import type { TableData } from '@core/model/interfaces';
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
declare function findCellGridPosition(data: TableData, cellId: string): {
    row: number;
    col: number;
} | null;
/**
 * One logical line per flag: L/T for internals; bottom on last row; right on last col.
 * Strips legacy mirrored borderBottom / borderRight on non-owner cells.
 */
export declare function normalizeTableBorders(data: TableData): void;
export interface BorderToggleTarget {
    row: number;
    col: number;
    side: BorderSide;
}
/**
 * User-facing “top/left/…” of the primary cell at (row, col) → canonical storage
 * (single owner per table edge, supports rowspan / colspan like prior sync).
 */
export declare function resolveBorderToggleTargets(data: TableData, row: number, col: number, userSide: BorderSide): BorderToggleTarget[];
export declare function getResolvedBorderValue(data: TableData, row: number, col: number, userSide: BorderSide): boolean;
/**
 * After inserting a row at `insertIndex`, fix top/bottom outer edges vs internal horizontal lines.
 */
export declare function reconcileBordersAfterInsertRowAt(data: TableData, insertIndex: number): void;
/**
 * After inserting a column at `insertIndex`, fix left/right outer edges vs internal vertical lines.
 */
export declare function reconcileBordersAfterInsertColumnAt(data: TableData, insertIndex: number): void;
/** After deleting a row, ensure cells on the new bottom edge own `borderBottom`. */
export declare function reconcileBordersAfterDeleteRow(data: TableData): void;
/** After deleting a column, ensure cells on the new right edge own `borderRight`. */
export declare function reconcileBordersAfterDeleteColumn(data: TableData): void;
/** Call before mutating the grid in MergeCellsCommand. */
export declare function collectMergeRangeOutline(data: TableData, range: MergeBorderRange): MergeRangeOutline;
/** Apply outline to the merge primary at range top-left (after merge). */
export declare function applyMergeOutlineToPrimary(data: TableData, range: MergeBorderRange, outline: MergeRangeOutline): void;
export { findCellGridPosition };
//# sourceMappingURL=table-border-sync.d.ts.map