import type { GraphicPageNode } from '@core/model/interfaces';
import type { ViewportController } from './viewport-controller';
import type { GraphicContext } from './graphic-context';
import type { GraphicRenderContext } from './render-context';
import { FrameRenderer } from './frame-renderer';

const SVG_NS = 'http://www.w3.org/2000/svg';

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
    // Full rebuild — see TODO(perf) above.
    this.worldGroup.innerHTML = '';
    this.overlayEl.innerHTML = '';
    this.selectionLayerEl.innerHTML = '';

    const renderCtx: GraphicRenderContext = {
      document: ctx.document,
      page,
      eventBus: ctx.eventBus,
      i18n: ctx.i18n,
      rootElement: ctx.rootElement,
      overlayHost: this.overlayEl,
      undoRedoManager: ctx.undoRedoManager,
    };

    // Render frames beneath all elements (design-token styling via FrameRenderer).
    for (const frame of page.frames) {
      this.frameRenderer.renderFrame(frame, this.worldGroup, this.overlayEl);
    }

    // Render elements
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
