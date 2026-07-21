import type { EditorContext } from '../engine/editor-context';
import { SelectionSync } from '../engine/selection-sync';
import { type FloatingToolbarConfig } from './toolbar-options';
export declare class FloatingToolbar {
    private readonly ctx;
    private readonly host;
    private overlay;
    private colorPicker;
    private linkFlyout;
    private linkFlyoutClose;
    private visible;
    private showTimer;
    /** Suppress toolbar during table cell range drag or while table context menu is open. */
    private tableRangeUiActive;
    private readonly markManager;
    private readonly disposers;
    private readonly selectionSync;
    private readonly toolbarConfig;
    constructor(ctx: EditorContext, host: HTMLElement, selectionSync?: SelectionSync, config?: Partial<FloatingToolbarConfig>);
    destroy(): void;
    isVisible(): boolean;
    private attach;
    private onSelectionChange;
    private showAtSelection;
    hide(): void;
    private clearColorPicker;
    private hideLinkFlyout;
    private getConvertiblePaletteItems;
    private findPaletteItemForBlock;
    /** Unique blocks touched by the selection (paragraphs, headings, etc.), in span order. */
    private getToolbarTargetBlocks;
    private createOverlay;
    private updateActiveStates;
    private getSelectionBoundingRect;
    private positionOverlay;
    private resolveInitialTextColorForPicker;
    private fallbackComputedTextColor;
    private resolveInitialHrefForInput;
    private openLinkFlyout;
    private openTextColorPicker;
    private toggleMark;
    private setAlign;
    private changeBlockType;
}
//# sourceMappingURL=floating-toolbar.d.ts.map