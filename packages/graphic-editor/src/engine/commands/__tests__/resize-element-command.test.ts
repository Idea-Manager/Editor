import { ResizeElementCommand } from '../resize-element-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';

function makeElement(x = 10, y = 20, width = 100, height = 80): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x, y, width, height } };
}

function makeDoc(el: GraphicElement) {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  page.elements.push(el);
  doc.graphicPages.push(page);
  return { doc, pageId: page.id };
}

function getBounds(doc: DocumentNode) {
  const data = doc.graphicPages[0].elements[0].data as Record<string, unknown>;
  return {
    x: data.x as number,
    y: data.y as number,
    width: data.width as number,
    height: data.height as number,
  };
}

describe('ResizeElementCommand', () => {
  it('sets all four properties on execute', () => {
    const el = makeElement(10, 20, 100, 80);
    const { doc, pageId } = makeDoc(el);
    const cmd = new ResizeElementCommand({ doc, pageId, elementId: el.id, x: 5, y: 10, width: 150, height: 120 });
    cmd.execute();
    expect(getBounds(doc)).toEqual({ x: 5, y: 10, width: 150, height: 120 });
  });

  it('restores original values on undo', () => {
    const el = makeElement(10, 20, 100, 80);
    const { doc, pageId } = makeDoc(el);
    const cmd = new ResizeElementCommand({ doc, pageId, elementId: el.id, x: 5, y: 10, width: 150, height: 120 });
    cmd.execute();
    cmd.undo();
    expect(getBounds(doc)).toEqual({ x: 10, y: 20, width: 100, height: 80 });
  });

  it('produces 4 operation records', () => {
    const el = makeElement();
    const { doc, pageId } = makeDoc(el);
    const cmd = new ResizeElementCommand({ doc, pageId, elementId: el.id, x: 0, y: 0, width: 50, height: 50 });
    expect(cmd.operationRecords).toHaveLength(4);
  });

  it('all records have type node:update', () => {
    const el = makeElement();
    const { doc, pageId } = makeDoc(el);
    const cmd = new ResizeElementCommand({ doc, pageId, elementId: el.id, x: 0, y: 0, width: 50, height: 50 });
    expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
  });
});
