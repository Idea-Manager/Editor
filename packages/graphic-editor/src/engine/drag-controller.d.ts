import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
/**
 * Handles drag-to-move for selected elements and frames.
 *
 * Activation: pointerdown on an element body, frame body, or grip handle
 * while the selection tool is active (or no tool override is set).
 *
 * Live update: mutates `element.data.x / .y` on every pointermove for
 * visual responsiveness. On pointerup, the live mutations are rolled back
 * and a single `MoveSelectionCommand` is pushed through the undo manager
 * so the final positions are applied atomically.
 */
export declare class DragController {
    private readonly ctx;
    private readonly selectionManager;
    private active;
    private startClientX;
    private startClientY;
    private accumulatedDx;
    private accumulatedDy;
    /** Snapshot of { elementId → {x, y} } taken at drag start for live rollback. */
    private startPositions;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onPointerCancel;
    constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager);
    private _handlePointerDown;
    private _handlePointerMove;
    private _handlePointerUp;
    private _handlePointerCancel;
    private _finish;
    /** Apply accumulated delta as live mutation (does not go through undo). */
    private _applyLiveDelta;
    /** Restore all positions to their snapshot values. */
    private _rollbackLive;
    destroy(): void;
}
//# sourceMappingURL=drag-controller.d.ts.map