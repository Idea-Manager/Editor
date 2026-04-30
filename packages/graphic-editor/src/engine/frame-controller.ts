import type { GraphicContext } from './graphic-context';
import type { CanvasRenderer } from './canvas-renderer';
import { AddFrameCommand } from './commands/add-frame-command';
import { AttachToFrameCommand } from './commands/attach-to-frame-command';
import { CompositeCommand } from '@core/commands/composite-command';
import { aabbIntersect } from './hit-tester';
import type { Rect } from '@core/model/interfaces';
import { GRAPHIC_FRAME_DEFAULT_NAME } from '../i18n/keys';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Minimum side length in world pixels for a committed frame. Smaller drags are aborted. */
const MIN_FRAME_SIZE_PX = 8;

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
export class FrameController {
  private readonly ctx: GraphicContext;
  private readonly canvas: HTMLElement;
  private readonly canvasRenderer: CanvasRenderer;

  private drawing = false;
  private startWorld: { x: number; y: number } | null = null;
  private previewGroup: SVGGElement | null = null;
  private previewRect: SVGRectElement | null = null;

  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: () => void;

  constructor(ctx: GraphicContext, canvas: HTMLElement, canvasRenderer: CanvasRenderer) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.canvasRenderer = canvasRenderer;

    this.onPointerMove = this._handlePointerMove.bind(this);
    this.onPointerUp = this._handlePointerUp.bind(this);
    this.onPointerCancel = this.cancelDraw.bind(this);
  }

  isDrawing(): boolean {
    return this.drawing;
  }

  handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const tool = this.ctx.toolState?.getTool();
    if (tool !== 'frame') return;

    e.stopPropagation();

    const worldPos = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    this.startWorld = worldPos;
    this.drawing = true;

    this._createPreview(worldPos.x, worldPos.y, 0, 0);

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  cancelDraw(): void {
    if (!this.drawing) return;
    this.drawing = false;
    this.startWorld = null;
    this._removePreview();
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }

  destroy(): void {
    this.cancelDraw();
  }

  private _handlePointerMove(e: PointerEvent): void {
    if (!this.drawing || !this.startWorld) return;

    const worldPos = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const rect = _normalizeRect(this.startWorld, worldPos);
    this._updatePreview(rect);
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (!this.drawing || !this.startWorld) return;

    const worldPos = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const rect = _normalizeRect(this.startWorld, worldPos);

    this.drawing = false;
    this.startWorld = null;
    this._removePreview();

    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);

    if (rect.width < MIN_FRAME_SIZE_PX || rect.height < MIN_FRAME_SIZE_PX) {
      return;
    }

    this._commitFrame(rect);
  }

  private _commitFrame(rect: Rect): void {
    const { document: doc, page, undoRedoManager, eventBus, i18n } = this.ctx;
    const n = page.frames.length + 1;
    const name = i18n.t(GRAPHIC_FRAME_DEFAULT_NAME, { n });

    const addFrameCmd = new AddFrameCommand({ doc, pageId: page.id, rect, name });

    // Warn if the new frame overlaps an existing one.
    // Frames are not intended to overlap; future iterations may enforce this.
    if (page.frames.some(f => aabbIntersect(rect, { x: f.data.x, y: f.data.y, width: f.data.width, height: f.data.height }))) {
      console.warn(
        '[FrameController] New frame overlaps an existing frame. ' +
        'Frames are not intended to overlap; future iterations may enforce this.',
      );
    }

    // Find all existing elements that intersect the new frame's AABB.
    // Snapshot BEFORE execute so we read the current (pre-commit) element list.
    const intersecting = page.elements.filter(el => {
      if (!this.ctx.registry.has(el.type)) return false;
      const elBounds = this.ctx.registry.get(el.type).getBounds(el);
      return aabbIntersect(elBounds, rect);
    });

    const attachCmds = intersecting.map(
      el => new AttachToFrameCommand({ doc, pageId: page.id, frameId: addFrameCmd.frameId, elementId: el.id }),
    );

    // push() calls execute() internally; push the composite so undo reverts everything atomically.
    const composite = new CompositeCommand([addFrameCmd, ...attachCmds]);
    undoRedoManager.push(composite);

    eventBus.emit('frame:add');
    eventBus.emit('doc:change');
  }

  private _createPreview(x: number, y: number, width: number, height: number): void {
    this._removePreview();

    const worldGroup = this.canvasRenderer.getWorldGroup();

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.classList.add('idea-graphic-frame-preview');

    const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
    rect.classList.add('idea-graphic-frame-preview__rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));

    // Corner indicators (4px squares at each corner)
    const corners = [
      { cx: x,         cy: y },
      { cx: x + width, cy: y },
      { cx: x + width, cy: y + height },
      { cx: x,         cy: y + height },
    ];
    for (const { cx, cy } of corners) {
      const corner = document.createElementNS(SVG_NS, 'rect');
      corner.classList.add('idea-graphic-frame-preview__corner');
      corner.setAttribute('x', String(cx - 2));
      corner.setAttribute('y', String(cy - 2));
      corner.setAttribute('width', '4');
      corner.setAttribute('height', '4');
      g.appendChild(corner);
    }

    g.appendChild(rect);
    worldGroup.appendChild(g);

    this.previewGroup = g;
    this.previewRect = rect;
  }

  private _updatePreview(rect: Rect): void {
    if (!this.previewRect || !this.previewGroup) return;

    this.previewRect.setAttribute('x', String(rect.x));
    this.previewRect.setAttribute('y', String(rect.y));
    this.previewRect.setAttribute('width', String(rect.width));
    this.previewRect.setAttribute('height', String(rect.height));

    const corners = this.previewGroup.querySelectorAll('.idea-graphic-frame-preview__corner');
    const positions = [
      { x: rect.x - 2,              y: rect.y - 2 },
      { x: rect.x + rect.width - 2, y: rect.y - 2 },
      { x: rect.x + rect.width - 2, y: rect.y + rect.height - 2 },
      { x: rect.x - 2,              y: rect.y + rect.height - 2 },
    ];
    corners.forEach((corner, i) => {
      if (positions[i]) {
        corner.setAttribute('x', String(positions[i].x));
        corner.setAttribute('y', String(positions[i].y));
      }
    });
  }

  private _removePreview(): void {
    this.previewGroup?.remove();
    this.previewGroup = null;
    this.previewRect = null;
  }
}

/** Returns a normalised Rect with positive width/height from two arbitrary world points. */
function _normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}
