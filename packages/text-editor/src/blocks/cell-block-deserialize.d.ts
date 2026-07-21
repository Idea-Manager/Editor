import type { BlockNode, TextRun } from '@core/model/interfaces';
/** Deserialize a block stored inside a table cell (no nested tables). */
export declare function deserializeCellBlock(raw: unknown): BlockNode;
export declare function deserializeCellBlocks(blocks: BlockNode[] | undefined, legacyContent: TextRun[] | undefined): BlockNode[];
//# sourceMappingURL=cell-block-deserialize.d.ts.map