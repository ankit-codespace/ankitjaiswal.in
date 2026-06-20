# Phase 2 Audit: Toolbar & Editing Overlay CSS
Status: COMPLETE

## Changes
- Declared state `[textStyle, setTextStyle]` inside `PasteToImage` component.
- Implemented Toolbar Text Style pill group next to the font size stepper.
- Hardened the `style` properties on the absolute overlay contentEditable input box to match caret color, background colors, padding, text-shadow, and margins.
- Updated `commitTextAnnotation()` to assign the active `textStyle` onto the new annotation instance.
