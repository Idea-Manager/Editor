import type { EditorContext } from './editor-context';
import type { BlockRenderer } from '../renderer/block-renderer';
import type { SelectionSync } from './selection-sync';
import type { SlashPaletteLike } from '../toolbar/toolbar-options';
export declare class InputInterceptor {
    private readonly ctx;
    private readonly blockRenderer;
    private readonly selectionSync;
    private readonly classifier;
    private readonly markManager;
    private readonly disposers;
    private slashPalette;
    constructor(ctx: EditorContext, blockRenderer: BlockRenderer, selectionSync: SelectionSync);
    setSlashPalette(palette: SlashPaletteLike): void;
    destroy(): void;
    private attach;
    private handleKeydown;
    private handleBeforeInput;
    private handleSelectionChange;
    private dispatch;
    private handleInsertText;
    private handleDelete;
    private handleMergeBackward;
    private handleSplitBlock;
    private handleToggleMark;
    private handleSelectAll;
    private handleIndent;
    private handleOutdent;
    private deleteSelection;
    private blockInsideTableCell;
    private emitChange;
}
//# sourceMappingURL=input-interceptor.d.ts.map