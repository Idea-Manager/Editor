import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { Viewport, ViewportChangeReason } from '../viewport-controller';
export declare class SetViewportCommand implements Command {
    private readonly doc;
    private readonly pageId;
    private nextViewport;
    private readonly reason;
    readonly operationRecords: OperationRecord[];
    private prevViewport;
    private lastUpdatedAt;
    constructor(doc: DocumentNode, pageId: string, nextViewport: Viewport, reason: ViewportChangeReason);
    execute(): void;
    undo(): void;
    /**
     * Coalesce consecutive viewport changes of the same reason within 500 ms.
     * Updates nextViewport in place so only one undo step is created for a
     * continuous zoom or pan gesture.
     */
    merge(next: Command): boolean;
}
//# sourceMappingURL=set-viewport-command.d.ts.map