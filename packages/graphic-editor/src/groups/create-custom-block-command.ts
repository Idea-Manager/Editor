import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getCustomBlocks } from '@core/model/document-data';
import type {
  CustomBlockDefinition,
  CustomBlockElement,
  CustomBlockArrow,
} from '@core/model/graphic-preferences';
import type { SelectionEntry } from '../engine/selection-manager';

export interface CreateCustomBlockCommandOptions {
  doc: DocumentNode;
  pageId: string;
  name: string;
  entries: SelectionEntry[];
}

type ArrowData = {
  from: { target?: { elementId: string; pivotId?: string }; point: { x: number; y: number } };
  to:   { target?: { elementId: string; pivotId?: string }; point: { x: number; y: number } };
};

function isArrow(el: GraphicElement): boolean {
  return el.type === 'arrow';
}

/**
 * Snapshots the current selection into a `CustomBlockDefinition` stored in
 * `doc.data.customBlocks`. Arrow elements are excluded from `elements` and
 * placed in `arrows` only when both endpoints are anchored within the
 * selected set. Nested custom blocks (`custom:*` types) are NOT supported and
 * are silently excluded.
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
      if (selectedIds.has(el.id) && !isArrow(el)) {
        selectedElements.push(el);
      }
    }

    const arrowElements: GraphicElement[] = [];
    for (const el of (page?.elements ?? [])) {
      if (selectedIds.has(el.id) && isArrow(el)) {
        arrowElements.push(el);
      }
    }

    // Compute AABB of non-arrow elements
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

    // Build an id → placeholderId map for element members
    const placeholderMap = new Map<string, string>();
    selectedElements.forEach((el, i) => {
      placeholderMap.set(el.id, `cb-${i}`);
    });

    const snapshotElements: CustomBlockElement[] = selectedElements.map(el => {
      const raw = el.data as Record<string, unknown>;
      const zeroed: Record<string, unknown> = { ...raw };

      if (typeof zeroed['x'] === 'number') zeroed['x'] = (zeroed['x'] as number) - originX;
      if (typeof zeroed['y'] === 'number') zeroed['y'] = (zeroed['y'] as number) - originY;

      // Translate path points / bounds
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

      // Strip text content per spec; preserve visual prefs
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

    // Include arrows whose both endpoints are within the selected set
    const snapshotArrows: CustomBlockArrow[] = [];
    for (const arrowEl of arrowElements) {
      const ad = arrowEl.data as ArrowData;
      const fromId = ad.from?.target?.elementId;
      const toId   = ad.to?.target?.elementId;

      const fromInside = fromId ? selectedIds.has(fromId) : false;
      const toInside   = toId   ? selectedIds.has(toId)   : false;

      if (!fromInside || !toInside) continue;

      const rawArrow: Record<string, unknown> = { ...(arrowEl.data as Record<string, unknown>) };

      // Rewrite endpoint element ids to placeholder ids
      if (rawArrow['from'] && typeof rawArrow['from'] === 'object') {
        const fromEp = { ...(rawArrow['from'] as Record<string, unknown>) };
        if (fromEp['target'] && typeof fromEp['target'] === 'object') {
          const t = fromEp['target'] as Record<string, unknown>;
          fromEp['target'] = { ...t, elementId: placeholderMap.get(fromId!) ?? fromId! };
        }
        rawArrow['from'] = fromEp;
      }
      if (rawArrow['to'] && typeof rawArrow['to'] === 'object') {
        const toEp = { ...(rawArrow['to'] as Record<string, unknown>) };
        if (toEp['target'] && typeof toEp['target'] === 'object') {
          const t = toEp['target'] as Record<string, unknown>;
          toEp['target'] = { ...t, elementId: placeholderMap.get(toId!) ?? toId! };
        }
        rawArrow['to'] = toEp;
      }

      snapshotArrows.push({
        data: rawArrow,
        placeholderId: `cb-arrow-${snapshotArrows.length}`,
      });
    }

    this.definition = {
      id: generateId('blk'),
      name,
      createdAt: new Date().toISOString(),
      source: { width: maxX - originX, height: maxY - originY },
      elements: snapshotElements,
      arrows: snapshotArrows,
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

  /** The id of the newly created custom block definition. */
  get definitionId(): string {
    return this.definition.id;
  }

  /** The name of the newly created custom block definition. */
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
