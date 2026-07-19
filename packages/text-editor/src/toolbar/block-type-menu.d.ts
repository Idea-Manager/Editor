import type { BlockType } from '@core/model/interfaces';
import type { I18nService } from '@core/i18n/i18n';
import type { BlockRegistry } from '../blocks/block-registry';
export type BlockTypeMenuAction = 'insert' | 'change';
export interface BlockTypeMenuCallbacks {
    onSelect(type: BlockType, action: BlockTypeMenuAction, dataOverride?: Record<string, unknown>): void;
    onTableSelect?(action: BlockTypeMenuAction): void;
}
export declare class BlockTypeMenu {
    private readonly registry;
    private readonly host;
    private readonly i18n;
    private overlay;
    private activeIndex;
    private items;
    private readonly disposers;
    constructor(registry: BlockRegistry, host: HTMLElement, i18n: I18nService);
    isVisible(): boolean;
    show(anchorRect: DOMRect, action: BlockTypeMenuAction, callbacks: BlockTypeMenuCallbacks): void;
    hide(): void;
    private confirmSelection;
    private renderItems;
    private positionOverlay;
}
//# sourceMappingURL=block-type-menu.d.ts.map