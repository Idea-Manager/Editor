import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface AttachToFrameCommandOptions {
    doc: DocumentNode;
    pageId: string;
    frameId: string;
    elementId: string;
}
/**
 * Attaches a graphic element to a frame.
 *
 * Sets element.frameId and appends elementId to frame.childElementIds.
 * Idempotent: safe to call even if the element is already attached.
 */
export declare class AttachToFrameCommand implements Command {
    readonly operationRecords: OperationRecord[];
    private readonly doc;
    private readonly pageId;
    private readonly frameId;
    private readonly elementId;
    constructor({ doc, pageId, frameId, elementId }: AttachToFrameCommandOptions);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=attach-to-frame-command.d.ts.map