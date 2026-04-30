import type { DocumentNode } from '@core/model/interfaces';

export type ActiveMode = 'text' | 'graphic';

export function getActiveMode(doc: DocumentNode): ActiveMode {
  const m = (doc.meta as Record<string, unknown> | undefined)?.activeMode;
  return m === 'graphic' ? 'graphic' : 'text';
}

export function setActiveMode(doc: DocumentNode, mode: ActiveMode): void {
  if (!doc.meta) doc.meta = {};
  (doc.meta as Record<string, unknown>).activeMode = mode;
}
