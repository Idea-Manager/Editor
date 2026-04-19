import type { I18nService } from '@core/i18n/i18n';
import { Modal } from '@shared/components/modal';
import { isValidUrl } from '../blocks/embed-url';

/**
 * Centered modal to paste an embed URL (Create / Cancel). Reused by slash palette and embed block placeholder.
 */
export function showEmbedUrlModal(
  host: HTMLElement,
  i18n: I18nService,
  _anchorRect: DOMRect | null,
  onConfirm: (url: string) => void,
  onCancel: () => void,
): void {
  const modal = new Modal(host);

  const input = document.createElement('input');
  input.type = 'url';
  input.placeholder = i18n.t('embed.placeholder');
  input.classList.add('idea-embed-url-modal__input');
  input.setAttribute('autocomplete', 'url');

  const footer = document.createElement('div');
  footer.classList.add('idea-embed-url-modal__actions');

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.classList.add('idea-embed-url-modal__cancel-btn');
  cancelBtn.textContent = i18n.t('table.cancel');

  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.classList.add('idea-embed-url-modal__create-btn');
  createBtn.textContent = i18n.t('table.create');

  const tryConfirm = () => {
    const url = input.value.trim();
    if (!url || !isValidUrl(url)) {
      input.classList.add('idea-embed-url-modal__input--error');
      return;
    }
    input.classList.remove('idea-embed-url-modal__input--error');
    onConfirm(url);
    modal.hide();
  };

  cancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    onCancel();
    modal.hide();
  });

  createBtn.addEventListener('click', (e) => {
    e.preventDefault();
    tryConfirm();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryConfirm();
    }
    e.stopPropagation();
  });

  input.addEventListener('beforeinput', (e) => e.stopPropagation());

  input.addEventListener('input', () => {
    input.classList.remove('idea-embed-url-modal__input--error');
  });

  footer.appendChild(cancelBtn);
  footer.appendChild(createBtn);

  modal.show({
    title: i18n.t('block.embed'),
    body: input,
    footer,
    onDismiss: () => onCancel(),
  });
}
