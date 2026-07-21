import type { EditorContext } from '../engine/editor-context';
export declare class LinkHoverPopover {
    private readonly ctx;
    private readonly markManager;
    private quickEl;
    private readonly quickDisposers;
    private urlFlyoutEl;
    private urlFlyoutClose;
    private showTimer;
    private hideTimer;
    private currentAnchor;
    private readonly disposers;
    constructor(ctx: EditorContext);
    destroy(): void;
    private attach;
    private clearTimers;
    private scheduleShow;
    private scheduleHide;
    private cancelHide;
    private resolveLinkContext;
    private show;
    private hideQuick;
    private hideUrlFlyout;
    private openEditFlyout;
}
//# sourceMappingURL=link-hover-popover.d.ts.map