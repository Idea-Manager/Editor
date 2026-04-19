import { DocumentSerializer } from '../serializer';
import { DocumentDeserializer } from '../deserializer';
import {
  createDocument,
  createParagraph,
  createHeading,
  createGraphicPage,
  createFrame,
} from '../../model/factory';
import { DocumentNode } from '../../model/interfaces';

describe('Serialization round-trip', () => {
  const serializer = new DocumentSerializer();
  const deserializer = new DocumentDeserializer();

  it('should round-trip a minimal document', () => {
    const doc = createDocument();
    doc.schemaVersion = 3;
    const json = serializer.export(doc);
    const restored = deserializer.import(json);

    expect(restored.id).toBe(doc.id);
    expect(restored.type).toBe('document');
    expect(restored.schemaVersion).toBe(3);
    expect(restored.children).toHaveLength(1);
    expect(restored.children[0].type).toBe('paragraph');
  });

  it('should round-trip a document with multiple blocks', () => {
    const doc = createDocument();
    doc.schemaVersion = 3;
    doc.children = [
      createHeading(1, 'Title'),
      createParagraph('Hello world'),
      createParagraph('Second paragraph'),
    ];

    const json = serializer.export(doc);
    const restored = deserializer.import(json);

    expect(restored.children).toHaveLength(3);
    expect(restored.children[0].type).toBe('heading');
    expect(restored.children[0].data).toEqual({ level: 1, align: 'left' });
    expect(restored.children[1].children[0].data.text).toBe('Hello world');
  });

  it('should round-trip a document with graphic pages', () => {
    const doc = createDocument();
    doc.schemaVersion = 3;
    const page = createGraphicPage('Diagram');
    const frame = createFrame('Main', { x: 0, y: 0, width: 800, height: 600 });
    page.frames.push(frame);
    doc.graphicPages.push(page);

    const json = serializer.export(doc);
    const restored = deserializer.import(json);

    expect(restored.graphicPages).toHaveLength(1);
    expect(restored.graphicPages[0].name).toBe('Diagram');
    expect(restored.graphicPages[0].frames).toHaveLength(1);
    expect(restored.graphicPages[0].frames[0].name).toBe('Main');
    expect(restored.graphicPages[0].frames[0].data.width).toBe(800);
  });

  it('should preserve JSON key structure through round-trip', () => {
    const doc = createDocument();
    doc.schemaVersion = 3;
    const json = serializer.export(doc);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('type', 'document');
    expect(parsed).toHaveProperty('schemaVersion', 3);
    expect(parsed).toHaveProperty('children');
    expect(parsed).toHaveProperty('graphicPages');
    expect(parsed).toHaveProperty('assets');
  });
});

describe('DocumentSerializer.exportPage', () => {
  const serializer = new DocumentSerializer();

  it('should export a single graphic page', () => {
    const page = createGraphicPage('Test Page');
    const json = serializer.exportPage(page);
    const parsed = JSON.parse(json);

    expect(parsed.id).toBe(page.id);
    expect(parsed.name).toBe('Test Page');
    expect(parsed.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });
});

describe('DocumentDeserializer.importPage', () => {
  const deserializer = new DocumentDeserializer();

  it('should import a graphic page from JSON', () => {
    const json = JSON.stringify({
      id: 'page_test',
      name: 'Imported',
      elements: [],
      frames: [],
      viewport: { x: 10, y: 20, zoom: 1.5 },
    });
    const page = deserializer.importPage(json);

    expect(page.id).toBe('page_test');
    expect(page.name).toBe('Imported');
    expect(page.viewport.zoom).toBe(1.5);
  });

  it('should throw on invalid JSON', () => {
    expect(() => deserializer.importPage('not json')).toThrow('Invalid JSON');
  });
});
