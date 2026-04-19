import type { BlockNode, DocumentNode, BlockType } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import type { BlockRegistry } from '../../blocks/block-registry';

export class ChangeBlockTypeCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldType: BlockType = 'paragraph';
  private oldData: Record<string, unknown> = {};

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly newType: BlockType,
    private readonly registry: BlockRegistry,
    private readonly dataOverride?: Record<string, unknown>,
  ) {}

  execute(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block) return;

    this.oldType = block.type;
    this.oldData = { ...block.data };

    const def = this.registry.get(this.newType);
    block.type = this.newType;
    block.data = this.dataOverride ? { ...this.dataOverride } : def.defaultData();

    this.operationRecords.push(
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'type',
          oldValue: this.oldType,
          newValue: this.newType,
        },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:update',
        payload: {
          nodeId: block.id,
          path: 'data',
          oldValue: this.oldData,
          newValue: block.data,
        },
      },
    );
  }

  undo(): void {
    const block = this.doc.children.find(b => b.id === this.blockId);
    if (!block) return;

    block.type = this.oldType;
    block.data = { ...this.oldData };
  }
}
