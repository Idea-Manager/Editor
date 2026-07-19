import type { GraphicContext } from './graphic-context';
import type { CanvasRenderer } from './canvas-renderer';
/**
 * Handles the 'frame' tool drag-to-create interaction.
 *
 * Active when toolState.getTool() === 'frame'.
 * Draws a temporary preview rect in the SVG world group during drag.
 * On pointerup (if the rect is >= 8px), pushes an AddFrameCommand + AttachToFrameCommand
 * for every existing element whose AABB intersects the new frame.
 *
 * Auto-attach only happens at frame-creation time and at element-creation time.
 * Moving a frame does NOT auto-attach newly overlapping elements — that is intentional
 * and aligns with the roadmap (manual re-attachment via a future group window).
 */
export declare class FrameController {
    private readonly ctx;
    private readonly canvas;
    private readonly canvasRenderer;
    private drawing;
    private startWorld;
    private previewGroup;
    private previewRect;
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
    private _commitFrame;
    private _createPreview;
    private _updatePreview;
    private _removePreview;
}
//# sourceMappingURL=frame-controller.d.ts.map