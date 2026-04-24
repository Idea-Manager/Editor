import type { BlockNode } from '@core/model/interfaces';
import type { EditorContext } from '../engine/editor-context';
import { SetLinkCommand } from '../inline/set-link-command';
import { InlineMarkManager } from '../inline/inline-mark-manager';
import { createIcon } from '../icons/create-icon';

export type LinkUrlFlyoutTarget = { block: BlockNode; start: number; end: number };

export type OpenLinkUrlFlyoutOptions = {
  ctx: EditorContext;
  markManager: InlineMarkManager;
  /** Used for positioning; called on each resize/scroll tick. */
  getAnchorRect: () => DOMRect | null;
  initialHref?: string;
  targets: LinkUrlFlyoutTarget[];
  onAfterCommit?: () => void;
  /** Called whenever the panel is torn down (commit, cancel, or Escape). */
  onClosed?: () => void;
};

function positionLinkUrlFlyoutNearRect(
  flyout: HTMLElement,
  rect: DOMRect,
  win: Window,
  preferBelow: boolean,
): void {
  const margin = 8;
  const vw = win.innerWidth;
  const vh = win.innerHeight;
  const w = flyout.offsetWidth || 280;
  const h = flyout.offsetHeight || 44;

  let top: number;
  if (preferBelow) {
    top = rect.bottom + margin;
    if (top + h > vh - margin) {
      top = rect.top - h - margin;
    }
  } else {
    top = rect.top - h - margin;
    if (top < margin) {
      top = rect.bottom + margin;
    }
  }
  top = Math.max(margin, Math.min(top, vh - h - margin));

  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(margin, Math.min(left, vw - w - margin));

  flyout.style.top = `${top}px`;
  flyout.style.left = `${left}px`;
}

/**
 * URL input panel (check / cancel). Caller owns lifecycle via returned `close`.
 */
export function openLinkUrlFlyout(opts: OpenLinkUrlFlyoutOptions & { preferBelow?: boolean }): {
  element: HTMLDivElement;
  close: () => void;
} {
  const preferBelow = opts.preferBelow !== false;
  const win = opts.ctx.rootElement.ownerDocument.defaultView ?? window;

  const root = document.createElement('div');
  root.classList.add('idea-floating-toolbar__link-flyout');

  const input = document.createElement('input');
  input.type = 'url';
  input.classList.add('idea-floating-toolbar__link-input');
  input.placeholder = opts.ctx.i18n.t('toolbar.linkUrlPlaceholder');
  if (opts.initialHref) input.value = opts.initialHref;

  const btnOk = document.createElement('button');
  btnOk.type = 'button';
  btnOk.classList.add(
    'idea-floating-toolbar__link-action',
    'idea-floating-toolbar__link-action--confirm',
  );
  btnOk.appendChild(createIcon('check'));

  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.classList.add(
    'idea-floating-toolbar__link-action',
    'idea-floating-toolbar__link-action--cancel',
  );
  btnCancel.appendChild(createIcon('close'));

  root.appendChild(input);
  root.appendChild(btnOk);
  root.appendChild(btnCancel);
  document.body.appendChild(root);

  const place = () => {
    const rect = opts.getAnchorRect();
    if (!rect) return;
    positionLinkUrlFlyoutNearRect(root, rect, win, preferBelow);
  };

  const onReposition = () => place();
  window.addEventListener('resize', onReposition);
  window.addEventListener('scroll', onReposition, true);

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('resize', onReposition);
    window.removeEventListener('scroll', onReposition, true);
    root.remove();
    opts.onClosed?.();
  };

  place();
  requestAnimationFrame(place);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  const commit = () => {
    const v = input.value.trim();
    const href = v === '' ? undefined : v;
    for (const t of opts.targets) {
      opts.ctx.undoRedoManager.push(
        new SetLinkCommand(opts.ctx.document, t.block.id, t.start, t.end, href, opts.markManager),
      );
    }
    opts.ctx.eventBus.emit('doc:change', { document: opts.ctx.document });
    close();
    opts.onAfterCommit?.();
  };

  btnOk.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    commit();
  });

  btnCancel.addEventListener('mousedown', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    close();
  });

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      commit();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      close();
    }
  });

  return { element: root, close };
}
