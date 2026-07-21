import './left-panel.scss';
import type { GraphicContext } from '../engine/graphic-context';
export declare const LEFT_PANEL_MIN_WIDTH = 250;
export declare const LEFT_PANEL_MAX_WIDTH = 400;
export declare const LEFT_PANEL_DEFAULT_WIDTH = 280;
export type LeftPanelViewMode = 'tiles' | 'list';
export interface LeftPanelOptions {
    /** Group keys whose accordion starts expanded. Defaults to the first group's key. */
    initiallyExpandedGroups?: string[];
    /** Hide certain groups entirely. */
    hiddenGroups?: string[];
    /** Initial panel width in px (clamped to 250–400). Default 280. */
    defaultPanelWidth?: number;
    /** Initial block presentation mode. Default 'tiles'. */
    defaultViewMode?: LeftPanelViewMode;
}
/** Max tile columns that fit in `panelWidth`; capped by `itemCount` when provided. */
export declare function computeTileLayout(panelWidth: number, itemCount?: number): number;
export declare class LeftPanel {
    private readonly host;
    private readonly ctx;
    private readonly options;
    private readonly aside;
    private readonly toolbarEl;
    private readonly sortInput;
    private readonly viewModeBtn;
    private readonly scrollEl;
    private readonly stickyEl;
    private readonly resizeHandle;
    private accordions;
    private tiles;
    private blockContainers;
    private panelWidth;
    private viewMode;
    private sortQuery;
    private rafHandle;
    private resizeObserver;
    private readonly onResizePointerDown;
    private readonly onResizePointerMove;
    private readonly onResizePointerUp;
    constructor(host: HTMLElement, ctx: GraphicContext, options?: LeftPanelOptions);
    /** Mount the aside before the first child of `host` (i.e., before the canvas). */
    mount(): void;
    refresh(): void;
    private _makeToolbarBtn;
    private _resolveGroupTitle;
    private _orderNamedGroups;
    private _snapshotOpenIds;
    private _doRefresh;
    private _blocksContainerClass;
    private _makeBlocksContainer;
    private _setViewMode;
    private _applyViewMode;
    private _syncViewModeButton;
    private _expandAll;
    private _collapseAll;
    private _applyPanelWidth;
    private _updateTileLayout;
    private _bindResizeObserver;
    private _handleResizePointerDown;
    private _handleResizePointerMove;
    private _handleResizePointerUp;
    private _destroyAccordions;
    destroy(): void;
}
//# sourceMappingURL=left-panel.d.ts.map