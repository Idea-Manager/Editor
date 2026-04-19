import type { BlockNode, TextRun, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';

export type DeleteDirection = 'backward' | 'forward';

export class DeleteCharCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private deletedChar: string = '';
  private runId: string = '';
  private deleteOffset: number = 0;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly offset: number,
    private readonly direction: DeleteDirection,
  ) {}

  execute(): void {
    const block = this.findBlock();
    if (!block) return;

    if (this.direction === 'backward') {
      if (this.offset === 0) return; // mergeBackward handled elsewhere
      this.deleteAt(block, this.offset - 1);
    } else {
      const totalLen = this.getBlockTextLength(block);
      if (this.offset >= totalLen) return;
      this.deleteAt(block, this.offset);
    }
  }

  undo(): void {
    if (!this.deletedChar) return;

    const block = this.findBlock();
    if (!block) return;

    const run = block.children.find(r => r.id === this.runId);
    if (!run) return;

    const before = run.data.text.slice(0, this.deleteOffset);
    const after = run.data.text.slice(this.deleteOffset);
    run.data.text = before + this.deletedChar + after;
  }

  private deleteAt(block: BlockNode, offset: number): void {
    let pos = 0;
    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      if (offset >= pos && offset < runEnd) {
        const runOffset = offset - pos;
        this.deletedChar = run.data.text[runOffset];
        this.runId = run.id;
        this.deleteOffset = runOffset;

        run.data.text =
          run.data.text.slice(0, runOffset) +
          run.data.text.slice(runOffset + 1);

        if (run.data.text === '' && block.children.length > 1) {
          block.children = block.children.filter(r => r.id !== run.id);
        }

        this.operationRecords.push({
          id: generateId('op'),
          actorId: 'local',
          timestamp: Date.now(),
          wallClock: Date.now(),
          type: 'text:delete',
          payload: {
            nodeId: run.id,
            offset: runOffset,
            length: 1,
            deletedText: this.deletedChar,
          },
        });
        return;
      }
      pos = runEnd;
    }
  }

  private findBlock(): BlockNode | undefined {
    return this.doc.children.find(b => b.id === this.blockId);
  }

  private getBlockTextLength(block: BlockNode): number {
    return block.children.reduce((sum, run) => sum + run.data.text.length, 0);
  }
}
