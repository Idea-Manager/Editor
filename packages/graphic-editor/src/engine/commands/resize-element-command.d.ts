import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export interface ResizeElementCommandOptions {
    doc: DocumentNode;
    pageId: string;
    elementId: string;
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Composite command that updates x, y, width, and height of an element atomically.
 * Undo restores all four values in a single step.
 */
export declare class ResizeElementCommand implements Command {
    private readonly composite;
    constructor({ doc, pageId, elementId, x, y, width, height }: ResizeElementCommandOptions);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=resize-element-command.d.ts.map