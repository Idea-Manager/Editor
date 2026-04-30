import { UpdateArrowEndpointCommand } from '../update-arrow-endpoint-command';
import { AddArrowCommand } from '../add-arrow-command';
import { GraphicBlockRegistry } from '../../../blocks/block-registry';
import { registerDefaultBlocks } from '../../../blocks/index';
import type { DocumentNode } from '@core/model/interfaces';
import type { ArrowData } from '../../../blocks/arrow/arrow-block';

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

function insertArrow(doc: DocumentNode): string {
  const registry = new GraphicBlockRegistry();
  registerDefaultBlocks(registry);
  const addCmd = new AddArrowCommand({
    doc,
    pageId: 'page-1',
    registry,
    from: { point: { x: 0, y: 0 } },
    to: { point: { x: 100, y: 0 } },
  });
  addCmd.execute();
  return doc.graphicPages[0].elements[0].id;
}

describe('UpdateArrowEndpointCommand', () => {
  it('updates the "to" endpoint point', () => {
    const doc = makeDoc();
    const elementId = insertArrow(doc);

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: 'page-1',
      elementId,
      which: 'to',
      endpoint: { point: { x: 200, y: 50 } },
    });

    cmd.execute();

    const el = doc.graphicPages[0].elements[0];
    expect((el.data as unknown as ArrowData).to.point).toEqual({ x: 200, y: 50 });
  });

  it('updates the "from" endpoint point', () => {
    const doc = makeDoc();
    const elementId = insertArrow(doc);

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: 'page-1',
      elementId,
      which: 'from',
      endpoint: { point: { x: -50, y: 25 } },
    });

    cmd.execute();

    const el = doc.graphicPages[0].elements[0];
    expect((el.data as unknown as ArrowData).from.point).toEqual({ x: -50, y: 25 });
  });

  it('undo restores the previous endpoint', () => {
    const doc = makeDoc();
    const elementId = insertArrow(doc);

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: 'page-1',
      elementId,
      which: 'to',
      endpoint: { point: { x: 200, y: 50 } },
    });

    cmd.execute();
    cmd.undo();

    const el = doc.graphicPages[0].elements[0];
    expect((el.data as unknown as ArrowData).to.point).toEqual({ x: 100, y: 0 });
  });

  it('updates the target anchor on "to"', () => {
    const doc = makeDoc();
    const elementId = insertArrow(doc);

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: 'page-1',
      elementId,
      which: 'to',
      endpoint: {
        point: { x: 50, y: 50 },
        target: { elementId: 'el-other', pivotId: 'top' },
      },
    });

    cmd.execute();

    const el = doc.graphicPages[0].elements[0];
    expect((el.data as unknown as ArrowData).to.target).toEqual({ elementId: 'el-other', pivotId: 'top' });
  });

  it('produces two node:update operation records', () => {
    const doc = makeDoc();
    const elementId = insertArrow(doc);

    const cmd = new UpdateArrowEndpointCommand({
      doc,
      pageId: 'page-1',
      elementId,
      which: 'to',
      endpoint: { point: { x: 200, y: 50 } },
    });

    expect(cmd.operationRecords).toHaveLength(2);
    expect(cmd.operationRecords.every(r => r.type === 'node:update')).toBe(true);
  });

  describe('merge', () => {
    it('merges consecutive endpoint updates within the window', () => {
      const doc = makeDoc();
      const elementId = insertArrow(doc);

      const cmd1 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'to',
        endpoint: { point: { x: 150, y: 0 } },
        mergeWindowMs: 2000,
      });
      cmd1.execute();

      const cmd2 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'to',
        endpoint: { point: { x: 200, y: 50 } },
        mergeWindowMs: 2000,
      });

      const merged = cmd1.merge(cmd2);
      expect(merged).toBe(true);

      const el = doc.graphicPages[0].elements[0];
      expect((el.data as unknown as ArrowData).to.point).toEqual({ x: 200, y: 50 });
    });

    it('does NOT merge when mergeWindowMs is 0', () => {
      const doc = makeDoc();
      const elementId = insertArrow(doc);

      const cmd1 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'to',
        endpoint: { point: { x: 150, y: 0 } },
        mergeWindowMs: 0,
      });
      cmd1.execute();

      const cmd2 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'to',
        endpoint: { point: { x: 200, y: 50 } },
        mergeWindowMs: 0,
      });

      expect(cmd1.merge(cmd2)).toBe(false);
    });

    it('does NOT merge commands for different endpoints', () => {
      const doc = makeDoc();
      const elementId = insertArrow(doc);

      const cmd1 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'from',
        endpoint: { point: { x: 10, y: 10 } },
        mergeWindowMs: 2000,
      });
      cmd1.execute();

      const cmd2 = new UpdateArrowEndpointCommand({
        doc,
        pageId: 'page-1',
        elementId,
        which: 'to',
        endpoint: { point: { x: 200, y: 50 } },
        mergeWindowMs: 2000,
      });

      expect(cmd1.merge(cmd2)).toBe(false);
    });
  });
});
