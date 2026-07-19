import type { BlockNode, TextRun } from '@core/model/interfaces';
export declare function createDefaultCellBlocks(): BlockNode[];
/** Legacy cells stored inline runs in `content`. */
export declare function blocksFromLegacyCellContent(runs: TextRun[] | undefined): BlockNode[];
//# sourceMappingURL=table-cell-defaults.d.ts.map