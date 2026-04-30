import { ViewportController, type Viewport } from '../engine/viewport-controller';

function makeCanvas(width = 800, height = 600, left = 0, top = 0): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    left, top, right: left + width, bottom: top + height,
    width, height, x: left, y: top, toJSON: () => ({}),
  });
  return el;
}

function makeController(initial: Viewport = { x: 0, y: 0, zoom: 1 }) {
  let vp = { ...initial };
  const calls: Array<{ next: Viewport; reason: string }> = [];
  const vc = new ViewportController(
    () => vp,
    (next, reason) => {
      vp = next;
      calls.push({ next: { ...next }, reason });
    },
  );
  return { vc, getVp: () => vp, calls };
}

describe('ViewportController', () => {
  describe('clientToWorld / worldToClient round-trip', () => {
    it('converts with default viewport', () => {
      const canvas = makeCanvas(800, 600, 0, 0);
      const { vc } = makeController({ x: 0, y: 0, zoom: 1 });
      const world = vc.clientToWorld(100, 200, canvas);
      const client = vc.worldToClient(world.x, world.y, canvas);
      expect(client.x).toBeCloseTo(100);
      expect(client.y).toBeCloseTo(200);
    });

    it('round-trips with non-trivial viewport', () => {
      const canvas = makeCanvas(800, 600, 50, 30);
      const { vc } = makeController({ x: 10, y: 20, zoom: 2 });
      const world = vc.clientToWorld(250, 330, canvas);
      const client = vc.worldToClient(world.x, world.y, canvas);
      expect(client.x).toBeCloseTo(250);
      expect(client.y).toBeCloseTo(330);
    });
  });

  describe('zoomAt', () => {
    it('keeps the anchor point fixed in world coordinates', () => {
      const canvas = makeCanvas(800, 600, 0, 0);
      const { vc } = makeController({ x: 0, y: 0, zoom: 1 });

      const anchorClient = { x: 300, y: 200 };
      const worldBefore = vc.clientToWorld(anchorClient.x, anchorClient.y, canvas);

      vc.zoomAt(anchorClient, 2, canvas);

      const worldAfter = vc.clientToWorld(anchorClient.x, anchorClient.y, canvas);
      expect(worldAfter.x).toBeCloseTo(worldBefore.x);
      expect(worldAfter.y).toBeCloseTo(worldBefore.y);
    });

    it('clamps zoom to minimum 0.1', () => {
      const canvas = makeCanvas();
      const { vc, getVp } = makeController({ x: 0, y: 0, zoom: 0.15 });
      vc.zoomAt({ x: 400, y: 300 }, 0.1, canvas);
      expect(getVp().zoom).toBeCloseTo(0.1);
    });

    it('clamps zoom to maximum 8', () => {
      const canvas = makeCanvas();
      const { vc, getVp } = makeController({ x: 0, y: 0, zoom: 7 });
      vc.zoomAt({ x: 400, y: 300 }, 2, canvas);
      expect(getVp().zoom).toBeCloseTo(8);
    });

    it('does not emit when zoom is already at min', () => {
      const canvas = makeCanvas();
      const { vc, calls } = makeController({ x: 0, y: 0, zoom: 0.1 });
      vc.zoomAt({ x: 400, y: 300 }, 0.5, canvas);
      expect(calls).toHaveLength(0);
    });
  });

  describe('panBy', () => {
    it('moves viewport by delta divided by zoom', () => {
      const { vc, getVp } = makeController({ x: 0, y: 0, zoom: 2 });
      vc.panBy(40, 20);
      expect(getVp().x).toBeCloseTo(-20);
      expect(getVp().y).toBeCloseTo(-10);
    });

    it('emits reason "pan"', () => {
      const { vc, calls } = makeController();
      vc.panBy(10, 0);
      expect(calls[0].reason).toBe('pan');
    });
  });

  describe('getWorldTransform', () => {
    it('returns correct translateX, translateY, scale', () => {
      const { vc } = makeController({ x: 5, y: 10, zoom: 2 });
      const t = vc.getWorldTransform();
      expect(t.translateX).toBeCloseTo(-10);
      expect(t.translateY).toBeCloseTo(-20);
      expect(t.scale).toBeCloseTo(2);
    });
  });

  describe('zoomBy', () => {
    it('zooms at canvas centre (panel zoom reason)', () => {
      const canvas = makeCanvas(800, 600, 0, 0);
      const { vc, calls } = makeController({ x: 0, y: 0, zoom: 1 });
      vc.zoomBy(1.2, canvas);
      expect(calls[0].reason).toBe('panel-zoom');
      expect(calls[0].next.zoom).toBeCloseTo(1.2);
    });
  });
});
