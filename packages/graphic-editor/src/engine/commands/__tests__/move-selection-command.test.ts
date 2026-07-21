import { MoveSelectionCommand } from '../move-selection-command';
import { createDocument, createGraphicPage } from '@core/model/factory';
import { generateId } from '@core/id';
import type { DocumentNode, GraphicElement } from '@core/model/interfaces';
import type { SelectionEntry } from '../../selection-manager';

function makeElement(x = 10, y = 20): GraphicElement {
  return { id: generateId('el'), type: 'rectangle', data: { x, y } };
}

function makeDoc(...elements: GraphicElement[]) {
  const doc = createDocument();
  const page = createGraphicPage('Page');
  elements.forEach(el => page.elements.push(el));
  doc.graphicPages.push(page);
  return { doc, pageId: page.id };
}

function sel(id: string): SelectionEntry {
  return { type: 'element', id };
}

function getXY(doc: DocumentNode, idx = 0) {
  const data = doc.graphicPages[0].elements[idx].data as Record<string, unknown>;
  return { x: data.x as number, y: data.y as number };
}

describe('MoveSelectionCommand', () => {
  describe('single element', () => {
    it('moves a single element by dx, dy on execute', () => {
      const el = makeElement(10, 20);
      const { doc, pageId } = makeDoc(el);
      const cmd = new MoveSelectionCommand({ doc, pageId, entries: [sel(el.id)], dx: 5, dy: -3 });
      cmd.execute();
      expect(getXY(doc)).toEqual({ x: 15, y: 17 });
    });

    it('undoes the move correctly', () => {
      const el = makeElement(10, 20);
      const { doc, pageId } = makeDoc(el);
      const cmd = new MoveSelectionCommand({ doc, pageId, entries: [sel(el.id)], dx: 5, dy: -3 });
      cmd.execute();
      cmd.undo();
      expect(getXY(doc)).toEqual({ x: 10, y: 20 });
    });
  });

  describe('multiple elements', () => {
    it('moves all selected elements', () => {
      const el1 = makeElement(0, 0);
      const el2 = makeElement(100, 100);
      const { doc, pageId } = makeDoc(el1, el2);
      const cmd = new MoveSelectionCommand({
        doc, pageId,
        entries: [sel(el1.id), sel(el2.id)],
        dx: 10, dy: 10,
      });
      cmd.execute();
      expect(getXY(doc, 0)).toEqual({ x: 10, y: 10 });
      expect(getXY(doc, 1)).toEqual({ x: 110, y: 110 });
    });
  });

  describe('frame drag also translates children', () => {
    it('moves both the frame and its child element', () => {
      const doc = createDocument();
      const page = createGraphicPage('Page');
      const child = makeElement(50, 50);
      page.elements.push(child);
      page.frames.push({
        id: 'frame1',
        name: 'Frame',
        data: { x: 0, y: 0, width: 200, height: 200, background: '#fff', clipContent: false, showLabel: true, labelFontSize: 12 },
        childElementIds: [child.id],
      });
      doc.graphicPages.push(page);

      const entry: SelectionEntry = { type: 'frame', id: 'frame1' };
      const cmd = new MoveSelectionCommand({ doc, pageId: page.id, entries: [entry], dx: 20, dy: 10 });
      cmd.execute();

      const frame = page.frames[0];
      expect(frame.data.x).toBe(20);
      expect(frame.data.y).toBe(10);

      // setAtPath replaces the element object; read from page
      const currentChild = page.elements.find(e => e.id === child.id)!.data as Record<string, unknown>;
      expect(currentChild.x).toBe(70);
      expect(currentChild.y).toBe(60);
    });

    it('undoes frame + children translation', () => {
      const doc = createDocument();
      const page = createGraphicPage('Page');
      const child = makeElement(50, 50);
      page.elements.push(child);
      page.frames.push({
        id: 'frame1',
        name: 'Frame',
        data: { x: 0, y: 0, width: 200, height: 200, background: '#fff', clipContent: false, showLabel: true, labelFontSize: 12 },
        childElementIds: [child.id],
      });
      doc.graphicPages.push(page);

      const entry: SelectionEntry = { type: 'frame', id: 'frame1' };
      const cmd = new MoveSelectionCommand({ doc, pageId: page.id, entries: [entry], dx: 20, dy: 10 });
      cmd.execute();
      cmd.undo();

      expect(page.frames[0].data.x).toBe(0);
      const currentChild = page.elements.find(e => e.id === child.id)!.data as Record<string, unknown>;
      expect(currentChild.x).toBe(50);
    });
  });
});
