import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getCustomBlocks } from '@core/model/document-data';

export interface InstantiateCustomBlockCommandOptions {
  doc: DocumentNode;
  pageId: string;
  customBlockId: string;
  /** World-space anchor (top-left origin of the placed block). */
  anchor: { x: number; y: number };
}

/** Fields that hold user-entered text content and must be reset on instantiation. */
const TEXT_FIELDS = ['text', 'htmlContent', 'templateHtml', 'labelText'];

/**
 * Places a custom block at a given world-space anchor by expanding its
 * `CustomBlockDefinition` into individual elements and arrows with fresh ids.
 * Text/template content is reset to `''`; visual preferences (border, fill,
 * font size, colors) are preserved from the snapshot.
 *
 * Undo removes all inserted elements.
 */
export class InstantiateCustomBlockCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly insertedElementIds: string[];

  constructor({ doc, pageId, customBlockId, anchor }: InstantiateCustomBlockCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;

    const definition = getCustomBlocks(doc).find(cb => cb.id === customBlockId);
    if (!definition) {
      throw new Error(`InstantiateCustomBlockCommand: custom block "${customBlockId}" not found`);
    }

    const page = doc.graphicPages.find(p => p.id === pageId);
    const baseIndex = page?.elements.length ?? 0;

    // Build a mapping from placeholderId → new real id for elements
    const idMap = new Map<string, string>();
    definition.elements.forEach(el => {
      idMap.set(el.placeholderId, generateId('el'));
    });
    definition.arrows.forEach(arrow => {
      idMap.set(arrow.placeholderId, generateId('conn'));
    });

    const now = Date.now();
    this.operationRecords = [];
    this.insertedElementIds = [];

    // Build element records
    for (let i = 0; i < definition.elements.length; i++) {
      const src = definition.elements[i];
      const newId = idMap.get(src.placeholderId)!;
      const rawData: Record<string, unknown> = { ...src.data };

      // Translate to anchor
      if (typeof rawData['x'] === 'number') rawData['x'] = (rawData['x'] as number) + anchor.x;
      if (typeof rawData['y'] === 'number') rawData['y'] = (rawData['y'] as number) + anchor.y;

      if (Array.isArray(rawData['points'])) {
        rawData['points'] = (rawData['points'] as Array<{ x: number; y: number }>).map(p => ({
          ...p,
          x: p.x + anchor.x,
          y: p.y + anchor.y,
        }));
      }
      if (rawData['bounds'] && typeof rawData['bounds'] === 'object') {
        const b = rawData['bounds'] as Record<string, number>;
        rawData['bounds'] = { ...b, x: b['x'] + anchor.x, y: b['y'] + anchor.y };
      }

      // Reset text content
      for (const field of TEXT_FIELDS) {
        if (field in rawData) rawData[field] = '';
      }

      this.insertedElementIds.push(newId);
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:insert' as const,
        payload: {
          parentId: pageId,
          index: baseIndex + i,
          node: { id: newId, type: src.type, data: rawData },
        },
      });
    }

    // Build arrow records
    const arrowBaseIndex = baseIndex + definition.elements.length;
    for (let i = 0; i < definition.arrows.length; i++) {
      const src = definition.arrows[i];
      const newId = idMap.get(src.placeholderId)!;
      const rawData: Record<string, unknown> = { ...src.data };

      // Rewrite placeholder ids in endpoints back to real ids
      for (const ep of ['from', 'to'] as const) {
        if (rawData[ep] && typeof rawData[ep] === 'object') {
          const endpoint = { ...(rawData[ep] as Record<string, unknown>) };
          if (endpoint['target'] && typeof endpoint['target'] === 'object') {
            const t = endpoint['target'] as Record<string, unknown>;
            const resolvedId = idMap.get(String(t['elementId'])) ?? String(t['elementId']);
            endpoint['target'] = { ...t, elementId: resolvedId };
          }
          rawData[ep] = endpoint;
        }
      }

      this.insertedElementIds.push(newId);
      this.operationRecords.push({
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:insert' as const,
        payload: {
          parentId: pageId,
          index: arrowBaseIndex + i,
          node: { id: newId, type: 'arrow', data: rawData },
        },
      });
    }
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    for (const record of this.operationRecords) {
      if (record.type !== 'node:insert') continue;
      const payload = record.payload as { node: GraphicElement };
      const alreadyPresent = page.elements.some(el => el.id === payload.node.id);
      if (!alreadyPresent) {
        page.elements.push({ ...payload.node, data: { ...payload.node.data } });
      }
    }
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    for (const id of this.insertedElementIds) {
      const idx = page.elements.findIndex(el => el.id === id);
      if (idx !== -1) page.elements.splice(idx, 1);
    }
  }
}
