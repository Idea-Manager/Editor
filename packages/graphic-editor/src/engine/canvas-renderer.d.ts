import type { GraphicPageNode } from '@core/model/interfaces';
import type { ViewportController } from './viewport-controller';
import type { GraphicContext } from './graphic-context';
import type { GraphicRenderContext } from './render-context';
/**
 * Builds and maintains the SVG + DOM overlay layers for the graphic canvas.
 *
 * Background grid approach: CSS `radial-gradient` on the canvas element in
 * screen space (not an SVG pattern). This keeps the grid at a constant 20px
 * spacing regardless of zoom and is simpler to keep crisp.
 * The background-position is shifted by (-vp.x * vp.zoom % 20, -vp.y * vp.zoom % 20)
 * so the grid appears to drift as the user pans.
 */
export declare class CanvasRenderer {
    private canvasEl;
    private svgEl;
    private worldGroup;
    private overlayEl;
    private selectionLayerEl;
    private instanceId;
    private readonly frameRenderer;
    build(container: HTMLElement, instanceId: string): {
        canvas: HTMLDivElement;
        svg: SVGSVGElement;
        worldGroup: SVGGElement;
        overlay: HTMLDivElement;
        selectionLayer: HTMLDivElement;
    };
    /**
     * Apply the current viewport transform to the SVG world group and DOM overlay,
     * and shift the CSS dotted-grid background to stay in screen space.
     */
    applyViewport(viewportController: ViewportController): void;
    /**
     * Re-render the active page. Idempotent; called on every relevant event.
     * Iterates page elements, looks up each block definition in the registry,
     * and calls renderSvg / renderOverlay.
     *
     * @param renderSelectionOverlay Optional callback injected by GraphicEditor to
     *   render selection handles into the screen-space selectionLayer.
     */
    renderPage(page: GraphicPageNode, ctx: GraphicContext, renderSelectionOverlay?: (host: HTMLElement, page: GraphicPageNode, renderCtx: GraphicRenderContext) => void): void;
    destroy(): void;
    /** Exposes the SVG world group for controllers that need to append temporary elements (e.g. FrameController preview). */
    getWorldGroup(): SVGGElement;
    private _appendStickerShadowFilter;
}
//# sourceMappingURL=canvas-renderer.d.ts.map