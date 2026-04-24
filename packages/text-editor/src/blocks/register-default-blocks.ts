import { BlockRegistry } from './block-registry';
import { ParagraphBlock } from './paragraph-block';
import { HeadingBlock } from './heading-block';
import { ListItemBlock } from './list-item-block';
import { TableBlock } from './table-block';
import { EmbedBlock } from './embed-block';

/** Registers built-in block definitions (paragraph, heading, list_item, table, embed). */
export function registerDefaultBlocks(registry: BlockRegistry): void {
  registry.register(new ParagraphBlock());
  registry.register(new HeadingBlock());
  registry.register(new ListItemBlock());
  registry.register(new TableBlock());
  registry.register(new EmbedBlock());
}

/** New registry with {@link registerDefaultBlocks} already applied. */
export function createDefaultBlockRegistry(): BlockRegistry {
  const registry = new BlockRegistry();
  registerDefaultBlocks(registry);
  return registry;
}
