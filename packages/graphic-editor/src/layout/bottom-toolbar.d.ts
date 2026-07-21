import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import type { ToolId } from '../engine/tool-state';
export interface BottomToolbarOptions {
    onToolSelect: (tool: ToolId) => void;
    initialTool?: ToolId;
}
/**
 * Bottom-centre floating toolbar that shows the tool buttons.
 * Mounted inside the GraphicEditor element, owned by it.
 */
export declare class BottomToolbar {
    private readonly eventBus;
    private readonly i18n;
    private readonly el;
    private readonly buttons;
    private activeTool;
    private readonly disposeToolChange;
    constructor(eventBus: EventBus, i18n: I18nService, options: BottomToolbarOptions);
    mount(container: HTMLElement): void;
    destroy(): void;
    private _updateActive;
}
//# sourceMappingURL=bottom-toolbar.d.ts.map