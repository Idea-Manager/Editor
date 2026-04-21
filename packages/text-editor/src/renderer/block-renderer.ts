import type { DocumentNode, BlockNode, ListItemData, ListType } from '@core/model/interfaces';
import type { RenderContext } from '../engine/render-context';
import type { BlockRegistry } from '../blocks/block-registry';
import { reconcileChildren } from '../engine/reconciler';
import { pruneEmbedStableRoots } from '../blocks/embed-block';
import { pruneTableStableRoots } from '../blocks/table-block';

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

/**
 * Builds one grouped list root (`ul`/`ol`) for consecutive `list_item` blocks starting at `startIdx`.
 * Does not attach the root to any parent.
 */
function buildListGroup(
  registry: BlockRegistry,
  blocks: ReadonlyArray<BlockNode>,
  startIdx: number,
  ctx: RenderContext,
  versionMap?: Map<string, number>,
): { rootList: HTMLElement; nextIndex: number } {
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

  return { rootList, nextIndex: i };
}

/**
 * Produces top-level `HTMLElement` nodes for `blocks`, grouping consecutive `list_item` blocks
 * into a single `ul`/`ol` root per group (same structure as the main document).
 */
export function collectRenderedBlockListElements(
  registry: BlockRegistry,
  blocks: ReadonlyArray<BlockNode>,
  ctx: RenderContext,
  versionMap?: Map<string, number>,
): HTMLElement[] {
  const elements: HTMLElement[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === 'list_item') {
      const { rootList, nextIndex } = buildListGroup(registry, blocks, i, ctx, versionMap);
      elements.push(rootList);
      i = nextIndex;
    } else {
      const el = registry.get(block.type).render(block, ctx);
      versionMap?.set(block.id, block.meta?.version ?? 0);
      elements.push(el);
      i++;
    }
  }
  return elements;
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
  reconcileChildren(parent, collectRenderedBlockListElements(registry, blocks, ctx, versionMap));
}

export class BlockRenderer {
  private renderedVersions = new Map<string, number>();

  constructor(private readonly registry: BlockRegistry) {}

  reconcile(doc: DocumentNode, rootEl: HTMLElement, ctx: RenderContext): void {
    this.renderedVersions.clear();
    const elements = collectRenderedBlockListElements(
      this.registry,
      doc.children,
      ctx,
      this.renderedVersions,
    );
    reconcileChildren(rootEl, elements);
    const presentIds = collectDataBlockIds(rootEl);
    pruneEmbedStableRoots(presentIds);
    pruneTableStableRoots(presentIds);
  }

  renderBlock(block: BlockNode, ctx: RenderContext): HTMLElement {
    const def = this.registry.get(block.type);
    return def.render(block, ctx);
  }
}
