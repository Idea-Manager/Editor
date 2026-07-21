import type { BlockNode } from '@core/model/interfaces';
import type { EditorContext } from './editor-context';
import type { BlockRenderer } from '../renderer/block-renderer';
import type { SelectionSync } from './selection-sync';
import { type TextEditorClipboardOptions } from './clipboard-options';
export declare class ClipboardHandler {
    private readonly ctx;
    private readonly blockRenderer;
    private readonly selectionSync;
    private readonly clipboardOptions?;
    private readonly disposers;
    constructor(ctx: EditorContext, blockRenderer: BlockRenderer, selectionSync: SelectionSync, clipboardOptions?: TextEditorClipboardOptions | undefined);
    destroy(): void;
    private attach;
    private handleCopy;
    private handleCut;
    /**
     * After removing one block, place caret on the best neighbor: start of the block that
     * replaced the position, or end of the previous if the last block was cut.
     */
    private caretAfterSingleBlockDelete;
    private caretInBlockListAfterDelete;
    private resolveBlocksForCopy;
    private resolvePasteBlocksFromDataTransfer;
    private handlePaste;
    private serializeBlocks;
    private getSelectedBlocks;
    parsePlainText(text: string): BlockNode[];
    parseHtml(html: string): BlockNode[];
    private extractRuns;
    private createParagraphFromRuns;
    private escapeHtml;
}
//# sourceMappingURL=clipboard-handler.d.ts.map