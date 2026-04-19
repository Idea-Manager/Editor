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
  backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:5000;display:flex;align-items:center;justify-content:center;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background:#fff;border-radius:8px;width:640px;max-width:90vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.15);';

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e5e5e5;font-family:Inter,sans-serif;font-size:14px;font-weight:600;';
  header.textContent = i18n.t('io.previewTitle');

  const closeBtn = document.createElement('button');
  closeBtn.appendChild(createIcon('close'));
  closeBtn.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;color:#737373;padding:0;line-height:1;display:flex;align-items:center;';
  closeBtn.addEventListener('click', () => backdrop.remove());
  header.appendChild(closeBtn);

  const textarea = document.createElement('textarea');
  textarea.readOnly = true;
  textarea.value = json;
  textarea.style.cssText = 'flex:1;padding:16px;border:none;outline:none;resize:none;font-family:"JetBrains Mono","Fira Code",monospace;font-size:12px;line-height:1.5;color:#171717;overflow:auto;';

  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;padding:10px 16px;border-top:1px solid #e5e5e5;';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = i18n.t('io.copyButton');
  copyBtn.style.cssText = 'padding:6px 14px;background:#171717;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;font-family:inherit;';
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
