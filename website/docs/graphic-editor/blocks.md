---
sidebar_position: 3
---

# Blocks

A **graphic block** is a self-contained unit on the canvas — a shape, an arrow, a path, or a sticker. Every block kind is described by a `GraphicBlockDefinition` and registered in the `GraphicBlockRegistry`.

## `GraphicBlockDefinition`

Defined in `packages/graphic-editor/src/blocks/block-definition.ts`:

```ts
interface GraphicBlockDefinition<TData = Record<string, unknown>> {
  /** Unique kind string stored in the document. */
  type: string;

  /** i18n key for the display name shown in the left panel and property window. */
  labelKey: string;

  /** SVG icon markup rendered in the left-panel tile. */
  icon: string;

  /** Group label key for the left-panel section (e.g. 'graphic.group.shapes'). */
  groupKey: string;

  /** Returns the default element data for a newly placed block. */
  defaultData(): TData;

  /** Renders the block into the SVG world element. */
  render(element: GraphicElement, svg: SVGGElement, ctx: RenderContext): void;

  /** Returns the CSS properties used by the floating properties window. */
  properties?(element: GraphicElement): PropertyDefinition[];
}
```

Blocks declare what properties they expose; the property window renders them automatically using the registered property renderers.

## Built-in block kinds

| Type | Label key | Location |
| ---- | --------- | -------- |
| `rectangle` | `graphic.block.rectangle` | `blocks/shapes/rectangle.ts` |
| `triangle` | `graphic.block.triangle` | `blocks/shapes/triangle.ts` |
| `circle` | `graphic.block.circle` | `blocks/shapes/circle.ts` |
| `ellipse` | `graphic.block.ellipse` | `blocks/shapes/ellipse.ts` |
| `sticker` | `graphic.block.sticker` | `blocks/sticker/sticker.ts` |
| `arrow` | `graphic.block.arrow` | `blocks/arrow/arrow-block.ts` |
| `path` | `graphic.block.path` | `blocks/path/path-block.ts` |
| `custom:*` | user-defined | stored in `document.data.customBlocks` |

All shapes (rectangle, triangle, circle, ellipse) extend `BaseShape` from `blocks/shapes/base-shape.ts`, which provides shared border / fill / text rendering.

### Arrow

The arrow block has a richer data model:

```ts
interface ArrowData {
  heading: 'none' | 'stroke' | 'fill';
  direction: 'none' | 'to' | 'from' | 'both';
  type: 'line' | 'curve';
  color: string;
  thickness: number;
  label?: string;
  // Start and end points in world space
  startX: number; startY: number;
  endX: number;   endY: number;
  // Optional anchor element IDs
  startElementId?: string;
  endElementId?: string;
}
```

Arrow geometry (midpoint, control points for curves, arrowhead polygons) lives in `blocks/arrow/arrow-geometry.ts`.

### Path

The path block stores an array of world-space points and renders them as an SVG `<polyline>`. Smooth interpolation is computed by `blocks/path/smooth-points.ts`.

### Custom blocks

When you group selected elements and name them, the editor serialises a snapshot (SVG + element data) into `document.data.customBlocks`. Custom blocks appear in the left panel under the **Custom** section. See [Custom blocks](./custom-blocks.md).

## Registering a third-party block

Here is a minimal worked example of a "cloud" shape block:

```ts
import type { GraphicBlockDefinition, RenderContext, GraphicElement } from '@graphic-editor';

export const cloudBlock: GraphicBlockDefinition = {
  type: 'cloud',
  labelKey: 'myPlugin.block.cloud',     // key must exist in your i18n bundle
  groupKey: 'graphic.group.shapes',     // reuse the built-in Shapes group
  icon: '<path d="M10 …"/>',            // SVG path data only, no <svg> wrapper

  defaultData() {
    return { fill: '#ffffff', border: { color: '#000000', thickness: 1 } };
  },

  render(element, svgGroup, ctx) {
    // Clear previous render
    svgGroup.innerHTML = '';

    // Place a <path> with your cloud outline
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', buildCloudPath(element.width, element.height));
    path.setAttribute('fill', element.data.fill as string);
    svgGroup.appendChild(path);
  },

  properties(element) {
    return [
      { kind: 'fill', path: 'data.fill' },
      { kind: 'border', path: 'data.border' },
    ];
  },
};
```

Register it at runtime before the editor is mounted:

```ts
import { registerBlock } from '@graphic-editor';
registerBlock(cloudBlock);
```

Or pass a pre-built registry to `GraphicEditor.init()` via the options (see [Extensibility](./extensibility.md) for the full pattern).

## Block registry

`GraphicBlockRegistry` maps `type → GraphicBlockDefinition`. Call `registry.get(type)` inside controllers and renderers. Built-in blocks are registered by `registerDefaultBlocks()` in `blocks/index.ts`.
