import type { DocumentNode } from '@core/model/interfaces';
import { getCustomBlocks } from '@core/model/document-data';
import type { GraphicBlockDefinition } from './block-definition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGraphicBlockDefinition = GraphicBlockDefinition<any>;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Group key for runtime-registered custom blocks (user-created via "Create new block"). */
export const CUSTOM_BLOCK_GROUP_KEY = '__custom';

export class GraphicBlockRegistry {
  private readonly definitions = new Map<string, AnyGraphicBlockDefinition>();

  register(def: AnyGraphicBlockDefinition): void {
    this.definitions.set(def.type, def);
  }

  get(type: string): AnyGraphicBlockDefinition {
    const def = this.definitions.get(type);
    if (!def) {
      throw new Error(`GraphicBlockDefinition not found for type: "${type}"`);
    }
    return def;
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  getAll(): AnyGraphicBlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Rebuilds all `custom:*` block definitions from the document's
   * `data.customBlocks` array. Call on init and on every `doc:change` op
   * whose `path` starts with `'data.customBlocks'`.
   */
  syncCustomBlocks(doc: DocumentNode): void {
    // Remove stale custom:* entries
    for (const key of Array.from(this.definitions.keys())) {
      if (key.startsWith('custom:')) {
        this.definitions.delete(key);
      }
    }

    // Re-register from doc
    for (const cb of getCustomBlocks(doc)) {
      const { width, height } = cb.source;
      const def: AnyGraphicBlockDefinition = {
        type: `custom:${cb.id}`,
        staticLabel: cb.name,
        icon: '<rect x="5" y="5" width="14" height="14" rx="1" stroke-dasharray="3 2"/>',
        groupKey: CUSTOM_BLOCK_GROUP_KEY,

        defaultData() {
          return { x: 0, y: 0, width, height, freeResize: false };
        },

        renderSvg(node) {
          const g = document.createElementNS(SVG_NS, 'g') as SVGGElement;
          const d = node.data as { x: number; y: number; width: number; height: number };
          const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
          rect.setAttribute('x', String(d.x));
          rect.setAttribute('y', String(d.y));
          rect.setAttribute('width', String(d.width));
          rect.setAttribute('height', String(d.height));
          rect.setAttribute('fill', 'none');
          rect.setAttribute('stroke', '#888');
          rect.setAttribute('stroke-dasharray', '4 2');
          g.appendChild(rect);
          return g;
        },

        getBounds(node) {
          const d = node.data as { x: number; y: number; width: number; height: number };
          return { x: d.x, y: d.y, width: d.width, height: d.height };
        },

        properties: () => [],
      };

      this.definitions.set(def.type, def);
    }
  }

  /** Returns definitions grouped by `groupKey ?? '__ungrouped'`, preserving registration order. */
  getGroups(): Array<{ groupKey: string; definitions: AnyGraphicBlockDefinition[] }> {
    const groups = new Map<string, AnyGraphicBlockDefinition[]>();

    for (const def of this.definitions.values()) {
      const key = def.groupKey ?? '__ungrouped';
      let bucket = groups.get(key);
      if (!bucket) {
        bucket = [];
        groups.set(key, bucket);
      }
      bucket.push(def);
    }

    return Array.from(groups.entries()).map(([groupKey, defs]) => ({
      groupKey,
      definitions: defs,
    }));
  }
}
