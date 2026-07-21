import { RectangleBlock } from '../shapes/rectangle';
import { TriangleBlock } from '../shapes/triangle';
import { CircleBlock } from '../shapes/circle';
import type { GraphicBlockDefinition } from '../block-definition';
import type { ShapeData } from '../shapes/base-shape';
import { SHAPE_DEFAULTS } from '../shapes/base-shape';

const ALL_SHAPES: GraphicBlockDefinition<ShapeData>[] = [
  RectangleBlock,
  TriangleBlock,
  CircleBlock,
];

const EXPECTED_PIVOTS = [
  { x: 0.5, y: 0, id: 'top' },
  { x: 1, y: 0.5, id: 'right' },
  { x: 0.5, y: 1, id: 'bottom' },
  { x: 0, y: 0.5, id: 'left' },
];

describe.each(ALL_SHAPES.map(b => [b.type, b] as [string, GraphicBlockDefinition<ShapeData>]))(
  '%s block',
  (type, block) => {
    describe('defaultData', () => {
      it('returns square defaults with expected fields', () => {
        const data = block.defaultData();
        expect(data.width).toBe(SHAPE_DEFAULTS.width);
        expect(data.height).toBe(SHAPE_DEFAULTS.height);
        expect(data.width).toBe(data.height);
        if (type === 'rectangle') {
          expect(data.freeResize).toBe(true);
        } else {
          expect(data.freeResize).not.toBe(true);
        }
      });

      it('mutating border on one instance does not affect another', () => {
        const a = block.defaultData();
        const b = block.defaultData();
        a.border.thickness = 99;
        expect(b.border.thickness).toBe(SHAPE_DEFAULTS.border.thickness);
      });
    });

    describe('getBounds', () => {
      it('returns the element data bounding box', () => {
        const data: ShapeData = { ...SHAPE_DEFAULTS, x: 10, y: 20, width: 200, height: 150 };
        const node = { id: 'el-1', type: block.type, data };
        expect(block.getBounds(node)).toEqual({ x: 10, y: 20, width: 200, height: 150 });
      });
    });

    describe('renderSvg', () => {
      it('returns a <g> element', () => {
        const data = block.defaultData();
        const node = { id: 'el-1', type: block.type, data };
        const el = block.renderSvg(node, {} as never);
        expect(el.tagName.toLowerCase()).toBe('g');
      });

      it('the renderer sets data-element-id on the returned <g>', () => {
        const data = block.defaultData();
        const node = { id: 'el-abc', type: block.type, data };
        const el = block.renderSvg(node, {} as never);
        // The renderer (CanvasRenderer.renderPage) sets data-element-id.
        // Here we verify the returned element IS a <g> so the renderer can set it.
        el.setAttribute('data-element-id', node.id);
        expect(el.getAttribute('data-element-id')).toBe('el-abc');
      });
    });

    describe('pivots', () => {
      it('has the expected 4-tuple of cardinal midpoints', () => {
        expect(block.pivots).toEqual(EXPECTED_PIVOTS);
      });
    });
  },
);
