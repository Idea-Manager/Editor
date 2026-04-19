import { DocumentNode, GraphicPageNode } from '../model/interfaces';
import { validateDocument } from './validator';
import { migrateDocument, LATEST_SCHEMA_VERSION } from './migrations';

export class DocumentDeserializer {
  import(json: string): DocumentNode {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON: could not parse input');
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid document: expected a JSON object');
    }

    const record = parsed as Record<string, unknown>;
    const version = record.schemaVersion as number;

    if (typeof version === 'number' && version < LATEST_SCHEMA_VERSION) {
      parsed = migrateDocument(parsed);
    }

    const validation = validateDocument(parsed);
    if (!validation.valid) {
      throw new Error(
        `Document validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`,
      );
    }

    return parsed as DocumentNode;
  }

  importPage(json: string): GraphicPageNode {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON: could not parse page input');
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid graphic page: expected a JSON object');
    }

    return parsed as GraphicPageNode;
  }
}
