import './block-tile.scss';
import type { I18nService } from '@core/i18n/i18n';
import type { EventBus } from '@core/events/event-bus';
import type { AnyGraphicBlockDefinition } from '../blocks/block-registry';
export type BlockTileViewMode = 'tile' | 'list';
export interface BlockTileOptions {
    viewMode?: BlockTileViewMode;
}
export declare class BlockTile {
    private readonly def;
    private readonly i18n;
    private readonly btn;
    private readonly activateListeners;
    private readonly pointerHandler;
    private viewMode;
    constructor(host: HTMLElement, def: AnyGraphicBlockDefinition, i18n: I18nService, options?: BlockTileOptions);
    get element(): HTMLButtonElement;
    getViewMode(): BlockTileViewMode;
    setViewMode(mode: BlockTileViewMode): void;
    private _applyViewModeClass;
    /**
     * Register a callback that fires on `pointerdown`. Returns an unsubscribe fn.
     */
    onActivate(callback: () => void): () => void;
    /**
     * Emits a one-time hint toast the first time any block type is placed in the
     * session. Call this inside the activate handler.
     */
    static maybeShowPlacementHint(type: string, i18n: I18nService, eventBus: EventBus): void;
    destroy(): void;
}
//# sourceMappingURL=block-tile.d.ts.map