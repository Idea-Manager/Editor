---
sidebar_position: 5
---

# Document model

The **document** is a JSON tree validated against a schema and versioned for migrations. Core owns the **schema**, **examples**, and **serialization** pipeline; the text editor interprets block nodes and text runs.

## Schema and examples

- **`packages/core/src/schema/document.schema.json`** — JSON Schema for persisted documents.
- **`packages/core/src/schema/examples/`** — sample documents (`text-only.json`, `mixed.json`, `graphic-only.json`, etc.) useful for tests and tooling.

## Serialization

- **`serializer.ts`** / **`deserializer.ts`** — convert between runtime model and JSON.
- **`validator.ts`** — validate payloads against the schema.
- **`migrations.ts`** — **`migrateDocument`** upgrades `schemaVersion` stepwise. **`LATEST_SCHEMA_VERSION`** marks the current version; each step is a pure function on the JSON object (for example list item `ordered` → `listType`).

When adding fields or renaming properties, bump the schema version and add a migration so old files still load.

## Model interfaces

TypeScript types for nodes (document root, blocks, text runs, marks) live under `packages/core/src/model/`. The text editor’s **block registry** maps block `type` strings to behavior and rendering.

## Graphic content

Example JSON for graphic-heavy documents exists under `schema/examples/` even though the **graphic editor package** is not in the repo yet. The same document envelope is intended to hold both prose blocks and graphic subtrees once that surface ships. See [Graphic editor roadmap](../graphic-editor/roadmap.md).

## See also

- [Operation log](./operation-log.md) — how edits surface as `OperationRecord`s
- [Architecture](../getting-started/architecture.md) — package layout
