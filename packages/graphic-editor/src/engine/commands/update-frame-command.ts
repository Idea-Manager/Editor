import type { DocumentNode, FrameElement } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getAtPath, setAtPath } from '../../util/object-path';

const ALLOWED_ROOT_SEGMENTS = new Set(['data']);

function validateFramePath(path: string): void {
  if (!path) throw new Error('UpdateFrameCommand: path must be non-empty');
  const root = path.split('.')[0];
  if (!ALLOWED_ROOT_SEGMENTS.has(root)) {
    throw new Error(`UpdateFrameCommand: path must start with "data.", got "${path}"`);
  }
}

export interface UpdateFrameCommandOptions {
  doc: DocumentNode;
  pageId: string;
  frameId: string;
  path: string;
  value: unknown;
  mergeWindowMs?: number;
}

/**
 * Updates a single data field on a FrameElement (e.g. data.x, data.width).
 * Supports mergeWindowMs for debouncing drag-resize sequences.
 */
export class UpdateFrameCommand implements Command {
  readonly operationRecords: OperationRecord[];

  private readonly doc: DocumentNode;
  private readonly pageId: string;
  private readonly frameId: string;
  private readonly path: string;
  private readonly oldValue: unknown;
  private newValue: unknown;
  private readonly mergeWindowMs: number;
  private lastUpdatedAt: number;

  constructor({ doc, pageId, frameId, path, value, mergeWindowMs = 0 }: UpdateFrameCommandOptions) {
    validateFramePath(path);

    this.doc = doc;
    this.pageId = pageId;
    this.frameId = frameId;
    this.path = path;
    this.newValue = value;
    this.mergeWindowMs = mergeWindowMs;
    this.lastUpdatedAt = Date.now();

    const page = doc.graphicPages.find(p => p.id === pageId);
    const frame = page?.frames.find(f => f.id === frameId);
    this.oldValue = frame
      ? getAtPath(frame as unknown as Record<string, unknown>, path)
      : undefined;

    const now = this.lastUpdatedAt;
    this.operationRecords = [
      {
        id: generateId('op'),
        actorId: 'local',
        timestamp: now,
        wallClock: now,
        type: 'node:update',
        payload: {
          nodeId: frameId,
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
    const idx = page.frames.findIndex(f => f.id === this.frameId);
    if (idx === -1) return;

    page.frames[idx] = setAtPath(
      page.frames[idx] as unknown as Record<string, unknown>,
      this.path,
      this.newValue,
    ) as unknown as FrameElement;
  }

  undo(): void {
    const page = this.doc.graphicPages.find(p => p.id === this.pageId);
    if (!page) return;
    const idx = page.frames.findIndex(f => f.id === this.frameId);
    if (idx === -1) return;

    page.frames[idx] = setAtPath(
      page.frames[idx] as unknown as Record<string, unknown>,
      this.path,
      this.oldValue,
    ) as unknown as FrameElement;
  }

  merge(next: Command): boolean {
    if (!(next instanceof UpdateFrameCommand)) return false;
    if (next.frameId !== this.frameId) return false;
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
