import type { BlockNode, TextRun, DocumentNode } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { findBlockLocation } from '../block-locator';

export class InsertTextCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private readonly blockId: string;
  private readonly offset: number;
  private mergedText: string;
  private runId: string = '';
  private runOffset: number = 0;
  private timestamp: number;

  constructor(
    private readonly doc: DocumentNode,
    blockId: string,
    offset: number,
    text: string,
  ) {
    this.blockId = blockId;
    this.offset = offset;
    this.mergedText = text;
    this.timestamp = Date.now();
  }

  execute(): void {
    const block = this.findBlock();
    if (!block) return;

    const { run, runOffset } = this.findRunAtOffset(block, this.offset);
    if (!run) {
      if (block.children.length === 0) {
        const newRun: TextRun = {
          id: generateId('txt'),
          type: 'text',
          data: { text: this.mergedText, marks: [] },
        };
        block.children.push(newRun);
        this.runId = newRun.id;
        this.runOffset = 0;

        this.operationRecords.push({
          id: generateId('op'),
          actorId: 'local',
          timestamp: this.timestamp,
          wallClock: this.timestamp,
          type: 'text:insert',
          payload: {
            nodeId: newRun.id,
            offset: 0,
            text: this.mergedText,
          },
        });
      }
      return;
    }

    this.runId = run.id;
    this.runOffset = runOffset;

    const before = run.data.text.slice(0, runOffset);
    const after = run.data.text.slice(runOffset);
    run.data.text = before + this.mergedText + after;

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: this.timestamp,
      wallClock: this.timestamp,
      type: 'text:insert',
      payload: {
        nodeId: run.id,
        offset: runOffset,
        text: this.mergedText,
      },
    });
  }

  undo(): void {
    const block = this.findBlock();
    if (!block) return;

    const run = block.children.find(r => r.id === this.runId);
    if (!run) return;

    const before = run.data.text.slice(0, this.runOffset);
    const after = run.data.text.slice(this.runOffset + this.mergedText.length);
    run.data.text = before + after;

    if (run.data.text === '' && block.children.length > 1) {
      block.children = block.children.filter(r => r.id !== run.id);
    }
  }

  merge(next: Command): boolean {
    if (!(next instanceof InsertTextCommand)) return false;
    if (next.blockId !== this.blockId) return false;

    const expectedOffset = this.offset + this.mergedText.length;
    if (next.offset !== expectedOffset) return false;

    if (Date.now() - this.timestamp > 1000) return false;

    // Absorb: execute the next command's effect here
    const block = this.findBlock();
    if (!block) return false;

    const run = block.children.find(r => r.id === this.runId);
    if (!run) return false;

    const insertAt = this.runOffset + this.mergedText.length;
    const before = run.data.text.slice(0, insertAt);
    const after = run.data.text.slice(insertAt);
    run.data.text = before + next.mergedText + after;

    this.mergedText += next.mergedText;
    this.timestamp = Date.now();

    this.operationRecords.push({
      id: generateId('op'),
      actorId: 'local',
      timestamp: this.timestamp,
      wallClock: this.timestamp,
      type: 'text:insert',
      payload: {
        nodeId: run.id,
        offset: insertAt,
        text: next.mergedText,
      },
    });

    return true;
  }

  private findBlock(): BlockNode | undefined {
    return findBlockLocation(this.doc, this.blockId)?.block;
  }

  private findRunAtOffset(
    block: BlockNode,
    offset: number,
  ): { run: TextRun | null; runOffset: number } {
    let pos = 0;
    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      if (offset <= runEnd) {
        return { run, runOffset: offset - pos };
      }
      pos = runEnd;
    }
    // Past the end -- use the last run
    if (block.children.length > 0) {
      const lastRun = block.children[block.children.length - 1];
      return { run: lastRun, runOffset: lastRun.data.text.length };
    }
    return { run: null, runOffset: 0 };
  }
}
