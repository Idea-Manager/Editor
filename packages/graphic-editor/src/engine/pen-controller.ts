import type { GraphicContext } from './graphic-context';
import type { CanvasRenderer } from './canvas-renderer';
import { smoothPoints, toPathD } from '../blocks/path/smooth-points';
import { AddPathCommand } from './commands/add-path-command';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Minimum number of buffered points required to commit a stroke.
 * Strokes with fewer points are treated as misclicks and discarded.
 */
const MIN_POINTS = 3;

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
export class PenController {
  private readonly ctx: GraphicContext;
  private readonly canvas: HTMLElement;
  private readonly canvasRenderer: CanvasRenderer;

  private drawing = false;
  private capturedPointerId: number | null = null;
  private buffer: Array<{ x: number; y: number }> = [];
  private rafId: number | null = null;

  /** Temporary SVG group appended to the world group during drawing. */
  private previewGroup: SVGGElement | null = null;
  private previewPath: SVGPathElement | null = null;

  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: () => void;

  constructor(ctx: GraphicContext, canvas: HTMLElement, canvasRenderer: CanvasRenderer) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.canvasRenderer = canvasRenderer;

    this.onPointerMove = this._handlePointerMove.bind(this);
    this.onPointerUp = this._handlePointerUp.bind(this);
    this.onPointerCancel = this._handlePointerCancel.bind(this);
  }

  isDrawing(): boolean {
    return this.drawing;
  }

  handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    e.stopPropagation();

    this.buffer = [];
    this.drawing = true;
    this.capturedPointerId = e.pointerId;

    // Capture pointer so all subsequent move/up events come to the canvas
    // element even when the pointer leaves its bounds.
    this.canvas.setPointerCapture(e.pointerId);

    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    this.buffer.push(world);

    this._createPreview();

    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
  }

  cancelDraw(): void {
    if (!this.drawing) return;
    this._cleanup(false);
  }

  destroy(): void {
    this._cleanup(false);
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private _handlePointerMove(e: PointerEvent): void {
    if (!this.drawing) return;
    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    this.buffer.push(world);
    this._schedulePreviewUpdate();
  }

  private _handlePointerUp(e: PointerEvent): void {
    if (!this.drawing) return;
    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    this.buffer.push(world);
    this._cleanup(true);
  }

  private _handlePointerCancel(): void {
    if (!this.drawing) return;
    this._cleanup(false);
  }

  private _cleanup(commit: boolean): void {
    this.drawing = false;

    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Release pointer capture
    if (this.capturedPointerId !== null) {
      try {
        this.canvas.releasePointerCapture(this.capturedPointerId);
      } catch {
        // May already be released (e.g. on cancel)
      }
      this.capturedPointerId = null;
    }

    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);

    this._removePreview();

    if (commit) {
      this._commitStroke();
    }

    this.buffer = [];
  }

  private _commitStroke(): void {
    if (this.buffer.length < MIN_POINTS) return;

    const smoothed = smoothPoints(this.buffer);
    const { eventBus, undoRedoManager, document: doc, page, registry } = this.ctx;

    const cmd = new AddPathCommand({
      doc,
      pageId: page.id,
      registry,
      points: smoothed,
    });

    undoRedoManager.push(cmd);
    eventBus.emit('element:add');
    eventBus.emit('doc:change');
  }

  // ─── Preview path ──────────────────────────────────────────────────────────

  private _createPreview(): void {
    this._removePreview();

    const worldGroup = this.canvasRenderer.getWorldGroup();

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.classList.add('idea-graphic-pen-preview');

    const path = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
    // strokeWidth is stored in world units; use PATH_DEFAULTS for the live preview
    path.setAttribute('stroke-width', '2');
    g.appendChild(path);

    worldGroup.appendChild(g);
    this.previewGroup = g;
    this.previewPath = path;
  }

  private _removePreview(): void {
    this.previewGroup?.remove();
    this.previewGroup = null;
    this.previewPath = null;
  }

  private _schedulePreviewUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this._updatePreview();
    });
  }

  private _updatePreview(): void {
    if (!this.previewPath || this.buffer.length === 0) return;
    // Show raw (unsmoothed) buffer for responsiveness; smoothing runs on commit.
    this.previewPath.setAttribute('d', toPathD(this.buffer));
  }
}
