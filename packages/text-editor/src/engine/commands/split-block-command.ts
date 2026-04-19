import type { BlockNode, DocumentNode, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { OperationRecord } from '@core/operation-log/interfaces';
import { generateId } from '@core/id';
import { InlineMarkManager } from '../../inline/inline-mark-manager';
import { findBlockLocation } from '../block-locator';
import { cloneBlockNodeDeep } from '../document-snapshot';

function cloneRuns(runs: TextRun[]): TextRun[] {
  return runs.map(r => ({
    ...r,
    data: { ...r.data, marks: [...r.data.marks] },
  }));
}

export class SplitBlockCommand implements Command {
  readonly operationRecords: OperationRecord[] = [];
  private newBlockId = '';
  private originalChildren: TextRun[] = [];
  private splitBlockId = '';
  private beforeChildren: TextRun[] = [];
  private newBlockSnapshot: BlockNode | null = null;
  private planned = false;

  constructor(
    private readonly doc: DocumentNode,
    private readonly blockId: string,
    private readonly offset: number,
  ) {}

  execute(): void {
    const loc = findBlockLocation(this.doc, this.blockId);
    if (!loc) return;

    if (!this.planned) {
      this.splitBlockId = loc.block.id;
      const block = loc.block;

      this.originalChildren = block.children.map(r => ({
        ...r,
        data: { ...r.data, marks: [...r.data.marks] },
      }));

      const mgr = new InlineMarkManager();
      const { before, after } = mgr.splitRunAtOffset(block.children, this.offset);

      const totalLen = block.children.reduce((s, r) => s + r.data.text.length, 0);
      const isAtEnd = this.offset >= totalLen;
      const newType = (block.type === 'heading' && isAtEnd) ? 'paragraph' : block.type;

      this.newBlockId = generateId('blk');

      let newBlockData: Record<string, unknown>;
      if (newType === 'paragraph') {
        newBlockData = { align: 'left' as const };
      } else {
        newBlockData = { ...block.data };
      }

      const beforeRuns = before.length > 0 ? before : [{
        id: generateId('txt'),
        type: 'text' as const,
        data: { text: '', marks: [] },
      }];

      const afterRuns = after.length > 0 ? after : [{
        id: generateId('txt'),
        type: 'text' as const,
        data: { text: '', marks: [] },
      }];

      this.beforeChildren = cloneRuns(beforeRuns);

      this.newBlockSnapshot = {
        id: this.newBlockId,
        type: newType as BlockNode['type'],
        data: newBlockData,
        children: cloneRuns(afterRuns),
        meta: { createdAt: Date.now(), version: 1 },
      };

      this.planned = true;

      this.operationRecords.push(
        {
          id: generateId('op'),
          actorId: 'local',
          timestamp: Date.now(),
          wallClock: Date.now(),
          type: 'node:update',
          payload: {
            nodeId: block.id,
            path: 'children',
            oldValue: this.originalChildren,
            newValue: this.beforeChildren,
          },
        },
        {
          id: generateId('op'),
          actorId: 'local',
          timestamp: Date.now(),
          wallClock: Date.now(),
          type: 'node:insert',
          payload: {
            parentId: this.doc.id,
            index: loc.index + 1,
            node: this.newBlockSnapshot,
          },
        },
      );
    }

    if (findBlockLocation(this.doc, this.newBlockId)) return;

    const splitLoc = findBlockLocation(this.doc, this.splitBlockId);
    if (!splitLoc || !this.newBlockSnapshot) return;

    splitLoc.block.children = cloneRuns(this.beforeChildren);
    splitLoc.parentList.splice(splitLoc.index + 1, 0, cloneBlockNodeDeep(this.newBlockSnapshot));
  }

  undo(): void {
    const splitLoc = findBlockLocation(this.doc, this.splitBlockId);
    if (!splitLoc) return;

    const block = splitLoc.block;
    block.children = this.originalChildren.map(r => ({
      ...r,
      data: { ...r.data, marks: [...r.data.marks] },
    }));

    const newLoc = findBlockLocation(this.doc, this.newBlockId);
    if (newLoc) {
      newLoc.parentList.splice(newLoc.index, 1);
    }
  }

  getNewBlockId(): string {
    return this.newBlockId;
  }
}
