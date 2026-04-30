import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
import type { HitTarget } from './hit-tester';
import { MoveSelectionCommand } from './commands/move-selection-command';

/**
 * Handles drag-to-move for selected elements and frames.
 *
 * Activation: pointerdown on an element body, frame body, or grip handle
 * while the selection tool is active (or no tool override is set).
 *
 * Live update: mutates `element.data.x / .y` on every pointermove for
 * visual responsiveness. On pointerup, the live mutations are rolled back
 * and a single `MoveSelectionCommand` is pushed through the undo manager
 * so the final positions are applied atomically.
 */
export class DragController {
  private readonly ctx: GraphicContext;
  private readonly selectionManager: GraphicSelectionManager;

  private active = false;
  private startClientX = 0;
  private startClientY = 0;
  private accumulatedDx = 0;
  private accumulatedDy = 0;

  /** Snapshot of { elementId → {x, y} } taken at drag start for live rollback. */
  private startPositions: Map<string, { x: number; y: number }> = new Map();

  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: (e: PointerEvent) => void;

  constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager) {
    this.ctx = ctx;
    this.selectionManager = selectionManager;

    this.onPointerMove = this._handlePointerMove.bind(this);
    this.onPointerUp = this._handlePointerUp.bind(this);
    this.onPointerCancel = this._handlePointerCancel.bind(this);

    selectionManager.registerPointerDownHandler(this._handlePointerDown.bind(this));
  }

  private _handlePointerDown(event: PointerEvent, target: HitTarget | null): void {
    if (!target) return;
    if (target.kind !== 'element' && target.kind !== 'frame' && target.kind !== 'grip') return;

    // Don't start a drag if no elements are selected yet (selection update happens first)
    const selection = this.selectionManager.getSelection();
    if (selection.length === 0) return;

    event.stopPropagation();

    this.active = true;
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.accumulatedDx = 0;
    this.accumulatedDy = 0;

    // Snapshot current positions for rollback
    this.startPositions = new Map();
    const page = this.ctx.page;
    for (const entry of selection) {
      if (entry.type === 'element') {
        const el = page.elements.find(e => e.id === entry.id);
        if (el) {
          const data = el.data as Record<string, unknown>;
          this.startPositions.set(entry.id, {
            x: (data.x as number) ?? 0,
            y: (data.y as number) ?? 0,
          });
        }
      } else if (entry.type === 'frame') {
        const frame = page.frames.find(f => f.id === entry.id);
        if (frame) {
          this.startPositions.set(entry.id, { x: frame.data.x, y: frame.data.y });
          // Also snapshot child elements
          for (const childId of frame.childElementIds) {
            if (!this.startPositions.has(childId)) {
              const el = page.elements.find(e => e.id === childId);
              if (el) {
                const data = el.data as Record<string, unknown>;
                this.startPositions.set(childId, {
                  x: (data.x as number) ?? 0,
                  y: (data.y as number) ?? 0,
                });
              }
            }
          }
        }
      }
    }

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!this.active) return;

    const viewport = this.ctx.page.viewport;
    const zoom = viewport.zoom;

    const screenDx = event.clientX - this.startClientX;
    const screenDy = event.clientY - this.startClientY;

    // Convert screen deltas to world deltas
    const worldDx = screenDx / zoom;
    const worldDy = screenDy / zoom;

    this.accumulatedDx = worldDx;
    this.accumulatedDy = worldDy;

    // Live mutation for visual responsiveness
    this._applyLiveDelta(worldDx, worldDy);
  }

  private _handlePointerUp(event: PointerEvent): void {
    if (!this.active) return;
    this._finish(event.clientX, event.clientY, false);
  }

  private _handlePointerCancel(_event: PointerEvent): void {
    if (!this.active) return;
    this._finish(0, 0, true);
  }

  private _finish(clientX: number, clientY: number, cancel: boolean): void {
    this.active = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);

    // Roll back live mutations first so the command can apply the canonical positions.
    this._rollbackLive();

    if (!cancel) {
      const viewport = this.ctx.page.viewport;
      const zoom = viewport.zoom;
      const worldDx = (clientX - this.startClientX) / zoom;
      const worldDy = (clientY - this.startClientY) / zoom;

      if (worldDx !== 0 || worldDy !== 0) {
        const cmd = new MoveSelectionCommand({
          doc: this.ctx.document,
          pageId: this.ctx.page.id,
          entries: this.selectionManager.getSelection(),
          dx: worldDx,
          dy: worldDy,
        });
        this.ctx.undoRedoManager.push(cmd);
        this.ctx.eventBus.emit('doc:change');
      }
    }

    this.startPositions.clear();
  }

  /** Apply accumulated delta as live mutation (does not go through undo). */
  private _applyLiveDelta(worldDx: number, worldDy: number): void {
    const page = this.ctx.page;
    for (const [id, start] of this.startPositions) {
      const el = page.elements.find(e => e.id === id);
      if (el) {
        (el.data as Record<string, unknown>).x = start.x + worldDx;
        (el.data as Record<string, unknown>).y = start.y + worldDy;
      }
      const frame = page.frames.find(f => f.id === id);
      if (frame) {
        frame.data.x = start.x + worldDx;
        frame.data.y = start.y + worldDy;
      }
    }
    // Trigger re-render
    this.ctx.eventBus.emit('element:update');
  }

  /** Restore all positions to their snapshot values. */
  private _rollbackLive(): void {
    const page = this.ctx.page;
    for (const [id, start] of this.startPositions) {
      const el = page.elements.find(e => e.id === id);
      if (el) {
        (el.data as Record<string, unknown>).x = start.x;
        (el.data as Record<string, unknown>).y = start.y;
      }
      const frame = page.frames.find(f => f.id === id);
      if (frame) {
        frame.data.x = start.x;
        frame.data.y = start.y;
      }
    }
  }

  destroy(): void {
    if (this.active) {
      this._rollbackLive();
      this.active = false;
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }
}
