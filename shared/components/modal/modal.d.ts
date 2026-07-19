export interface ModalShowOptions {
    /** Plain-text title; ignored if `header` is set. */
    title?: string;
    /** Custom header content; takes precedence over `title`. */
    header?: HTMLElement | null;
    body: HTMLElement;
    footer?: HTMLElement | null;
    /** Extra class on the panel (e.g. for narrow confirm dialogs). */
    panelClass?: string;
    /** Called when the modal is dismissed (Escape, backdrop click, or `hide()`). */
    onDismiss?: () => void;
}
/**
 * Centered modal dialog with backdrop. Sections are plain DOM nodes (slot-like).
 */
export declare class Modal {
    private readonly host;
    private root;
    private readonly disposers;
    constructor(host: HTMLElement);
    show(options: ModalShowOptions): void;
    hide(): void;
    isVisible(): boolean;
}
//# sourceMappingURL=modal.d.ts.map