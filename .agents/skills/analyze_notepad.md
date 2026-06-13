# Skill: Analyze Notepad Tool

## Objective
Fully understand the existing web Notepad tool before writing a single line of Windows code.

## Steps

1. Search the entire project directory recursively for files related to the Notepad tool.
   Look for keywords: notepad, editor, textarea, save, txt, download, open-file
   Look in: HTML files, JS files, CSS files, component files

2. Read every relevant file completely. Do not skim.

3. Document every feature the Notepad tool has:
   - Core text editing functionality
   - Save behavior (how does it currently save? Blob download? localStorage?)
   - Load/open behavior (does it open existing files?)
   - Keyboard shortcuts (Ctrl+S, Ctrl+O, etc.)
   - Toolbar buttons and what each does
   - Font or formatting options
   - Word count, line count, or any status bar features
   - Dark/light mode toggle if present
   - Any other special features

4. List every web API being used and its Windows/Node.js equivalent:
   - Blob + URL.createObjectURL => fs.writeFile
   - FileReader API => fs.readFile
   - localStorage => electron-store or direct fs
   - window.confirm / window.alert => Electron dialog module

5. Note the exact file paths of all Notepad-related files.

6. Write the full analysis to: production_artifacts/notepad_analysis.md

7. Self-audit: Re-read your analysis. Is anything missing? Did you miss any file? Confirm completeness before marking this skill done.
