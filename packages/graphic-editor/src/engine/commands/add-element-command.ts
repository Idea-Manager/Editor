import type { DocumentNode, GraphicElement, Rect } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import type { IdPrefix } from '@core/id';
import { getGraphicPreferences } from '@core/model/document-data';
import type { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { StyleMemoryService } from '../../preferences/style-memory-service';
import { AttachToFrameCommand } from './attach-to-frame-command';
import { aabbIntersect } from '../hit-tester';

export interface AddElementCommandOptions {
  doc: DocumentNode;
  pageId: string;
  type: string;
  registry: GraphicBlockRegistry;
  dataOverride?: Record<string, unknown>;
  /**
   * When true, skips auto-detection of an intersecting frame.
   * Use when the caller manages frame attachment explicitly (e.g. FrameController).
   */
  skipFrameAttach?: boolean;
  /** Optional ID prefix passed to `generateId`. Defaults to `'el'`. */
  idPrefix?: IdPrefix;
  /**
   * When provided, `getEffectiveDefaults` is used instead of raw
   * `graphicPreferences` so that NON_PERSISTABLE_PATHS and text/template
   * fields are properly excluded from the merged data.
   */
  styleMemory?: StyleMemoryService;
}

/** Returns the first frame (by document order) whose AABB intersects the given bounds. */
function findContainingFrame(
  doc: DocumentNode,
  pageId: string,
  bounds: Rect,
) {
  const page = doc.graphicPages.find(p => p.id === pageId);
  if (!page) return null;
  for (const frame of page.frames) {
    const fb: Rect = { x: frame.data.x, y: frame.data.y, width: frame.data.width, height: frame.data.height };
    if (aabbIntersect(bounds, fb)) {
      return frame;
    }
  }
  return null;
}

export class AddElementCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly element: GraphicElement;
  private readonly attachCmd: AttachToFrameCommand | null;

  constructor({ doc, pageId, type, registry, dataOverride, skipFrameAttach, idPrefix, styleMemory }: AddElementCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;

    const def = registry.get(type);

    const mergedDefaults: Record<string, unknown> = styleMemory
      ? styleMemory.getEffectiveDefaults(type, registry)
      : {
          ...(def.defaultData() as Record<string, unknown>),
          ...((getGraphicPreferences(doc)[type] ?? {}) as Record<string, unknown>),
        };

    this.element = {
      id: generateId(idPrefix ?? 'el'),
      type,
      data: { ...mergedDefaults, ...(dataOverride ?? {}) },
    };

    const page = doc.graphicPages.find(p => p.id === pageId);
    const index = page ? page.elements.length : 0;
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
          index,
          node: { ...this.element },
        },
      },
    ];

    // Auto-detect frame intersection unless explicitly skipped
    if (!skipFrameAttach) {
      const bounds = def.getBounds(this.element);
      const frame = findContainingFrame(doc, pageId, bounds);
      if (frame) {
        this.element.frameId = frame.id;
        this.attachCmd = new AttachToFrameCommand({
          doc,
          pageId,
          frameId: frame.id,
          elementId: this.element.id,
        });
      } else {
        this.attachCmd = null;
      }
    } else {
      this.attachCmd = null;
    }
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    const alreadyAdded = page.elements.some(el => el.id === this.element.id);
    if (alreadyAdded) return;

    page.elements.push(this.element);
    this.attachCmd?.execute();
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;

    this.attachCmd?.undo();

    const idx = page.elements.findIndex(el => el.id === this.element.id);
    if (idx !== -1) {
      page.elements.splice(idx, 1);
    }
  }
}
