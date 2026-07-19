import type { BlockNode, DocumentNode, TableData } from '@core/model/interfaces';
export declare function cloneTableData(data: TableData): TableData;
export declare function cloneBlockNodeDeep(block: BlockNode): BlockNode;
/** Deep snapshot of top-level blocks (including nested table cell blocks). */
export declare function snapshotDocumentChildren(doc: DocumentNode): BlockNode[];
export declare function restoreDocumentChildren(doc: DocumentNode, snapshot: BlockNode[]): void;
/** Reassigns ids on a cloned block tree (e.g. after pasting from clipboard). */
export declare function remapBlockNodeIds(block: BlockNode): BlockNode;
export declare function remapBlocksList(blocks: BlockNode[]): BlockNode[];
//# sourceMappingURL=document-snapshot.d.ts.map