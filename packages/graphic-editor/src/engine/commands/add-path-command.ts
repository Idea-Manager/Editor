import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import type { GraphicBlockRegistry } from '../../blocks/block-registry';
import type { PathData } from '../../blocks/path/path-block';
import { PATH_DEFAULTS } from '../../blocks/path/path-block';
import { AddElementCommand } from './add-element-command';

export interface AddPathCommandOptions {
  doc: DocumentNode;
  pageId: string;
  registry: GraphicBlockRegistry;
  /** Smoothed world-space points produced by PenController. */
  points: Array<{ x: number; y: number }>;
  /** Optional overrides (e.g. stroke/strokeWidth from style preferences). */
  overrides?: Partial<PathData>;
}

/** Compute AABB of a point list. Returns a zero-sized rect at origin when empty. */
function boundsFromPoints(
  points: Array<{ x: number; y: number }>,
): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Creates a new 'path' GraphicElement from a list of smoothed world-space points.
 *
 * Internally delegates to AddElementCommand with a full PathData override so that
 * frame auto-attachment and operation-log generation reuse the shared infrastructure.
 * The operation log from the inner command can be inspected in tests to confirm
 * the element insertion and optional frame attachment.
 */
export class AddPathCommand implements Command {
  private readonly innerCmd: AddElementCommand;

  constructor({ doc, pageId, registry, points, overrides }: AddPathCommandOptions) {
    const bounds = boundsFromPoints(points);

    const pathData: PathData = {
      stroke: PATH_DEFAULTS.stroke,
      strokeWidth: PATH_DEFAULTS.strokeWidth,
      lineCap: PATH_DEFAULTS.lineCap,
      lineJoin: PATH_DEFAULTS.lineJoin,
      ...overrides,
      points,
      bounds,
    };

    this.innerCmd = new AddElementCommand({
      doc,
      pageId,
      type: 'path',
      registry,
      dataOverride: pathData as unknown as Record<string, unknown>,
    });
  }

  get operationRecords(): OperationRecord[] {
    return this.innerCmd.operationRecords;
  }

  execute(): void {
    this.innerCmd.execute();
  }

  undo(): void {
    this.innerCmd.undo();
  }
}
