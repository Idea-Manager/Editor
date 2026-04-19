import type { BlockDefinition } from './block-definition';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlockDefinition = BlockDefinition<any>;

export interface PaletteItem {
  id: string;
  type: string;
  labelKey: string;
  icon: string;
  dataFactory(): Record<string, unknown>;
  matchData?: Record<string, unknown>;
}

export class BlockRegistry {
  private definitions = new Map<string, AnyBlockDefinition>();

  register(def: AnyBlockDefinition): void {
    this.definitions.set(def.type, def);
  }

  get(type: string): AnyBlockDefinition {
    const def = this.definitions.get(type);
    if (!def) {
      throw new Error(`BlockDefinition not found for type: "${type}"`);
    }
    return def;
  }

  has(type: string): boolean {
    return this.definitions.has(type);
  }

  getAll(): AnyBlockDefinition[] {
    return Array.from(this.definitions.values());
  }

  getPaletteItems(): PaletteItem[] {
    const items: PaletteItem[] = [];

    for (const def of this.definitions.values()) {
      if (def.paletteEntries) {
        for (const entry of def.paletteEntries()) {
          items.push({
            id: entry.id,
            type: def.type,
            labelKey: entry.labelKey,
            icon: entry.icon,
            dataFactory: entry.dataFactory,
            matchData: entry.matchData,
          });
        }
      } else {
        items.push({
          id: def.type,
          type: def.type,
          labelKey: def.labelKey,
          icon: def.icon,
          dataFactory: () => def.defaultData() as Record<string, unknown>,
        });
      }
    }

    return items;
  }
}
