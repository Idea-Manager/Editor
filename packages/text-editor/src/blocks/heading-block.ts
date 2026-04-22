import type { BlockNode, HeadingData, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { renderInline } from '../inline/inline-renderer';

export class HeadingBlock implements BlockDefinition<HeadingData> {
  readonly type = 'heading';
  readonly labelKey = 'block.heading';
  readonly icon = 'title';

  defaultData(): HeadingData {
    return { level: 1, align: 'left' };
  }

  render(node: BlockNode<HeadingData>, ctx: RenderContext): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-block-id', node.id);
    el.setAttribute('data-level', String(node.data.level));
    el.setAttribute('data-align', node.data.align);
    el.classList.add('idea-block', 'idea-block--heading');

    const hasText = node.children.some(r => r.data.text.length > 0);
    if (hasText) {
      el.appendChild(renderInline(node.children));
    } else {
      el.setAttribute('data-empty', '');
    }

    return el;
  }

  serialize(node: BlockNode<HeadingData>): BlockNode<HeadingData> {
    return {
      id: node.id,
      type: node.type,
      data: { ...node.data },
      children: node.children.map(run => ({
        ...run,
        data: {
          ...run.data,
          marks: [...run.data.marks],
          ...(run.data.color !== undefined ? { color: run.data.color } : {}),
          ...(run.data.href !== undefined ? { href: run.data.href } : {}),
        },
      })),
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<HeadingData> {
    const obj = raw as BlockNode<HeadingData>;
    return {
      id: obj.id,
      type: 'heading',
      data: {
        level: obj.data?.level ?? 1,
        align: obj.data?.align ?? 'left',
      },
      children: (obj.children ?? []).map((run: TextRun) => ({
        id: run.id,
        type: 'text' as const,
        data: {
          text: run.data?.text ?? '',
          marks: [...(run.data?.marks ?? [])],
          ...(run.data?.color !== undefined ? { color: run.data.color } : {}),
          ...(run.data?.href !== undefined ? { href: run.data.href } : {}),
        },
      })),
      meta: obj.meta ? { ...obj.meta } : undefined,
    };
  }

  onEnter(_node: BlockNode<HeadingData>, _ctx: EditorContext): Command | null {
    return null;
  }

  onDelete(_node: BlockNode<HeadingData>, _ctx: EditorContext): Command | null {
    return null;
  }
}
