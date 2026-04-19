import type { DocumentNode, BlockNode, ListItemData, ListType } from '@core/model/interfaces';
import type { RenderContext } from '../engine/render-context';
import type { BlockRegistry } from '../blocks/block-registry';

export class BlockRenderer {
  private renderedVersions = new Map<string, number>();

  constructor(private readonly registry: BlockRegistry) {}

  reconcile(doc: DocumentNode, rootEl: HTMLElement, ctx: RenderContext): void {
    const fragment = document.createDocumentFragment();
    this.renderedVersions.clear();

    let i = 0;
    while (i < doc.children.length) {
      const block = doc.children[i];

      if (block.type === 'list_item') {
        i = this.renderListGroup(doc.children, i, fragment as unknown as HTMLElement, ctx);
      } else {
        const def = this.registry.get(block.type);
        const el = def.render(block, ctx);
        this.renderedVersions.set(block.id, block.meta?.version ?? 0);
        fragment.appendChild(el);
        i++;
      }
    }

    rootEl.innerHTML = '';
    rootEl.appendChild(fragment);
  }

  private listTagForType(listType: ListType): 'ol' | 'ul' {
    return listType === 'ordered' ? 'ol' : 'ul';
  }

  private renderListGroup(
    blocks: BlockNode[],
    startIdx: number,
    rootEl: HTMLElement | DocumentFragment,
    ctx: RenderContext,
  ): number {
    const firstData = blocks[startIdx].data as ListItemData;
    const groupListType = firstData.listType;
    const listTag = this.listTagForType(groupListType);

    let i = startIdx;
    const stack: HTMLElement[] = [];
    const rootList = document.createElement(listTag);
    rootList.classList.add('idea-list-group');
    stack.push(rootList);

    while (i < blocks.length && blocks[i].type === 'list_item') {
      const block = blocks[i];
      const data = block.data as ListItemData;

      if (data.listType !== groupListType) break;

      const targetDepth = data.depth;

      while (stack.length - 1 > targetDepth) {
        stack.pop();
      }
      while (stack.length - 1 < targetDepth) {
        const nestedList = document.createElement(listTag);
        nestedList.classList.add('idea-list-group', 'idea-list-group--nested');
        const parentLi = stack[stack.length - 1].lastElementChild as HTMLElement | null;
        if (parentLi) {
          parentLi.appendChild(nestedList);
        } else {
          stack[stack.length - 1].appendChild(nestedList);
        }
        stack.push(nestedList);
      }

      const def = this.registry.get(block.type);
      const blockEl = def.render(block, ctx);

      const li = document.createElement('li');
      li.setAttribute('data-list-wrapper', block.id);
      while (blockEl.firstChild) {
        li.appendChild(blockEl.firstChild);
      }
      for (const attr of Array.from(blockEl.attributes)) {
        li.setAttribute(attr.name, attr.value);
      }
      li.classList.add('idea-block', 'idea-block--list-item');

      this.renderedVersions.set(block.id, block.meta?.version ?? 0);
      stack[stack.length - 1].appendChild(li);
      i++;
    }

    rootEl.appendChild(rootList);
    return i;
  }

  renderBlock(block: BlockNode, ctx: RenderContext): HTMLElement {
    const def = this.registry.get(block.type);
    return def.render(block, ctx);
  }
}
