import type { GraphicElement } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import type { GraphicContext } from '../engine/graphic-context';
export interface FloatingPropertiesWindowConfig {
    i18n: I18nService;
    ctx: GraphicContext;
    /** CSS selector used to constrain the window within the canvas. */
    hostSelector: string;
    /** Called when the user clicks the close icon or selection becomes empty. */
    onClose?: () => void;
    /** Called whenever the focused state changes (for highlighting the block). */
    onFocusedTargetChange?: (targetId: string | null) => void;
}
export declare class FloatingPropertiesWindow {
    private readonly host;
    private readonly config;
    private floatingWindow;
    private accordion;
    private activeRenderers;
    private currentNodeId;
    private readonly disposers;
    constructor(host: HTMLElement, config: FloatingPropertiesWindowConfig);
    open(node: GraphicElement): void;
    /** Engage the floating window and notify the host of the focused target. */
    focus(): void;
    setNode(node: GraphicElement): void;
    close(): void;
    destroy(): void;
    /** Id of the node this window is bound to, or null if closed. */
    getCurrentNodeId(): string | null;
    private _calcInitialPosition;
    private _buildBody;
    private _buildRenderer;
    private _propId;
    private _propTitle;
    private _subscribeToUpdates;
    private _destroyWindow;
}
//# sourceMappingURL=floating-properties-window.d.ts.map