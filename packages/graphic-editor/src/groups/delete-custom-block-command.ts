import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getCustomBlocks } from '@core/model/document-data';
import type { CustomBlockDefinition } from '@core/model/graphic-preferences';

export interface DeleteCustomBlockCommandOptions {
  doc: DocumentNode;
  blockId: string;
}

/**
 * Removes a custom block definition from `doc.data.customBlocks` by id.
 * Undo re-inserts it at the same position.
 */
export class DeleteCustomBlockCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly blockId: string;
  private readonly definition: CustomBlockDefinition | undefined;
  private readonly originalIndex: number;

  constructor({ doc, blockId }: DeleteCustomBlockCommandOptions) {
    this.doc = doc;
    this.blockId = blockId;

    const existing = getCustomBlocks(doc);
    this.originalIndex = existing.findIndex(cb => cb.id === blockId);
    this.definition = this.originalIndex !== -1 ? existing[this.originalIndex] : undefined;

    const now = Date.now();
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update' as const,
        payload: {
          nodeId: doc.id,
          path: 'data.customBlocks',
          oldValue: existing,
          newValue: existing.filter(cb => cb.id !== blockId),
        },
      },
    ];
  }

  execute(): void {
    const existing = getCustomBlocks(this.doc);
    (this.doc.data as Record<string, unknown>)['customBlocks'] = existing.filter(
      cb => cb.id !== this.blockId,
    );
  }

  undo(): void {
    if (!this.definition) return;
    const existing = getCustomBlocks(this.doc);
    const restored = [...existing];
    restored.splice(this.originalIndex, 0, this.definition);
    (this.doc.data as Record<string, unknown>)['customBlocks'] = restored;
  }
}
