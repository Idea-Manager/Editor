import type { FrameElement } from '@core/model/interfaces';
/**
 * Renders a FrameElement into the SVG world group and the DOM overlay layer.
 *
 * SVG: a dashed rect using design-token CSS class (idea-graphic-frame__rect).
 * DOM: an overlay label positioned just above the top-left corner in world
 *      space (the overlay's CSS transform maps it to screen coords).
 *
 * Note: auto-attach on frame move/resize is intentionally NOT performed here.
 * Auto-attach happens only at frame creation time and at element creation time.
 * Re-attachment after move is a manual action (handled in a future group window).
 */
export declare class FrameRenderer {
    /**
     * Renders a single frame.
     *
     * @param frame       The frame to render.
     * @param worldGroup  SVG <g> element with the world transform applied.
     * @param overlayEl   DOM div with the same world-space CSS transform.
     */
    renderFrame(frame: FrameElement, worldGroup: SVGGElement, overlayEl: HTMLElement): void;
    private _renderSvg;
    private _renderLabel;
}
//# sourceMappingURL=frame-renderer.d.ts.map