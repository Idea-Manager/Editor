import './floating-window.scss';
export interface FloatingWindowConfig {
    /** Title bar text or custom node. */
    title: string | HTMLElement;
    /** Body content (slot). The component owns scrolling inside the body. */
    body: HTMLElement;
    /**
     * CSS selector resolved (closest, then querySelector) at every layout
     * computation to derive the parent bounding rectangle.
     * Default: the host element passed to mount().
     */
    boundsSelector?: string;
    /** Initial size. Default { width: 320, height: 400 }. */
    initialSize?: {
        width: number;
        height: number;
    };
    /** Initial position relative to host. Default: top-right with 16 px margin. */
    initialPosition?: {
        x: number;
        y: number;
    };
    /** ID forwarded to onFocusedTargetChange so the host can map it back to a graphic element / group. */
    targetId?: string | null;
    /** Fired when the window is closed by the user. */
    onClose?: () => void;
    /**
     * Fired with targetId when the window receives focus, and with null when it
     * loses focus. Hosts use this to highlight the target.
     */
    onFocusedTargetChange?: (targetId: string | null) => void;
    /**
     * Accessible label for the close button.
     * Callers should pass i18n.t('graphic.floatingWindow.close').
     * Defaults to 'Close'.
     */
    closeAriaLabel?: string;
}
export declare class FloatingWindow {
    readonly element: HTMLElement;
    private host;
    private readonly titleEl;
    private readonly bodyWrap;
    private x;
    private y;
    private width;
    private height;
    private isFocused;
    private targetId;
    private readonly config;
    private readonly disposers;
    private resizeObserver;
    constructor(config: FloatingWindowConfig);
    mount(host: HTMLElement): void;
    unmount(): void;
    setTitle(title: string | HTMLElement): void;
    setBody(body: HTMLElement): void;
    setTargetId(id: string | null): void;
    focus(): void;
    getRect(): DOMRect;
    private syncAriaLabel;
    private getBoundsRect;
    private applyLayout;
    private setPosition;
    private reclamp;
    private bringToFront;
    private bindTitlebarDrag;
    private bindResizeHandle;
    private attachResizeObserver;
}
//# sourceMappingURL=floating-window.d.ts.map