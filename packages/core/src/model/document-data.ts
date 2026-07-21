import type { DocumentNode } from './interfaces';
import type { GraphicPreferences, CustomBlockDefinition } from './graphic-preferences';

const PREFS_KEY = 'graphicPreferences';
const CUSTOM_KEY = 'customBlocks';

export function getGraphicPreferences(doc: DocumentNode): GraphicPreferences {
  const raw = (doc.data as Record<string, unknown>)[PREFS_KEY];
  return (raw && typeof raw === 'object' ? raw : {}) as GraphicPreferences;
}

export function getCustomBlocks(doc: DocumentNode): CustomBlockDefinition[] {
  const raw = (doc.data as Record<string, unknown>)[CUSTOM_KEY];
  return Array.isArray(raw) ? (raw as CustomBlockDefinition[]) : [];
}

export const DOCUMENT_DATA_KEYS = {
  graphicPreferences: PREFS_KEY,
  customBlocks: CUSTOM_KEY,
} as const;
