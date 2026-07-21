---
sidebar_position: 3
---

# API reference

Public SDK surface exported from `dist/index.d.ts` (source: [src/sdk/public-api.d.ts](https://github.com/Idea-Manager/Editor/blob/master/src/sdk/public-api.d.ts)). For a step-by-step embed guide, see [Build and embed](./build-and-embed.md).

:::info[Development status]

This reference tracks the current **`0.0.x`** SDK. Fields and defaults may change before the first stable major release.

- **`mode: 'text'`** — recommended for embeds today.
- **`mode: 'graphic'`, `mode: 'both'`, and `config.graphic`** — graphic editor is **not production-ready**; options and behavior are subject to change while development continues.
:::

## `createIdeaEditor`

```ts
function createIdeaEditor(options: IdeaEditorCreateOptions): IdeaEditorInstance
```

Creates and mounts the editor shell into `options.container`. Injects bundled CSS into `document.head` on first use.

---

## `IdeaEditorCreateOptions`

Top-level arguments passed to `createIdeaEditor`.

| Field | Type | Default | Values / constraints | Description |
| ----- | ---- | ------- | -------------------- | ----------- |
| `mode` | `IdeaEditorMode` | — (required) | `'text'` \| `'graphic'` \| `'both'` \| `'read-only'` | Which editor(s) to mount and whether editing is allowed. `'read-only'` disables editing, toolbars, and import/export regardless of chrome settings. |
| `container` | `string` \| `HTMLElement` | — (required) | CSS selector or DOM element | Mount target. The shell is appended as a child of this element. |
| `view` | `IdeaEditorView` | `'full'` | `'full'` \| `'inline'` | Shell presentation. `'full'` = workspace with optional top bar and status bar. `'inline'` = compact bordered box. |
| `config` | `IdeaEditorConfig` | `{}` | See below | Runtime configuration: document, locale, editor options, callbacks. |

### `IdeaEditorMode`

| Value | Description |
| ----- | ----------- |
| `'text'` | Mount text editor only. **Recommended for production embeds** during active development. |
| `'graphic'` | Mount graphic editor only. **Not production-ready** — preview and testing only. |
| `'both'` | Mount both; user can switch via mode switcher when chrome allows. **Not production-ready** — graphic surface is unstable. |
| `'read-only'` | Mount both surfaces in view-only mode; `config.text.readOnly` and `config.graphic.readOnly` are forced on. |

### `IdeaEditorView`

| Value | Description |
| ----- | ----------- |
| `'full'` | Default workspace layout. Chrome defaults favor visible top bar, status bar, and mode switcher (when applicable). |
| `'inline'` | Compact embed layout. Chrome defaults hide top bar, mode switcher, import/export, and undo/redo. Status bar shown only when `config.statusBar` or `config.chrome.showStatusBar` is true. |

---

## `IdeaEditorConfig`

| Field | Type | Default | Values / constraints | Description |
| ----- | ---- | ------- | -------------------- | ----------- |
| `document` | `DocumentNode` | New empty document | Valid document JSON | Initial document. When omitted, `createDocument()` is used. |
| `locale` | `Locale` | `'en'` | `'en'` \| `'uk'` | Default UI locale for shell and editors (unless overridden per editor). |
| `i18nOverrides` | `Partial<TranslationDictionary>` | — | Key → string map | Merged into the active locale dictionary for shell and editors. |
| `text` | `TextEditorOptions` | — | See [TextEditorOptions](#texteditoroptions) | Options passed to the text editor `init()`. |
| `graphic` | `GraphicEditorOptions` | — | See [GraphicEditorOptions](#graphiceditoroptions) | Options passed to the graphic editor `init()`. |
| `chrome` | `IdeaEditorChromeConfig` | Resolved per view/mode | See [IdeaEditorChromeConfig](#ideaeditorchromeconfig) | Toggle top bar, status bar, mode switcher, import/export, undo/redo. |
| `statusBar` | `boolean` | `false` in inline; ignored in full | `true` \| `false` | Shorthand for inline view status bar. Equivalent to `chrome.showStatusBar` when set. |
| `shortcuts` | `{ enabled?: boolean; entries?: ShortcutEntry[] }` | `{ enabled: true }` | — | Global shortcut manager. When `enabled: false`, command palette and default shortcuts are not registered. |
| `onReady` | `(instance: IdeaEditorInstance) => void` | — | — | Called after the editor is mounted and initial mode is set. |
| `onChange` | `(doc: DocumentNode) => void` | — | — | Called on `doc:change` events. |
| `onModeChange` | `(mode: ActiveMode) => void` | — | `'text'` \| `'graphic'` | Called when the user or API switches between text and graphic mode. |
| `extensions` | `Record<string, unknown>` | — | — | Reserved for future plugin extensions. |

---

## `IdeaEditorChromeConfig`

Boolean flags for shell UI. Unset fields use **resolved defaults** from `view`, `mode`, and `readOnly` (see [src/sdk/create-idea-editor.ts](https://github.com/Idea-Manager/Editor/blob/master/src/sdk/create-idea-editor.ts)).

### Full view defaults (`view: 'full'`)

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `showTopBar` | `boolean` | `true` | Document title bar with actions. |
| `showStatusBar` | `boolean` | `true` | Character and block count footer. |
| `showModeSwitcher` | `boolean` | `true` when `mode: 'both'`, else `false` | Text / Graphic toggle in the top bar. |
| `showImportExport` | `boolean` | `true` unless `mode: 'read-only'` | JSON import, export, copy, preview buttons. |
| `showUndoRedo` | `boolean` | `true` unless `mode: 'read-only'` | Undo and redo buttons in the top bar. |

### Inline view defaults (`view: 'inline'`)

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `showTopBar` | `boolean` | `false` | Hidden unless explicitly enabled. |
| `showStatusBar` | `boolean` | `config.statusBar ?? false` | Footer; enable via `statusBar: true` or `chrome.showStatusBar: true`. |
| `showModeSwitcher` | `boolean` | `false` | Hidden in inline view by default. |
| `showImportExport` | `boolean` | `false` | Hidden in inline view by default. |
| `showUndoRedo` | `boolean` | `false` | Hidden in inline view by default. |

---

## `IdeaEditorInstance`

Handle returned by `createIdeaEditor`.

| Member | Type | Description |
| ------ | ---- | ----------- |
| `destroy()` | `() => void` | Unmount the shell, remove listeners, and detach the root element from the DOM. |
| `getDocument()` | `() => DocumentNode` | Return the current document root. |
| `setDocument(doc)` | `(doc: DocumentNode) => void` | Replace the document in both editors; clears undo/redo and resets selection. |
| `getMode()` | `() => ActiveMode` | Current active mode: `'text'` or `'graphic'`. |
| `setMode(mode)` | `(mode: ActiveMode) => void` | Switch mode when `mode: 'both'`. No-op for single-mode shells. |
| `getEventBus()` | `() => EventBus` | Shared event bus for document, history, and mode events. |
| `exportJSON()` | `() => void` | Open the JSON export flow (when chrome allows). |
| `importJSON()` | `() => void` | Open the JSON import flow (when chrome allows). |
| `getElement()` | `() => HTMLElement` | Root `.app-shell` DOM element. |

### `ActiveMode`

`'text' | 'graphic'` — which editor surface is visible when both are mounted.

### `EventBus`

| Method | Description |
| ------ | ----------- |
| `on(event, handler)` | Subscribe; returns an unsubscribe function. |
| `emit(event, payload?)` | Emit an event. |
| `off(event, handler)` | Remove a handler. |
| `removeAllListeners(event?)` | Clear handlers. |

Common events: `doc:change`, `history:undo`, `history:redo`, `mode:change`, `selection:change`. See [Events](../concepts/events.md).

---

## Shared types

### `Locale`

`'en' | 'uk'` — supported UI locales.

### `TranslationDictionary`

`Record<string, string>` — i18n key to translated string.

### `DocumentNode`

Root document object. Shape includes `id`, `type: 'document'`, `children` (text blocks), `graphicPages`, optional `meta` and `data`. See [Document model](../concepts/document-model.md).

### `ShortcutEntry`

| Field | Type | Default | Values | Description |
| ----- | ---- | ------- | ------ | ----------- |
| `keys` | `string` | — (required) | Chord string, e.g. `'mod+k'`, `'mod+s'` | Key combination. |
| `scope` | `string` | — (required) | `'global'` \| `'text'` \| `'graphic'` | When the shortcut is active. |
| `label` | `string` | — (required) | — | Human-readable label (e.g. command palette). |
| `command` | `() => void` | — (required) | — | Action to run. |
| `when` | `(event: KeyboardEvent) => boolean` | — | — | Optional guard; return false to skip. |

---

## `TextEditorOptions`

Passed as `config.text`. Used by `<idea-text-editor>` `init()`.

| Field | Type | Default | Values / constraints | Description |
| ----- | ---- | ------- | -------------------- | ----------- |
| `locale` | `Locale` | `'en'` | `'en'` \| `'uk'` | Text editor UI locale. Falls back to `config.locale` from the shell when omitted. |
| `i18nOverrides` | `Partial<TranslationDictionary>` | — | Key → string | Merged into the active locale after base dictionary. Use namespaced keys for extensions. |
| `blocks` | `AnyBlockDefinition[]` | — | Block definition objects | Custom blocks registered after built-ins (unless `includeDefaultBlocks: false`). Last registration wins on type collision. |
| `includeDefaultBlocks` | `boolean` | `true` | `true` \| `false` | When `false`, only `blocks` are registered. |
| `includeDefaultStyles` | `boolean` | `true` | `true` \| `false` | When `true`, inject bundled CSS into `#idea-editor-styles` in `document.head` on first `init`. When `false`, host must supply styles. |
| `extraStyleText` | `string` | — | CSS string | Appended as `<style class="idea-editor-extra-style">` on each editor host. Per-instance theming. |
| `toolbars` | `TextEditorToolbarsOptions` | — | See below | Toolbar and palette customization. |
| `clipboard` | `TextEditorClipboardOptions` | — | See below | **@experimental** paste hooks. |
| `readOnly` | `boolean` | `false` | `true` \| `false` | View-only: no editing, toolbars, or clipboard handling. Forced when `mode: 'read-only'`. |

Deep dives: [Toolbars](../text-editor/toolbars.md), [Custom blocks](../text-editor/custom-blocks.md), [i18n](../text-editor/i18n.md), [Theming](../text-editor/theming.md), [Clipboard](../text-editor/clipboard.md).

### `TextEditorToolbarsOptions`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `slashPalette` | `SlashPaletteOptions` | — | Slash command palette config. |
| `slashPaletteFactory` | `SlashPaletteFactory` | — | Replace the default slash palette implementation. |
| `floatingToolbar` | `Partial<FloatingToolbarConfig>` | All sections on | Floating selection toolbar config. |
| `floatingToolbarFactory` | `FloatingToolbarFactory` | — | Replace the default floating toolbar. |
| `blockGutter` | `BlockGutterConfig` | All buttons on | Block gutter (add, drag, delete) config. |
| `blockGutterFactory` | `BlockGutterFactory` | — | Replace the default block gutter. |
| `tableContextMenu` | `TableContextMenuConfig` | All sections on | Table right-click menu config. |
| `tableContextMenuFactory` | `TableContextMenuFactory` | — | Replace the default table context menu. |
| `linkHover` | `LinkHoverOptions` | Enabled | Link hover popover; set `disabled: true` to hide. |

#### `SlashPaletteOptions`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `excludeTypes` | `BlockType[]` | — | Block types hidden from the palette. |
| `filterItems` | `(items: PaletteItem[]) => PaletteItem[]` | — | Post-filter palette entries. |
| `maxHeightPx` | `number` | — | Max height of the palette overlay. |

#### `FloatingToolbarConfig`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `sections.marks` | `boolean` | `true` | Bold, italic, underline toggles. |
| `sections.color` | `boolean` | `true` | Text color picker. |
| `sections.link` | `boolean` | `true` | Link URL control. |
| `sections.align` | `boolean` | `true` | Alignment buttons. |
| `sections.blockConvert` | `boolean` | `true` | Block type dropdown. |
| `convertibleBlockTypes` | `BlockType[]` | `['paragraph', 'heading', 'list_item']` | Types available in the convert dropdown. |
| `extraButtons` | `FloatingToolbarExtraButton[]` | `[]` | Custom toolbar buttons. |

Each `FloatingToolbarExtraButton`:

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | `string` | Unique button id. |
| `icon` | `string` | Material Symbols icon name. |
| `titleKey` | `string` | i18n key for tooltip. |
| `isActive?` | `(ctx: EditorContext) => boolean` | Active state for toggle styling. |
| `onClick` | `(ctx: EditorContext) => void` | Click handler. |

#### `BlockGutterConfig`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `showAddButton` | `boolean` | `true` | Block insert button. |
| `showDragHandle` | `boolean` | `true` | Drag-to-reorder handle. |
| `showDeleteButton` | `boolean` | `true` | Delete block button. |
| `confirmRemoveMessageKey` | `string` | `'gutter.confirmRemoveMessage'` | i18n key for delete confirmation modal. |

#### `TableContextMenuConfig`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `showRowOperations` | `boolean` | `true` | Insert/delete row actions. |
| `showColumnOperations` | `boolean` | `true` | Insert/delete column actions. |
| `showMergeCells` | `boolean` | `true` | Merge/split cell actions. |
| `showCellBorders` | `boolean` | `true` | Cell border controls. |
| `showCellBackground` | `boolean` | `true` | Cell background color. |

#### `LinkHoverOptions`

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `disabled` | `boolean` | `false` | When `true`, no link hover UI is created. |
| `factory` | `(ctx: EditorContext) => { destroy(): void }` | — | Custom link hover implementation. |

### `TextEditorClipboardOptions` (@experimental)

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `transformPaste` | `(ctx, e: ClipboardEvent) => BlockNode[] \| null` | — | Return blocks to replace default paste parsing; return `null` or `[]` to use built-in pipeline. |
| `pasteDataSources` | `readonly PasteDataSource[]` | `['idea-editor', 'text/html', 'text/plain']` | Order of clipboard MIME sources to try. |

#### `PasteDataSource`

| Value | Description |
| ----- | ----------- |
| `'idea-editor'` | Internal JSON clipboard payload. |
| `'text/html'` | Rich HTML from the clipboard. |
| `'text/plain'` | Plain text. |

---

## `GraphicEditorOptions`

:::warning[Not production-ready]

The graphic editor is in **active development**. Options, tools, and UI described here and in the [Graphic editor](../graphic-editor/overview.md) docs **change frequently** and may not match the current build. Do not ship `mode: 'graphic'` or `mode: 'both'` to end users until a stable major version is released.
:::

Passed as `config.graphic`. Used by `<idea-graphic-editor>` `init()`.

| Field | Type | Default | Values / constraints | Description |
| ----- | ---- | ------- | -------------------- | ----------- |
| `locale` | `Locale` | `'en'` | `'en'` \| `'uk'` | Graphic editor UI locale. Falls back to `config.locale` when omitted. |
| `pageId` | `string` | First page or new "Untitled" | Graphic page id | Active page on init. |
| `includeDefaultStyles` | `boolean` | `true` | `true` \| `false` | Inject bundled CSS into `#idea-graphic-editor-styles` on first init. |
| `extraStyleText` | `string` | — | CSS string | Per-host extra styles. |
| `i18nOverrides` | `Partial<TranslationDictionary>` | — | Key → string | Locale string overrides. |
| `skipDefaultBlocks` | `boolean` | `false` | `true` \| `false` | When `true`, built-in shapes (rectangle, triangle, circle, sticker) are not registered. |
| `blocks` | `GraphicBlockDefinition[]` | — | Block defs | Custom graphic blocks added after defaults. |
| `leftPanel` | `LeftPanelOptions` | — | See below | Left panel block library options. |
| `readOnly` | `boolean` | `false` | `true` \| `false` | View-only: pan and zoom allowed; editing tools disabled. Forced when `mode: 'read-only'`. |

See [Graphic editor overview](../graphic-editor/overview.md), [Blocks](../graphic-editor/blocks.md), [Custom blocks](../graphic-editor/custom-blocks.md).

### `LeftPanelOptions`

| Field | Type | Default | Values / constraints | Description |
| ----- | ---- | ------- | -------------------- | ----------- |
| `initiallyExpandedGroups` | `string[]` | First group key | Group keys | Accordions that start expanded. |
| `hiddenGroups` | `string[]` | — | Group keys | Groups not rendered in the panel. |
| `defaultPanelWidth` | `number` | `280` | `250`–`400` | Initial panel width in pixels. |
| `defaultViewMode` | `LeftPanelViewMode` | `'tiles'` | `'tiles'` \| `'list'` | Block tile presentation mode. |

---

## Default export

```ts
import IdeaEditor from 'idea-editor';
IdeaEditor.create({ ... });
```

Equivalent to named export `createIdeaEditor`.
