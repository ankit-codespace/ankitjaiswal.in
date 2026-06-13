# Notepad Tool Web Analysis

This document provides a comprehensive analysis of the existing web-based Notepad tool, detailing its features, web APIs used, files, and their native Windows/Node.js/Electron equivalents for migration.

## File Paths

- Primary Component: [notepad.tsx](file:///c:/Users/LENOVO-PC/Documents/Preview-Maker/Preview-Maker/ankitjaiswal.in/artifacts/website/src/pages/tools/notepad.tsx)
- CSS and Themes: Shared styles are in [ToolStyles.tsx](file:///c:/Users/LENOVO-PC/Documents/Preview-Maker/Preview-Maker/ankitjaiswal.in/artifacts/website/src/components/tool/ToolStyles.tsx) and Tailwind/vanilla CSS variables in the project.

## Core Features

1. **Rich Text Editor (TipTap Engine)**:
   - Supports bold, italic, underline, strikethrough, highlights, code blocks (with a copy button), lists, tables, text alignment, horizontal rules, custom text colors.
   - Text selection-based floating styling menu.
   - Live character/word counts.

2. **File Management**:
   - Multiple documents support: add, rename, pin/unpin, and delete.
   - Two-stage delete with undo behavior (Ctrl+Z or undo toast).
   - Local autosave on every keystroke.

3. **Find & Replace**:
   - Integrated floating find/replace panel (Ctrl+F for find, Ctrl+H for find/replace).
   - Live decoration highlighting of search matches.

4. **Export Formats**:
   - Plain Text (`.txt`): Raw text export.
   - Markdown (`.md`): Structured Markdown, including tables and simplified images.
   - PDF (`.pdf`): Custom HTML template printed to PDF using browser print engine (`window.print()`).
   - HTML (`.html`): Self-contained styled HTML file.

5. **Aesthetics & Themes**:
   - Multiple built-in color themes: Slate (default dark), Paper (default light), Midnight (true dark), Sepia, Mist (neutral light).
   - Spellcheck toggle.
   - Focus mode: Fullscreen with non-active paragraphs faded out.
   - Responsive, elegant writing panel.

## Web APIs & Desktop Equivalents

| Web API / Feature | Usage in Notepad | Windows / Electron / Node.js Equivalent |
|:---|:---|:---|
| **`localStorage`** | Document persistence (`notepad_docs_v2`), active ID (`notepad_active_v2`), and settings (`notepad_settings_v1`). | Node.js `fs` module writing local JSON files (e.g. `userdata/documents.json`, `userdata/settings.json`) or `electron-store`. |
| **Blob + `URL.createObjectURL`** | Triggering downloads for `.txt`, `.md`, and `.html` exports in `dl()` function. | Direct saving to local disk via `fs.writeFileSync` or Electron's `dialog.showSaveDialog` + IPC. |
| **`window.open` + `window.print`** | PDF generation by writing to a new print window and invoking browser print. | Electron's `webContents.printToPDF()` or opening a native Print dialog via Electron's print options. |
| **`FileReader` + Input Elements** | Reading images and files pasted or dropped into the editor. | Direct path loading using Node.js or `file://` protocols, or Electron's native IPC dialogs for local file paths. |
| **Fullscreen API** | `requestFullscreen` and `exitFullscreen` for Focus Mode. | Electron `BrowserWindow.setFullScreen(true / false)`. |
| **`window.matchMedia`** | OS theme preference detection. | Electron `nativeTheme.shouldUseDarkColors` or IPC query. |
| **Google Drive Integration** | Optional cloud saving script. | Stripped for pure offline-first/local-first desktop functionality. |

## Self-Audit Findings

The web notepad is highly self-contained. The rich text editor runs on TipTap, which compiles clean HTML. To turn this into a standalone desktop application, the React code can be compiled/built, or the component can be extracted into an Electron renderer process. Since we need to strip portfolio wrappers (nav/header/footer) and build a native-feeling experience, we will create a clean React + Tailwind/CSS renderer build for the desktop app, leveraging IPC handlers for Native File Operations.
