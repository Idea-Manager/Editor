import { stripGraphicArrows } from '../strip-graphic-arrows';
import { DocumentSerializer } from '../serializer';
import { createDocument, createGraphicPage } from '../../model/factory';

describe('stripGraphicArrows', () => {
  it('removes arrow elements from graphic pages', () => {
    const doc = createDocument();
    const page = createGraphicPage('Page');
    page.elements.push(
      { id: 'el_1', type: 'rectangle', data: { x: 0, y: 0, width: 10, height: 10 } },
      { id: 'conn_1', type: 'arrow', data: { from: { point: { x: 0, y: 0 } }, to: { point: { x: 1, y: 1 } } } },
    );
    doc.graphicPages.push(page);

    const stripped = stripGraphicArrows(doc);
    expect(stripped.graphicPages[0].elements).toHaveLength(1);
    expect(stripped.graphicPages[0].elements[0].type).toBe('rectangle');
  });

  it('removes arrows from custom blocks and graphicPreferences.arrow', () => {
    const doc = createDocument();
    doc.data['graphicPreferences'] = { arrow: { color: '#000' }, rectangle: { background: '#fff' } };
    doc.data['customBlocks'] = [
      {
        id: 'blk_1',
        name: 'Block',
        createdAt: '2024-01-01T00:00:00.000Z',
        source: { width: 10, height: 10 },
        elements: [],
        arrows: [{ placeholderId: 'cb-arrow-0', data: {} }],
      },
    ];

    const stripped = stripGraphicArrows(doc);
    const prefs = stripped.data['graphicPreferences'] as Record<string, unknown>;
    expect(prefs['arrow']).toBeUndefined();
    expect(prefs['rectangle']).toEqual({ background: '#fff' });

    const blocks = stripped.data['customBlocks'] as Array<Record<string, unknown>>;
    expect(blocks[0]['arrows']).toBeUndefined();
  });

  it('DocumentSerializer.export omits arrow data', () => {
    const doc = createDocument();
    const page = createGraphicPage('Page');
    page.elements.push({ id: 'conn_1', type: 'arrow', data: {} });
    doc.graphicPages.push(page);

    const json = new DocumentSerializer().export(doc);
    const parsed = JSON.parse(json) as { graphicPages: Array<{ elements: Array<{ type: string }> }> };
    expect(parsed.graphicPages[0].elements).toHaveLength(0);
  });
});
