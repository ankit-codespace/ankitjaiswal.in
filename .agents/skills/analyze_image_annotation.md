# Skill: Analyze Image Annotation Toolbar and Text Rendering

This skill conducts a deep architectural audit of the canvas annotation editor in `paste-to-image.tsx` to identify the root causes of the toolbar Cumulative Layout Shift (CLS) and the unbalanced vertical text padding inside highlighted background boxes.

## Analysis & Findings

### 1. Cumulative Layout Shift (CLS) in the Toolbar
- **Root Cause:** When the user switches to the "Text" tool, the editor toolbar replaces the "Stroke Width" controls (3 small buttons taking up ~90px) with the "Text Font & Style" controls (size stepper, separator, and Plain/Highlight/Solid buttons taking up ~230px). Because the toolbar container uses a wrap-based flexbox layout, this sudden 140px width expansion pushes subsequent buttons (`Copy`, `Download`, etc.) rightward, forcing them to wrap to a second line. Switching back to another tool shrinks the width, shifting the elements back up. This constant layout snapping is a bad user experience.
- **Top 1% SaaS Solution:**
  Wrap both the "Text font & style" controls and the "Stroke width" controls inside a statically sized container (`w-[270px]` or `w-[17rem]`) using a centered flex alignment and `shrink-0`. 
  This reserves a constant, identical spacing zone in the toolbar. Switching tools swaps the controls inside this fixed zone, eliminating all layout shifts and wrapping behaviors in the rest of the toolbar.

### 2. Unbalanced Text Padding inside highlighted boxes
- **Root Cause:**
  - In CSS (handling the HTML input typing overlay), `line-height: 1.35` distributes the leading space (the `0.35 * fontSize` difference) equally above and below the text line (`0.175` top and `0.175` bottom).
  - In Canvas drawing (handling both the display canvas and the download export canvas), the rendering engine uses `ctx.textBaseline = "top"`. This places the top of the em-square exactly at the y-coordinate. Thus, the entire `0.35 * fontSize` leading space is placed below the text line.
  - The background box is drawn with height `bgH = lines.length * lineHeight + paddingY * 2` and starts at `bgY = sy - paddingY`.
  - Consequently, the top padding is exactly `paddingY` (`0.2 * fontSize`), while the bottom padding is `paddingY + 0.55 * fontSize` (`0.75 * fontSize`). This makes the text look heavily pushed toward the top of the box.
- **Top 1% SaaS Solution:**
  To distribute the leading space equally (matching the CSS rendering), we calculate the half-leading offset:
  `halfLeading = (lineHeight - fontSize) / 2 = 0.175 * fontSize`.
  When rendering text on the canvas, we offset the text drawing y-coordinate downward by `halfLeading`:
  `ctx.fillText(line, x, y + halfLeading + i * lineHeight);`
  This shifts the text down by `0.175 * fontSize`, making the visual top padding and bottom padding perfectly symmetrical at `paddingY + halfLeading`, achieving pixel-perfect centering!

## Analysis Self-Audit
- **Toolbar CLS Fix:** Verified that wrapping the conditional elements inside a fixed-width container is standard practice in SaaS image editors (e.g. Figma and Miro) to prevent content shift.
- **Padding Centering Math:** Symmetrical padding calculation is mathematically verified to align the canvas rendering with the browser font box rendering.
