import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager, SelectionEntry } from './selection-manager';
import type { HitTarget } from './hit-tester';
import { aabbIntersect } from './hit-tester';

/**
 * Handles background-drag lasso selection.
 *
 * Activation: pointerdown where hitTest returns null (empty canvas).
 * Renders a `.idea-graphic-lasso` div in the selectionLayer during drag.
 * On pointerup: selects all elements whose AABB intersects the lasso world rect.
 * Shift: adds to existing selection instead of replacing it.
 */
export class LassoController {
  private readonly ctx: GraphicContext;
  private readonly selectionManager: GraphicSelectionManager;
  private readonly selectionLayer: HTMLElement;

  private active = false;
  private shiftHeld = false;
  private startClientX = 0;
  private startClientY = 0;
  private lassoEl: HTMLDivElement | null = null;

  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: () => void;

  constructor(
    ctx: GraphicContext,
    selectionManager: GraphicSelectionManager,
    selectionLayer: HTMLElement,
  ) {
    this.ctx = ctx;
    this.selectionManager = selectionManager;
    this.selectionLayer = selectionLayer;

    this.onPointerMove = this._handlePointerMove.bind(this);
    this.onPointerUp = this._handlePointerUp.bind(this);
    this.onPointerCancel = this._handlePointerCancel.bind(this);

    selectionManager.registerPointerDownHandler(this._handlePointerDown.bind(this));
  }

  private _handlePointerDown(event: PointerEvent, target: HitTarget | null): void {
    if (target !== null) return;

    this.active = true;
    this.shiftHeld = event.shiftKey;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;

    // Create lasso div
    const canvas = this._getCanvas();
    const canvasRect = canvas?.getBoundingClientRect();
    const startX = canvasRect ? event.clientX - canvasRect.left : 0;
    const startY = canvasRect ? event.clientY - canvasRect.top : 0;

    this.lassoEl = document.createElement('div');
    this.lassoEl.className = 'idea-graphic-lasso';
    this.lassoEl.style.left = `${startX}px`;
    this.lassoEl.style.top = `${startY}px`;
    this.lassoEl.style.width = '0px';
    this.lassoEl.style.height = '0px';
    this.selectionLayer.appendChild(this.lassoEl);

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!this.active || !this.lassoEl) return;

    const canvas = this._getCanvas();
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const { screenRect } = this._computeRects(event.clientX, event.clientY, canvasRect);

    this.lassoEl.style.left = `${screenRect.x}px`;
    this.lassoEl.style.top = `${screenRect.y}px`;
    this.lassoEl.style.width = `${screenRect.width}px`;
    this.lassoEl.style.height = `${screenRect.height}px`;
  }

  private _handlePointerUp(event: PointerEvent): void {
    if (!this.active) return;

    const canvas = this._getCanvas();
    if (canvas) {
      const canvasRect = canvas.getBoundingClientRect();
      const { worldRect } = this._computeRects(event.clientX, event.clientY, canvasRect);

      // Find all elements whose AABB intersects the lasso world rect
      const page = this.ctx.page;
      const registry = this.ctx.registry;
      const matched: SelectionEntry[] = [];

      for (const el of page.elements) {
        if (!registry.has(el.type)) continue;
        const bounds = registry.get(el.type).getBounds(el);
        if (aabbIntersect(bounds, worldRect)) {
          matched.push({ type: 'element', id: el.id });
        }
      }

      if (this.shiftHeld) {
        // Add matched to existing, avoiding duplicates
        const existing = this.selectionManager.getSelection();
        const existingIds = new Set(existing.map(e => e.id));
        const toAdd = matched.filter(e => !existingIds.has(e.id));
        this.selectionManager.setSelection([...existing, ...toAdd]);
      } else {
        this.selectionManager.setSelection(matched);
      }
    }

    this._cleanup();
  }

  private _handlePointerCancel(): void {
    this._cleanup();
  }

  private _computeRects(
    clientX: number,
    clientY: number,
    canvasRect: DOMRect,
  ): {
    screenRect: { x: number; y: number; width: number; height: number };
    worldRect: { x: number; y: number; width: number; height: number };
  } {
    const vp = this.ctx.page.viewport;

    const startScreenX = this.startClientX - canvasRect.left;
    const startScreenY = this.startClientY - canvasRect.top;
    const curScreenX = clientX - canvasRect.left;
    const curScreenY = clientY - canvasRect.top;

    const screenMinX = Math.min(startScreenX, curScreenX);
    const screenMinY = Math.min(startScreenY, curScreenY);
    const screenMaxX = Math.max(startScreenX, curScreenX);
    const screenMaxY = Math.max(startScreenY, curScreenY);

    const screenRect = {
      x: screenMinX,
      y: screenMinY,
      width: screenMaxX - screenMinX,
      height: screenMaxY - screenMinY,
    };

    // Convert screen rect to world coords
    const worldRect = {
      x: screenMinX / vp.zoom + vp.x,
      y: screenMinY / vp.zoom + vp.y,
      width: (screenMaxX - screenMinX) / vp.zoom,
      height: (screenMaxY - screenMinY) / vp.zoom,
    };

    return { screenRect, worldRect };
  }

  private _getCanvas(): HTMLElement | null {
    return this.ctx.rootElement.querySelector<HTMLElement>('.idea-graphic-canvas');
  }

  private _cleanup(): void {
    this.active = false;
    this.lassoEl?.remove();
    this.lassoEl = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }

  destroy(): void {
    this._cleanup();
  }
}
