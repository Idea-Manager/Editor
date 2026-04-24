# Changelog

## Unreleased

### @text-editor

- **`TextEditorOptions`**: optional `blocks` and `includeDefaultBlocks` for registering custom `BlockDefinition`s in `init()`.
- **`TextEditorOptions.toolbars`**: nested config and optional factories for slash palette, floating toolbar, block gutter, table context menu, and link hover (`linkHover.disabled` / `factory`).
- **`TextEditorOptions` (i18n / styles)**: `i18nOverrides`, `includeDefaultStyles`, `extraStyleText`; `I18nService` in core supports `mergeDictionaries` and optional locale overrides.
- **`TextEditorOptions.clipboard` (experimental)**: `transformPaste` and `pasteDataSources` for paste policy; `TextEditorClipboardOptions`, `DEFAULT_PASTE_DATA_SOURCES` exported.
- **Icons / packaging (Phase E)**: `createIcon` lives in `packages/text-editor/src/icons/create-icon.ts` and is re-exported from `@text-editor`. The `packages/text-editor` tree must not import from the repo root app (`src/`). The demo app re-exports the same helper from `src/util/icon` for existing shell imports.
- **Exports**: toolbar types and helpers (`mergeFloatingToolbarConfig`, `resolveBlockGutterConfig`, `resolveTableContextMenuConfig`, `SlashPaletteLike`, `FloatingToolbarLike`, etc.); `registerDefaultBlocks`, `createDefaultBlockRegistry`, `AnyBlockDefinition`; `createIcon`; clipboard types above.

### Semver (extension API)

- Options on `TextEditor` (`blocks`, `toolbars`, `i18nOverrides`, `clipboard`, style flags) are intended to **stabilize** after review; mark breaking changes in this file.
- A **major** version bump is appropriate if the **document model** or **core schema/validation** changes incompatibly (for example if `BlockNode` or `document.schema.json` regresses in ways that reject previously valid JSON).

### Tooling

- **Jest**: map `*.scss?inline` and `@shared/**/*.scss?inline` so `TextEditor` can be loaded in tests.
- **Import guard**: `npm run check:text-editor-imports` fails if `packages/text-editor` imports the repo `src/` app tree. See [docs/publishing-text-editor.md](docs/publishing-text-editor.md) for a future npm split.
- **Example**: [examples/custom-blocks](examples/custom-blocks) links full docs and a copy-paste `BlockDefinition` sketch.

### @core (breaking)

- **`BlockNode.type`** is now `string` instead of the `BlockType` union so documents can carry custom block kinds. Use the `BlockType` type where you need to narrow to built-in kinds (toolbars, palette filters, etc.).
- **`document.schema.json`**: `blockNode.properties.type` no longer uses a closed `enum`; any non-empty string is accepted. Validate untrusted documents with an allowlist if you require only known block types.
