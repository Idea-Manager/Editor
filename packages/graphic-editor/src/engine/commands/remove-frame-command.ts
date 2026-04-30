import type { DocumentNode, FrameElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export interface RemoveFrameCommandOptions {
  doc: DocumentNode;
  pageId: string;
  frameId: string;
}

/**
 * Removes a frame from the page.
 *
 * Child elements are NOT deleted — only their frameId is cleared.
 * On undo, the frame is re-inserted at its original position and all
 * child element frameIds are restored.
 */
export class RemoveFrameCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly frameId: string;
  private readonly snapshot: FrameElement;
  private readonly originalIndex: number;

  constructor({ doc, pageId, frameId }: RemoveFrameCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.frameId = frameId;

    const page = doc.graphicPages.find(p => p.id === pageId);
    if (!page) throw new Error(`RemoveFrameCommand: page "${pageId}" not found`);

    const idx = page.frames.findIndex(f => f.id === frameId);
    if (idx === -1) throw new Error(`RemoveFrameCommand: frame "${frameId}" not found`);

    this.snapshot = { ...page.frames[idx], data: { ...page.frames[idx].data }, childElementIds: [...page.frames[idx].childElementIds] };
    this.originalIndex = idx;

    const now = Date.now();
    const childUpdates: OperationRecord[] = this.snapshot.childElementIds.map(elementId => ({
      id: generateId('op'),
      actorId: 'local' as const,
      timestamp: now,
      wallClock: now,
      type: 'node:update' as const,
      payload: { nodeId: elementId, path: 'frameId', oldValue: frameId, newValue: undefined },
    }));

    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:delete',
        payload: {
          parentId: pageId,
          index: idx,
          nodeId: frameId,
          node: { ...this.snapshot },
        },
      },
      ...childUpdates,
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    // Clear frameId on all child elements
    for (const elementId of this.snapshot.childElementIds) {
      const el = page.elements.find(e => e.id === elementId);
      if (el) {
        delete el.frameId;
      }
    }

    const idx = page.frames.findIndex(f => f.id === this.frameId);
    if (idx !== -1) {
      page.frames.splice(idx, 1);
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const alreadyPresent = page.frames.some(f => f.id === this.frameId);
    if (!alreadyPresent) {
      page.frames.splice(this.originalIndex, 0, this.snapshot);
    }

    // Restore frameId on all child elements
    for (const elementId of this.snapshot.childElementIds) {
      const el = page.elements.find(e => e.id === elementId);
      if (el) {
        el.frameId = this.frameId;
      }
    }
  }
}
