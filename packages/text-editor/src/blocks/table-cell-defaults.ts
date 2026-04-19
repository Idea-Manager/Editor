import type { BlockNode, TextRun } from '@core/model/interfaces';
import { generateId } from '@core/id';

export function createDefaultCellBlocks(): BlockNode[] {
  return [{
    id: generateId('blk'),
    type: 'paragraph',
    data: { align: 'left' as const },
    children: [{
      id: generateId('txt'),
      type: 'text' as const,
      data: { text: '', marks: [] },
    }],
  }];
}

/** Legacy cells stored inline runs in `content`. */
export function blocksFromLegacyCellContent(runs: TextRun[] | undefined): BlockNode[] {
  const safe = (runs ?? []).map(r => ({
    id: r.id,
    type: 'text' as const,
    data: { text: r.data?.text ?? '', marks: [...(r.data?.marks ?? [])] },
  }));
  if (safe.length === 0) {
    return createDefaultCellBlocks();
  }
  return [{
    id: generateId('blk'),
    type: 'paragraph',
    data: { align: 'left' as const },
    children: safe,
  }];
}
