import type { BlockNode, DocumentNode, BlockType } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { BlockRegistry } from '../../blocks/block-registry';
import { generateId } from '@core/id';
import { findBlockLocation } from '../block-locator';
import { cloneBlockNodeDeep } from '../document-snapshot';

export class InsertBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private newBlockId = '';
  /** Stable prototype for redo (IDs must not change on re-execute). */
  private blockTemplate: BlockNode | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly afterBlockId: string,
    private readonly newType: BlockType,
    private readonly registry: BlockRegistry,
    private readonly dataOverride?: Record<string, unknown>,
  ) {}

  execute(): void {
    const afterLoc = findBlockLocation(this.doc, this.afterBlockId);
    if (!afterLoc) return;

    if (!this.blockTemplate) {
      const def = this.registry.get(this.newType);
      this.newBlockId = generateId('blk');
      this.blockTemplate = {
        id: this.newBlockId,
        type: this.newType,
        data: this.dataOverride ? { ...this.dataOverride } : def.defaultData(),
        children: [{
          id: generateId('txt'),
          type: 'text',
          data: { text: '', marks: [] },
        }],
        meta: { createdAt: Date.now(), version: 1 },
      };

      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: Date.now(),
        wallClock: Date.now(),
        type: 'node:insert',
        payload: {
          parentId: this.doc.id,
          index: afterLoc.index + 1,
          node: this.blockTemplate,
        },
      });
    }

    if (findBlockLocation(this.doc, this.newBlockId)) return;

    afterLoc.parentList.splice(afterLoc.index + 1, 0, cloneBlockNodeDeep(this.blockTemplate));
  }

  undo(): void {
    if (!this.newBlockId) return;

    const loc = findBlockLocation(this.doc, this.newBlockId);
    if (loc) {
      loc.parentList.splice(loc.index, 1);
    }
  }

  getNewBlockId(): string {
    return this.newBlockId;
  }
}
