import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export interface RemoveElementCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementId: string;
}

export class RemoveElementCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly elementId: string;
  private readonly snapshot: GraphicElement;
  private readonly originalIndex: number;
  private readonly frameId: string | undefined;

  constructor({ doc, pageId, elementId }: RemoveElementCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.elementId = elementId;

    const page = doc.graphicPages.find(p => p.id === pageId);
    if (!page) throw new Error(`RemoveElementCommand: page "${pageId}" not found`);

    const idx = page.elements.findIndex(el => el.id === elementId);
    if (idx === -1) throw new Error(`RemoveElementCommand: element "${elementId}" not found`);

    this.snapshot = { ...page.elements[idx], data: { ...page.elements[idx].data } };
    this.originalIndex = idx;
    this.frameId = page.elements[idx].frameId;

    const now = Date.now();
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
          nodeId: elementId,
          node: { ...this.snapshot },
        },
      },
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const idx = page.elements.findIndex(el => el.id === this.elementId);
    if (idx !== -1) {
      page.elements.splice(idx, 1);
    }

    if (this.frameId) {
      const frame = page.frames.find(f => f.id === this.frameId);
      if (frame) {
        const fIdx = frame.childElementIds.indexOf(this.elementId);
        if (fIdx !== -1) {
          frame.childElementIds.splice(fIdx, 1);
        }
      }
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const alreadyPresent = page.elements.some(el => el.id === this.elementId);
    if (!alreadyPresent) {
      page.elements.splice(this.originalIndex, 0, { ...this.snapshot, data: { ...this.snapshot.data } });
    }

    if (this.frameId) {
      const frame = page.frames.find(f => f.id === this.frameId);
      if (frame && !frame.childElementIds.includes(this.elementId)) {
        frame.childElementIds.push(this.elementId);
      }
    }
  }
}
