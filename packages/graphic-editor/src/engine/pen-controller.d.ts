import type { GraphicContext } from './graphic-context';
import type { CanvasRenderer } from './canvas-renderer';
/**
 * Handles the 'pen' tool freehand drawing interaction.
 *
 * Activation: pointerdown on the canvas while toolState.getTool() === 'pen'.
 * Uses setPointerCapture so pointermove/pointerup fire on the canvas element even
 * when the pointer leaves its bounds.
 *
 * Live rendering is throttled to animation frames to avoid redundant SVG mutations
 * mid-frame — the raw (unsmoothed) buffer is displayed during drag for responsiveness;
 * smoothing runs only at commit time.
 */
export declare class PenController {
    private readonly ctx;
    private readonly canvas;
    private readonly canvasRenderer;
    private drawing;
    private capturedPointerId;
    private buffer;
    private rafId;
    /** Temporary SVG group appended to the world group during drawing. */
    private previewGroup;
    private previewPath;
    private readonly onPointerMove;
    private readonly onPointerUp;
    private readonly onPointerCancel;
    constructor(ctx: GraphicContext, canvas: HTMLElement, canvasRenderer: CanvasRenderer);
    isDrawing(): boolean;
    handlePointerDown(e: PointerEvent): void;
    cancelDraw(): void;
    destroy(): void;
    private _handlePointerMove;
    private _handlePointerUp;
    private _handlePointerCancel;
    private _cleanup;
    private _commitStroke;
    private _createPreview;
    private _removePreview;
    private _schedulePreviewUpdate;
    private _updatePreview;
}
//# sourceMappingURL=pen-controller.d.ts.map