import { validateDocument } from '../validator';
import { createDocument, createParagraph, createHeading } from '../../model/factory';

describe('validateDocument', () => {
  it('should accept a valid document', () => {
    const doc = createDocument();
    const result = validateDocument(doc);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept a document with multiple blocks', () => {
    const doc = createDocument();
    doc.children = [
      createHeading(1, 'Title'),
      createParagraph('Text'),
    ];
    const result = validateDocument(doc);
    expect(result.valid).toBe(true);
  });

  it('should reject a document missing required fields', () => {
    const result = validateDocument({ id: 'x', type: 'document' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject a document with wrong type', () => {
    const doc = createDocument() as any;
    doc.type = 'not-document';
    const result = validateDocument(doc);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('type'))).toBe(true);
  });

  it('should reject a document with invalid block type', () => {
    const doc = createDocument();
    doc.children = [
      { id: 'blk_x', type: 'invalid_type' as any, data: {}, children: [] },
    ];
    const result = validateDocument(doc);
    expect(result.valid).toBe(false);
  });

  it('should reject a non-object input', () => {
    const result = validateDocument('not an object');
    expect(result.valid).toBe(false);
  });

  it('should reject null input', () => {
    const result = validateDocument(null);
    expect(result.valid).toBe(false);
  });

  it('should provide error paths in messages', () => {
    const result = validateDocument({
      id: 'x',
      type: 'document',
      schemaVersion: 1,
      data: {},
      children: [{ id: 'b', type: 'paragraph', data: {}, children: [{ bad: true }] }],
      graphicPages: [],
      assets: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('/children'))).toBe(true);
  });
});
