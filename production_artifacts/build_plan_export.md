# Build Plan: Export & Screen Modes

Implement split-button Export behavior in the web version and clean up Focus Mode buttons on the desktop toolbar.

## Proposed Changes

### 1. Web Split Export Button (`notepad.tsx`)

- **New Method**: `exportSmart`
  ```typescript
  const exportSmart = () => {
    if (!editor) return;
    const html = editor.getHTML() ?? "";
    const ext = getSmartSaveExtension(html);
    if (ext === "html") {
      exportHtml();
      toast.success("Automatically exported as HTML to preserve formatting");
    } else if (ext === "md") {
      exportMd();
      toast.success("Automatically exported as Markdown");
    } else {
      exportTxt();
      toast.success("Automatically exported as Plain Text");
    }
  };
  ```

- **UI Split**:
  Replace the single `<button>` for Export in the toolbar with a Flex container containing two buttons:
  - Button 1: Triggers `exportSmart()`, displaying the label "Export" and download icon.
  - Button 2: Toggles `showExportMenu`, displaying only the chevron arrow icon.

### 2. Desktop Focus Button Removal (`App.tsx`)

- **Toolbar cleanup**:
  Locate and delete the Focus Mode button component in the toolbar list (around line 4001):
  ```tsx
  {/* Focus mode */}
  <button title={getTooltip("Focus Mode", "Ctrl+Shift+\\")} ... />
  ```
  Ensure the `focusMode` state variable and keyboard handlers are kept so backing code does not break.
