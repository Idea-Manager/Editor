import type { BlockSelection } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
export declare class SelectionManager {
    private readonly eventBus;
    private selection;
    constructor(eventBus: EventBus);
    get(): BlockSelection | null;
    set(sel: BlockSelection): void;
    clear(): void;
    setCollapsed(blockId: string, offset: number): void;
    extend(focusBlockId: string, focusOffset: number): void;
    get isCollapsed(): boolean;
}
//# sourceMappingURL=selection-manager.d.ts.map