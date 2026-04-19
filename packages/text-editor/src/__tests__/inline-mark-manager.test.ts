import { createParagraph, createTextRun } from '@core/model/factory';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { ToggleMarkCommand } from '../inline/toggle-mark-command';
import type { BlockNode, ParagraphData } from '@core/model/interfaces';

describe('InlineMarkManager', () => {
  let mgr: InlineMarkManager;

  beforeEach(() => {
    mgr = new InlineMarkManager();
  });

  it('toggles bold on plain text', () => {
    const block = createParagraph('Hello world');
    // "Hello" is 0..5
    const result = mgr.toggleMark('bold', block, 0, 5);

    const boldRun = result.find(r => r.data.marks.includes('bold'));
    expect(boldRun).toBeDefined();
    expect(boldRun!.data.text).toBe('Hello');

    const plainRun = result.find(r => r.data.marks.length === 0);
    expect(plainRun).toBeDefined();
    expect(plainRun!.data.text).toBe(' world');
  });

  it('toggles bold off marked text', () => {
    const block: BlockNode<ParagraphData> = {
      id: 'blk_test',
      type: 'paragraph',
      data: { align: 'left' },
      children: [
        { id: 'txt_1', type: 'text', data: { text: 'Bold', marks: ['bold'] } },
        { id: 'txt_2', type: 'text', data: { text: ' normal', marks: [] } },
      ],
    };

    const result = mgr.toggleMark('bold', block, 0, 4);

    // Bold should be removed from "Bold", then runs merge since both are now mark-free
    expect(result[0].data.marks).not.toContain('bold');
    expect(result[0].data.text).toBe('Bold normal');
  });

  it('splits runs at selection boundary', () => {
    const block = createParagraph('Hello world');
    // Bold "lo wo" (offset 3..8)
    const result = mgr.toggleMark('bold', block, 3, 8);

    const texts = result.map(r => r.data.text);
    expect(texts).toContain('Hel');
    expect(texts).toContain('lo wo');
    expect(texts).toContain('rld');

    const boldRun = result.find(r => r.data.text === 'lo wo');
    expect(boldRun!.data.marks).toContain('bold');
  });

  it('merges adjacent runs with identical marks', () => {
    const block: BlockNode<ParagraphData> = {
      id: 'blk_test',
      type: 'paragraph',
      data: { align: 'left' },
      children: [
        { id: 'txt_1', type: 'text', data: { text: 'AA', marks: ['bold'] } },
        { id: 'txt_2', type: 'text', data: { text: 'BB', marks: ['bold'] } },
      ],
    };

    const merged = mgr.mergeAdjacentRuns(block.children);
    expect(merged).toHaveLength(1);
    expect(merged[0].data.text).toBe('AABB');
    expect(merged[0].data.marks).toContain('bold');
  });

  it('handles multi-mark combinations', () => {
    const block: BlockNode<ParagraphData> = {
      id: 'blk_test',
      type: 'paragraph',
      data: { align: 'left' },
      children: [
        { id: 'txt_1', type: 'text', data: { text: 'Hello', marks: ['bold'] } },
      ],
    };

    // Add italic on top of bold
    const result = mgr.toggleMark('italic', block, 0, 5);
    expect(result[0].data.marks).toContain('bold');
    expect(result[0].data.marks).toContain('italic');
  });

  it('returns unchanged runs for zero-length range', () => {
    const block = createParagraph('Hello');
    const result = mgr.toggleMark('bold', block, 3, 3);
    expect(result).toBe(block.children);
  });

  it('getActiveMarks returns marks at offset', () => {
    const block: BlockNode<ParagraphData> = {
      id: 'blk_test',
      type: 'paragraph',
      data: { align: 'left' },
      children: [
        { id: 'txt_1', type: 'text', data: { text: 'Hello', marks: ['bold', 'italic'] } },
        { id: 'txt_2', type: 'text', data: { text: ' world', marks: [] } },
      ],
    };

    expect(mgr.getActiveMarks(block, 3)).toEqual(['bold', 'italic']);
    expect(mgr.getActiveMarks(block, 7)).toEqual([]);
  });

  it('splitRunAtOffset splits correctly', () => {
    const runs = [
      createTextRun('Hello'),
      createTextRun(' world'),
    ];

    const { before, after } = mgr.splitRunAtOffset(runs, 5);
    expect(before).toHaveLength(1);
    expect(before[0].data.text).toBe('Hello');
    expect(after).toHaveLength(1);
    expect(after[0].data.text).toBe(' world');
  });

  it('splitRunAtOffset splits within a run', () => {
    const runs = [createTextRun('Hello world')];
    const { before, after } = mgr.splitRunAtOffset(runs, 5);

    expect(before).toHaveLength(1);
    expect(before[0].data.text).toBe('Hello');
    expect(after).toHaveLength(1);
    expect(after[0].data.text).toBe(' world');
  });
});

describe('ToggleMarkCommand', () => {
  let mgr: InlineMarkManager;

  beforeEach(() => {
    mgr = new InlineMarkManager();
  });

  it('executes and produces operation records', () => {
    const block = createParagraph('Hello');
    const cmd = new ToggleMarkCommand(block, 'bold', 0, 5, mgr);

    cmd.execute();

    expect(block.children[0].data.marks).toContain('bold');
    expect(cmd.operationRecords).toHaveLength(1);
    expect(cmd.operationRecords[0].type).toBe('node:update');
  });

  it('undo restores original children', () => {
    const block = createParagraph('Hello');
    const originalText = block.children[0].data.text;
    const cmd = new ToggleMarkCommand(block, 'bold', 0, 5, mgr);

    cmd.execute();
    expect(block.children[0].data.marks).toContain('bold');

    cmd.undo();
    expect(block.children[0].data.marks).not.toContain('bold');
    expect(block.children[0].data.text).toBe(originalText);
  });
});
