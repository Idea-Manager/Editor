import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import type { ViewportController } from '../engine/viewport-controller';
export declare class ZoomPanel {
    private readonly viewportController;
    private readonly canvas;
    private readonly eventBus;
    private readonly i18n;
    private el;
    private percentEl;
    private disposeViewportChange;
    constructor(viewportController: ViewportController, canvas: HTMLElement, eventBus: EventBus, i18n: I18nService);
    mount(container: HTMLElement): void;
    destroy(): void;
    private updatePercent;
}
//# sourceMappingURL=zoom-panel.d.ts.map