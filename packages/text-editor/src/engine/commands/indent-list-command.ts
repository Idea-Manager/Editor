import type { DocumentNode, ListItemData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { MAX_LIST_DEPTH } from '../../blocks/list-item-block';
import { findBlockLocation } from '../block-locator';

export class IndentListCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldDepth = 0;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
  ) {}

  execute(): void {
    const block = findBlockLocation(this.doc, this.blockId)?.block;
    if (!block || block.type !== 'list_item') return;

    const data = block.data as ListItemData;
    this.oldDepth = data.depth;

    if (data.depth >= MAX_LIST_DEPTH) return;
    data.depth += 1;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'data.depth',
        oldValue: this.oldDepth,
        newValue: data.depth,
      },
    });
  }

  undo(): void {
    const block = findBlockLocation(this.doc, this.blockId)?.block;
    if (!block || block.type !== 'list_item') return;
    (block.data as ListItemData).depth = this.oldDepth;
  }
}
