import type { BlockNode, EmbedData, TextRun } from '@core/model/interfaces';
import type { Command } from '@core/commands/command';
import type { BlockDefinition } from './block-definition';
import type { RenderContext } from '../engine/render-context';
import type { EditorContext } from '../engine/editor-context';
import { SetEmbedUrlCommand } from '../engine/commands/set-embed-url-command';
import { createIcon } from '../../../../src/util/icon';

interface ProviderInfo {
  name: string;
  embeddable: boolean;
  transformUrl?: (url: string) => string;
}

const PROVIDERS: { pattern: RegExp; info: ProviderInfo }[] = [
  {
    pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/,
    info: {
      name: 'YouTube',
      embeddable: true,
      transformUrl: (url: string) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : url;
      },
    },
  },
  {
    pattern: /figma\.com\/(file|proto|design)\//,
    info: {
      name: 'Figma',
      embeddable: true,
      transformUrl: (url: string) => `https://www.figma.com/embed?embed_host=idea-editor&url=${encodeURIComponent(url)}`,
    },
  },
  {
    pattern: /miro\.com\/app\/board\//,
    info: {
      name: 'Miro',
      embeddable: true,
      transformUrl: (url: string) => url.replace('/app/board/', '/app/live-embed/'),
    },
  },
  {
    pattern: /google\.com\/maps/,
    info: {
      name: 'Google Maps',
      embeddable: true,
      transformUrl: (url: string) => {
        if (url.includes('/embed')) return url;
        return url.replace('/maps/', '/maps/embed/');
      },
    },
  },
];

function detectProvider(url: string): ProviderInfo | null {
  for (const { pattern, info } of PROVIDERS) {
    if (pattern.test(url)) return info;
  }
  return null;
}

function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
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
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-block-id', node.id);
    wrapper.classList.add('idea-block', 'idea-block--embed');
    wrapper.setAttribute('contenteditable', 'false');

    if (!node.data.url) {
      this.renderInputState(wrapper, node, ctx);
    } else {
      this.renderPreviewState(wrapper, node, ctx);
    }

    return wrapper;
  }

  private renderInputState(wrapper: HTMLElement, node: BlockNode<EmbedData>, ctx: RenderContext): void {
    const container = document.createElement('div');
    container.classList.add('idea-embed-input');

    const input = document.createElement('input');
    input.type = 'url';
    input.placeholder = ctx.i18n.t('embed.placeholder');
    input.classList.add('idea-embed-input__field');

    const btn = document.createElement('button');
    btn.textContent = ctx.i18n.t('embed.button');
    btn.classList.add('idea-embed-input__btn');

    const doEmbed = () => {
      const url = input.value.trim();
      if (!url || !isValidUrl(url)) {
        input.classList.add('idea-embed-input__field--error');
        return;
      }
      input.classList.remove('idea-embed-input__field--error');

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
      }
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      doEmbed();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doEmbed();
      }
      e.stopPropagation();
    });

    input.addEventListener('beforeinput', (e) => e.stopPropagation());

    container.appendChild(input);
    container.appendChild(btn);
    wrapper.appendChild(container);
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

      titleBar.appendChild(providerLabel);
      titleBar.appendChild(openBtn);

      const iframe = document.createElement('iframe');
      iframe.src = provider.transformUrl ? provider.transformUrl(node.data.url) : node.data.url;
      iframe.classList.add('idea-embed-preview__iframe');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('allowfullscreen', '');

      embedContainer.appendChild(titleBar);
      embedContainer.appendChild(iframe);
      wrapper.appendChild(embedContainer);
    } else {
      this.renderFallbackCard(wrapper, node);
    }
  }

  private renderFallbackCard(wrapper: HTMLElement, node: BlockNode<EmbedData>): void {
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
    wrapper.appendChild(card);
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
