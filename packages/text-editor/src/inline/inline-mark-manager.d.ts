import type { BlockNode, TextRun, InlineMark } from '@core/model/interfaces';
export declare class InlineMarkManager {
    toggleMark(mark: InlineMark, block: BlockNode, startOffset: number, endOffset: number): TextRun[];
    setTextColorInRange(block: BlockNode, startOffset: number, endOffset: number, color: string): TextRun[];
    setLinkInRange(block: BlockNode, startOffset: number, endOffset: number, href: string | undefined): TextRun[];
    getActiveMarks(block: BlockNode, offset: number): InlineMark[];
    getActiveMarksInRange(block: BlockNode, start: number, end: number): InlineMark[];
    /** Uniform `data.color` across the range, or `undefined` if mixed / no overlapping text. */
    getUniformTextColorInRange(block: BlockNode, start: number, end: number): string | undefined;
    /** Uniform `data.href` across the range, or `undefined` if mixed / no overlap. */
    /**
     * Offset range covering the contiguous runs that share the same marks, color, and href as `runId`
     * (same merge rule as `mergeAdjacentRuns`).
     */
    expandContiguousStyledRange(block: BlockNode, runId: string): {
        start: number;
        end: number;
    } | null;
    getUniformHrefInRange(block: BlockNode, start: number, end: number): string | undefined;
    splitRunAtOffset(runs: TextRun[], offset: number): {
        before: TextRun[];
        after: TextRun[];
    };
    private splitRunsAtOffsets;
    private splitAtOffset;
    private rangeHasMark;
    mergeAdjacentRuns(runs: TextRun[]): TextRun[];
    private runStyleEqual;
    private marksEqual;
}
//# sourceMappingURL=inline-mark-manager.d.ts.map