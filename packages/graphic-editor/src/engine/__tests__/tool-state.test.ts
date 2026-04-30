import { ToolState } from '../tool-state';
import { EventBus } from '@core/events/event-bus';

function makeToolState() {
  const eventBus = new EventBus();
  const toolState = new ToolState(eventBus);
  return { toolState, eventBus };
}

describe('ToolState', () => {
  describe('initial state', () => {
    it('defaults to selection tool', () => {
      const { toolState } = makeToolState();
      expect(toolState.getTool()).toBe('selection');
    });

    it('getSnapshot returns correct initial snapshot', () => {
      const { toolState } = makeToolState();
      expect(toolState.getSnapshot()).toEqual({ tool: 'selection' });
    });
  });

  describe('setTool', () => {
    it('changes the active tool', () => {
      const { toolState } = makeToolState();
      toolState.setTool('pen');
      expect(toolState.getTool()).toBe('pen');
    });

    it('emits tool:change on the event bus', () => {
      const { toolState, eventBus } = makeToolState();
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));

      toolState.setTool('frame');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ tool: 'frame' });
    });

    it('does not emit when setting the same tool', () => {
      const { toolState, eventBus } = makeToolState();
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));

      toolState.setTool('selection');
      expect(events).toHaveLength(0);
    });

    it('notifies onChange listeners', () => {
      const { toolState } = makeToolState();
      const snaps: unknown[] = [];
      toolState.onChange((s) => snaps.push(s));
      toolState.setTool('arrow');
      expect(snaps).toHaveLength(1);
      expect(snaps[0]).toMatchObject({ tool: 'arrow' });
    });

    it('does not emit when silent option is set', () => {
      const { toolState, eventBus } = makeToolState();
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));

      toolState.setTool('pen', { silent: true });
      expect(events).toHaveLength(0);
    });

    it('throws if setTool is called with placement', () => {
      const { toolState } = makeToolState();
      expect(() => toolState.setTool('placement')).toThrow();
    });

    it('clears pendingBlockType when switching tool normally', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('rectangle');
      toolState.cancelPlacement();
      toolState.setTool('frame');
      expect(toolState.getSnapshot().pendingBlockType).toBeUndefined();
    });
  });

  describe('beginPlacement', () => {
    it('enters placement mode with a pending block type', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('rectangle');
      const snap = toolState.getSnapshot();
      expect(snap.tool).toBe('placement');
      expect(snap.pendingBlockType).toBe('rectangle');
    });

    it('saves previousTool', () => {
      const { toolState } = makeToolState();
      toolState.setTool('pen');
      toolState.beginPlacement('circle');
      expect(toolState.getSnapshot().previousTool).toBe('pen');
    });

    it('preserves previousTool when called again during active placement', () => {
      const { toolState } = makeToolState();
      toolState.setTool('arrow');
      toolState.beginPlacement('rectangle');
      toolState.beginPlacement('circle');
      expect(toolState.getSnapshot().previousTool).toBe('arrow');
      expect(toolState.getSnapshot().pendingBlockType).toBe('circle');
    });

    it('emits tool:change', () => {
      const { toolState, eventBus } = makeToolState();
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));
      toolState.beginPlacement('sticker');
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ tool: 'placement', pendingBlockType: 'sticker' });
    });
  });

  describe('cancelPlacement', () => {
    it('restores previousTool', () => {
      const { toolState } = makeToolState();
      toolState.setTool('pen');
      toolState.beginPlacement('triangle');
      toolState.cancelPlacement();
      expect(toolState.getTool()).toBe('pen');
    });

    it('defaults to selection when no previousTool', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('triangle');
      toolState.cancelPlacement();
      expect(toolState.getTool()).toBe('selection');
    });

    it('clears pendingBlockType and previousTool', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('ellipse');
      toolState.cancelPlacement();
      const snap = toolState.getSnapshot();
      expect(snap.pendingBlockType).toBeUndefined();
      expect(snap.previousTool).toBeUndefined();
    });

    it('no-ops when not in placement mode', () => {
      const { toolState, eventBus } = makeToolState();
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));
      toolState.cancelPlacement();
      expect(events).toHaveLength(0);
      expect(toolState.getTool()).toBe('selection');
    });

    it('emits tool:change', () => {
      const { toolState, eventBus } = makeToolState();
      toolState.beginPlacement('rectangle');
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));
      toolState.cancelPlacement();
      expect(events).toHaveLength(1);
    });
  });

  describe('consumePlacement', () => {
    it('returns the pending block type', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('circle');
      const result = toolState.consumePlacement();
      expect(result).toBe('circle');
    });

    it('restores previousTool after consuming', () => {
      const { toolState } = makeToolState();
      toolState.setTool('sticker');
      toolState.beginPlacement('rectangle');
      toolState.consumePlacement();
      expect(toolState.getTool()).toBe('sticker');
    });

    it('defaults to selection when no previousTool', () => {
      const { toolState } = makeToolState();
      toolState.beginPlacement('rectangle');
      toolState.consumePlacement();
      expect(toolState.getTool()).toBe('selection');
    });

    it('returns null when not in placement mode', () => {
      const { toolState } = makeToolState();
      expect(toolState.consumePlacement()).toBeNull();
    });

    it('emits tool:change', () => {
      const { toolState, eventBus } = makeToolState();
      toolState.beginPlacement('circle');
      const events: unknown[] = [];
      eventBus.on('tool:change', (p) => events.push(p));
      toolState.consumePlacement();
      expect(events).toHaveLength(1);
    });
  });

  describe('onChange', () => {
    it('returns a disposer that stops listening', () => {
      const { toolState } = makeToolState();
      const snaps: unknown[] = [];
      const dispose = toolState.onChange((s) => snaps.push(s));
      toolState.setTool('frame');
      dispose();
      toolState.setTool('pen');
      expect(snaps).toHaveLength(1);
    });
  });
});
