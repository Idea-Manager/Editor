import type { BlockNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from './inline-mark-manager';

export class SetLinkCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldChildren: TextRun[];
  private newChildren: TextRun[] | null = null;

  constructor(
    private readonly block: BlockNode,
    private readonly startOffset: number,
    private readonly endOffset: number,
    private readonly href: string | undefined,
    private readonly markManager: InlineMarkManager,
  ) {
    this.oldChildren = block.children.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));
  }

  execute(): void {
    this.newChildren = this.markManager.setLinkInRange(
      this.block,
      this.startOffset,
      this.endOffset,
      this.href,
    );
    this.block.children = this.newChildren;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: this.block.id,
        path: 'children',
        oldValue: this.oldChildren,
        newValue: this.newChildren,
      },
    });
  }

  undo(): void {
    this.block.children = this.oldChildren.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));
  }
}
