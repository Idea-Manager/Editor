import type { FrameElement } from '@core/model/interfaces';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Renders a FrameElement into the SVG world group and the DOM overlay layer.
 *
 * SVG: a dashed rect using design-token CSS class (idea-graphic-frame__rect).
 * DOM: an overlay label positioned just above the top-left corner in world
 *      space (the overlay's CSS transform maps it to screen coords).
 *
 * Note: auto-attach on frame move/resize is intentionally NOT performed here.
 * Auto-attach happens only at frame creation time and at element creation time.
 * Re-attachment after move is a manual action (handled in a future group window).
 */
export class FrameRenderer {
  /**
   * Renders a single frame.
   *
   * @param frame       The frame to render.
   * @param worldGroup  SVG <g> element with the world transform applied.
   * @param overlayEl   DOM div with the same world-space CSS transform.
   */
  renderFrame(
    frame: FrameElement,
    worldGroup: SVGGElement,
    overlayEl: HTMLElement,
  ): void {
    this._renderSvg(frame, worldGroup);

    if (frame.data.showLabel) {
      this._renderLabel(frame, overlayEl);
    }
  }

  private _renderSvg(frame: FrameElement, worldGroup: SVGGElement): void {
    const { x, y, width, height } = frame.data;

    const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
    g.setAttribute('data-frame-id', frame.id);

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.classList.add('idea-graphic-frame__rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(width));
    rect.setAttribute('height', String(height));
    rect.setAttribute('data-frame-id', frame.id);

    g.appendChild(rect);
    worldGroup.appendChild(g);
  }

  private _renderLabel(frame: FrameElement, overlayEl: HTMLElement): void {
    const { x, y } = frame.data;

    const label = document.createElement('div');
    label.className = 'idea-graphic-frame__label';
    label.textContent = frame.name;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;

    overlayEl.appendChild(label);
  }
}
