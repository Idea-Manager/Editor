---
sidebar_position: 5
---

# Text editor: theming and styles

## Options on `TextEditorOptions`

| Option | Default | Purpose |
| ------ | -------- | -------- |
| `includeDefaultStyles` | `true` | When `false`, the package does **not** inject the bundled default CSS into a shared `<style id="idea-editor-styles">` in `document.head` on the first `init` that needs it. For full control, supply your own rules (class names are stable, e.g. `.idea-text-editor`, `.idea-block--*`). |
| `extraStyleText` | (optional) | A string of CSS that is added as a `<style class="idea-editor-extra-style">` **on the** `<idea-text-editor>` **host** when `init()` runs. Per-instance, so two editors on the same page can use different extras. The node is removed when the element is disconnected. |

`init()` is responsible for applying these options. Call `init()` soon after the custom element is connected so the editor has the expected classes as early as possible.

## Layout and scrolling

The `<idea-text-editor>` host uses class **`.idea-editor`**. It is the vertical scroll container when content exceeds the available height:

```css
.idea-editor {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}
```

**Embed hosts must define a bounded height** on the mount container (full view: e.g. `100vh` or fixed px; inline view: e.g. `200px`). Without it, the editor may grow with content instead of scrolling internally.

Caret **scroll-into-view** is handled automatically during editing (after render and on selection changes).

## SDK shell styles

When mounted via **`createIdeaEditor`**, two style injections apply:

| Style node id | Injected by | Contents |
| ------------- | ----------- | -------- |
| `#idea-editor-shell-styles` | App shell (SDK) | Top bar, status bar, app-shell layout |
| `#idea-editor-styles` | Text editor `init()` | Block editor, toolbars, tables |

Both are created once per page on first use. See [Build and embed](../getting-started/build-and-embed.md).

## Global default bundle (important)

Bundled editor styles are written **once** to `document.head` with id **`idea-editor-styles`**. The **first** `TextEditor` instance whose `init()` runs while that node is still missing, and for which `includeDefaultStyles` is not `false`, will populate it. A later `init` with different `includeDefaultStyles` will **not** replace an existing node (by design, to avoid repainting the whole app). In practice, avoid two editors on one page with conflicting `includeDefaultStyles` values unless you own the first `init` order.

`extraStyleText` is **not** subject to that limitation: each host gets its own extra `<style>`.

## CSS variables (initial list)

The following **custom properties** appear in the editor’s inline bundles (or shared color-picker styles) and are safe to override from your theme or from `extraStyleText`:

| Variable | Where | Purpose |
| -------- | ----- | -------- |
| `--idea-table-border-width` | Table cells in `text-editor.scss` | Border width for table grid lines; default `1px`. |
| `--idea-cp-hue` | Color picker (shared) | Hue channel for the linear hue gradient. |
| `--idea-cp-thumb` | Color picker | Thumb background. |
| `--idea-cp-hue-thumb` | Color picker | Hue thumb color. |
| `--idea-cp-rgb` | Color picker | RGB components for the saturation/lightness square (comma-separated `r, g, b` as used in `rgba(var(--idea-cp-rgb), …)`). |

This list is **not** exhaustive. Core UI may use Infima, Sass, or other tokens from the app shell; the table above is limited to `var(--…)` entries inside the text-editor and linked shared SCSS that ship with the editor’s style injection.

### Example: themed table border

```css
idea-text-editor {
  --idea-table-border-width: 2px;
}
```

## Shadow DOM

The editor is implemented in the **light DOM** today. Adopting Shadow DOM for isolation would be a large, separate effort; there is no API for that in the current package.
