import type { DocumentNode, Rect } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface AddFrameCommandOptions {
    doc: DocumentNode;
    pageId: string;
    rect: Rect;
    name?: string;
}
/**
 * Creates a new FrameElement and appends it to page.frames.
 *
 * On undo, removes the frame AND clears frameId on all its child elements
 * so that attachment state is fully reverted.
 */
export declare class AddFrameCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly frame;
    constructor({ doc, pageId, rect, name }: AddFrameCommandOptions);
    get frameId(): string;
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=add-frame-command.d.ts.map