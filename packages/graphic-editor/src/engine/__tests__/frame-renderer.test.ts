import { FrameRenderer } from '../frame-renderer';
import { createFrame } from '@core/model/factory';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeWorldGroup(): SVGGElement {
  return document.createElementNS(SVG_NS, 'g') as SVGGElement;
}

function makeOverlay(): HTMLDivElement {
  return document.createElement('div');
}

describe('FrameRenderer', () => {
  const renderer = new FrameRenderer();

  describe('renderFrame SVG', () => {
    it('appends a rect with idea-graphic-frame__rect class', () => {
      const frame = createFrame('F1', { x: 10, y: 20, width: 300, height: 200 });
      const worldGroup = makeWorldGroup();
      const overlay = makeOverlay();

      renderer.renderFrame(frame, worldGroup, overlay);

      const rect = worldGroup.querySelector('rect.idea-graphic-frame__rect');
      expect(rect).not.toBeNull();
    });

    it('sets correct x, y, width, height attributes', () => {
      const frame = createFrame('F1', { x: 10, y: 20, width: 300, height: 200 });
      const worldGroup = makeWorldGroup();

      renderer.renderFrame(frame, worldGroup, makeOverlay());

      const rect = worldGroup.querySelector('rect')!;
      expect(rect.getAttribute('x')).toBe('10');
      expect(rect.getAttribute('y')).toBe('20');
      expect(rect.getAttribute('width')).toBe('300');
      expect(rect.getAttribute('height')).toBe('200');
    });

    it('sets data-frame-id on the containing group', () => {
      const frame = createFrame('F1', { x: 0, y: 0, width: 100, height: 100 });
      const worldGroup = makeWorldGroup();

      renderer.renderFrame(frame, worldGroup, makeOverlay());

      const g = worldGroup.querySelector('[data-frame-id]')!;
      expect(g.getAttribute('data-frame-id')).toBe(frame.id);
    });
  });

  describe('label', () => {
    it('appends a label div when showLabel is true', () => {
      const frame = createFrame('My Frame', { x: 0, y: 0, width: 100, height: 100 });
      const overlay = makeOverlay();

      renderer.renderFrame(frame, makeWorldGroup(), overlay);

      const label = overlay.querySelector('.idea-graphic-frame__label');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe('My Frame');
    });

    it('does NOT append a label div when showLabel is false', () => {
      const frame = createFrame('Hidden', { x: 0, y: 0, width: 100, height: 100 });
      frame.data.showLabel = false;
      const overlay = makeOverlay();

      renderer.renderFrame(frame, makeWorldGroup(), overlay);

      expect(overlay.querySelector('.idea-graphic-frame__label')).toBeNull();
    });

    it('positions the label at world frame origin', () => {
      const frame = createFrame('F1', { x: 42, y: 88, width: 100, height: 100 });
      const overlay = makeOverlay();

      renderer.renderFrame(frame, makeWorldGroup(), overlay);

      const label = overlay.querySelector<HTMLElement>('.idea-graphic-frame__label')!;
      expect(label.style.left).toBe('42px');
      expect(label.style.top).toBe('88px');
    });
  });
});
