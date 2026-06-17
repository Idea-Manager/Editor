import { DocumentNode, GraphicPageNode } from '../model/interfaces';
import { createDocument } from '../model/factory';
import { stripGraphicArrows } from './strip-graphic-arrows';

const KEY_ORDER = [
  'id', 'type', 'schemaVersion', 'name', 'data', 'meta',
  'children', 'elements', 'frames', 'graphicPages',
  'viewport', 'assets', 'childElementIds',
];

function orderedReplacer(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  for (const k of KEY_ORDER) {
    if (k in obj) sorted[k] = obj[k];
  }
  for (const k of Object.keys(obj)) {
    if (!(k in sorted)) sorted[k] = obj[k];
  }

  return sorted;
}

export class DocumentSerializer {
  export(doc: DocumentNode): string {
    return JSON.stringify(stripGraphicArrows(doc), orderedReplacer, 2);
  }

  exportPage(page: GraphicPageNode): string {
    const doc = createDocument();
    doc.graphicPages.push(page);
    const stripped = stripGraphicArrows(doc);
    return JSON.stringify(stripped.graphicPages[0], orderedReplacer, 2);
  }
}
