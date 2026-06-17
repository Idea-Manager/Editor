import { readFreeResize } from '../blocks/shapes/base-shape';
import type { GraphicContext } from './graphic-context';
import type { GraphicSelectionManager } from './selection-manager';
import type { HitTarget, HandleId } from './hit-tester';
import { ResizeElementCommand } from './commands/resize-element-command';

const MIN_SIZE = 8;

type Bounds = { x: number; y: number; width: number; height: number };

/**
 * Handles corner-handle resize for single-element selections.
 *
 * Activation: pointerdown on a `kind: 'handle'` target.
 *
 * - By default (`freeResize` false): width and height change by the same delta
 * - Rectangle (`freeResize` true): independent width/height corner resize
 * - Shift key: preserve aspect ratio when `freeResize` is true
 * - Clamps minimum size to 8px
 * - On pointerup: pushes a ResizeElementCommand
 */
export class ResizeController {
  private readonly ctx: GraphicContext;
  private readonly selectionManager: GraphicSelectionManager;

  private active = false;
  private handle: HandleId = 'corner-se';
  private elementId = '';
  private freeResize = false;
  private startClientX = 0;
  private startClientY = 0;
  private startBounds = { x: 0, y: 0, width: 0, height: 0 };
  private aspectRatio = 1;

  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerUp: (e: PointerEvent) => void;
  private readonly onPointerCancel: () => void;

  constructor(ctx: GraphicContext, selectionManager: GraphicSelectionManager) {
    this.ctx = ctx;
    this.selectionManager = selectionManager;

    this.onPointerMove = this._handlePointerMove.bind(this);
    this.onPointerUp = this._handlePointerUp.bind(this);
    this.onPointerCancel = this._handlePointerCancel.bind(this);

    selectionManager.registerPointerDownHandler(this._handlePointerDown.bind(this));
  }

  private _handlePointerDown(event: PointerEvent, target: HitTarget | null): void {
    if (!target || target.kind !== 'handle') return;

    const el = target.element;
    if (!this.ctx.registry.has(el.type)) return;

    const bounds = this.ctx.registry.get(el.type).getBounds(el);

    event.stopPropagation();

    this.active = true;
    this.handle = target.handle;
    this.elementId = el.id;
    this.freeResize = readFreeResize(el.data as Record<string, unknown>);
    this.startClientX = event.clientX;
    this.startClientY = event.clientY;
    this.startBounds = { ...bounds };
    this.aspectRatio = bounds.height !== 0 ? bounds.width / bounds.height : 1;

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
  }

  private _handlePointerMove(event: PointerEvent): void {
    if (!this.active) return;

    const zoom = this.ctx.page.viewport.zoom;
    const screenDx = event.clientX - this.startClientX;
    const screenDy = event.clientY - this.startClientY;
    const worldDx = screenDx / zoom;
    const worldDy = screenDy / zoom;

    const next = this._computeNewBounds(worldDx, worldDy, event.shiftKey);

    // Live mutation
    const el = this.ctx.page.elements.find(e => e.id === this.elementId);
    if (el) {
      const data = el.data as Record<string, unknown>;
      data.x = next.x;
      data.y = next.y;
      data.width = next.width;
      data.height = next.height;
      this.ctx.eventBus.emit('element:update');
    }
  }

  private _handlePointerUp(event: PointerEvent): void {
    if (!this.active) return;

    const zoom = this.ctx.page.viewport.zoom;
    const worldDx = (event.clientX - this.startClientX) / zoom;
    const worldDy = (event.clientY - this.startClientY) / zoom;
    const next = this._computeNewBounds(worldDx, worldDy, event.shiftKey);

    // Rollback live mutation — command will apply the canonical values
    const el = this.ctx.page.elements.find(e => e.id === this.elementId);
    if (el) {
      const data = el.data as Record<string, unknown>;
      data.x = this.startBounds.x;
      data.y = this.startBounds.y;
      data.width = this.startBounds.width;
      data.height = this.startBounds.height;
    }

    this._cleanup();

    const cmd = new ResizeElementCommand({
      doc: this.ctx.document,
      pageId: this.ctx.page.id,
      elementId: this.elementId,
      ...next,
    });
    this.ctx.undoRedoManager.push(cmd);
    this.ctx.eventBus.emit('doc:change');
  }

  private _handlePointerCancel(): void {
    if (!this.active) return;

    // Rollback live mutation
    const el = this.ctx.page.elements.find(e => e.id === this.elementId);
    if (el) {
      const data = el.data as Record<string, unknown>;
      data.x = this.startBounds.x;
      data.y = this.startBounds.y;
      data.width = this.startBounds.width;
      data.height = this.startBounds.height;
      this.ctx.eventBus.emit('element:update');
    }

    this._cleanup();
  }

  private _computeNewBounds(
    worldDx: number,
    worldDy: number,
    shiftKey: boolean,
  ): Bounds {
    if (!this.freeResize) {
      const delta = _computeUniformDelta(this.handle, worldDx, worldDy);
      return _applyUniformResize(this.startBounds, this.handle, delta);
    }

    let bounds = _computeFreeBounds(this.startBounds, this.handle, worldDx, worldDy);

    if (shiftKey && this.aspectRatio !== 0) {
      bounds = _applyAspectRatioConstraint(bounds, this.startBounds, this.handle, worldDx, worldDy, this.aspectRatio);
    }

    return bounds;
  }

  private _cleanup(): void {
    this.active = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
  }

  destroy(): void {
    if (this.active) {
      this._handlePointerCancel();
    }
    this._cleanup();
  }
}

function _computeFreeBounds(
  s: Bounds,
  handle: HandleId,
  worldDx: number,
  worldDy: number,
): Bounds {
  let x = s.x;
  let y = s.y;
  let width = s.width;
  let height = s.height;

  switch (handle) {
    case 'corner-se':
      width = Math.max(MIN_SIZE, s.width + worldDx);
      height = Math.max(MIN_SIZE, s.height + worldDy);
      break;
    case 'corner-sw':
      width = Math.max(MIN_SIZE, s.width - worldDx);
      x = s.x + s.width - width;
      height = Math.max(MIN_SIZE, s.height + worldDy);
      break;
    case 'corner-ne':
      width = Math.max(MIN_SIZE, s.width + worldDx);
      height = Math.max(MIN_SIZE, s.height - worldDy);
      y = s.y + s.height - height;
      break;
    case 'corner-nw':
      width = Math.max(MIN_SIZE, s.width - worldDx);
      x = s.x + s.width - width;
      height = Math.max(MIN_SIZE, s.height - worldDy);
      y = s.y + s.height - height;
      break;
  }

  return { x, y, width, height };
}

function _computeUniformDelta(handle: HandleId, worldDx: number, worldDy: number): number {
  const magnitude = Math.max(Math.abs(worldDx), Math.abs(worldDy));
  if (magnitude === 0) return 0;

  const dominantX = Math.abs(worldDx) >= Math.abs(worldDy);

  switch (handle) {
    case 'corner-se':
      return (dominantX ? Math.sign(worldDx) : Math.sign(worldDy)) * magnitude;
    case 'corner-nw':
      return (dominantX ? -Math.sign(worldDx) : -Math.sign(worldDy)) * magnitude;
    case 'corner-ne':
      return (dominantX ? Math.sign(worldDx) : -Math.sign(worldDy)) * magnitude;
    case 'corner-sw':
      return (dominantX ? -Math.sign(worldDx) : Math.sign(worldDy)) * magnitude;
  }
}

function _applyUniformResize(s: Bounds, handle: HandleId, delta: number): Bounds {
  let x = s.x;
  let y = s.y;
  const width = Math.max(MIN_SIZE, s.width + delta);
  const height = Math.max(MIN_SIZE, s.height + delta);

  switch (handle) {
    case 'corner-se':
      break;
    case 'corner-sw':
      x = s.x + s.width - width;
      break;
    case 'corner-ne':
      y = s.y + s.height - height;
      break;
    case 'corner-nw':
      x = s.x + s.width - width;
      y = s.y + s.height - height;
      break;
  }

  return { x, y, width, height };
}

function _applyAspectRatioConstraint(
  bounds: Bounds,
  startBounds: Bounds,
  handle: HandleId,
  worldDx: number,
  worldDy: number,
  aspectRatio: number,
): Bounds {
  const s = startBounds;
  let { x, y, width, height } = bounds;

  if (Math.abs(worldDx) >= Math.abs(worldDy)) {
    height = Math.max(MIN_SIZE, width / aspectRatio);
  } else {
    width = Math.max(MIN_SIZE, height * aspectRatio);
  }

  switch (handle) {
    case 'corner-nw':
      x = s.x + s.width - width;
      y = s.y + s.height - height;
      break;
    case 'corner-ne':
      y = s.y + s.height - height;
      break;
    case 'corner-sw':
      x = s.x + s.width - width;
      break;
    // corner-se: x/y stay anchored at top-left
  }

  return { x, y, width, height };
}
