import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
export declare class SetEmbedUrlCommand implements Command {
    private readonly doc;
    private readonly blockId;
    private readonly url;
    private readonly title;
    private readonly provider;
    readonly operationRecords: OperationRecord[];
    private oldUrl;
    private oldTitle;
    private oldProvider;
    constructor(doc: DocumentNode, blockId: string, url: string, title: string, provider: string | undefined);
    execute(): void;
    undo(): void;
}
//# sourceMappingURL=set-embed-url-command.d.ts.map