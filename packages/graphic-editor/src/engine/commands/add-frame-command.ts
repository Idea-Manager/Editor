import type { DocumentNode, FrameElement, Rect } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { createFrame } from '@core/model/factory';

export interface AddFrameCommandOptions {
  doc: DocumentNode;
  pageId: string;
  rect: Rect;
  name?: string;
}

/**
 * Creates a new FrameElement and appends it to page.frames.
 *
 * On undo, removes the frame AND clears frameId on all its child elements
 * so that attachment state is fully reverted.
 */
export class AddFrameCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly frame: FrameElement;

  constructor({ doc, pageId, rect, name }: AddFrameCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;

    const page = doc.graphicPages.find(p => p.id === pageId);
    const frameNumber = page ? page.frames.length + 1 : 1;
    const frameName = name ?? `Frame ${frameNumber}`;

    this.frame = createFrame(frameName, rect);

    const now = Date.now();
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:insert',
        payload: {
          parentId: pageId,
          index: page ? page.frames.length : 0,
          node: { ...this.frame },
        },
      },
    ];
  }

  get frameId(): string {
    return this.frame.id;
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const alreadyAdded = page.frames.some(f => f.id === this.frame.id);
    if (alreadyAdded) return;

    page.frames.push(this.frame);
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    // Clear frameId on all child elements before removing the frame
    for (const elementId of this.frame.childElementIds) {
      const el = page.elements.find(e => e.id === elementId);
      if (el) {
        delete el.frameId;
      }
    }

    const idx = page.frames.findIndex(f => f.id === this.frame.id);
    if (idx !== -1) {
      page.frames.splice(idx, 1);
    }
  }
}
