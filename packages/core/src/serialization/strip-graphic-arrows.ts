import type { DocumentNode } from '../model/interfaces';

/**
 * Returns a deep clone of the document with arrow-related data removed.
 * Used on export so saved JSON no longer contains legacy connector elements.
 */
export function stripGraphicArrows(doc: DocumentNode): DocumentNode {
  const cloned = structuredClone(doc) as DocumentNode;
  const data = cloned.data as Record<string, unknown>;

  if (data['graphicPreferences'] && typeof data['graphicPreferences'] === 'object') {
    const prefs = { ...(data['graphicPreferences'] as Record<string, unknown>) };
    delete prefs['arrow'];
    data['graphicPreferences'] = prefs;
  }

  if (Array.isArray(data['customBlocks'])) {
    data['customBlocks'] = (data['customBlocks'] as Array<Record<string, unknown>>).map(block => {
      const next = { ...block };
      delete next['arrows'];
      return next;
    });
  }

  for (const page of cloned.graphicPages) {
    page.elements = page.elements.filter(el => el.type !== 'arrow');
  }

  return cloned;
}
