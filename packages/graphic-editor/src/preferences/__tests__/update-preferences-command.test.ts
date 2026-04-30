import { UpdatePreferencesCommand } from '../update-preferences-command';
import { createDocument } from '@core/model/factory';
import type { DocumentNode } from '@core/model/interfaces';

function makeDoc(prefs: Record<string, unknown> = {}): DocumentNode {
  const doc = createDocument();
  doc.data = { graphicPreferences: prefs };
  return doc;
}

describe('UpdatePreferencesCommand', () => {
  describe('execute / undo', () => {
    it('sets a top-level pref on execute', () => {
      const doc = makeDoc({});
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      cmd.execute();

      const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
      const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
      expect(rectPrefs['background']).toBe('blue');
    });

    it('restores the old value on undo', () => {
      const doc = makeDoc({ rectangle: { background: 'red' } });
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      cmd.execute();
      cmd.undo();

      const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
      const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
      expect(rectPrefs['background']).toBe('red');
    });

    it('supports nested paths via setAtPath', () => {
      const doc = makeDoc({});
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'border.thickness',
        value: 3,
      });

      cmd.execute();

      const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
      const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
      const border = rectPrefs['border'] as Record<string, unknown>;
      expect(border['thickness']).toBe(3);
    });

    it('preserves sibling keys in the block prefs on execute', () => {
      const doc = makeDoc({ rectangle: { background: 'red', fontSize: 14 } });
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      cmd.execute();

      const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
      const rectPrefs = prefs['rectangle'] as Record<string, unknown>;
      expect(rectPrefs['background']).toBe('blue');
      expect(rectPrefs['fontSize']).toBe(14);
    });

    it('preserves other block types on execute', () => {
      const doc = makeDoc({ triangle: { background: 'green' } });
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      cmd.execute();

      const prefs = (doc.data as Record<string, unknown>)['graphicPreferences'] as Record<string, unknown>;
      const trianglePrefs = prefs['triangle'] as Record<string, unknown>;
      expect(trianglePrefs['background']).toBe('green');
    });
  });

  describe('operation records', () => {
    it('emits a single node:update operation record', () => {
      const doc = makeDoc({});
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      expect(cmd.operationRecords).toHaveLength(1);
      expect(cmd.operationRecords[0].type).toBe('node:update');
    });

    it('includes the doc id as nodeId', () => {
      const doc = makeDoc({});
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      const payload = cmd.operationRecords[0].payload as { nodeId: string; path: string };
      expect(payload.nodeId).toBe(doc.id);
    });

    it('includes the correct nested path', () => {
      const doc = makeDoc({});
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'border.thickness',
        value: 3,
      });

      const payload = cmd.operationRecords[0].payload as { path: string };
      expect(payload.path).toBe('data.graphicPreferences.rectangle.border.thickness');
    });

    it('captures the old value for undo', () => {
      const doc = makeDoc({ rectangle: { background: 'red' } });
      const cmd = new UpdatePreferencesCommand({
        doc,
        blockType: 'rectangle',
        path: 'background',
        value: 'blue',
      });

      const payload = cmd.operationRecords[0].payload as { oldValue: unknown; newValue: unknown };
      expect(payload.oldValue).toBe('red');
      expect(payload.newValue).toBe('blue');
    });
  });
});
