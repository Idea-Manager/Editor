import type { BlockNode, ParagraphData, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { renderInline } from '../inline/inline-renderer';

export class ParagraphBlock implements BlockDefinition<ParagraphData> {
  readonly type = 'paragraph';
  readonly labelKey = 'block.paragraph';
  readonly icon = 'notes';

  defaultData(): ParagraphData {
    return { align: 'left' };
  }

  render(node: BlockNode<ParagraphData>, ctx: RenderContext): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-block-id', node.id);
    el.classList.add('idea-block', 'idea-block--paragraph');
    el.style.textAlign = node.data.align;

    const hasText = node.children.some(r => r.data.text.length > 0);
    if (hasText) {
      el.appendChild(renderInline(node.children));
    } else {
      el.setAttribute('data-empty', '');
      el.setAttribute('data-placeholder', ctx.i18n.t('editor.placeholder'));
    }

    return el;
  }

  serialize(node: BlockNode<ParagraphData>): BlockNode<ParagraphData> {
    return {
      id: node.id,
      type: node.type,
      data: { ...node.data },
      children: node.children.map(run => ({
        ...run,
        data: { ...run.data, marks: [...run.data.marks] },
      })),
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<ParagraphData> {
    const obj = raw as BlockNode<ParagraphData>;
    return {
      id: obj.id,
      type: 'paragraph',
      data: {
        align: obj.data?.align ?? 'left',
      },
      children: (obj.children ?? []).map((run: TextRun) => ({
        id: run.id,
        type: 'text' as const,
        data: {
          text: run.data?.text ?? '',
          marks: [...(run.data?.marks ?? [])],
        },
      })),
      meta: obj.meta ? { ...obj.meta } : undefined,
    };
  }

  onEnter(_node: BlockNode<ParagraphData>, _ctx: EditorContext): Command | null {
    // Handled by SplitBlockCommand in the input pipeline
    return null;
  }

  onDelete(_node: BlockNode<ParagraphData>, _ctx: EditorContext): Command | null {
    // Handled by MergeBlocksCommand in the input pipeline
    return null;
  }
}
