import type { DocumentNode, EmbedData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export class SetEmbedUrlCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldUrl = '';
  private oldTitle = '';
  private oldProvider: string | undefined;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly url: string,
    private readonly title: string,
    private readonly provider: string | undefined,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'embed') return;

    const data = block.data as EmbedData;
    this.oldUrl = data.url;
    this.oldTitle = data.title;
    this.oldProvider = data.provider;

    data.url = this.url;
    data.title = this.title;
    data.provider = this.provider;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: this.blockId,
        path: 'data.url',
        oldValue: this.oldUrl,
        newValue: this.url,
      },
    });
  }

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block || block.type !== 'embed') return;

    const data = block.data as EmbedData;
    data.url = this.oldUrl;
    data.title = this.oldTitle;
    data.provider = this.oldProvider;
  }
}
