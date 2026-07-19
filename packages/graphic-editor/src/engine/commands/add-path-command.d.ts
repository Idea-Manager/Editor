import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { PathData } from '../../blocks/path/path-block';
export interface AddPathCommandOptions {
    doc: DocumentNode;
    pageId: string;
    registry: GraphicBlockRegistry;
    /** Smoothed world-space points produced by PenController. */
    points: Array<{
        x: number;
        y: number;
    }>;
    /** Optional overrides (e.g. stroke/strokeWidth from style preferences). */
    overrides?: Partial<PathData>;
}
/**
 * Creates a new 'path' GraphicElement from a list of smoothed world-space points.
 *
 * Internally delegates to AddElementCommand with a full PathData override so that
 * frame auto-attachment and operation-log generation reuse the shared infrastructure.
 * The operation log from the inner command can be inspected in tests to confirm
 * the element insertion and optional frame attachment.
 */
export declare class AddPathCommand implements Command {
    private readonly innerCmd;
    constructor({ doc, pageId, registry, points, overrides }: AddPathCommandOptions);
    get operationRecords(): OperationRecord[];
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=add-path-command.d.ts.map