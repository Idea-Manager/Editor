import type { BlockNode, BlockSelection, DocumentNode, TableCell } from '@core/model/interfaces';
/** First content block in the first non-absorbed cell (reading order), for caret after inserting a table. */
export declare function getFirstTableCellFirstBlockId(tableBlock: BlockNode): string | null;
export type BlockParentKind = 'document' | 'table-cell';
export interface BlockLocation {
    block: BlockNode;
    parentList: BlockNode[];
    index: number;
    parentKind: BlockParentKind;
    tableBlockId?: string;
    cellId?: string;
}
export declare function findBlockLocation(doc: DocumentNode, blockId: string): BlockLocation | null;
export declare function getBlockById(doc: DocumentNode, blockId: string): BlockNode | null;
/** Linear leaf order of block nodes (paragraphs, headings, etc.) matching table reading order. */
export declare function flattenBlocksInReadingOrder(doc: DocumentNode): BlockNode[];
export interface SelectionTextSpan {
    block: BlockNode;
    start: number;
    end: number;
}
/**
 * Character ranges per block for the selection (anchor → focus in reading order).
 * Cross-cell table selections use row-major reading order.
 */
export declare function getSelectionSpansInDocumentOrder(doc: DocumentNode, sel: BlockSelection): SelectionTextSpan[] | null;
/** Resolves a table block by id at any nesting depth. */
export declare function findTableBlock(doc: DocumentNode, tableBlockId: string): BlockNode | null;
/** Collapsed caret position after deleting a multi-block selection (document or shared cell parent). */
export declare function getSelectionStartAfterDelete(doc: DocumentNode, sel: BlockSelection): {
    blockId: string;
    offset: number;
};
export declare function findTableCell(doc: DocumentNode, tableBlockId: string, cellId: string): TableCell | null;
//# sourceMappingURL=block-locator.d.ts.map