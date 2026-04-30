export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type ViewportChangeReason = 'pan' | 'wheel-zoom' | 'panel-zoom' | 'reset' | 'set';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

export class ViewportController {
  constructor(
    private readonly getViewport: () => Viewport,
    private readonly setViewport: (next: Viewport, reason: ViewportChangeReason) => void,
  ) {}

  /**
   * Convert canvas client coordinates to world coordinates.
   * Accounts for the canvas element's bounding rect and current viewport transform.
   */
  clientToWorld(clientX: number, clientY: number, canvas: HTMLElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const vp = this.getViewport();
    return {
      x: (clientX - rect.left) / vp.zoom + vp.x,
      y: (clientY - rect.top) / vp.zoom + vp.y,
    };
  }

  /** Convert world coordinates to canvas client coordinates. */
  worldToClient(x: number, y: number, canvas: HTMLElement): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const vp = this.getViewport();
    return {
      x: (x - vp.x) * vp.zoom + rect.left,
      y: (y - vp.y) * vp.zoom + rect.top,
    };
  }

  /**
   * Wheel-zoom around a screen anchor point.
   * The world point under the anchor stays fixed after the zoom.
   */
  zoomAt(anchor: { x: number; y: number }, factor: number, canvas: HTMLElement): void {
    const vp = this.getViewport();
    const rect = canvas.getBoundingClientRect();

    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * factor));
    if (newZoom === vp.zoom) return;

    // World point under the anchor must remain fixed:
    // anchor = (worldX - newVp.x) * newZoom + rect.left
    // => newVp.x = worldX - (anchor - rect.left) / newZoom
    const worldX = (anchor.x - rect.left) / vp.zoom + vp.x;
    const worldY = (anchor.y - rect.top) / vp.zoom + vp.y;

    this.setViewport(
      {
        x: worldX - (anchor.x - rect.left) / newZoom,
        y: worldY - (anchor.y - rect.top) / newZoom,
        zoom: newZoom,
      },
      'wheel-zoom',
    );
  }

  /** Pan by a delta in screen pixels. */
  panBy(dx: number, dy: number): void {
    const vp = this.getViewport();
    this.setViewport(
      {
        x: vp.x - dx / vp.zoom,
        y: vp.y - dy / vp.zoom,
        zoom: vp.zoom,
      },
      'pan',
    );
  }

  /** Set zoom anchored at the canvas centre. Used by the zoom panel buttons. */
  zoomBy(factor: number, canvas: HTMLElement): void {
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const vp = this.getViewport();

    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * factor));
    if (newZoom === vp.zoom) return;

    const worldX = rect.width / 2 / vp.zoom + vp.x;
    const worldY = rect.height / 2 / vp.zoom + vp.y;

    this.setViewport(
      {
        x: worldX - (centerX - rect.left) / newZoom,
        y: worldY - (centerY - rect.top) / newZoom,
        zoom: newZoom,
      },
      'panel-zoom',
    );
  }

  /** Returns the current world transform that the renderer should apply. */
  getWorldTransform(): { translateX: number; translateY: number; scale: number } {
    const vp = this.getViewport();
    return {
      translateX: -vp.x * vp.zoom,
      translateY: -vp.y * vp.zoom,
      scale: vp.zoom,
    };
  }
}
