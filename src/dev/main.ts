import { createIdeaEditor, type IdeaEditorMode } from '../sdk';

function resolveDevMode(): IdeaEditorMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'text' || mode === 'graphic' || mode === 'both' || mode === 'read-only') {
    return mode;
  }
  return 'both';
}

const mode = resolveDevMode();

createIdeaEditor({
  mode,
  container: '#app',
  config: {
    locale: 'en',
    chrome: {
      showImportExport: true,
    },
    onReady: () => {
      console.log(`[IdeaEditor] v0.0.1 — editor mounted (mode: ${mode})`);
    },
  },
});
