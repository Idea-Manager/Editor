import type { GraphicContext } from './graphic-context';
import type { CanvasRenderer } from './canvas-renderer';
import type { GraphicSelectionManager } from './selection-manager';
import type { ArrowEndpoint } from '../blocks/arrow/arrow-block';
import { ARROW_DEFAULTS } from '../blocks/arrow/arrow-block';
import { AddArrowCommand } from './commands/add-arrow-command';
import { UpdateArrowEndpointCommand } from './commands/update-arrow-endpoint-command';
import type { GraphicElement } from '@core/model/interfaces';
import type { ArrowData } from '../blocks/arrow/arrow-block';
import { getGraphicPreferences } from '@core/model/document-data';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Minimum drag distance (in world units) to commit a new arrow. */
const MIN_DRAG_DIST = 4;

/** Snap threshold in screen pixels for pivot snapping. */
const SNAP_THRESHOLD_PX = 12;

/** Endpoint drag merge window in milliseconds. */
const ENDPOINT_MERGE_MS = 300;

interface DrawState {
  from: ArrowEndpoint;
  to: ArrowEndpoint;
  capturedPointerId: number;
  /** Pivot source for the no-move guard: the elementId that originated the draw. */
  fromElementId?: string;
  hasMoved: boolean;
}

interface EditState {
  elementId: string;
  which: 'from' | 'to';
  capturedPointerId: number;
}

/**
 * Handles the 'arrow' tool: click-to-draw new arrows and drag-endpoint editing
 * of existing arrows.
 *
 * Activated by:
 *  - `toolState.getTool() === 'arrow'` pointer-down on canvas
 *  - `graphic:start-arrow` event emitted by selection-manager edge handles
 */
export class ArrowController {
  private readonly ctx: GraphicContext;
  private readonly canvas: HTMLElement;
  private readonly canvasRenderer: CanvasRenderer;
  private readonly selectionManager: GraphicSelectionManager;

  private drawState: DrawState | null = null;
  private editState: EditState | null = null;

  /** Temporary SVG elements drawn during a drag. */
  private previewGroup: SVGGElement | null = null;

  private readonly onPointerMoveGlobal: (e: PointerEvent) => void;
  private readonly onPointerUpGlobal: (e: PointerEvent) => void;
  private readonly onPointerCancelGlobal: () => void;

  private readonly disposeStartArrow: () => void;

  constructor(
    ctx: GraphicContext,
    canvas: HTMLElement,
    canvasRenderer: CanvasRenderer,
    selectionManager: GraphicSelectionManager,
  ) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.canvasRenderer = canvasRenderer;
    this.selectionManager = selectionManager;

    this.onPointerMoveGlobal = this._handlePointerMoveGlobal.bind(this);
    this.onPointerUpGlobal = this._handlePointerUpGlobal.bind(this);
    this.onPointerCancelGlobal = this._handlePointerCancelGlobal.bind(this);

    // Listen for arrow-start from selection edge handles (prompt 07)
    this.disposeStartArrow = ctx.eventBus.on<{
      fromPoint: { x: number; y: number };
      fromElementId: string;
      pointerId: number;
    }>('graphic:start-arrow', (payload) => {
      if (!payload) return;
      this._beginDraw(
        { point: payload.fromPoint },
        { point: payload.fromPoint },
        payload.pointerId,
        payload.fromElementId,
      );
    });
  }

  isDrawing(): boolean {
    return this.drawState !== null;
  }

  /**
   * Entry point called by GraphicEditor's canvas pointerdown handler
   * when `toolState.getTool() === 'arrow'`.
   */
  handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    e.stopPropagation();

    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const from: ArrowEndpoint = { point: { ...world } };
    const to: ArrowEndpoint = { point: { ...world } };

    this._beginDraw(from, to, e.pointerId);
  }

  /**
   * Entry point for endpoint-drag on a selected arrow.
   * Called from the selection overlay when data-arrow-endpoint is clicked.
   */
  handleEndpointPointerDown(
    e: PointerEvent,
    elementId: string,
    which: 'from' | 'to',
  ): void {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    this.editState = { elementId, which, capturedPointerId: e.pointerId };
    this.canvas.setPointerCapture(e.pointerId);

    document.addEventListener('pointermove', this.onPointerMoveGlobal);
    document.addEventListener('pointerup', this.onPointerUpGlobal);
    document.addEventListener('pointercancel', this.onPointerCancelGlobal);
  }

  cancelDraw(): void {
    if (!this.drawState) return;
    this._cleanupDraw(false);
  }

  destroy(): void {
    this._cleanupDraw(false);
    this._cleanupEdit(false);
    this.disposeStartArrow();
  }

  // ─── Private — drawing ────────────────────────────────────────────────────

  private _beginDraw(
    from: ArrowEndpoint,
    to: ArrowEndpoint,
    pointerId: number,
    fromElementId?: string,
  ): void {
    this.drawState = {
      from: { ...from, point: { ...from.point } },
      to: { ...to, point: { ...to.point } },
      capturedPointerId: pointerId,
      fromElementId,
      hasMoved: false,
    };

    this.canvas.setPointerCapture(pointerId);
    this._createPreview();

    document.addEventListener('pointermove', this.onPointerMoveGlobal);
    document.addEventListener('pointerup', this.onPointerUpGlobal);
    document.addEventListener('pointercancel', this.onPointerCancelGlobal);
  }

  private _handlePointerMoveGlobal(e: PointerEvent): void {
    if (this.drawState) {
      this._handleDrawMove(e);
    } else if (this.editState) {
      this._handleEditMove(e);
    }
  }

  private _handlePointerUpGlobal(e: PointerEvent): void {
    if (this.drawState) {
      this._handleDrawUp(e);
    } else if (this.editState) {
      this._handleEditUp(e);
    }
  }

  private _handlePointerCancelGlobal(): void {
    this._cleanupDraw(false);
    this._cleanupEdit(false);
  }

  private _handleDrawMove(e: PointerEvent): void {
    if (!this.drawState) return;

    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const snapped = this._snapToPivot(e.clientX, e.clientY, world);

    this.drawState.to = snapped;

    const dx = world.x - this.drawState.from.point.x;
    const dy = world.y - this.drawState.from.point.y;
    if (Math.sqrt(dx * dx + dy * dy) > MIN_DRAG_DIST / this.ctx.page.viewport.zoom) {
      this.drawState.hasMoved = true;
    }

    this._updatePreview();
  }

  private _handleDrawUp(e: PointerEvent): void {
    if (!this.drawState) return;

    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const snapped = this._snapToPivot(e.clientX, e.clientY, world);
    this.drawState.to = snapped;

    const dx = this.drawState.to.point.x - this.drawState.from.point.x;
    const dy = this.drawState.to.point.y - this.drawState.from.point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If the drag started from a pivot and the user didn't move enough, discard.
    const tooShort = dist < MIN_DRAG_DIST;
    this._cleanupDraw(!tooShort);
  }

  private _cleanupDraw(commit: boolean): void {
    if (!this.drawState) return;

    const state = this.drawState;
    this.drawState = null;

    try {
      this.canvas.releasePointerCapture(state.capturedPointerId);
    } catch { /* already released */ }

    document.removeEventListener('pointermove', this.onPointerMoveGlobal);
    document.removeEventListener('pointerup', this.onPointerUpGlobal);
    document.removeEventListener('pointercancel', this.onPointerCancelGlobal);

    this._removePreview();

    if (commit) {
      this._commitArrow(state);
    }
  }

  private _commitArrow(state: DrawState): void {
    const { document: doc, page, undoRedoManager, eventBus, registry } = this.ctx;

    // Merge ARROW_DEFAULTS with per-doc arrow defaults (if any)
    const savedDefaults = (getGraphicPreferences(doc)['arrow'] ?? {}) as Partial<ArrowData>;
    const effectiveDefaults = { ...ARROW_DEFAULTS, ...savedDefaults };

    const cmd = new AddArrowCommand({
      doc,
      pageId: page.id,
      registry,
      from: state.from,
      to: state.to,
      overrides: effectiveDefaults,
    });

    undoRedoManager.push(cmd);
    eventBus.emit('element:add');
    eventBus.emit('doc:change');
  }

  // ─── Private — endpoint editing ───────────────────────────────────────────

  private _handleEditMove(e: PointerEvent): void {
    if (!this.editState) return;

    const world = this.ctx.viewportController.clientToWorld(e.clientX, e.clientY, this.canvas);
    const snapped = this._snapToPivot(e.clientX, e.clientY, world);

    const { document: doc, page, undoRedoManager, eventBus } = this.ctx;

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: page.id,
      elementId: this.editState.elementId,
      which: this.editState.which,
      endpoint: snapped,
      mergeWindowMs: ENDPOINT_MERGE_MS,
    });

    undoRedoManager.push(cmd);
    eventBus.emit('element:update');
    eventBus.emit('doc:change');
  }

  private _handleEditUp(_e: PointerEvent): void {
    this._cleanupEdit(true);
  }

  private _cleanupEdit(_commit: boolean): void {
    if (!this.editState) return;

    const state = this.editState;
    this.editState = null;

    try {
      this.canvas.releasePointerCapture(state.capturedPointerId);
    } catch { /* already released */ }

    document.removeEventListener('pointermove', this.onPointerMoveGlobal);
    document.removeEventListener('pointerup', this.onPointerUpGlobal);
    document.removeEventListener('pointercancel', this.onPointerCancelGlobal);
  }

  // ─── Private — pivot snapping ──────────────────────────────────────────────

  /**
   * Returns an `ArrowEndpoint` that may be snapped to a pivot on an element
   * within `SNAP_THRESHOLD_PX` screen pixels of `(clientX, clientY)`.
   * Falls back to a free endpoint at the provided world coords.
   */
  private _snapToPivot(
    clientX: number,
    clientY: number,
    worldFallback: { x: number; y: number },
  ): ArrowEndpoint {
    const { page, registry, viewportController } = this.ctx;
    const zoom = page.viewport.zoom;

    let bestDist = SNAP_THRESHOLD_PX;
    let best: ArrowEndpoint | null = null;

    for (const el of page.elements) {
      if (el.type === 'arrow') continue;
      if (!registry.has(el.type)) continue;

      const def = registry.get(el.type);
      const pivots = def.pivots ?? [];
      const bounds = def.getBounds(el);

      for (const pivot of pivots) {
        const worldPx = bounds.x + pivot.x * bounds.width;
        const worldPy = bounds.y + pivot.y * bounds.height;

        const screen = viewportController.worldToClient(worldPx, worldPy, this.canvas);
        const dx = screen.x - clientX;
        const dy = screen.y - clientY;
        const screenDist = Math.sqrt(dx * dx + dy * dy);

        if (screenDist < bestDist) {
          bestDist = screenDist;
          best = {
            target: { elementId: el.id, pivotId: pivot.id },
            point: { x: worldPx, y: worldPy },
          };
        }
      }

      // Also check element body centre as a fallback pivot if no named pivots
      if (pivots.length === 0) {
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const screen = viewportController.worldToClient(cx, cy, this.canvas);
        const dx = screen.x - clientX;
        const dy = screen.y - clientY;
        const screenDist = Math.sqrt(dx * dx + dy * dy) / zoom;

        if (screenDist < bestDist) {
          bestDist = screenDist;
          best = {
            target: { elementId: el.id },
            point: { x: cx, y: cy },
          };
        }
      }
    }

    return best ?? { point: { ...worldFallback } };
  }

  // ─── Private — preview SVG ────────────────────────────────────────────────

  private _createPreview(): void {
    this._removePreview();

    const worldGroup = this.canvasRenderer.getWorldGroup();
    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.classList.add('idea-graphic-arrow-preview');

    const path = document.createElementNS(SVG_NS, 'path') as SVGPathElement;
    path.setAttribute('stroke', '#888888');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-dasharray', '4 4');
    g.appendChild(path);

    worldGroup.appendChild(g);
    this.previewGroup = g;
  }

  private _removePreview(): void {
    this.previewGroup?.remove();
    this.previewGroup = null;
  }

  private _updatePreview(): void {
    if (!this.previewGroup || !this.drawState) return;

    const { from, to } = this.drawState;
    const path = this.previewGroup.querySelector('path')!;
    const dx = to.point.x - from.point.x;
    const dy = to.point.y - from.point.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) return;

    const mx = (from.point.x + to.point.x) / 2;
    const my = (from.point.y + to.point.y) / 2;
    const nx = -dy / dist;
    const ny = dx / dist;
    const offset = Math.min(dist * 0.25, 80);
    const cpx = mx + nx * offset;
    const cpy = my + ny * offset;

    path.setAttribute(
      'd',
      `M ${from.point.x} ${from.point.y} Q ${cpx} ${cpy} ${to.point.x} ${to.point.y}`,
    );
  }
}
