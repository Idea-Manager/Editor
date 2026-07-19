import type { BlockSelection } from '@core/model/interfaces';
/** Safe for `[data-block-id="..."]` in querySelector; works in Jest where `CSS` may be missing. */
export declare function escapeSelectorAttr(value: string): string;
export declare class SelectionSync {
    syncToDOM(sel: BlockSelection, rootEl: HTMLElement): void;
    syncFromDOM(rootEl: HTMLElement): BlockSelection | null;
    /**
     * Client rect for the selection from the same DOM mapping as syncToDOM.
     * Prefer over window.getSelection() when the native range has no geometry (e.g. table cells).
     */
    getSelectionClientRect(rootEl: HTMLElement, sel: BlockSelection): DOMRect | null;
    private findTextNodeAtOffset;
    /** Resolves `[data-block-id]`; if multiple, prefer the one containing the live selection anchor. */
    private findBlockElement;
    private resolveBlockOffset;
    private computeElementOffset;
    private findBlockAncestor;
    private getLastTextNode;
}
//# sourceMappingURL=selection-sync.d.ts.map