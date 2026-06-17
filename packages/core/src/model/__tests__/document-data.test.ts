import { createDocument } from '../factory';
import { getGraphicPreferences, getCustomBlocks, DOCUMENT_DATA_KEYS } from '../document-data';
import { DocumentSerializer } from '../../serialization/serializer';
import { DocumentDeserializer } from '../../serialization/deserializer';
import { validateDocument } from '../../serialization/validator';
import type { GraphicPreferences, CustomBlockDefinition } from '../graphic-preferences';
import type { DocumentNode } from '../interfaces';

import graphicWithPrefs from '../../schema/examples/graphic-with-prefs.json';

describe('getGraphicPreferences', () => {
  it('returns {} when data has no graphicPreferences key', () => {
    const doc = createDocument();
    expect(getGraphicPreferences(doc)).toEqual({});
  });

  it('returns the stored value when key is present', () => {
    const doc = createDocument();
    const prefs: GraphicPreferences = {
      rectangle: { fill: '#ffffff', strokeWidth: 2 },
      triangle: { stroke: '#000000' },
    };
    doc.data[DOCUMENT_DATA_KEYS.graphicPreferences] = prefs;
    expect(getGraphicPreferences(doc)).toBe(prefs);
  });

  it('returns {} when the value is a non-object (string)', () => {
    const doc = createDocument();
    doc.data[DOCUMENT_DATA_KEYS.graphicPreferences] = 'not-an-object';
    expect(getGraphicPreferences(doc)).toEqual({});
  });

  it('returns {} when the value is null', () => {
    const doc = createDocument();
    doc.data[DOCUMENT_DATA_KEYS.graphicPreferences] = null;
    expect(getGraphicPreferences(doc)).toEqual({});
  });
});

describe('getCustomBlocks', () => {
  it('returns [] when data has no customBlocks key', () => {
    const doc = createDocument();
    expect(getCustomBlocks(doc)).toEqual([]);
  });

  it('returns the stored array when key is present', () => {
    const doc = createDocument();
    const blocks: CustomBlockDefinition[] = [
      {
        id: 'blk_001',
        name: 'My Block',
        createdAt: '2024-01-01T00:00:00.000Z',
        source: { width: 100, height: 50 },
        elements: [],
      },
    ];
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = blocks;
    expect(getCustomBlocks(doc)).toBe(blocks);
  });

  it('returns [] when the value is not an array (object)', () => {
    const doc = createDocument();
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = { notAnArray: true };
    expect(getCustomBlocks(doc)).toEqual([]);
  });

  it('returns [] when the value is not an array (string)', () => {
    const doc = createDocument();
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = 'oops';
    expect(getCustomBlocks(doc)).toEqual([]);
  });

  it('returns [] when the value is null', () => {
    const doc = createDocument();
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = null;
    expect(getCustomBlocks(doc)).toEqual([]);
  });
});

describe('round-trip through DocumentSerializer / DocumentDeserializer', () => {
  const serializer = new DocumentSerializer();
  const deserializer = new DocumentDeserializer();

  it('preserves graphicPreferences and customBlocks byte-equivalently', () => {
    const doc = createDocument();
    doc.schemaVersion = 3;

    const prefs: GraphicPreferences = {
      rectangle: { fill: '#ffffff', strokeWidth: 2 },
    };
    const blocks: CustomBlockDefinition[] = [
      {
        id: 'blk_test',
        name: 'Test Block',
        createdAt: '2023-11-14T22:13:20.000Z',
        source: { width: 200, height: 100 },
        elements: [
          {
            type: 'rectangle',
            data: { x: 0, y: 0, width: 200, height: 100 },
            placeholderId: 'cb-0',
          },
        ],
      },
    ];

    doc.data[DOCUMENT_DATA_KEYS.graphicPreferences] = prefs;
    doc.data[DOCUMENT_DATA_KEYS.customBlocks] = blocks;

    const exported = serializer.export(doc);
    const restored = deserializer.import(exported);

    // Re-exporting restored doc should produce same JSON (key-order replacer is deterministic)
    expect(serializer.export(restored)).toBe(exported);

    // Data is structurally equivalent
    expect(getGraphicPreferences(restored)).toEqual(prefs);
    expect(getCustomBlocks(restored)).toEqual(blocks);
  });
});

describe('validateDocument with graphicPreferences and customBlocks', () => {
  it('accepts the graphic-with-prefs.json example', () => {
    const result = validateDocument(graphicWithPrefs);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a document with both keys populated inline', () => {
    const doc: DocumentNode = {
      id: 'doc_test',
      type: 'document',
      schemaVersion: 1,
      data: {
        graphicPreferences: {
          rectangle: { fill: '#ffffff' },
        },
        customBlocks: [
          {
            id: 'blk_x',
            name: 'Block X',
            createdAt: '2024-01-01T00:00:00.000Z',
            source: { width: 100, height: 50 },
            elements: [],
          },
        ],
      },
      children: [],
      graphicPages: [],
      assets: {},
    };
    const result = validateDocument(doc);
    expect(result.valid).toBe(true);
  });
});
