import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getCustomBlocks } from '@core/model/document-data';
import type {
  CustomBlockDefinition,
  CustomBlockElement,
} from '@core/model/graphic-preferences';
import type { SelectionEntry } from '../engine/selection-manager';

export interface CreateCustomBlockCommandOptions {
  doc: DocumentNode;
  pageId: string;
  name: string;
  entries: SelectionEntry[];
}

/**
 * Snapshots the current selection into a `CustomBlockDefinition` stored in
 * `doc.data.customBlocks`. Nested custom blocks (`custom:*` types) are NOT
 * supported and are silently excluded.
 */
export class CreateCustomBlockCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly definition: CustomBlockDefinition;

  constructor({ doc, pageId, name, entries }: CreateCustomBlockCommandOptions) {
    this.doc = doc;

    const page = doc.graphicPages.find(p => p.id === pageId);
    const selectedIds = new Set(entries.filter(e => e.type === 'element').map(e => e.id));

    const selectedElements: GraphicElement[] = [];
    for (const el of (page?.elements ?? [])) {
      if (selectedIds.has(el.id)) {
        selectedElements.push(el);
      }
    }

    const xs = selectedElements.flatMap(el => {
      const d = el.data as Record<string, unknown>;
      const x = typeof d['x'] === 'number' ? d['x'] : 0;
      const w = typeof d['width'] === 'number' ? d['width'] : 0;
      return [x, x + w];
    });
    const ys = selectedElements.flatMap(el => {
      const d = el.data as Record<string, unknown>;
      const y = typeof d['y'] === 'number' ? d['y'] : 0;
      const h = typeof d['height'] === 'number' ? d['height'] : 0;
      return [y, y + h];
    });

    const originX = xs.length > 0 ? Math.min(...xs) : 0;
    const originY = ys.length > 0 ? Math.min(...ys) : 0;
    const maxX = xs.length > 0 ? Math.max(...xs) : 0;
    const maxY = ys.length > 0 ? Math.max(...ys) : 0;

    const placeholderMap = new Map<string, string>();
    selectedElements.forEach((el, i) => {
      placeholderMap.set(el.id, `cb-${i}`);
    });

    const snapshotElements: CustomBlockElement[] = selectedElements.map(el => {
      const raw = el.data as Record<string, unknown>;
      const zeroed: Record<string, unknown> = { ...raw };

      if (typeof zeroed['x'] === 'number') zeroed['x'] = (zeroed['x'] as number) - originX;
      if (typeof zeroed['y'] === 'number') zeroed['y'] = (zeroed['y'] as number) - originY;

      if (Array.isArray(zeroed['points'])) {
        zeroed['points'] = (zeroed['points'] as Array<{ x: number; y: number }>).map(p => ({
          ...p,
          x: p.x - originX,
          y: p.y - originY,
        }));
      }
      if (zeroed['bounds'] && typeof zeroed['bounds'] === 'object') {
        const b = zeroed['bounds'] as Record<string, number>;
        zeroed['bounds'] = {
          ...b,
          x: b['x'] - originX,
          y: b['y'] - originY,
        };
      }

      delete zeroed['text'];

      const meta = el.meta
        ? { groupId: el.meta.groupId, locked: el.meta.locked }
        : undefined;

      return {
        type: el.type,
        data: zeroed,
        ...(meta && (meta.groupId !== undefined || meta.locked !== undefined) ? { meta } : {}),
        placeholderId: placeholderMap.get(el.id)!,
      };
    });

    this.definition = {
      id: generateId('blk'),
      name,
      createdAt: new Date().toISOString(),
      source: { width: maxX - originX, height: maxY - originY },
      elements: snapshotElements,
    };

    const now = Date.now();
    const existingBlocks = getCustomBlocks(doc);
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
          oldValue: existingBlocks,
          newValue: [...existingBlocks, this.definition],
        },
      },
    ];
  }

  get definitionId(): string {
    return this.definition.id;
  }

  get definitionName(): string {
    return this.definition.name;
  }

  execute(): void {
    const existing = getCustomBlocks(this.doc);
    if (existing.some(cb => cb.id === this.definition.id)) return;
    (this.doc.data as Record<string, unknown>)['customBlocks'] = [...existing, this.definition];
  }

  undo(): void {
    const existing = getCustomBlocks(this.doc);
    (this.doc.data as Record<string, unknown>)['customBlocks'] = existing.filter(
      cb => cb.id !== this.definition.id,
    );
  }
}
