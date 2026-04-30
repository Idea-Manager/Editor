import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { CompositeCommand } from '@core/commands/composite-command';
import { MoveElementCommand } from './move-element-command';
import type { SelectionEntry } from '../selection-manager';

export interface MoveSelectionCommandOptions {
  doc: DocumentNode;
  pageId: string;
  entries: SelectionEntry[];
  dx: number;
  dy: number;
  /** Reserved for future snap-to-grid; currently unused in UI. */
  snap?: number;
}

/**
 * Composite command that moves all selected elements (and frames) by (dx, dy).
 * For frames, child elements are also translated so they maintain their relative positions.
 */
export class MoveSelectionCommand implements Command {
  private readonly composite: CompositeCommand;

  constructor({ doc, pageId, entries, dx, dy }: MoveSelectionCommandOptions) {
    const page = doc.graphicPages.find(p => p.id === pageId);
    const commands: Command[] = [];

    const movedElementIds = new Set<string>();

    for (const entry of entries) {
      if (entry.type === 'element') {
        if (!movedElementIds.has(entry.id)) {
          movedElementIds.add(entry.id);
          commands.push(new MoveElementCommand({ doc, pageId, elementId: entry.id, dx, dy }));
        }
      } else if (entry.type === 'frame' && page) {
        const frame = page.frames.find(f => f.id === entry.id);
        if (frame) {
          // Move the frame itself — translate data.x / data.y via a pair of UpdateElementCommands
          // We reuse MoveElementCommand's pattern but frames are not elements; do it inline.
          // Frames don't go through UpdateElementCommand (no registry) — manipulate directly via
          // a lightweight Frame move command built inline as a custom Command object.
          const prevX = frame.data.x;
          const prevY = frame.data.y;
          commands.push(_makeFrameMoveCommand(doc, pageId, entry.id, prevX, prevY, dx, dy));

          // Also move all child elements that are not already being moved individually.
          for (const childId of frame.childElementIds) {
            if (!movedElementIds.has(childId)) {
              movedElementIds.add(childId);
              commands.push(new MoveElementCommand({ doc, pageId, elementId: childId, dx, dy }));
            }
          }
        }
      }
    }

    this.composite = new CompositeCommand(commands);
  }

  get operationRecords(): OperationRecord[] {
    return this.composite.operationRecords;
  }

  execute(): void {
    this.composite.execute();
  }

  undo(): void {
    this.composite.undo();
  }
}

/** Inline command for moving a FrameElement's data.x / data.y. */
function _makeFrameMoveCommand(
  doc: DocumentNode,
  pageId: string,
  frameId: string,
  prevX: number,
  prevY: number,
  dx: number,
  dy: number,
): Command {
  return {
    operationRecords: [],
    execute() {
      const page = doc.graphicPages.find(p => p.id === pageId);
      const frame = page?.frames.find(f => f.id === frameId);
      if (frame) {
        frame.data.x = prevX + dx;
        frame.data.y = prevY + dy;
      }
    },
    undo() {
      const page = doc.graphicPages.find(p => p.id === pageId);
      const frame = page?.frames.find(f => f.id === frameId);
      if (frame) {
        frame.data.x = prevX;
        frame.data.y = prevY;
      }
    },
  };
}
