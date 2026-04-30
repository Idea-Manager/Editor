import { AddArrowCommand } from '../add-arrow-command';
import { GraphicBlockRegistry } from '../../../blocks/block-registry';
import { registerDefaultBlocks } from '../../../blocks/index';
import type { DocumentNode } from '@core/model/interfaces';

function makeDoc(): DocumentNode {
  return {
    id: 'doc-1',
    type: 'document',
    schemaVersion: 1,
    data: {},
    children: [],
    assets: {},
    graphicPages: [
      {
        id: 'page-1',
        name: 'Page',
        elements: [],
        frames: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
  };
}

function makeRegistry(): GraphicBlockRegistry {
  const reg = new GraphicBlockRegistry();
  registerDefaultBlocks(reg);
  return reg;
}

describe('AddArrowCommand', () => {
  it('executes and inserts an arrow element on the page', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    cmd.execute();

    expect(doc.graphicPages[0].elements).toHaveLength(1);
    expect(doc.graphicPages[0].elements[0].type).toBe('arrow');
  });

  it('arrow element id uses "conn" prefix', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    cmd.execute();

    expect(doc.graphicPages[0].elements[0].id).toMatch(/^conn_/);
  });

  it('undo removes the arrow element', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    cmd.execute();
    expect(doc.graphicPages[0].elements).toHaveLength(1);

    cmd.undo();
    expect(doc.graphicPages[0].elements).toHaveLength(0);
  });

  it('produces a node:insert operation record', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    expect(cmd.operationRecords).toHaveLength(1);
    expect(cmd.operationRecords[0].type).toBe('node:insert');
  });

  it('applies overrides on top of ARROW_DEFAULTS', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
      overrides: { thickness: 5, color: '#ff0000' },
    });

    cmd.execute();

    const el = doc.graphicPages[0].elements[0];
    expect((el.data as Record<string, unknown>)['thickness']).toBe(5);
    expect((el.data as Record<string, unknown>)['color']).toBe('#ff0000');
  });

  it('does NOT auto-attach to a frame even when one intersects', () => {
    const doc = makeDoc();
    doc.graphicPages[0].frames.push({
      id: 'frm-1',
      name: 'Frame',
      data: { x: -50, y: -50, width: 200, height: 200, background: 'transparent', clipContent: false, showLabel: true, labelFontSize: 12 },
      childElementIds: [],
    });

    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    cmd.execute();

    const el = doc.graphicPages[0].elements[0];
    expect((el as { frameId?: string }).frameId).toBeUndefined();
    expect(doc.graphicPages[0].frames[0].childElementIds).toHaveLength(0);
  });

  it('is idempotent on double-execute', () => {
    const doc = makeDoc();
    const registry = makeRegistry();
    const cmd = new AddArrowCommand({
      doc,
      pageId: 'page-1',
      registry,
      from: { point: { x: 0, y: 0 } },
      to: { point: { x: 100, y: 0 } },
    });

    cmd.execute();
    cmd.execute();

    expect(doc.graphicPages[0].elements).toHaveLength(1);
  });
});
