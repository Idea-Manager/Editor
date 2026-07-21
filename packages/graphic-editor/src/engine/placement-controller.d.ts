import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
/**
 * Handles ghost-placement mode ('placement' tool) and sticker single-click mode.
 *
 * Placement mode: shows a translucent ghost preview that follows the cursor.
 * On pointerdown, places the block at the cursor world position and selects it.
 * Selection change opens the floating properties window via GroupController.
 *
 * Sticker mode: a single click places a sticker immediately without a ghost.
 * The active tool stays 'sticker' so the user can drop multiple stickers.
 *
 * Canvas pointerdown is routed through GraphicEditor.bindPointerEvents — do not
 * register a separate listener here.
 */
export declare class PlacementController {
    private readonly ctx;
    private readonly selectionManager;
    private readonly canvas;
    private ghostEl;
    private readonly onToolChange;
    private readonly onPointerMove;
    constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager, canvas: HTMLElement);
    /**
     * Handles placement and sticker clicks. Returns true when the event was consumed.
     */
    handlePointerDown(e: PointerEvent): boolean;
    private _handleToolChange;
    private _handlePointerMove;
    private _createGhost;
    private _removeGhost;
    destroy(): void;
}
//# sourceMappingURL=placement-controller.d.ts.map