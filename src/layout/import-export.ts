import type { DocumentNode } from '@core/model/interfaces';
import type { EventBus } from '@core/events/event-bus';
import type { I18nService } from '@core/i18n/i18n';
import {
  DocumentSerializer,
  DocumentDeserializer,
  validateDocument,
  migrateDocument,
  LATEST_SCHEMA_VERSION,
} from '@core/index';
import { Modal } from '@shared/components/modal';
import { showToast } from '@shared/components/toast';
import { createIcon } from '../util/icon';

const serializer = new DocumentSerializer();
const deserializer = new DocumentDeserializer();
const jsonPreviewModal = new Modal(document.body);
const importConfirmModal = new Modal(document.body);

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

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        showToast({
          message: i18n.t('io.invalidDocument', { error: i18n.t('io.unknownError') }),
          type: 'error',
          duration: 5000,
        });
        return;
      }

      if (typeof parsed === 'object' && parsed !== null) {
        const record = parsed as Record<string, unknown>;
        const version = record.schemaVersion;
        if (typeof version === 'number' && version < LATEST_SCHEMA_VERSION) {
          try {
            parsed = migrateDocument(parsed);
          } catch (err) {
            showToast({
              message: i18n.t('io.invalidDocument', { error: (err as Error).message }),
              type: 'error',
              duration: 5000,
            });
            return;
          }
        }
      }

      const preCheck = validateDocument(parsed);
      if (!preCheck.valid) {
        showToast({
          message: i18n.t('io.invalidDocument', { error: preCheck.errors[0] ?? i18n.t('io.unknownError') }),
          type: 'error',
          duration: 5000,
        });
        return;
      }

      const body = document.createElement('p');
      body.className = 'idea-io-import-confirm__message';
      body.textContent = i18n.t('io.confirmReplace');

      const actions = document.createElement('div');
      actions.className = 'idea-io-import-confirm__actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'idea-io-import-confirm__btn idea-io-import-confirm__btn--cancel';
      cancelBtn.textContent = i18n.t('io.importConfirmCancel');
      cancelBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        importConfirmModal.hide();
      });

      const primaryBtn = document.createElement('button');
      primaryBtn.type = 'button';
      primaryBtn.className = 'idea-io-import-confirm__btn idea-io-import-confirm__btn--primary';
      primaryBtn.textContent = i18n.t('io.importConfirmPrimary');
      primaryBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        importConfirmModal.hide();
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
      });

      actions.appendChild(cancelBtn);
      actions.appendChild(primaryBtn);

      importConfirmModal.show({
        title: i18n.t('io.importConfirmTitle'),
        body,
        footer: actions,
        panelClass: 'idea-modal__panel--narrow',
      });
    };
    reader.readAsText(file);
  });

  input.click();
}

export function showJSONPreview(doc: DocumentNode, i18n: I18nService): void {
  const json = serializer.export(doc);

  const titleEl = document.createElement('div');
  titleEl.className = 'idea-modal__title';
  titleEl.textContent = i18n.t('io.previewTitle');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'idea-json-preview-close';
  closeBtn.appendChild(createIcon('close'));
  closeBtn.addEventListener('click', () => jsonPreviewModal.hide());

  const headerRow = document.createElement('div');
  headerRow.className = 'idea-json-preview-header';
  headerRow.appendChild(titleEl);
  headerRow.appendChild(closeBtn);

  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.value = json;
  textarea.className = 'idea-json-preview-textarea';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'idea-json-preview-copy';
  copyBtn.textContent = i18n.t('io.copyButton');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(json).then(
      () => showToast({ message: i18n.t('io.jsonCopied'), type: 'success' }),
    );
  });

  const footer = document.createElement('div');
  footer.className = 'idea-json-preview-footer';
  footer.appendChild(copyBtn);

  jsonPreviewModal.show({
    header: headerRow,
    body: textarea,
    footer,
    panelClass: 'idea-modal__panel--json-preview',
  });
}
