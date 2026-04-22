import type { DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { getBlockById } from '../engine/block-locator';
import { InlineMarkManager } from './inline-mark-manager';

function cloneTextRunsFromBlock(block: { children: TextRun[] }): TextRun[] {
  return block.children.map(r => ({
    ...r,
    data: { ...r.data, marks: [...r.data.marks] },
  }));
}

export class SetLinkCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private oldChildren: TextRun[];
  private newChildren: TextRun[] | null = null;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly startOffset: number,
    private readonly endOffset: number,
    private readonly href: string | undefined,
    private readonly markManager: InlineMarkManager,
  ) {
    const block = getBlockById(doc, blockId);
    this.oldChildren = block ? cloneTextRunsFromBlock(block) : [];
  }

  execute(): void {
    const block = getBlockById(this.doc, this.blockId);
    if (!block) return;

    this.newChildren = this.markManager.setLinkInRange(
      block,
      this.startOffset,
      this.endOffset,
      this.href,
    );
    block.children = this.newChildren;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: Date.now(),
      wallClock: Date.now(),
      type: 'node:update',
      payload: {
        nodeId: block.id,
        path: 'children',
        oldValue: this.oldChildren,
        newValue: this.newChildren,
      },
    });
  }

  undo(): void {
    const block = getBlockById(this.doc, this.blockId);
    if (!block) return;
    block.children = cloneTextRunsFromBlock({ children: this.oldChildren });
  }
}
