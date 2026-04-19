import { migrateDocument, LATEST_SCHEMA_VERSION } from '../migrations';

describe('migrateDocument', () => {
  it('should migrate a v1 document to latest version', () => {
    const v1Doc = {
      id: 'doc_test',
      type: 'document',
      schemaVersion: 1,
      data: {},
      children: [],
      graphicPages: [],
      assets: {},
    };

    const result = migrateDocument(v1Doc) as Record<string, unknown>;
    expect(result.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
  });

  it('should not modify a document already at latest version', () => {
    const doc = {
      id: 'doc_test',
      type: 'document',
      schemaVersion: LATEST_SCHEMA_VERSION,
      data: {},
      children: [],
      graphicPages: [],
      assets: {},
    };

    const result = migrateDocument(doc) as Record<string, unknown>;
    expect(result.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
    expect(result.id).toBe('doc_test');
  });

  it('should throw on invalid input', () => {
    expect(() => migrateDocument(null)).toThrow('expected an object');
    expect(() => migrateDocument('string')).toThrow('expected an object');
  });

  it('should throw on missing schemaVersion', () => {
    expect(() => migrateDocument({ type: 'document' })).toThrow('Invalid schemaVersion');
  });

  it('should throw on future schemaVersion', () => {
    expect(() => migrateDocument({
      schemaVersion: LATEST_SCHEMA_VERSION + 10,
    })).toThrow('newer than supported');
  });

  it('should preserve existing document data through migration', () => {
    const v1Doc = {
      id: 'doc_preserved',
      type: 'document',
      schemaVersion: 1,
      data: { custom: 'value' },
      children: [
        { id: 'blk_1', type: 'paragraph', data: { align: 'left' }, children: [] },
      ],
      graphicPages: [],
      assets: {},
    };

    const result = migrateDocument(v1Doc) as Record<string, unknown>;
    expect(result.id).toBe('doc_preserved');
    expect(result.data).toEqual({ custom: 'value' });
    expect((result.children as any[])[0].id).toBe('blk_1');
  });
});
