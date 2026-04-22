import type { BlockNode, TextRun, InlineMark } from '@core/model/interfaces';
import { generateId } from '@core/id';

function runData(run: TextRun): TextRun['data'] {
  return {
    text: run.data.text,
    marks: [...run.data.marks],
    ...(run.data.color !== undefined ? { color: run.data.color } : {}),
    ...(run.data.href !== undefined ? { href: run.data.href } : {}),
  };
}

export class InlineMarkManager {
  toggleMark(
    mark: InlineMark,
    block: BlockNode,
    startOffset: number,
    endOffset: number,
  ): TextRun[] {
    if (startOffset === endOffset) return block.children;

    const runs = block.children;
    const split = this.splitRunsAtOffsets(runs, startOffset, endOffset);
    const allHaveMark = this.rangeHasMark(split, startOffset, endOffset, mark);

    let offset = 0;
    const result: TextRun[] = [];

    for (const run of split) {
      const runEnd = offset + run.data.text.length;
      const inRange = offset >= startOffset && runEnd <= endOffset;

      if (inRange) {
        const marks = allHaveMark
          ? run.data.marks.filter(m => m !== mark)
          : run.data.marks.includes(mark)
            ? [...run.data.marks]
            : [...run.data.marks, mark];

        result.push({
          id: run.id,
          type: 'text',
          data: { ...runData(run), marks },
        });
      } else {
        result.push(run);
      }

      offset = runEnd;
    }

    return this.mergeAdjacentRuns(result);
  }

  setTextColorInRange(
    block: BlockNode,
    startOffset: number,
    endOffset: number,
    color: string,
  ): TextRun[] {
    if (startOffset === endOffset) return block.children;

    const runs = block.children;
    const split = this.splitRunsAtOffsets(runs, startOffset, endOffset);

    let offset = 0;
    const result: TextRun[] = [];

    for (const run of split) {
      const runEnd = offset + run.data.text.length;
      const inRange = offset >= startOffset && runEnd <= endOffset;

      if (inRange) {
        result.push({
          id: run.id,
          type: 'text',
          data: { ...runData(run), color },
        });
      } else {
        result.push(run);
      }

      offset = runEnd;
    }

    return this.mergeAdjacentRuns(result);
  }

  setLinkInRange(
    block: BlockNode,
    startOffset: number,
    endOffset: number,
    href: string | undefined,
  ): TextRun[] {
    if (startOffset === endOffset) return block.children;

    const runs = block.children;
    const split = this.splitRunsAtOffsets(runs, startOffset, endOffset);

    let offset = 0;
    const result: TextRun[] = [];

    for (const run of split) {
      const runEnd = offset + run.data.text.length;
      const inRange = offset >= startOffset && runEnd <= endOffset;

      if (inRange) {
        const next: TextRun['data'] = { ...runData(run) };
        if (href !== undefined && href.trim() !== '') {
          next.href = href.trim();
        } else {
          delete next.href;
        }
        result.push({
          id: run.id,
          type: 'text',
          data: next,
        });
      } else {
        result.push(run);
      }

      offset = runEnd;
    }

    return this.mergeAdjacentRuns(result);
  }

  getActiveMarks(block: BlockNode, offset: number): InlineMark[] {
    let pos = 0;
    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      if (offset === pos && run.data.text.length > 0) {
        return [...run.data.marks];
      }
      if (offset > pos && offset < runEnd) {
        return [...run.data.marks];
      }
      pos = runEnd;
    }
    const lastRun = block.children[block.children.length - 1];
    if (lastRun) return [...lastRun.data.marks];
    return [];
  }

  getActiveMarksInRange(block: BlockNode, start: number, end: number): InlineMark[] {
    if (start === end) return this.getActiveMarks(block, start);

    let pos = 0;
    let active: Set<InlineMark> | null = null;

    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      const overlapStart = Math.max(pos, start);
      const overlapEnd = Math.min(runEnd, end);

      if (overlapStart < overlapEnd) {
        if (active === null) {
          active = new Set<InlineMark>(run.data.marks);
        } else {
          for (const m of active) {
            if (!run.data.marks.includes(m)) active.delete(m);
          }
        }
      }
      pos = runEnd;
    }

    return active ? [...active] : [];
  }

  /** Uniform `data.color` across the range, or `undefined` if mixed / no overlapping text. */
  getUniformTextColorInRange(block: BlockNode, start: number, end: number): string | undefined {
    if (start === end) {
      let pos = 0;
      for (const run of block.children) {
        const runEnd = pos + run.data.text.length;
        if (start >= pos && start < runEnd) {
          return run.data.color;
        }
        pos = runEnd;
      }
      const last = block.children[block.children.length - 1];
      return last?.data.color;
    }

    let pos = 0;
    let color: string | undefined | null = null;

    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      const overlapStart = Math.max(pos, start);
      const overlapEnd = Math.min(runEnd, end);

      if (overlapStart < overlapEnd) {
        const c = run.data.color;
        if (color === null) {
          color = c;
        } else if ((c ?? '') !== (color ?? '')) {
          return undefined;
        }
      }
      pos = runEnd;
    }

    return color === null ? undefined : color ?? undefined;
  }

  /** Uniform `data.href` across the range, or `undefined` if mixed / no overlap. */
  /**
   * Offset range covering the contiguous runs that share the same marks, color, and href as `runId`
   * (same merge rule as `mergeAdjacentRuns`).
   */
  expandContiguousStyledRange(block: BlockNode, runId: string): { start: number; end: number } | null {
    const idx = block.children.findIndex(r => r.id === runId);
    if (idx === -1) return null;
    const ref = block.children[idx].data;
    let lo = idx;
    while (lo > 0 && this.runStyleEqual(block.children[lo - 1].data, ref)) {
      lo--;
    }
    let hi = idx;
    while (hi < block.children.length - 1 && this.runStyleEqual(ref, block.children[hi + 1].data)) {
      hi++;
    }
    let start = 0;
    for (let i = 0; i < lo; i++) {
      start += block.children[i].data.text.length;
    }
    let end = start;
    for (let i = lo; i <= hi; i++) {
      end += block.children[i].data.text.length;
    }
    return { start, end };
  }

  getUniformHrefInRange(block: BlockNode, start: number, end: number): string | undefined {
    if (start === end) {
      let pos = 0;
      for (const run of block.children) {
        const runEnd = pos + run.data.text.length;
        if (start >= pos && start < runEnd) {
          return run.data.href;
        }
        pos = runEnd;
      }
      const last = block.children[block.children.length - 1];
      return last?.data.href;
    }

    let pos = 0;
    let href: string | undefined | null = null;

    for (const run of block.children) {
      const runEnd = pos + run.data.text.length;
      const overlapStart = Math.max(pos, start);
      const overlapEnd = Math.min(runEnd, end);

      if (overlapStart < overlapEnd) {
        const h = run.data.href;
        if (href === null) {
          href = h;
        } else if ((h ?? '') !== (href ?? '')) {
          return undefined;
        }
      }
      pos = runEnd;
    }

    return href === null ? undefined : href ?? undefined;
  }

  splitRunAtOffset(runs: TextRun[], offset: number): { before: TextRun[]; after: TextRun[] } {
    const before: TextRun[] = [];
    const after: TextRun[] = [];
    let pos = 0;
    let splitDone = false;

    for (const run of runs) {
      const runEnd = pos + run.data.text.length;

      if (splitDone) {
        after.push(run);
      } else if (offset <= pos) {
        splitDone = true;
        after.push(run);
      } else if (offset >= runEnd) {
        before.push(run);
      } else {
        const splitPoint = offset - pos;
        before.push({
          id: run.id,
          type: 'text',
          data: {
            ...runData(run),
            text: run.data.text.slice(0, splitPoint),
          },
        });
        after.push({
          id: generateId('txt'),
          type: 'text',
          data: {
            ...runData(run),
            text: run.data.text.slice(splitPoint),
          },
        });
        splitDone = true;
      }

      pos = runEnd;
    }

    return { before, after };
  }

  private splitRunsAtOffsets(
    runs: TextRun[],
    startOffset: number,
    endOffset: number,
  ): TextRun[] {
    let result = [...runs];
    result = this.splitAtOffset(result, endOffset);
    result = this.splitAtOffset(result, startOffset);
    return result;
  }

  private splitAtOffset(runs: TextRun[], offset: number): TextRun[] {
    const result: TextRun[] = [];
    let pos = 0;

    for (const run of runs) {
      const runEnd = pos + run.data.text.length;

      if (offset > pos && offset < runEnd) {
        const splitPoint = offset - pos;
        result.push({
          id: run.id,
          type: 'text',
          data: {
            ...runData(run),
            text: run.data.text.slice(0, splitPoint),
          },
        });
        result.push({
          id: generateId('txt'),
          type: 'text',
          data: {
            ...runData(run),
            text: run.data.text.slice(splitPoint),
          },
        });
      } else {
        result.push(run);
      }

      pos = runEnd;
    }

    return result;
  }

  private rangeHasMark(
    runs: TextRun[],
    startOffset: number,
    endOffset: number,
    mark: InlineMark,
  ): boolean {
    let offset = 0;
    for (const run of runs) {
      const runEnd = offset + run.data.text.length;
      const inRange = offset >= startOffset && runEnd <= endOffset;
      if (inRange && !run.data.marks.includes(mark)) {
        return false;
      }
      offset = runEnd;
    }
    return true;
  }

  mergeAdjacentRuns(runs: TextRun[]): TextRun[] {
    if (runs.length <= 1) return runs;

    const result: TextRun[] = [runs[0]];

    for (let i = 1; i < runs.length; i++) {
      const prev = result[result.length - 1];
      const curr = runs[i];

      if (this.runStyleEqual(prev.data, curr.data)) {
        result[result.length - 1] = {
          id: prev.id,
          type: 'text',
          data: {
            text: prev.data.text + curr.data.text,
            marks: [...prev.data.marks],
            ...(prev.data.color !== undefined ? { color: prev.data.color } : {}),
            ...(prev.data.href !== undefined ? { href: prev.data.href } : {}),
          },
        };
      } else {
        result.push(curr);
      }
    }

    return result;
  }

  private runStyleEqual(a: TextRun['data'], b: TextRun['data']): boolean {
    return (
      this.marksEqual(a.marks, b.marks) &&
      (a.color ?? '') === (b.color ?? '') &&
      (a.href ?? '') === (b.href ?? '')
    );
  }

  private marksEqual(a: InlineMark[], b: InlineMark[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((m, i) => m === sortedB[i]);
  }
}
