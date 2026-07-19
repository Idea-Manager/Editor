export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}
export type ViewportChangeReason = 'pan' | 'wheel-zoom' | 'panel-zoom' | 'reset' | 'set';
export declare class ViewportController {
    private readonly getViewport;
    private readonly setViewport;
    constructor(getViewport: () => Viewport, setViewport: (next: Viewport, reason: ViewportChangeReason) => void);
    /**
     * Convert canvas client coordinates to world coordinates.
     * Accounts for the canvas element's bounding rect and current viewport transform.
     */
    clientToWorld(clientX: number, clientY: number, canvas: HTMLElement): {
        x: number;
        y: number;
    };
    /** Convert world coordinates to canvas client coordinates. */
    worldToClient(x: number, y: number, canvas: HTMLElement): {
        x: number;
        y: number;
    };
    /**
     * Wheel-zoom around a screen anchor point.
     * The world point under the anchor stays fixed after the zoom.
     */
    zoomAt(anchor: {
        x: number;
        y: number;
    }, factor: number, canvas: HTMLElement): void;
    /** Pan by a delta in screen pixels. */
    panBy(dx: number, dy: number): void;
    /** Set zoom anchored at the canvas centre. Used by the zoom panel buttons. */
    zoomBy(factor: number, canvas: HTMLElement): void;
    /** Returns the current world transform that the renderer should apply. */
    getWorldTransform(): {
        translateX: number;
        translateY: number;
        scale: number;
    };
}
//# sourceMappingURL=viewport-controller.d.ts.map