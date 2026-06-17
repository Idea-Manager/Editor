import type { GraphicPageNode } from '@core/model/interfaces';
import type { ViewportController } from './viewport-controller';
import type { GraphicContext } from './graphic-context';
import type { GraphicRenderContext } from './render-context';
import { FrameRenderer } from './frame-renderer';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SHAPE_TEXT_OVERLAY_CLASS = 'idea-graphic-shape__text';

type ShapeTextFocusSnapshot = { elementId: string; start: number; end: number };

function captureShapeTextOverlayFocus(overlay: HTMLElement): ShapeTextFocusSnapshot | null {
  const ae = document.activeElement;
  if (!ae || !(ae instanceof HTMLElement)) return null;
  if (!ae.classList.contains(SHAPE_TEXT_OVERLAY_CLASS)) return null;
  if (!overlay.contains(ae)) return null;
  const elementId = ae.getAttribute('data-element-id');
  if (!elementId) return null;
  const offsets = getContentEditableOffsets(ae);
  if (!offsets) return null;
  return { elementId, ...offsets };
}

function getContentEditableOffsets(root: HTMLElement): { start: number; end: number } | null {
  try {
    const sel = typeof window.getSelection === 'function' ? window.getSelection() : null;
    const textLen = root.textContent?.length ?? 0;
    if (!sel || sel.rangeCount === 0) {
      return { start: textLen, end: textLen };
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      return { start: textLen, end: textLen };
    }
    const pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    pre.setEnd(range.endContainer, range.endOffset);
    const end = pre.toString().length;
    return { start, end };
  } catch {
    return null;
  }
}

function setContentEditableSelection(root: HTMLElement, start: number, end: number): void {
  const textNodes: Text[] = [];
  const collect = (n: Node): void => {
    if (n.nodeType === Node.TEXT_NODE) {
      textNodes.push(n as Text);
      return;
    }
    for (let i = 0; i < n.childNodes.length; i++) {
      collect(n.childNodes[i]!);
    }
  };
  collect(root);

  if (textNodes.length === 0) {
    root.focus();
    return;
  }

  const totalLen = textNodes.reduce((a, t) => a + (t.textContent?.length ?? 0), 0);
  const s = Math.max(0, Math.min(start, totalLen));
  const e = Math.max(0, Math.min(end, totalLen));

  const mapOffset = (offset: number): [Text, number] | null => {
    let p = 0;
    for (const t of textNodes) {
      const tl = t.textContent?.length ?? 0;
      if (p + tl >= offset) return [t, offset - p];
      p += tl;
    }
    const last = textNodes[textNodes.length - 1]!;
    return [last, last.textContent?.length ?? 0];
  };

  const startMap = mapOffset(s);
  const endMap = mapOffset(e);
  if (!startMap || !endMap) return;

  const sel = window.getSelection();
  if (!sel) {
    root.focus();
    return;
  }
  const range = document.createRange();
  range.setStart(startMap[0], Math.min(startMap[1], startMap[0].textContent?.length ?? 0));
  range.setEnd(endMap[0], Math.min(endMap[1], endMap[0].textContent?.length ?? 0));
  sel.removeAllRanges();
  sel.addRange(range);
  root.focus();
}

function findShapeTextOverlay(overlay: HTMLElement, elementId: string): HTMLElement | null {
  for (const node of overlay.querySelectorAll<HTMLElement>(`.${SHAPE_TEXT_OVERLAY_CLASS}`)) {
    if (node.getAttribute('data-element-id') === elementId) return node;
  }
  return null;
}

function restoreShapeTextOverlayFocus(overlay: HTMLElement, snap: ShapeTextFocusSnapshot): void {
  const el = findShapeTextOverlay(overlay, snap.elementId);
  if (!el) return;
  setContentEditableSelection(el, snap.start, snap.end);
}

/**
 * Builds and maintains the SVG + DOM overlay layers for the graphic canvas.
 *
 * Background grid approach: CSS `radial-gradient` on the canvas element in
 * screen space (not an SVG pattern). This keeps the grid at a constant 20px
 * spacing regardless of zoom and is simpler to keep crisp.
 * The background-position is shifted by (-vp.x * vp.zoom % 20, -vp.y * vp.zoom % 20)
 * so the grid appears to drift as the user pans.
 */
export class CanvasRenderer {
  private canvasEl!: HTMLDivElement;
  private svgEl!: SVGSVGElement;
  private worldGroup!: SVGGElement;
  private overlayEl!: HTMLDivElement;
  private selectionLayerEl!: HTMLDivElement;
  private instanceId!: string;
  private readonly frameRenderer = new FrameRenderer();

  // TODO(perf): Replace full rebuild with a keyed cache Map<elementId, {svg, overlay}>
  // that patches existing nodes instead of destroying and recreating them.

  build(container: HTMLElement, instanceId: string): {
    canvas: HTMLDivElement;
    svg: SVGSVGElement;
    worldGroup: SVGGElement;
    overlay: HTMLDivElement;
    selectionLayer: HTMLDivElement;
  } {
    this.instanceId = instanceId;

    this.canvasEl = document.createElement('div');
    this.canvasEl.className = 'idea-graphic-canvas';
    this.canvasEl.setAttribute('tabindex', '0');

    this.svgEl = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
    this.svgEl.setAttribute('xmlns', SVG_NS);
    this.svgEl.classList.add('idea-graphic-canvas__svg');

    // SVG defs — sticker drop-shadow filter + reserved for future SVG patterns.
    const defs = document.createElementNS(SVG_NS, 'defs');
    this._appendStickerShadowFilter(defs, instanceId);
    this.svgEl.appendChild(defs);

    // Background rect fills the full SVG area (no fill — grid is CSS-driven)
    const bgRect = document.createElementNS(SVG_NS, 'rect');
    bgRect.classList.add('idea-graphic-canvas__bg');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'transparent');
    this.svgEl.appendChild(bgRect);

    this.worldGroup = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    this.worldGroup.classList.add('idea-graphic-canvas__world');
    this.svgEl.appendChild(this.worldGroup);

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'idea-graphic-canvas__overlay';

    // Screen-space selection layer: no world transform; handles stay pixel-sized at any zoom.
    this.selectionLayerEl = document.createElement('div');
    this.selectionLayerEl.className = 'idea-graphic-canvas__selection-layer';

    this.canvasEl.appendChild(this.svgEl);
    this.canvasEl.appendChild(this.overlayEl);
    this.canvasEl.appendChild(this.selectionLayerEl);
    container.appendChild(this.canvasEl);

    return {
      canvas: this.canvasEl,
      svg: this.svgEl,
      worldGroup: this.worldGroup,
      overlay: this.overlayEl,
      selectionLayer: this.selectionLayerEl,
    };
  }

  /**
   * Apply the current viewport transform to the SVG world group and DOM overlay,
   * and shift the CSS dotted-grid background to stay in screen space.
   */
  applyViewport(viewportController: ViewportController): void {
    const { translateX, translateY, scale } = viewportController.getWorldTransform();

    // World group: scale + translate so shapes render in world coords
    this.worldGroup.setAttribute(
      'transform',
      `translate(${translateX}, ${translateY}) scale(${scale})`,
    );

    // Overlay mirrors the same transform via CSS
    this.overlayEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    this.overlayEl.style.transformOrigin = '0 0';

    // Shift the CSS dotted-grid background so it drifts with pan but stays crisp.
    // Modulo 20 keeps the offset within one tile period (20px screen-space spacing).
    const bgX = ((-translateX % 20) + 20) % 20;
    const bgY = ((-translateY % 20) + 20) % 20;
    this.canvasEl.style.backgroundPosition = `${bgX}px ${bgY}px`;
  }

  /**
   * Re-render the active page. Idempotent; called on every relevant event.
   * Iterates page elements, looks up each block definition in the registry,
   * and calls renderSvg / renderOverlay.
   *
   * @param renderSelectionOverlay Optional callback injected by GraphicEditor to
   *   render selection handles into the screen-space selectionLayer.
   */
  renderPage(
    page: GraphicPageNode,
    ctx: GraphicContext,
    renderSelectionOverlay?: (host: HTMLElement, page: GraphicPageNode, renderCtx: GraphicRenderContext) => void,
  ): void {
    // Full rebuild — see TODO(perf) above. Preserve in-overlay shape text caret when
    // the same element is re-rendered (model updates coalesce while typing).
    const shapeTextFocus = captureShapeTextOverlayFocus(this.overlayEl);

    this.worldGroup.innerHTML = '';
    this.overlayEl.innerHTML = '';
    this.selectionLayerEl.innerHTML = '';

    const renderCtx: GraphicRenderContext = {
      document: ctx.document,
      page,
      eventBus: ctx.eventBus,
      i18n: ctx.i18n,
      registry: ctx.registry,
      rootElement: ctx.rootElement,
      overlayHost: this.overlayEl,
      undoRedoManager: ctx.undoRedoManager,
    };

    // Render frames beneath all elements (design-token styling via FrameRenderer).
    for (const frame of page.frames) {
      this.frameRenderer.renderFrame(frame, this.worldGroup, this.overlayEl);
    }

    for (const element of page.elements) {
      if (!ctx.registry.has(element.type)) continue;
      const def = ctx.registry.get(element.type);

      const svgEl = def.renderSvg(element, renderCtx);
      svgEl.setAttribute('data-element-id', element.id);
      this.worldGroup.appendChild(svgEl);

      if (def.renderOverlay) {
        def.renderOverlay(element, renderCtx);
        // appendShapeText (called inside renderOverlay) handles its own appending
        // to overlayHost and positioning in world space.
      }
    }

    // Render selection handles in the screen-space layer (no world transform)
    renderSelectionOverlay?.(this.selectionLayerEl, page, renderCtx);

    if (shapeTextFocus && page.elements.some(e => e.id === shapeTextFocus.elementId)) {
      restoreShapeTextOverlayFocus(this.overlayEl, shapeTextFocus);
    }
  }

  destroy(): void {
    this.canvasEl?.remove();
  }

  /** Exposes the SVG world group for controllers that need to append temporary elements (e.g. FrameController preview). */
  getWorldGroup(): SVGGElement {
    return this.worldGroup;
  }

  private _appendStickerShadowFilter(defs: SVGDefsElement, instanceId: string): void {
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', `idea-graphic-sticker-shadow-${instanceId}`);
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    const shadow = document.createElementNS(SVG_NS, 'feDropShadow');
    shadow.setAttribute('dx', '0');
    shadow.setAttribute('dy', '2');
    shadow.setAttribute('stdDeviation', '2');
    shadow.setAttribute('flood-color', 'rgb(0,0,0)');
    shadow.setAttribute('flood-opacity', '0.18');

    filter.appendChild(shadow);
    defs.appendChild(filter);
  }

}
