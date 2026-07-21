import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export interface DetachFromFrameCommandOptions {
  doc: DocumentNode;
  pageId: string;
  frameId: string;
  elementId: string;
}

/**
 * Detaches a graphic element from its frame.
 *
 * Clears element.frameId and removes elementId from frame.childElementIds.
 * Idempotent: safe to call even if the element is not currently attached.
 */
export class DetachFromFrameCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly frameId: string;
  private readonly elementId: string;

  constructor({ doc, pageId, frameId, elementId }: DetachFromFrameCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.frameId = frameId;
    this.elementId = elementId;

    const now = Date.now();
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: { nodeId: elementId, path: 'frameId', oldValue: frameId, newValue: undefined },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: { nodeId: frameId, path: 'childElementIds', oldValue: elementId, newValue: undefined },
      },
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const element = page.elements.find(el => el.id === this.elementId);
    if (element) {
      delete element.frameId;
    }

    const frame = page.frames.find(f => f.id === this.frameId);
    if (frame) {
      const idx = frame.childElementIds.indexOf(this.elementId);
      if (idx !== -1) {
        frame.childElementIds.splice(idx, 1);
      }
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const element = page.elements.find(el => el.id === this.elementId);
    if (element) {
      element.frameId = this.frameId;
    }

    const frame = page.frames.find(f => f.id === this.frameId);
    if (frame && !frame.childElementIds.includes(this.elementId)) {
      frame.childElementIds.push(this.elementId);
    }
  }
}
