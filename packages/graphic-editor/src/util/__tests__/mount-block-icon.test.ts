import { mountBlockIcon } from '../mount-block-icon';

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeTarget(): HTMLSpanElement {
  return document.createElement('span');
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountBlockIcon', () => {
  describe('string icons', () => {
    it('wraps a fragment in a default svg shell', () => {
      const target = makeTarget();
      mountBlockIcon('<rect x="4" y="4" width="16" height="16"/>', target);

      const svg = target.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg?.getAttribute('stroke')).toBe('currentColor');
      expect(target.querySelector('rect')).not.toBeNull();
    });

    it('uses a full svg string as-is', () => {
      const target = makeTarget();
      const markup =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></svg>';
      mountBlockIcon(markup, target);

      const svg = target.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 32 32');
      expect(target.querySelector('circle')).not.toBeNull();
    });

    it('leaves the target empty for invalid svg strings', () => {
      const target = makeTarget();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mountBlockIcon('<rect x="1"', target);

      expect(target.querySelector('svg')).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('SVGElement icons', () => {
    it('clones an SVGSVGElement without removing the original', () => {
      const target = makeTarget();
      const original = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
      original.setAttribute('viewBox', '0 0 10 10');
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '5');
      circle.setAttribute('cy', '5');
      circle.setAttribute('r', '3');
      original.appendChild(circle);

      mountBlockIcon(original, target);

      expect(original.parentNode).toBeNull();
      expect(original.querySelector('circle')).not.toBeNull();
      expect(target.querySelector('svg circle')).not.toBeNull();
      expect(target.firstChild).not.toBe(original);
    });

    it('wraps an inner SVGElement in the default svg shell', () => {
      const target = makeTarget();
      const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
      rect.setAttribute('x', '2');
      rect.setAttribute('y', '2');
      rect.setAttribute('width', '8');
      rect.setAttribute('height', '8');

      mountBlockIcon(rect, target);

      const svg = target.querySelector('svg');
      expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(target.querySelector('rect')).not.toBeNull();
      expect(rect.parentNode).toBeNull();
    });

    it('can mount the same SVGElement into two targets', () => {
      const targetA = makeTarget();
      const targetB = makeTarget();
      const original = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
      original.appendChild(document.createElementNS(SVG_NS, 'path'));

      mountBlockIcon(original, targetA);
      mountBlockIcon(original, targetB);

      expect(targetA.querySelector('svg path')).not.toBeNull();
      expect(targetB.querySelector('svg path')).not.toBeNull();
    });
  });

  it('clears previous content before mounting', () => {
    const target = makeTarget();
    target.textContent = 'old';

    mountBlockIcon('<circle cx="12" cy="12" r="7"/>', target);

    expect(target.textContent).not.toBe('old');
    expect(target.querySelector('circle')).not.toBeNull();
  });
});
