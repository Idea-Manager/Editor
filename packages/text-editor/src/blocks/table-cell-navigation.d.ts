/** Table cell horizontal caret moves (DOM). Used from the editor root keydown — cell-level listeners never fire when focus is the root contenteditable. */
/** True when the caret is at the end of the last content block in the cell. */
export declare function isCollapsedRangeAtCellContentEnd(inner: HTMLElement, range: Range): boolean;
/** True when the caret is at the start of the first content block in the cell. */
export declare function isCollapsedRangeAtCellContentStart(inner: HTMLElement, range: Range): boolean;
export declare function navigateTableCellDOM(wrapper: HTMLElement, currentCellId: string, direction: 'next' | 'prev'): void;
/**
 * If the collapsed caret is at a horizontal cell boundary, move to the adjacent cell.
 * @returns true if the event was handled (caller should not run other key handling).
 */
export declare function tryTableCellHorizontalNavigation(root: HTMLElement, e: KeyboardEvent): boolean;
//# sourceMappingURL=table-cell-navigation.d.ts.map