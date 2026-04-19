export const LATEST_SCHEMA_VERSION = 3;

type MigrationFn = (doc: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, MigrationFn> = {
  // v1 → v2: adds optional `tags` field to NodeMeta (proof-of-concept migration)
  2: (doc) => {
    const result = { ...doc, schemaVersion: 2 };
    return result;
  },

  // v2 → v3: convert list_item `ordered: boolean` to `listType: string`
  3: (doc) => {
    const result: Record<string, unknown> = { ...doc, schemaVersion: 3 };
    const children = result.children as Record<string, unknown>[] | undefined;
    if (Array.isArray(children)) {
      result.children = children.map(block => {
        if (block.type !== 'list_item') return block;
        const data = block.data as Record<string, unknown>;
        if (data.listType) return block;
        const ordered = data.ordered === true;
        const { ordered: _, ...rest } = data;
        return {
          ...block,
          data: { ...rest, listType: ordered ? 'ordered' : 'unordered' },
        };
      });
    }
    return result;
  },
};

export function migrateDocument(doc: unknown): unknown {
  if (typeof doc !== 'object' || doc === null) {
    throw new Error('Invalid document: expected an object');
  }

  const record = doc as Record<string, unknown>;
  let currentVersion = record.schemaVersion as number;

  if (typeof currentVersion !== 'number' || currentVersion < 1) {
    throw new Error(`Invalid schemaVersion: ${currentVersion}`);
  }

  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `Document schemaVersion ${currentVersion} is newer than supported ${LATEST_SCHEMA_VERSION}`,
    );
  }

  let result = { ...record };

  while (currentVersion < LATEST_SCHEMA_VERSION) {
    const nextVersion = currentVersion + 1;
    const migrate = migrations[nextVersion];
    if (!migrate) {
      throw new Error(`Missing migration from v${currentVersion} to v${nextVersion}`);
    }
    result = migrate(result);
    currentVersion = nextVersion;
  }

  return result;
}
