> Status: ✅ Shipped. See `website/docs/graphic-editor/` for the live docs.
> This document is preserved as the original specification.

# Graphic editor roadmap #

I want a graphical editor which combines features from AFFiNE and draw.io.

## Components: ##
- Accordion. This should be a classic accordion component with title, smooth animation and collapsible content. For content it should take a DOM part via slot.
- Floating window. This should be a component to display properties of selected graphical block. Reuse Accordion for grouping properties.
I want that window to be draggable over main layout and resizable (min width 300px, min height depends on content, max height should be limited by main layout here you could pass selector to parent element and max width should be 1/2 of the parent element width). Don't forget to add cross icon to close the window and in bottom right corner also should be a resize icon, but it should be resizable from any border. If window in focus, then item which properties it represents should be highlighted with light blue outline (do this with callback which passes block id which should be highlighted).
- Flyout arrow toolbar. This thin toolbar should contain next buttons (icons only, except thickness, there should be a dropdown-combobox):
    1. Arrow heading. Simply allow select heading type for arrow (none, stroke, and fill).
    2. Arrow direction. Simply allow select direction for arrow (none, to, from, both).
    3. Arrow type. Dropdown with options: line, curve.
    4. Arrow color. Use color picker.
    5. Arrow thickness. Use dropdown-combobox with input and predefined sizes like 1px, 2px, 3px, 4px, 5px, 6px, 7px, 8px | set min to 1px and max to 8px.
    from 1 to 3 should be dropdown with icons, current value should be setted to the certain position in flyout arrow toolbar.
    for 5th point I'd like to see dropdown-combobox with current value in the flyout arrow toolbar.

## Main layout: ##
- Left pannel:
Scrollable layout with accordions which grouping graphical blocks. Each group is a separete accordion with blocks inside. First in the list should be opened by default, others - close. But it should be configurable for future. To the bottom of the pannel should be sticked accordion with name "Custom" (if there at least one block), there will be all blocks without groups and custom blocks which created from groups.

- Main content area:
This area should be a canvas with a lot of graphical blocks. Background for the main content area should be look like in the screenshot and be scalable, that's one more feature of main content area - it should be scalable (zoom in/out). 

- Bottom pannel (all buttons should be icons):
It should always be visible in the bottom of the main content area in the center and contains next tools:
    1. Selection tool (cursor). Simply select block(s) by click on them, or drag selection area.
    2. Frame tool. This should create a block frame. (details below)
    3. Arrow tool. Reuse flyout arrow toolbar on click. It should define preferences for all arrows which customer create. By default (stroke, curve, 2px, gray).
    4. Pen (pencil). This tool should allow to draw lines and shapes on the canvas.
    5. Stickers tool. This tool simply create sticker block on the canvas with text input inside (default bg is yellow some kind of pastel color and text color is black). Text size should adjust to the sticker block size, but set 14pt as minimal + don't forget about text wrapping and alignment, text should start from the center of the sticker block, grow wider till sticker boundaries (don't forget about padding inside sticker block) and after grow in height till fit the whole content (no limits, text could overflow the sticker block and should be visible outside of it). In Flyout window there should be input field which directly connected to input inside sticker block, so the value should changed in live mode in both direction, an option to pick (use color picker) for background color and text color, also select font size (dropdown-combobox with input and predefined sizes like 10pt, 12pt, 14pt, 16pt, 18pt, 20pt, 22pt, 24pt, 26pt, 28pt, 30pt | set min to 5pt and max to 80pt).

## Blocks API: ##
- (optionally) each block should have a pivot points where stick arrows, but by default arrows could be joined to any point on the block boundaries.
- (optionally) each block should have border (thickness, color) and background (color), by default border is 1px solid black and background is white.
- (optionally) block potentially could have an html template inside (for example block which represents table in SQL table) so there should be a clear way to create pivot points for html form's elements. By default there should be an input field which should behave like in the stickers tool. Don't forget to add an option to disable default input field, so the block could stand alone without any content inside. If block contains html template, this template should appear in first accordion inside floating window, then accordions with other properties.
- (optionally) block should be attached to group of blocks to create an accordion into left pannel. By default all blocks without group should attached to accordion with name "Custom" if block registered.

Also there should be some kind of storage to save block types related to last changes over that kind of block. For example if user create a new rectangle then change it's props in floating window, then create circle and then again triangle, so newly created triangle should have the same border, background and text color. If block contains html template, then no need to save fields values, only visual properties should be saved.


## Basic blocks: ##
For now let's create only one group from simple geometric shapes with input as in the stickers tool:
- Rectangle
- Triangle
- Cirle
- Ellipse
Each of this element should have border thickness, border color, background color and fill color properties + text color and font size properties.

## Behavior concepts: ##
- When user click on block in the left pannel, element should stick to the cursor and could be placed on main content area on click. On ESC key element should disappear from cursor and last selected tool should be restored or it could be last selection on main content area. After element is placed on main content area, it should be selected and properties window should be opened.
- Select block or several blocks + Delete or Backspace should remove selected block(s) from main content area.
- Corner of the bounding rectangle of the block should be a little circles to resize block. Border of the circle 1px dashed black and fill it with light blue. Radius 6px.
- From the centers of each border of bounding rectangle when hover over selected block should appear small black arrows to click on them will stick second end of the arrow to cursor to attach it to another element or simple put it on certain clicked point. 
- In the top left corner on the left hand side of the left outer rectangle border should be an icon to drag and drop element in main content area (use the same icon and size as for text editor blocks).
- Click over the form/(default input) to focus on interactable element (start typing)
- On mouse wheel zoom in/out should be performed on main content area. Also in bottom right corner there should be small pannel: [Zoom: {icon zoom-in} {icon zoom-out}]. Click on this pannel should perform zoom in/out.
- Selection tool should select block on click or select bunch of blocks by dragging selection area. Selected block(s) should be surrounded by black dashed rectangle where the origin block is fits into it. If there is one block is selected, then floating window should be opened for this block. If there are a group of blocks is selected, then floating window should be opened for the group properties. Group properties:
    1. Lock/Unlock - label + checkbox. Prevent from moving and editing content. But arrows could be create from the group element and attached to it. In group case arrows could be handled as they are in single mode, so they stick to the boundaries of each element in the group and never cross over the elements.
    2. Group/Ungroup - label + checkbox.
    3. Create new block - some short label + input (for name min 1 char) + button to create. If user create a new block, it should automatically place in left pannel in "Custom" accordion element with visual preferences, but empty form/input.

- Arrow should be selectable on click, above the selected one should appear flyout arrow toolbar to change styling of the selected arrow. Double click on arrow should appear an input element to create a label over the arrow with white background, it could cross the arrow itself. Selected arrow should be repositionalbe by draggin one it's end. In this case if arrow sticked to pivot point, drag and drop from pivot point don't create new arrow, but simply allow to drag and drop existing arrow.

