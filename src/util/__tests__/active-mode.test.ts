import { createDocument } from '@core/model/factory';
import { getActiveMode, setActiveMode } from '../active-mode';

describe('getActiveMode', () => {
  it('defaults to "text" when meta is absent', () => {
    const doc = createDocument();
    expect(getActiveMode(doc)).toBe('text');
  });

  it('defaults to "text" when meta.activeMode is not set', () => {
    const doc = createDocument();
    doc.meta = { createdAt: Date.now() };
    expect(getActiveMode(doc)).toBe('text');
  });

  it('returns "graphic" when meta.activeMode is "graphic"', () => {
    const doc = createDocument();
    doc.meta = {};
    (doc.meta as Record<string, unknown>).activeMode = 'graphic';
    expect(getActiveMode(doc)).toBe('graphic');
  });

  it('returns "text" for any unrecognised activeMode value', () => {
    const doc = createDocument();
    doc.meta = {};
    (doc.meta as Record<string, unknown>).activeMode = 'unknown';
    expect(getActiveMode(doc)).toBe('text');
  });
});

describe('setActiveMode', () => {
  it('writes "graphic" to meta.activeMode', () => {
    const doc = createDocument();
    setActiveMode(doc, 'graphic');
    expect((doc.meta as Record<string, unknown>).activeMode).toBe('graphic');
  });

  it('writes "text" to meta.activeMode', () => {
    const doc = createDocument();
    setActiveMode(doc, 'text');
    expect((doc.meta as Record<string, unknown>).activeMode).toBe('text');
  });

  it('initialises meta if absent before writing', () => {
    const doc = createDocument();
    doc.meta = undefined;
    setActiveMode(doc, 'graphic');
    expect(doc.meta).toBeDefined();
    expect((doc.meta as unknown as Record<string, unknown>).activeMode).toBe('graphic');
  });
});

describe('round-trip', () => {
  it('getActiveMode returns what setActiveMode wrote', () => {
    const doc = createDocument();
    setActiveMode(doc, 'graphic');
    expect(getActiveMode(doc)).toBe('graphic');
    setActiveMode(doc, 'text');
    expect(getActiveMode(doc)).toBe('text');
  });
});
