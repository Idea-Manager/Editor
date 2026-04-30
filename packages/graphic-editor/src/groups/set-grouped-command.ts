import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { setAtPath } from '../util/object-path';

export interface SetGroupedCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementIds: string[];
  /** true = group (assign a new groupId), false = ungroup (clear groupId). */
  grouped: boolean;
}

/**
 * Bulk-updates `meta.groupId` on a set of elements.
 * When grouping: generates a new groupId shared across all elements.
 * When ungrouping: clears `meta.groupId` for those that share the current group.
 * Undo restores each element's prior groupId.
 */
export class SetGroupedCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly elementIds: string[];
  private readonly grouped: boolean;
  private readonly newGroupId: string | undefined;
  private readonly previousValues: Map<string, string | undefined>;

  constructor({ doc, pageId, elementIds, grouped }: SetGroupedCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.elementIds = [...elementIds];
    this.grouped = grouped;
    this.newGroupId = grouped ? generateId('blk') : undefined;

    const page = doc.graphicPages.find(p => p.id === pageId);
    this.previousValues = new Map(
      elementIds.map(id => {
        const el = page?.elements.find(e => e.id === id);
        return [id, el?.meta?.groupId];
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
        path: 'meta.groupId',
        oldValue: this.previousValues.get(elementId),
        newValue: this.newGroupId,
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
        'meta.groupId',
        this.newGroupId,
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
        'meta.groupId',
        this.previousValues.get(id),
      ) as unknown as GraphicElement;
    }
  }
}
