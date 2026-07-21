import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import type { ViewportController } from '../engine/viewport-controller';
import { createIcon } from '@text-editor/icons/create-icon';
import { GRAPHIC_ZOOM_IN, GRAPHIC_ZOOM_LABEL, GRAPHIC_ZOOM_OUT, GRAPHIC_VIEWPORT_PERCENT } from '../i18n/keys';

export class ZoomPanel {
  private el: HTMLDivElement;
  private percentEl: HTMLSpanElement;
  private disposeViewportChange: (() => void) | null = null;

  constructor(
    private readonly viewportController: ViewportController,
    private readonly canvas: HTMLElement,
    private readonly eventBus: EventBus,
    private readonly i18n: I18nService,
  ) {
    this.el = document.createElement('div');
    this.el.className = 'idea-graphic-canvas__zoom-panel';

    const label = document.createElement('span');
    label.className = 'idea-graphic-zoom-panel__label';
    label.textContent = i18n.t(GRAPHIC_ZOOM_LABEL);

    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'idea-graphic-zoom-panel__btn';
    zoomInBtn.setAttribute('title', i18n.t(GRAPHIC_ZOOM_IN));
    zoomInBtn.setAttribute('type', 'button');
    zoomInBtn.appendChild(createIcon('zoom_in'));
    zoomInBtn.addEventListener('click', () => {
      this.viewportController.zoomBy(1.2, this.canvas);
    });

    this.percentEl = document.createElement('span');
    this.percentEl.className = 'idea-graphic-zoom-panel__percent';
    this.updatePercent();

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'idea-graphic-zoom-panel__btn';
    zoomOutBtn.setAttribute('title', i18n.t(GRAPHIC_ZOOM_OUT));
    zoomOutBtn.setAttribute('type', 'button');
    zoomOutBtn.appendChild(createIcon('zoom_out'));
    zoomOutBtn.addEventListener('click', () => {
      this.viewportController.zoomBy(1 / 1.2, this.canvas);
    });

    this.el.appendChild(label);
    this.el.appendChild(zoomInBtn);
    this.el.appendChild(this.percentEl);
    this.el.appendChild(zoomOutBtn);

    this.disposeViewportChange = eventBus.on('viewport:change', () => {
      this.updatePercent();
    });
  }

  mount(container: HTMLElement): void {
    container.appendChild(this.el);
  }

  destroy(): void {
    this.disposeViewportChange?.();
    this.disposeViewportChange = null;
    this.el.remove();
  }

  private updatePercent(): void {
    const vp = this.viewportController.getWorldTransform();
    const percent = Math.round(vp.scale * 100);
    this.percentEl.textContent = this.i18n.t(GRAPHIC_VIEWPORT_PERCENT, { percent: String(percent) });
  }
}
