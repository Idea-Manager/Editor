import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { CompositeCommand } from '@core/commands/composite-command';
import { UpdateElementCommand } from './update-element-command';
import { getAtPath } from '../../util/object-path';

export interface MoveElementCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementId: string;
  dx: number;
  dy: number;
  mergeWindowMs?: number;
}

export class MoveElementCommand implements Command {
  private readonly composite: CompositeCommand;
  private readonly elementId: string;
  private readonly mergeWindowMs: number;
  private lastUpdatedAt: number;

  constructor({ doc, pageId, elementId, dx, dy, mergeWindowMs = 0 }: MoveElementCommandOptions) {
    this.elementId = elementId;
    this.mergeWindowMs = mergeWindowMs;
    this.lastUpdatedAt = Date.now();

    const page = doc.graphicPages.find(p => p.id === pageId);
    const element = page?.elements.find(el => el.id === elementId);
    const currentX = (element ? getAtPath(element as unknown as Record<string, unknown>, 'data.x') : 0) as number ?? 0;
    const currentY = (element ? getAtPath(element as unknown as Record<string, unknown>, 'data.y') : 0) as number ?? 0;

    this.composite = new CompositeCommand([
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.x', value: currentX + dx, mergeWindowMs }),
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.y', value: currentY + dy, mergeWindowMs }),
    ]);
  }

  get operationRecords(): OperationRecord[] {
    return this.composite.operationRecords;
  }

  execute(): void {
    this.composite.execute();
  }

  undo(): void {
    this.composite.undo();
  }

  merge(next: Command): boolean {
    if (!(next instanceof MoveElementCommand)) return false;
    if (next.elementId !== this.elementId) return false;
    if (this.mergeWindowMs <= 0) return false;
    if (Date.now() - this.lastUpdatedAt >= this.mergeWindowMs) return false;

    const nextOps = next.operationRecords;
    const thisOps = this.operationRecords;

    // Forward the merged x/y values from the next command's inner ops into ours.
    // Both composites hold [x-op, y-op] in order.
    for (let i = 0; i < thisOps.length && i < nextOps.length; i++) {
      const thisRec = thisOps[i];
      const nextRec = nextOps[i];
      if (thisRec.type === 'node:update' && nextRec.type === 'node:update') {
        (thisRec.payload as { newValue: unknown }).newValue =
          (nextRec.payload as { newValue: unknown }).newValue;
      }
    }

    this.lastUpdatedAt = Date.now();
    // Apply the new positions to the document immediately (UndoRedoManager skips execute on merge).
    next.execute();
    return true;
  }
}
