import type { GraphicElement } from '@core/model/interfaces';
import type { GraphicContext } from '../engine/graphic-context';
import type { GroupPropertiesWindow } from '../properties/group-properties-window';
export interface GroupControllerConfig {
    ctx: GraphicContext;
    /** Called when a single element is selected. */
    showPropertiesWindow: (el: GraphicElement) => void;
    /** Called when the selection no longer warrants a single-element window. */
    hidePropertiesWindow: () => void;
    /** Factory for the group properties window (created lazily on first multi-select). */
    createGroupPropertiesWindow: (host: HTMLElement) => GroupPropertiesWindow;
}
/**
 * Centralises `selection:change` routing:
 *
 *  0 items       → close everything
 *  1 element     → FloatingPropertiesWindow
 *  >1 items      → GroupPropertiesWindow
 */
export declare class GroupController {
    private readonly ctx;
    private readonly config;
    private groupWindow;
    private readonly disposers;
    constructor(config: GroupControllerConfig);
    private _onSelectionChange;
    private _openOrUpdateGroupWindow;
    private _closeGroupWindow;
    destroy(): void;
}
//# sourceMappingURL=group-controller.d.ts.map