import type { BlockNode, EmbedData } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { SetEmbedUrlCommand } from '../engine/commands/set-embed-url-command';
import { DeleteBlockCommand } from '../engine/commands/delete-block-command';
import { findBlockLocation, findTableCell } from '../engine/block-locator';
import type { BlockLocation } from '../engine/block-locator';
import { createIcon } from '../icons/create-icon';
import { detectProvider, getFaviconUrl } from './embed-url';
import { showEmbedUrlModal } from '../toolbar/embed-url-modal';

// Reuse embed DOM across full reconciles so iframe previews are not torn down (e.g. edits in another table cell).
const embedStableRoots = new Map<string, { signature: string; el: HTMLElement }>();

function embedStableSignature(node: BlockNode<EmbedData>): string {
  return `${node.data.url}\0${node.data.title ?? ''}\0${node.data.provider ?? ''}`;
}

export function pruneEmbedStableRoots(presentBlockIds: Set<string>): void {
  for (const id of embedStableRoots.keys()) {
    if (!presentBlockIds.has(id)) {
      embedStableRoots.delete(id);
    }
  }
}

export class EmbedBlock implements BlockDefinition<EmbedData> {
  readonly type = 'embed';
  readonly labelKey = 'block.embed';
  readonly icon = 'code';

  defaultData(): EmbedData {
    return { url: '', title: '' };
  }

  render(node: BlockNode<EmbedData>, ctx: RenderContext): HTMLElement {
    if (!node.data.url) {
      embedStableRoots.delete(node.id);
    } else {
      const sig = embedStableSignature(node);
      const hit = embedStableRoots.get(node.id);
      if (hit && hit.signature === sig) {
        return hit.el;
      }
    }

    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-id', node.id);
    wrapper.classList.add('idea-block', 'idea-block--embed');
    wrapper.setAttribute('contenteditable', 'false');

    if (!node.data.url) {
      this.renderInputState(wrapper, node, ctx);
    } else {
      this.renderPreviewState(wrapper, node, ctx);
      embedStableRoots.set(node.id, { signature: embedStableSignature(node), el: wrapper });
    }

    return wrapper;
  }

  private renderInputState(wrapper: HTMLElement, node: BlockNode<EmbedData>, ctx: RenderContext): void {
    if (ctx.rootElement) {
      const container = document.createElement('div');
      container.classList.add('idea-embed-placeholder');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.classList.add('idea-embed-placeholder__btn');
      btn.textContent = ctx.i18n.t('block.embed');

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showEmbedUrlModal(
          ctx.rootElement!,
          ctx.i18n,
          null,
          (url) => this.applyEmbedUrl(wrapper, node, ctx, url),
          () => {},
        );
      });

      container.appendChild(btn);
      container.appendChild(this.createRemoveButton(node, ctx));
      wrapper.appendChild(container);
    } else {
      const row = document.createElement('div');
      row.classList.add('idea-embed-placeholder', 'idea-embed-placeholder--fallback-row');
      const hint = document.createElement('span');
      hint.classList.add('idea-embed-placeholder-fallback-text');
      hint.textContent = ctx.i18n.t('embed.placeholder');
      row.appendChild(hint);
      row.appendChild(this.createRemoveButton(node, ctx));
      wrapper.appendChild(row);
    }
  }

  private createRemoveButton(node: BlockNode<EmbedData>, ctx: RenderContext): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.classList.add('idea-embed-remove');
    btn.setAttribute('aria-label', ctx.i18n.t('embed.remove'));
    btn.title = ctx.i18n.t('embed.remove');
    btn.appendChild(createIcon('close'));
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeBlock(node, ctx);
    });
    return btn;
  }

  private removeBlock(node: BlockNode<EmbedData>, ctx: RenderContext): void {
    const loc = findBlockLocation(ctx.document, node.id);
    if (!loc) return;

    const docIdx =
      loc.parentKind === 'document'
        ? ctx.document.children.findIndex(b => b.id === node.id)
        : -1;

    const cmd = new DeleteBlockCommand(ctx.document, node.id);
    if (ctx.undoRedoManager) {
      ctx.undoRedoManager.push(cmd);
    } else {
      cmd.execute();
    }

    if (loc.parentKind === 'document' && docIdx !== -1) {
      this.focusAfterDelete(ctx, docIdx);
    } else if (loc.parentKind === 'table-cell') {
      this.focusAfterDeleteInTableCell(ctx, loc);
    }
    ctx.eventBus.emit('doc:change', { document: ctx.document });
  }

  private focusAfterDeleteInTableCell(ctx: RenderContext, loc: BlockLocation): void {
    const sm = ctx.selectionManager;
    if (!sm || !loc.tableBlockId || !loc.cellId) return;
    const cell = findTableCell(ctx.document, loc.tableBlockId, loc.cellId);
    if (!cell || cell.blocks.length === 0) return;

    const n = cell.blocks.length;
    const i = loc.index;
    const textLen = (b: BlockNode) => b.children.reduce((s, r) => s + r.data.text.length, 0);

    if (i < n) {
      sm.setCollapsed(cell.blocks[i].id, 0);
    } else {
      const prev = cell.blocks[n - 1];
      sm.setCollapsed(prev.id, textLen(prev));
    }
  }

  private focusAfterDelete(ctx: RenderContext, removedIndex: number): void {
    const sm = ctx.selectionManager;
    if (!sm) return;
    const doc = ctx.document;
    if (doc.children.length === 0) return;

    if (removedIndex > 0) {
      const prev = doc.children[removedIndex - 1];
      const len = prev.children.reduce((s, r) => s + r.data.text.length, 0);
      sm.setCollapsed(prev.id, len);
    } else {
      sm.setCollapsed(doc.children[0].id, 0);
    }
  }

  private applyEmbedUrl(
    wrapper: HTMLElement,
    node: BlockNode<EmbedData>,
    ctx: RenderContext,
    url: string,
  ): void {
    const provider = detectProvider(url);

    if (ctx.undoRedoManager) {
      const cmd = new SetEmbedUrlCommand(
        ctx.document,
        node.id,
        url,
        provider?.name ?? '',
        provider?.name,
      );
      ctx.undoRedoManager.push(cmd);
      ctx.eventBus.emit('doc:change', { document: ctx.document });
    } else {
      node.data.url = url;
      node.data.title = provider?.name ?? '';
      node.data.provider = provider?.name;
      wrapper.innerHTML = '';
      this.renderPreviewState(wrapper, node, ctx);
      embedStableRoots.set(node.id, { signature: embedStableSignature(node), el: wrapper });
    }
  }

  private renderPreviewState(wrapper: HTMLElement, node: BlockNode<EmbedData>, ctx: RenderContext): void {
    const provider = detectProvider(node.data.url);

    if (provider?.embeddable) {
      const embedContainer = document.createElement('div');
      embedContainer.classList.add('idea-embed-preview');

      const titleBar = document.createElement('div');
      titleBar.classList.add('idea-embed-preview__titlebar');

      const providerLabel = document.createElement('span');
      providerLabel.classList.add('idea-embed-preview__provider');
      providerLabel.textContent = provider.name;

      const openBtn = document.createElement('a');
      openBtn.href = node.data.url;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener noreferrer';
      openBtn.classList.add('idea-embed-preview__open');
      openBtn.textContent = ctx.i18n.t('embed.open');
      openBtn.appendChild(createIcon('open_in_new'));

      const titleLeft = document.createElement('div');
      titleLeft.classList.add('idea-embed-preview__titlebar-left');
      titleLeft.appendChild(providerLabel);

      const titleRight = document.createElement('div');
      titleRight.classList.add('idea-embed-preview__titlebar-right');
      titleRight.appendChild(openBtn);
      titleRight.appendChild(this.createRemoveButton(node, ctx));

      titleBar.appendChild(titleLeft);
      titleBar.appendChild(titleRight);

      const iframe = document.createElement('iframe');
      iframe.src = provider.transformUrl ? provider.transformUrl(node.data.url) : node.data.url;
      iframe.classList.add('idea-embed-preview__iframe');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      );
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allowfullscreen', '');

      embedContainer.appendChild(titleBar);
      embedContainer.appendChild(iframe);
      wrapper.appendChild(embedContainer);
    } else {
      this.renderFallbackCard(wrapper, node, ctx);
    }
  }

  private renderFallbackCard(wrapper: HTMLElement, node: BlockNode<EmbedData>, ctx: RenderContext): void {
    const outer = document.createElement('div');
    outer.classList.add('idea-embed-fallback-wrap');

    const card = document.createElement('a');
    card.href = node.data.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.classList.add('idea-embed-fallback');

    const favicon = document.createElement('img');
    favicon.src = getFaviconUrl(node.data.url);
    favicon.classList.add('idea-embed-fallback__favicon');
    favicon.width = 16;
    favicon.height = 16;
    favicon.alt = '';

    const info = document.createElement('div');
    info.classList.add('idea-embed-fallback__info');

    const title = document.createElement('span');
    title.classList.add('idea-embed-fallback__title');
    try {
      title.textContent = node.data.title || new URL(node.data.url).hostname;
    } catch {
      title.textContent = node.data.url;
    }

    const urlText = document.createElement('span');
    urlText.classList.add('idea-embed-fallback__url');
    urlText.textContent = node.data.url;

    info.appendChild(title);
    info.appendChild(urlText);

    card.appendChild(favicon);
    card.appendChild(info);
    outer.appendChild(card);
    outer.appendChild(this.createRemoveButton(node, ctx));
    wrapper.appendChild(outer);
  }

  serialize(node: BlockNode<EmbedData>): BlockNode<EmbedData> {
    return {
      id: node.id,
      type: node.type,
      data: { ...node.data },
      children: node.children ?? [],
      meta: node.meta ? { ...node.meta } : undefined,
    };
  }

  deserialize(raw: unknown): BlockNode<EmbedData> {
    const obj = raw as BlockNode<EmbedData>;
    return {
      id: obj.id,
      type: 'embed',
      data: {
        url: obj.data?.url ?? '',
        title: obj.data?.title ?? '',
        provider: obj.data?.provider,
      },
      children: [],
      meta: obj.meta ? { ...obj.meta } : undefined,
    };
  }

  onEnter(_node: BlockNode<EmbedData>, _ctx: EditorContext): Command | null {
    return null;
  }

  onDelete(_node: BlockNode<EmbedData>, _ctx: EditorContext): Command | null {
    return null;
  }
}
