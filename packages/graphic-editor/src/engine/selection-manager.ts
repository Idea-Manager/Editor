import type { GraphicPageNode } from '@core/model/interfaces';
import type { GraphicContext } from './graphic-context';
import type { GraphicRenderContext } from './render-context';
import type { HitTarget } from './hit-tester';
import { combinedAABB } from './hit-tester';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectionEntry {
  type: 'element' | 'frame';
  id: string;
}

type PointerDownHandler = (event: PointerEvent, target: HitTarget | null) => void;

// ─── SelectionManager ────────────────────────────────────────────────────────

/**
 * Manages the set of selected graphic elements/frames and renders the
 * selection overlay (bounding rect + handles) into the screen-space
 * `selectionLayer` div provided by CanvasRenderer.
 *
 * The selection overlay is intentionally in screen space so that handles
 * stay at 12px regardless of viewport zoom.
 */
export class GraphicSelectionManager {
  private entries: SelectionEntry[] = [];
  private readonly ctx: GraphicContext;

  /** ID of the element currently highlighted by the floating properties window focus. */
  private focusedTargetId: string | null = null;

  /** Registered handlers (drag/resize/lasso controllers) called on pointerdown. */
  private readonly pointerDownHandlers: PointerDownHandler[] = [];

  constructor(ctx: GraphicContext) {
    this.ctx = ctx;
  }

  /**
   * Sets the element that the floating properties window is currently focused on.
   * Triggers a re-render so the secondary focus ring is applied.
   */
  setFocusedHighlight(id: string | null): void {
    if (this.focusedTargetId !== id) {
      this.focusedTargetId = id;
      this.ctx.eventBus.emit('selection:change', this.entries);
    }
  }

  getFocusedHighlightId(): string | null {
    return this.focusedTargetId;
  }

  // ─── Selection API ──────────────────────────────────────────────────────────

  getSelection(): SelectionEntry[] {
    return [...this.entries];
  }

  has(id: string): boolean {
    return this.entries.some(e => e.id === id);
  }

  setSelection(entries: SelectionEntry[], options?: { bypassGrouping?: boolean }): void {
    const expanded = options?.bypassGrouping ? entries : _expandByGroupId(entries, this.ctx.page);
    const changed = !_selectionsEqual(this.entries, expanded);
    this.entries = [...expanded];
    if (changed) {
      this.ctx.eventBus.emit('selection:change', this.entries);
    }
  }

  add(entry: SelectionEntry, options?: { bypassGrouping?: boolean }): void {
    if (!this.has(entry.id)) {
      const toAdd = options?.bypassGrouping
        ? [entry]
        : _expandByGroupId([entry], this.ctx.page).filter(e => !this.has(e.id));
      this.entries = [...this.entries, ...toAdd];
      this.ctx.eventBus.emit('selection:change', this.entries);
    }
  }

  remove(id: string): void {
    const next = this.entries.filter(e => e.id !== id);
    if (next.length !== this.entries.length) {
      this.entries = next;
      this.ctx.eventBus.emit('selection:change', this.entries);
    }
  }

  clear(): void {
    if (this.entries.length > 0) {
      this.entries = [];
      this.ctx.eventBus.emit('selection:change', this.entries);
    }
  }

  /**
   * Returns the combined AABB of all selected elements/frames in world coords.
   * Returns null when the selection is empty.
   */
  getBoundingRect(): { x: number; y: number; width: number; height: number } | null {
    const page = this.ctx.page;
    const registry = this.ctx.registry;
    const rects: { x: number; y: number; width: number; height: number }[] = [];

    for (const entry of this.entries) {
      if (entry.type === 'element') {
        const el = page.elements.find(e => e.id === entry.id);
        if (el && registry.has(el.type)) {
          rects.push(registry.get(el.type).getBounds(el));
        }
      } else if (entry.type === 'frame') {
        const frame = page.frames.find(f => f.id === entry.id);
        if (frame) {
          rects.push({
            x: frame.data.x,
            y: frame.data.y,
            width: frame.data.width,
            height: frame.data.height,
          });
        }
      }
    }

    return combinedAABB(rects);
  }

  // ─── Overlay rendering ──────────────────────────────────────────────────────

  /**
   * Rebuilds the `.idea-graphic-selection` div inside `host` (the selectionLayer).
   * Called after every render pass.
   */
  renderOverlay(
    host: HTMLElement,
    page: GraphicPageNode,
    renderCtx: GraphicRenderContext,
  ): void {
    // Remove previous selection overlay (keep lasso div if present)
    const existing = host.querySelector('.idea-graphic-selection');
    existing?.remove();

    if (this.entries.length === 0) return;

    const worldBounds = this.getBoundingRect();
    if (!worldBounds) return;

    const canvas = this.ctx.rootElement.querySelector<HTMLElement>('.idea-graphic-canvas');
    if (!canvas) return;

    const vp = this.ctx.viewportController;

    // Convert world bounding rect to screen coords relative to canvas
    const canvasRect = canvas.getBoundingClientRect();
    const topLeft = vp.worldToClient(worldBounds.x, worldBounds.y, canvas);
    const bottomRight = vp.worldToClient(
      worldBounds.x + worldBounds.width,
      worldBounds.y + worldBounds.height,
      canvas,
    );

    const screenX = topLeft.x - canvasRect.left;
    const screenY = topLeft.y - canvasRect.top;
    const screenW = bottomRight.x - topLeft.x;
    const screenH = bottomRight.y - topLeft.y;

    const container = document.createElement('div');
    container.className = 'idea-graphic-selection';

    // Dashed bounding rect
    const rect = document.createElement('div');
    rect.className = 'idea-graphic-selection__rect';
    rect.style.left = `${screenX}px`;
    rect.style.top = `${screenY}px`;
    rect.style.width = `${screenW}px`;
    rect.style.height = `${screenH}px`;

    // Secondary focus ring when the floating properties window is focused on this element
    const isFocused =
      this.focusedTargetId !== null &&
      this.entries.length === 1 &&
      this.entries[0].id === this.focusedTargetId;
    if (isFocused) {
      rect.classList.add('idea-graphic-selection__rect--focused');
    }

    container.appendChild(rect);

    // Single-element selection: corner handles + grip + arrow-edge handles
    const isSingle = this.entries.length === 1 && this.entries[0].type === 'element';

    if (isSingle) {
      const singleEl = page.elements.find(e => e.id === this.entries[0].id);

      // Arrows get special endpoint-circle handles instead of the standard bounding-rect UI.
      if (singleEl?.type === 'arrow') {
        const arrowData = singleEl.data as { from: { point: { x: number; y: number } }; to: { point: { x: number; y: number } } };
        const canvasRect = this.ctx.rootElement.querySelector<HTMLElement>('.idea-graphic-canvas')?.getBoundingClientRect();
        const vp = this.ctx.viewportController;
        const canvasEl = this.ctx.rootElement.querySelector<HTMLElement>('.idea-graphic-canvas');
        if (canvasEl && canvasRect) {
          for (const which of ['from', 'to'] as const) {
            const worldPt = arrowData[which].point;
            const screenPt = vp.worldToClient(worldPt.x, worldPt.y, canvasEl);
            const cx = screenPt.x - canvasRect.left;
            const cy = screenPt.y - canvasRect.top;

            const handle = document.createElement('div');
            handle.className = 'idea-graphic-selection__handle idea-graphic-selection__handle--arrow-endpoint';
            handle.setAttribute('data-arrow-endpoint', which);
            handle.title = renderCtx.i18n.t('graphic.handle.move');
            handle.style.left = `${cx}px`;
            handle.style.top = `${cy}px`;
            container.appendChild(handle);
          }
        }
        // No bounding rect, no corner handles, no edge arrow handles for arrows.
        rect.style.display = 'none';
      } else {
        // Corner resize handles are NOT shown for path elements — scaling a point list
        // is non-trivial and out of scope for this iteration.
        if (singleEl?.type !== 'path') {
          const corners: Array<{ id: string; label: string; cx: number; cy: number }> = [
            { id: 'corner-nw', label: renderCtx.i18n.t('graphic.handle.resize-nw'), cx: screenX, cy: screenY },
            { id: 'corner-ne', label: renderCtx.i18n.t('graphic.handle.resize-ne'), cx: screenX + screenW, cy: screenY },
            { id: 'corner-se', label: renderCtx.i18n.t('graphic.handle.resize-se'), cx: screenX + screenW, cy: screenY + screenH },
            { id: 'corner-sw', label: renderCtx.i18n.t('graphic.handle.resize-sw'), cx: screenX, cy: screenY + screenH },
          ];

          for (const { id, label, cx, cy } of corners) {
            const handle = document.createElement('div');
            handle.className = `idea-graphic-selection__handle idea-graphic-selection__handle--${id}`;
            handle.setAttribute('data-handle', id);
            handle.title = label;
            handle.style.left = `${cx}px`;
            handle.style.top = `${cy}px`;
            container.appendChild(handle);
          }
        }

        // Arrow-edge handles (hidden by default; shown via CSS :hover on parent or JS hover tracking)
        const edgeDefs: Array<{ id: string; label: string; ex: number; ey: number }> = [
          { id: 'top',    label: renderCtx.i18n.t('graphic.handle.start-arrow'), ex: screenX + screenW / 2, ey: screenY - 16 },
          { id: 'right',  label: renderCtx.i18n.t('graphic.handle.start-arrow'), ex: screenX + screenW + 16, ey: screenY + screenH / 2 },
          { id: 'bottom', label: renderCtx.i18n.t('graphic.handle.start-arrow'), ex: screenX + screenW / 2, ey: screenY + screenH + 16 },
          { id: 'left',   label: renderCtx.i18n.t('graphic.handle.start-arrow'), ex: screenX - 16, ey: screenY + screenH / 2 },
        ];

        for (const { id, label, ex, ey } of edgeDefs) {
          const arrowHandle = document.createElement('button');
          arrowHandle.className = `idea-graphic-selection__arrow idea-graphic-selection__arrow--${id}`;
          arrowHandle.setAttribute('data-arrow-edge', id);
          arrowHandle.setAttribute('aria-label', label);
          arrowHandle.title = label;
          arrowHandle.style.left = `${ex}px`;
          arrowHandle.style.top = `${ey}px`;
          arrowHandle.style.display = 'none';
          container.appendChild(arrowHandle);
        }
      }
    }

    // Grip icon (outside left edge, at the top of the bounding rect)
    const grip = document.createElement('button');
    grip.className = 'idea-graphic-selection__grip';
    grip.setAttribute('data-grip', 'true');
    grip.title = renderCtx.i18n.t('graphic.handle.move');
    grip.setAttribute('aria-label', renderCtx.i18n.t('graphic.handle.move'));
    grip.textContent = 'drag_indicator';
    grip.style.left = `${screenX - 24}px`;
    grip.style.top = `${screenY}px`;
    container.appendChild(grip);

    host.appendChild(container);

    // Show/hide arrow-edge handles on pointer hover over the selection rect
    // (only for non-arrow elements — arrows use endpoint circles instead)
    if (isSingle) {
      const singleElType = page.elements.find(e => e.id === this.entries[0]?.id)?.type;
      if (singleElType !== 'arrow') {
        this._bindArrowEdgeHover(rect, container, page, renderCtx);
      }
    }
  }

  /**
   * Show arrow-edge handles when the pointer is within ~8px of the element boundary.
   */
  private _bindArrowEdgeHover(
    rect: HTMLElement,
    container: HTMLElement,
    _page: GraphicPageNode,
    _renderCtx: GraphicRenderContext,
  ): void {
    const arrowHandles = container.querySelectorAll<HTMLElement>('.idea-graphic-selection__arrow');

    const show = () => {
      arrowHandles.forEach(h => (h.style.display = ''));
    };
    const hide = () => {
      // Only hide when leaving the entire container (not just the rect)
      arrowHandles.forEach(h => (h.style.display = 'none'));
    };

    rect.addEventListener('pointerenter', show);
    container.addEventListener('pointerleave', hide);
  }

  // ─── Pointer handling ───────────────────────────────────────────────────────

  /**
   * Register a handler to be called on every pointerdown processed by this manager.
   * Controllers (DragController, ResizeController, LassoController) use this to activate.
   */
  registerPointerDownHandler(handler: PointerDownHandler): void {
    this.pointerDownHandlers.push(handler);
  }

  /**
   * Called by the canvas root pointerdown listener.
   * Updates selection based on the hit target, then notifies registered controllers.
   * No-ops when a non-selection tool is active (placement handled separately).
   */
  handlePointerDown(event: PointerEvent, target: HitTarget | null): void {
    if (this.ctx.toolState && this.ctx.toolState.getTool() !== 'selection') return;
    if (target === null) {
      // Click on empty canvas — clear selection (lasso controller will take over via registered handler)
      if (!event.shiftKey) {
        this.clear();
      }
    } else if (target.kind === 'element') {
      if (event.shiftKey) {
        if (this.has(target.element.id)) {
          this.remove(target.element.id);
        } else {
          this.add({ type: 'element', id: target.element.id });
        }
      } else {
        // Select the clicked element (keep multi-selection if it's already selected)
        if (!this.has(target.element.id)) {
          this.setSelection([{ type: 'element', id: target.element.id }]);
        }
      }
    } else if (target.kind === 'frame') {
      if (event.shiftKey) {
        if (this.has(target.frame.id)) {
          this.remove(target.frame.id);
        } else {
          this.add({ type: 'frame', id: target.frame.id });
        }
      } else {
        if (!this.has(target.frame.id)) {
          this.setSelection([{ type: 'frame', id: target.frame.id }]);
        }
      }
    }
    // handle / grip / arrow-edge targets don't change selection

    // Notify controllers (drag, resize, lasso)
    for (const handler of this.pointerDownHandlers) {
      handler(event, target);
    }
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  destroy(): void {
    this.entries = [];
    this.pointerDownHandlers.length = 0;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _selectionsEqual(a: SelectionEntry[], b: SelectionEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].type !== b[i].type) return false;
  }
  return true;
}

/**
 * Expands element entries so that when any member of a group is selected,
 * all siblings that share the same `meta.groupId` are added automatically.
 * Frame entries and entries without a groupId are passed through unchanged.
 */
function _expandByGroupId(entries: SelectionEntry[], page: GraphicPageNode): SelectionEntry[] {
  if (entries.length === 0) return entries;

  // Collect groupIds from selected elements
  const groupIdsToExpand = new Set<string>();
  for (const entry of entries) {
    if (entry.type !== 'element') continue;
    const el = page.elements.find(e => e.id === entry.id);
    if (el?.meta?.groupId) {
      groupIdsToExpand.add(el.meta.groupId);
    }
  }

  if (groupIdsToExpand.size === 0) return entries;

  // Build expanded set
  const result: SelectionEntry[] = [...entries];
  const seenIds = new Set(entries.map(e => e.id));

  for (const el of page.elements) {
    if (seenIds.has(el.id)) continue;
    if (el.meta?.groupId && groupIdsToExpand.has(el.meta.groupId)) {
      result.push({ type: 'element', id: el.id });
      seenIds.add(el.id);
    }
  }

  return result;
}
