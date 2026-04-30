import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import type { ArrowEndpoint } from '../../blocks/arrow/arrow-block';
import { getAtPath, setAtPath } from '../../util/object-path';

export interface UpdateArrowEndpointCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementId: string;
  /** Which endpoint to update. */
  which: 'from' | 'to';
  endpoint: ArrowEndpoint;
  /** When > 0, consecutive commands within this window (ms) merge into one. */
  mergeWindowMs?: number;
}

/**
 * Updates one endpoint of an arrow element.
 *
 * Produces two `node:update` operation records — one for `data.<which>.target`
 * and one for `data.<which>.point` — so that CRDT-based remote collaboration
 * can apply each field change independently.
 *
 * Supports merge within `mergeWindowMs` for smooth endpoint-drag UX.
 */
export class UpdateArrowEndpointCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly elementId: string;
  private readonly which: 'from' | 'to';
  private endpoint: ArrowEndpoint;
  private readonly mergeWindowMs: number;
  private lastUpdatedAt: number;

  private readonly oldTarget: unknown;
  private readonly oldPoint: unknown;

  constructor({
    doc,
    pageId,
    elementId,
    which,
    endpoint,
    mergeWindowMs = 0,
  }: UpdateArrowEndpointCommandOptions) {
    this.doc = doc;
    this.pageId = pageId;
    this.elementId = elementId;
    this.which = which;
    this.endpoint = endpoint;
    this.mergeWindowMs = mergeWindowMs;
    this.lastUpdatedAt = Date.now();

    const page = doc.graphicPages.find(p => p.id === pageId);
    const element = page?.elements.find(el => el.id === elementId) as Record<string, unknown> | undefined;

    this.oldTarget = element ? getAtPath(element, `data.${which}.target`) : undefined;
    this.oldPoint = element ? getAtPath(element, `data.${which}.point`) : undefined;

    const now = this.lastUpdatedAt;
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: {
          nodeId: elementId,
          path: `data.${which}.target`,
          oldValue: this.oldTarget,
          newValue: endpoint.target,
        },
      },
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: {
          nodeId: elementId,
          path: `data.${which}.point`,
          oldValue: this.oldPoint,
          newValue: endpoint.point,
        },
      },
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;
    const idx = page.elements.findIndex(el => el.id === this.elementId);
    if (idx === -1) return;

    let el = page.elements[idx] as unknown as Record<string, unknown>;
    el = setAtPath(el, `data.${this.which}.target`, this.endpoint.target);
    el = setAtPath(el, `data.${this.which}.point`, this.endpoint.point);
    page.elements[idx] = el as never;
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;
    const idx = page.elements.findIndex(el => el.id === this.elementId);
    if (idx === -1) return;

    let el = page.elements[idx] as unknown as Record<string, unknown>;
    el = setAtPath(el, `data.${this.which}.target`, this.oldTarget);
    el = setAtPath(el, `data.${this.which}.point`, this.oldPoint);
    page.elements[idx] = el as never;
  }

  merge(next: Command): boolean {
    if (!(next instanceof UpdateArrowEndpointCommand)) return false;
    if (next.elementId !== this.elementId) return false;
    if (next.which !== this.which) return false;
    if (this.mergeWindowMs <= 0) return false;
    if (Date.now() - this.lastUpdatedAt >= this.mergeWindowMs) return false;

    this.endpoint = next.endpoint;
    this.lastUpdatedAt = Date.now();

    const targetRecord = this.operationRecords[0];
    const pointRecord = this.operationRecords[1];
    if (targetRecord?.type === 'node:update') {
      (targetRecord.payload as { newValue: unknown }).newValue = next.endpoint.target;
    }
    if (pointRecord?.type === 'node:update') {
      (pointRecord.payload as { newValue: unknown }).newValue = next.endpoint.point;
    }

    this.execute();
    return true;
  }
}
