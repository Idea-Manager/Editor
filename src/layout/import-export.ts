import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import { DocumentSerializer, DocumentDeserializer, validateDocument } from '@core/index';
import { showToast } from './toast';
import { createIcon } from '../util/icon';

const serializer = new DocumentSerializer();
const deserializer = new DocumentDeserializer();

export function exportJSON(doc: DocumentNode, i18n: I18nService): void {
  const json = serializer.export(doc);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = i18n.t('io.exportFilename');
  a.click();
  URL.revokeObjectURL(url);

  showToast({ message: i18n.t('io.exported'), type: 'success' });
}

export function copyJSON(doc: DocumentNode, i18n: I18nService): void {
  const json = serializer.export(doc);
  navigator.clipboard.writeText(json).then(
    () => showToast({ message: i18n.t('io.copiedClipboard'), type: 'success' }),
    () => showToast({ message: i18n.t('io.copyFailed'), type: 'error' }),
  );
}

export function importJSON(
  currentDoc: DocumentNode,
  eventBus: EventBus,
  onReplace: (doc: DocumentNode) => void,
  i18n: I18nService,
): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;

      const preCheck = validateDocument((() => {
        try { return JSON.parse(text); }
        catch { return null; }
      })());

      if (!preCheck.valid) {
        showToast({
          message: i18n.t('io.invalidDocument', { error: preCheck.errors[0] ?? i18n.t('io.unknownError') }),
          type: 'error',
          duration: 5000,
        });
        return;
      }

      const confirmed = confirm(i18n.t('io.confirmReplace'));
      if (!confirmed) return;

      try {
        const newDoc = deserializer.import(text);
        onReplace(newDoc);
        eventBus.emit('doc:change', { document: newDoc });
        showToast({ message: i18n.t('io.imported'), type: 'success' });
      } catch (err) {
        showToast({
          message: i18n.t('io.importFailed', { error: (err as Error).message }),
          type: 'error',
          duration: 5000,
        });
      }
    };
    reader.readAsText(file);
  });

  input.click();
}

export function showJSONPreview(doc: DocumentNode, i18n: I18nService): void {
  const json = serializer.export(doc);

  const backdrop = document.createElement('div');
  backdrop.className = 'idea-json-preview-backdrop';

  const modal = document.createElement('div');
  modal.className = 'idea-json-preview-modal';

  const header = document.createElement('div');
  header.className = 'idea-json-preview-header';
  header.textContent = i18n.t('io.previewTitle');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'idea-json-preview-close';
  closeBtn.appendChild(createIcon('close'));
  closeBtn.addEventListener('click', () => backdrop.remove());
  header.appendChild(closeBtn);

  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.value = json;
  textarea.className = 'idea-json-preview-textarea';

  const footer = document.createElement('div');
  footer.className = 'idea-json-preview-footer';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'idea-json-preview-copy';
  copyBtn.textContent = i18n.t('io.copyButton');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(json).then(
      () => showToast({ message: i18n.t('io.jsonCopied'), type: 'success' }),
    );
  });
  footer.appendChild(copyBtn);

  modal.appendChild(header);
  modal.appendChild(textarea);
  modal.appendChild(footer);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}
