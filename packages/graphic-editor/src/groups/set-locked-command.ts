import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { setAtPath } from '../util/object-path';

export interface SetLockedCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementIds: string[];
  locked: boolean;
}

/**
 * Bulk-updates `meta.locked` on a set of elements.
 * Undo restores each element's prior locked value.
 */
export class SetLockedCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly elementIds: string[];
  private readonly locked: boolean;
  private readonly previousValues: Map<string, boolean | undefined>;

  constructor({ doc, pageId, elementIds, locked }: SetLockedCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.elementIds = [...elementIds];
    this.locked = locked;

    const page = doc.graphicPages.find(p => p.id === pageId);
    this.previousValues = new Map(
      elementIds.map(id => {
        const el = page?.elements.find(e => e.id === id);
        return [id, el?.meta?.locked];
      }),
    );

    const now = Date.now();
    this.operationRecords = elementIds.map(elementId => ({
      id: generateId('op'),
      actorId: 'local',
      timestamp: now,
      wallClock: now,
      type: 'node:update' as const,
      payload: {
        nodeId: elementId,
        path: 'meta.locked',
        oldValue: this.previousValues.get(elementId),
        newValue: locked,
      },
    }));
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    for (const id of this.elementIds) {
      const idx = page.elements.findIndex(el => el.id === id);
      if (idx === -1) continue;
      page.elements[idx] = setAtPath(
        page.elements[idx] as unknown as Record<string, unknown>,
        'meta.locked',
        this.locked,
      ) as unknown as GraphicElement;
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    for (const id of this.elementIds) {
      const idx = page.elements.findIndex(el => el.id === id);
      if (idx === -1) continue;
      page.elements[idx] = setAtPath(
        page.elements[idx] as unknown as Record<string, unknown>,
        'meta.locked',
        this.previousValues.get(id),
      ) as unknown as GraphicElement;
    }
  }
}
