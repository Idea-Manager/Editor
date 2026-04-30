import type { GraphicBlockRegistry } from './block-registry';
import { RectangleBlock } from './shapes/rectangle';
import { TriangleBlock } from './shapes/triangle';
import { CircleBlock } from './shapes/circle';
import { EllipseBlock } from './shapes/ellipse';
import { StickerBlock } from './sticker/sticker';
import { PathBlock } from './path/path-block';
import { ArrowBlock } from './arrow/arrow-block';

export function registerDefaultBlocks(registry: GraphicBlockRegistry): void {
  registry.register({ ...RectangleBlock, groupKey: 'shapes' });
  registry.register({ ...TriangleBlock, groupKey: 'shapes' });
  registry.register({ ...CircleBlock, groupKey: 'shapes' });
  registry.register({ ...EllipseBlock, groupKey: 'shapes' });
  // Sticker has no groupKey on purpose — it belongs to the bottom-toolbar
  // Stickers tool (prompt 08), not the left-panel Shapes accordion.
  registry.register({ ...StickerBlock });
  // Path has no groupKey — created exclusively via the Pen tool, not the left panel.
  registry.register({ ...PathBlock });
  // Arrow has no groupKey — created via the Arrow tool, not the left panel.
  registry.register({ ...ArrowBlock });
}
