import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
/**
 * Handles corner-handle resize for single-element selections.
 *
 * Activation: pointerdown on a `kind: 'handle'` target.
 *
 * - By default (`freeResize` false): width and height change by the same delta
 * - Rectangle (`freeResize` true): independent width/height corner resize
 * - Shift key: preserve aspect ratio when `freeResize` is true
 * - Clamps minimum size to 8px
 * - On pointerup: pushes a ResizeElementCommand
 */
export declare class ResizeController {
    private readonly ctx;
    private readonly selectionManager;
    private active;
    private handle;
    private elementId;
    private freeResize;
    private startClientX;
    private startClientY;
    private startBounds;
    private aspectRatio;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onPointerCancel;
    constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager);
    private _handlePointerDown;
    private _handlePointerMove;
    private _handlePointerUp;
    private _handlePointerCancel;
    private _computeNewBounds;
    private _cleanup;
    destroy(): void;
}
//# sourceMappingURL=resize-controller.d.ts.map