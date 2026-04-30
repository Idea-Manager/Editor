import type { DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { CompositeCommand } from '@core/commands/composite-command';
import { UpdateElementCommand } from './update-element-command';

export interface ResizeElementCommandOptions {
  doc: DocumentNode;
  pageId: string;
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Composite command that updates x, y, width, and height of an element atomically.
 * Undo restores all four values in a single step.
 */
export class ResizeElementCommand implements Command {
  private readonly composite: CompositeCommand;

  constructor({ doc, pageId, elementId, x, y, width, height }: ResizeElementCommandOptions) {
    this.composite = new CompositeCommand([
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.x', value: x }),
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.y', value: y }),
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.width', value: width }),
      new UpdateElementCommand({ doc, pageId, elementId, path: 'data.height', value: height }),
    ]);
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
