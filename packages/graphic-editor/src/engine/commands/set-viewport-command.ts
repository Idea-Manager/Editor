import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { Viewport, ViewportChangeReason } from '../viewport-controller';

let _operationCounter = 0;

function nextId(): string {
  return `vp-${Date.now()}-${++_operationCounter}`;
}

const MERGE_WINDOW_MS = 500;

export class SetViewportCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private prevViewport: Viewport;
  private lastUpdatedAt: number;

  constructor(
    private readonly doc: DocumentNode,
    private readonly pageId: string,
    private nextViewport: Viewport,
    private readonly reason: ViewportChangeReason,
  ) {
    const page = doc.graphicPages.find(p => p.id === pageId);
    this.prevViewport = page ? { ...page.viewport } : { x: 0, y: 0, zoom: 1 };
    this.lastUpdatedAt = Date.now();

    this.operationRecords = [
      {
        id: nextId(),
        actorId: 'local',
        timestamp: this.lastUpdatedAt,
        wallClock: this.lastUpdatedAt,
        type: 'node:update',
        payload: {
          nodeId: pageId,
          path: 'viewport',
          oldValue: this.prevViewport,
          newValue: { ...nextViewport },
        },
      },
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (page) {
      page.viewport = { ...this.nextViewport };
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (page) {
      page.viewport = { ...this.prevViewport };
    }
  }

  /**
   * Coalesce consecutive viewport changes of the same reason within 500 ms.
   * Updates nextViewport in place so only one undo step is created for a
   * continuous zoom or pan gesture.
   */
  merge(next: Command): boolean {
    if (!(next instanceof SetViewportCommand)) return false;
    if (next.pageId !== this.pageId) return false;
    if (next.reason !== this.reason) return false;
    if (Date.now() - this.lastUpdatedAt >= MERGE_WINDOW_MS) return false;

    this.nextViewport = { ...next.nextViewport };
    this.lastUpdatedAt = Date.now();

    // Keep the operation record's newValue in sync
    const record = this.operationRecords[0];
    if (record && record.type === 'node:update') {
      (record.payload as { newValue: Viewport }).newValue = { ...this.nextViewport };
    }

    // UndoRedoManager skips execute() on a successful merge, so apply the
    // new viewport to the document here.
    this.execute();

    return true;
  }
}
