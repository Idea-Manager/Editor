import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
/**
 * Handles background-drag lasso selection.
 *
 * Activation: pointerdown where hitTest returns null (empty canvas).
 * Renders a `.idea-graphic-lasso` div in the selectionLayer during drag.
 * On pointerup: selects all elements whose AABB intersects the lasso world rect.
 * Shift: adds to existing selection instead of replacing it.
 */
export declare class LassoController {
    private readonly ctx;
    private readonly selectionManager;
    private readonly selectionLayer;
    private active;
    private shiftHeld;
    private startClientX;
    private startClientY;
    private lassoEl;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onPointerCancel;
    constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager, selectionLayer: HTMLElement);
    private _handlePointerDown;
    private _handlePointerMove;
    private _handlePointerUp;
    private _handlePointerCancel;
    private _computeRects;
    private _getCanvas;
    private _cleanup;
    destroy(): void;
}
//# sourceMappingURL=lasso-controller.d.ts.map