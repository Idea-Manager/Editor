import { SetLockedCommand } from '../set-locked-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeEl(overrides: Partial<GraphicElement> = {}): GraphicElement {
  return {
    id: generateId('el'),
    type: 'rectangle',
    data: { x: 0, y: 0, width: 100, height: 100 },
    ...overrides,
  };
}

function makeDoc(elements: GraphicElement[]): { doc: DocumentNode; pageId: string } {
  const doc = createDocument();
  const page = createGraphicPage('Test');
  page.elements.push(...elements);
  doc.graphicPages.push(page);
  return { doc, pageId: page.id };
}

describe('SetLockedCommand', () => {
  it('sets meta.locked to true on execute', () => {
    const el = makeEl();
    const { doc, pageId } = makeDoc([el]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el.id], locked: true });
    cmd.execute();

    expect(doc.graphicPages[0].elements[0].meta?.locked).toBe(true);
  });

  it('sets meta.locked to false (unlock) on execute', () => {
    const el = makeEl({ meta: { locked: true } });
    const { doc, pageId } = makeDoc([el]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el.id], locked: false });
    cmd.execute();

    expect(doc.graphicPages[0].elements[0].meta?.locked).toBe(false);
  });

  it('restores prior locked value on undo', () => {
    const el = makeEl({ meta: { locked: true } });
    const { doc, pageId } = makeDoc([el]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el.id], locked: false });
    cmd.execute();
    cmd.undo();

    expect(doc.graphicPages[0].elements[0].meta?.locked).toBe(true);
  });

  it('restores undefined locked value on undo when element had no meta', () => {
    const el = makeEl();
    const { doc, pageId } = makeDoc([el]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el.id], locked: true });
    cmd.execute();
    cmd.undo();

    expect(doc.graphicPages[0].elements[0].meta?.locked).toBeUndefined();
  });

  it('bulk-updates multiple elements', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const { doc, pageId } = makeDoc([el1, el2]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el1.id, el2.id], locked: true });
    cmd.execute();

    const elements = doc.graphicPages[0].elements;
    expect(elements[0].meta?.locked).toBe(true);
    expect(elements[1].meta?.locked).toBe(true);
  });

  it('emits one operation record per element', () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const { doc, pageId } = makeDoc([el1, el2]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el1.id, el2.id], locked: true });

    expect(cmd.operationRecords).toHaveLength(2);
    expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
  });

  it('mixed-state undo: each element restores its own prior value', () => {
    const el1 = makeEl({ meta: { locked: true } });
    const el2 = makeEl({ meta: { locked: false } });
    const { doc, pageId } = makeDoc([el1, el2]);

    const cmd = new SetLockedCommand({ doc, pageId, elementIds: [el1.id, el2.id], locked: false });
    cmd.execute();
    cmd.undo();

    expect(doc.graphicPages[0].elements[0].meta?.locked).toBe(true);
    expect(doc.graphicPages[0].elements[1].meta?.locked).toBe(false);
  });
});
