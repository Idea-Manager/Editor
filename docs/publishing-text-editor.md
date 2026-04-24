# Publishing `@text-editor` (when split from the monorepo)

The IdeaEditor repo is currently a **single private workspace** with path aliases (`@text-editor/*`, `@core/*`, etc.). The text editor is not yet published as its own npm package. When you extract or publish it, use this checklist.

## `package.json`

- **`name`**: e.g. `@your-scope/text-editor` (avoid claiming `idea-editor` on npm if unused).
- **`exports`**: map subpaths for `import '@text-editor/foo'` the same way [tsconfig paths](../tsconfig.json) does today, plus `"types"` / `typesVersions` for TypeScript.
- **`peerDependencies`**: at minimum document **`typescript`** if consumers compile against your types; add **`@core/...`** if you publish core separately, or **bundle** types with a clear note.
- **`license`**: point to the repo [LICENSE](../LICENSE) file (e.g. `"MIT"` + `LICENSE` in package root).
- **Files**: set `"files"`: `["src", "dist", "README.md", "LICENSE"]` (or built output only) so publishes stay small.

## API stability

- Follow the [CHANGELOG](../CHANGELOG.md) semver notes for `TextEditorOptions` and the document model.
- Treat **`clipboard`** options and anything marked **@experimental** in JSDoc as subject to change until promoted.

## CI

- Run **`npm run check:text-editor-imports`** (and `npm test`) so `packages/text-editor` never reintroduces imports from the app `src/` tree.
