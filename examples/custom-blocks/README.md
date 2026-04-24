# Custom blocks example

Minimal instructions and a copy-paste sketch for extending [`TextEditor`](../packages/text-editor/src/engine/text-editor.ts) with a custom `BlockDefinition`.

## Prerequisites

- Clone the repo, run **`npm install`** at the repository root.
- Run **`npm test`** to verify the workspace.
- App shell: **`npm run dev`** starts the main IdeaEditor (see [`src/main.ts`](../src/main.ts)).
- Docusaurus: **`npm run docs:dev`** in [`website/`](../website/); the full write-up is [Custom blocks](../website/docs/text-editor/custom-blocks.md) (also: [Toolbars](../website/docs/text-editor/toolbars.md), [i18n](../website/docs/text-editor/i18n.md)).

## What to do

1. Implement `BlockDefinition` (see `my-callout-snippet.ts` in this folder for a **non-compiling** sketch you can copy into your app).
2. Call **`editor.init(doc, bus, history, { blocks: [new MyCalloutBlock()], … })`**. Use **`includeDefaultBlocks: false`** if you only want your blocks.
3. Add **`i18nOverrides`** for your `labelKey` strings if they are not in the core locale files.
4. Optionally pass **`toolbars`**, **`clipboard`**, and style options—see the website docs and [CHANGELOG](../CHANGELOG.md).

## Publishing a standalone app

If you copy `packages/text-editor` into another repo, read [../docs/publishing-text-editor.md](../docs/publishing-text-editor.md) and keep **`npm run check:text-editor-imports`** in CI so the package does not depend on the host app’s `src/` tree.
