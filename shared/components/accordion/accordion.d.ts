import './accordion.scss';
export interface AccordionItem {
    id: string;
    /** Plain text or any HTMLElement — rendered into the title row. */
    title: string | HTMLElement;
    /** DOM rendered into the collapsible body (slot). */
    content: HTMLElement;
    /** Initial state. Default: false. */
    defaultOpen?: boolean;
    /** Set to true to disable interaction (e.g. empty Custom group). */
    disabled?: boolean;
}
export interface AccordionConfig {
    items: AccordionItem[];
    /**
     * 'single' = at most one item is open at a time.
     * 'multiple' = each item toggles independently.
     */
    mode?: 'single' | 'multiple';
    /** Optional callback fired on every open/close change. */
    onToggle?: (id: string, open: boolean) => void;
}
export declare class Accordion {
    readonly element: HTMLElement;
    private readonly mode;
    private readonly onToggle?;
    private openIds;
    private itemStates;
    private destroyed;
    constructor(config: AccordionConfig);
    open(id: string): void;
    close(id: string): void;
    toggle(id: string): void;
    getOpen(): string[];
    setItems(items: AccordionItem[]): void;
    destroy(): void;
    private renderItems;
    private openItem;
    private closeItem;
    private destroyItemListeners;
}
//# sourceMappingURL=accordion.d.ts.map