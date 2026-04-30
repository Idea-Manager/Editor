---
sidebar_position: 7
---

# Keyboard and mouse

## Keyboard shortcuts

| Key | Action |
| --- | ------ |
| `V` | Switch to **Selection** tool |
| `F` | Switch to **Frame** tool |
| `A` | Switch to **Arrow** tool |
| `P` | Switch to **Pen** tool |
| `S` | Switch to **Sticker** tool |
| `Esc` | Cancel active placement / return to Selection tool |
| `Delete` / `Backspace` | Delete selected elements |
| `Cmd Z` / `Ctrl Z` | Undo |
| `Cmd Y` / `Ctrl Y` | Redo |
| `Cmd Shift Z` / `Ctrl Shift Z` | Redo (alternative) |

## Mouse and touch interactions

| Gesture | Effect |
| ------- | ------ |
| **Click** an element | Select it |
| **Click** empty canvas | Deselect all |
| **Drag** an element | Move it (`DragController`) |
| **Drag** a corner handle | Resize the element (`ResizeController`) |
| **Drag** empty canvas | Lasso-select (draws a rubber-band rect) |
| **Scroll wheel** | Zoom in / out centred on pointer position |
| **Middle-button drag** | Pan the canvas |
| **Space + drag** | Pan the canvas (laptop-friendly) |
| **Double-click** a text block | Enter inline text-editing mode |
| **Hover** an edge arrow handle | Highlight; click starts an arrow |
| **Drag** an edge arrow handle | Start an arrow anchored to this element |
| **Click** a block tile in left panel | Begin ghost placement |
| **Click** canvas during placement | Commit element at that position |
| `Esc` during placement | Cancel placement |

## Handle accessibility labels

Each selection handle has an `aria-label` from the i18n system:

| Handle | Key |
| ------ | --- |
| Move grip | `graphic.handle.move` |
| Top-left corner | `graphic.handle.resize-nw` |
| Top-right corner | `graphic.handle.resize-ne` |
| Bottom-right corner | `graphic.handle.resize-se` |
| Bottom-left corner | `graphic.handle.resize-sw` |
| Edge arrow triggers | `graphic.handle.start-arrow` |

## Zoom panel

The zoom panel in the bottom bar shows the current zoom percentage and provides **Zoom in** / **Zoom out** buttons. The keyboard shortcut for each is shown as their `title` attribute (drawn from `graphic.zoom.in` / `graphic.zoom.out`). Clicking the percentage label resets to 100 %.
