import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getAtPath, setAtPath } from '../../util/object-path';

const ALLOWED_ROOT_SEGMENTS = new Set(['data', 'meta']);
const REJECTED_PATHS = new Set(['id', 'type']);

function validateElementPath(path: string): void {
  if (!path) throw new Error('UpdateElementCommand: path must be non-empty');
  const root = path.split('.')[0];
  if (REJECTED_PATHS.has(path) || REJECTED_PATHS.has(root)) {
    throw new Error(`UpdateElementCommand: path "${path}" is not allowed`);
  }
  if (!ALLOWED_ROOT_SEGMENTS.has(root)) {
    throw new Error(`UpdateElementCommand: path must start with "data." or "meta.", got "${path}"`);
  }
}

export interface UpdateElementCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementId: string;
  path: string;
  value: unknown;
  mergeWindowMs?: number;
}

export class UpdateElementCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly elementId: string;
  private readonly path: string;
  private readonly oldValue: unknown;
  private newValue: unknown;
  private readonly mergeWindowMs: number;
  private lastUpdatedAt: number;

  constructor({ doc, pageId, elementId, path, value, mergeWindowMs = 0 }: UpdateElementCommandOptions) {
    validateElementPath(path);

    this.doc = doc;
    this.pageId = pageId;
    this.elementId = elementId;
    this.path = path;
    this.newValue = value;
    this.mergeWindowMs = mergeWindowMs;
    this.lastUpdatedAt = Date.now();

    const page = doc.graphicPages.find(p => p.id === pageId);
    const element = page?.elements.find(el => el.id === elementId);
    this.oldValue = element ? getAtPath(element as unknown as Record<string, unknown>, path) : undefined;

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
          path,
          oldValue: this.oldValue,
          newValue: value,
        },
      },
    ];
  }

  execute(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;
    const idx = page.elements.findIndex(el => el.id === this.elementId);
    if (idx === -1) return;

    page.elements[idx] = setAtPath(
      page.elements[idx] as unknown as Record<string, unknown>,
      this.path,
      this.newValue,
    ) as unknown as GraphicElement;
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;
    const idx = page.elements.findIndex(el => el.id === this.elementId);
    if (idx === -1) return;

    page.elements[idx] = setAtPath(
      page.elements[idx] as unknown as Record<string, unknown>,
      this.path,
      this.oldValue,
    ) as unknown as GraphicElement;
  }

  merge(next: Command): boolean {
    if (!(next instanceof UpdateElementCommand)) return false;
    if (next.elementId !== this.elementId) return false;
    if (next.path !== this.path) return false;
    if (this.mergeWindowMs <= 0) return false;
    if (Date.now() - this.lastUpdatedAt >= this.mergeWindowMs) return false;

    this.newValue = next.newValue;
    this.lastUpdatedAt = Date.now();

    const record = this.operationRecords[0];
    if (record && record.type === 'node:update') {
      (record.payload as { newValue: unknown }).newValue = this.newValue;
    }

    this.execute();
    return true;
  }
}
