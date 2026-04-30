import { getCustomBlocks } from '@core/model/document-data';
import type { DocumentNode } from '@core/model/interfaces';
import type { CustomBlockDefinition } from '@core/model/graphic-preferences';

/**
 * Thin read-only wrapper around `doc.data.customBlocks`.
 * Provides stable list / has / get accessors; the doc is the source of truth.
 */
export class CustomBlockStore {
  private readonly doc: DocumentNode;

  constructor(doc: DocumentNode) {
    this.doc = doc;
  }

  /** Returns all custom block definitions stored in the document. */
  list(): CustomBlockDefinition[] {
    return getCustomBlocks(this.doc);
  }

  /** Returns true if a definition with the given id exists. */
  has(id: string): boolean {
    return this.list().some(cb => cb.id === id);
  }

  /** Returns the definition with the given id, or undefined. */
  get(id: string): CustomBlockDefinition | undefined {
    return this.list().find(cb => cb.id === id);
  }
}
