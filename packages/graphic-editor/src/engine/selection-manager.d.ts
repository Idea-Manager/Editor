import type { GraphicPageNode } from '@core/model/interfaces';
import type { GraphicContext } from './graphic-context';
import type { GraphicRenderContext } from './render-context';
import type { HitTarget } from './hit-tester';
export interface SelectionEntry {
    type: 'element' | 'frame';
    id: string;
}
type PointerDownHandler = (event: PointerEvent, target: HitTarget | null) => void;
/**
 * Manages the set of selected graphic elements/frames and renders the
 * selection overlay (bounding rect + handles) into the screen-space
 * `selectionLayer` div provided by CanvasRenderer.
 *
 * The selection overlay is intentionally in screen space so that handles
 * stay at 12px regardless of viewport zoom.
 */
export declare class GraphicSelectionManager {
    private entries;
    private readonly ctx;
    /** ID of the element currently highlighted by the floating properties window focus. */
    private focusedTargetId;
    /** Registered handlers (drag/resize/lasso controllers) called on pointerdown. */
    private readonly pointerDownHandlers;
    constructor(ctx: GraphicContext);
    /**
     * Sets the element that the floating properties window is currently focused on.
     * Triggers a re-render so the secondary focus ring is applied.
     */
    setFocusedHighlight(id: string | null): void;
    getFocusedHighlightId(): string | null;
    getSelection(): SelectionEntry[];
    has(id: string): boolean;
    setSelection(entries: SelectionEntry[], options?: {
        bypassGrouping?: boolean;
    }): void;
    add(entry: SelectionEntry, options?: {
        bypassGrouping?: boolean;
    }): void;
    remove(id: string): void;
    clear(): void;
    /**
     * Returns the combined AABB of all selected elements/frames in world coords.
     * Returns null when the selection is empty.
     */
    getBoundingRect(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    /**
     * Rebuilds the `.idea-graphic-selection` div inside `host` (the selectionLayer).
     * Called after every render pass.
     */
    renderOverlay(host: HTMLElement, page: GraphicPageNode, renderCtx: GraphicRenderContext): void;
    /**
     * Register a handler to be called on every pointerdown processed by this manager.
     * Controllers (DragController, ResizeController, LassoController) use this to activate.
     */
    registerPointerDownHandler(handler: PointerDownHandler): void;
    /**
     * Called by the canvas root pointerdown listener.
     * Updates selection based on the hit target, then notifies registered controllers.
     * No-ops when a non-selection tool is active (placement handled separately).
     */
    handlePointerDown(event: PointerEvent, target: HitTarget | null): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=selection-manager.d.ts.map