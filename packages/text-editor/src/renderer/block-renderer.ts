import type { DocumentNode, BlockNode, ListItemData, ListType } from '@core/model/interfaces';
import type { RenderContext } from '../engine/render-context';
import type { BlockRegistry } from '../blocks/block-registry';
import { pruneEmbedStableRoots } from '../blocks/embed-block';

function collectDataBlockIds(root: HTMLElement): Set<string> {
  const ids = new Set<string>();
  for (const el of root.querySelectorAll('[data-block-id]')) {
    const id = el.getAttribute('data-block-id');
    if (id) ids.add(id);
  }
  return ids;
}

function listTagForType(listType: ListType): 'ol' | 'ul' {
  return listType === 'ordered' ? 'ol' : 'ul';
}

function appendListGroup(
  registry: BlockRegistry,
  blocks: ReadonlyArray<BlockNode>,
  startIdx: number,
  parent: HTMLElement,
  ctx: RenderContext,
  versionMap?: Map<string, number>,
): number {
  const firstData = blocks[startIdx].data as ListItemData;
  const groupListType = firstData.listType;
  const listTag = listTagForType(groupListType);

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

    const def = registry.get(block.type);
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

    versionMap?.set(block.id, block.meta?.version ?? 0);
    stack[stack.length - 1].appendChild(li);
    i++;
  }

  parent.appendChild(rootList);
  return i;
}

/**
 * Renders a flat block array into `parent`, grouping consecutive `list_item` blocks
 * into ul/ol like the main document (required for correct list styling and structure).
 */
export function appendRenderedBlockList(
  registry: BlockRegistry,
  blocks: ReadonlyArray<BlockNode>,
  parent: HTMLElement,
  ctx: RenderContext,
  versionMap?: Map<string, number>,
): void {
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'list_item') {
      i = appendListGroup(registry, blocks, i, parent, ctx, versionMap);
    } else {
      const el = registry.get(block.type).render(block, ctx);
      versionMap?.set(block.id, block.meta?.version ?? 0);
      parent.appendChild(el);
      i++;
    }
  }
}

export class BlockRenderer {
  private renderedVersions = new Map<string, number>();

  constructor(private readonly registry: BlockRegistry) {}

  reconcile(doc: DocumentNode, rootEl: HTMLElement, ctx: RenderContext): void {
    this.renderedVersions.clear();
    rootEl.innerHTML = '';
    appendRenderedBlockList(this.registry, doc.children, rootEl, ctx, this.renderedVersions);
    pruneEmbedStableRoots(collectDataBlockIds(rootEl));
  }

  renderBlock(block: BlockNode, ctx: RenderContext): HTMLElement {
    const def = this.registry.get(block.type);
    return def.render(block, ctx);
  }
}
