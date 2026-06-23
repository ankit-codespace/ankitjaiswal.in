# Build Plan - Notepad Header Tab Alignment

This plan covers the visual alignment and structural cleanup of the web notepad's header.

## Goal
A clean, premium, and Chrome-like header bar where tabs are visually balanced, navigation and action items are well-spaced, the plus icon flows dynamically next to tabs, and menu hierarchies are streamlined.

## Affected Files
* [notepad.tsx](file:///c:/Users/LENOVO-PC/Documents/Ankit%20Jaiswal%20Portfolio/Ankit%20Jaiswal%20Portfolio/ankitjaiswal.in/artifacts/website/src/pages/tools/notepad.tsx)

## Phased Steps

### Phase 1: Header Row & Navigation Alignments
* **1.1:** Set Row 1 container style height to `42` (previously `40`).
* **1.2:** Shift Back button and File Menu button `marginBottom` to `1` (previously `-2`), lifting them up slightly.
* **1.3:** Set both navigation separators `marginBottom` to `6` to align them symmetrically with the navigation buttons.

### Phase 2: Plus Button & Separators Cleanup
* **2.1:** Move the Plus button element inside `.notepad-tabs-container` as the final item.
* **2.2:** Adjust Plus button `marginBottom` to `6` to sit cleanly next to the active/inactive tabs on the baseline.
* **2.3:** Remove the redundant `{sep}` at the beginning of the Right Zone. Ensure separators only render next to active options.

### Phase 3: Action Buttons & Menu Relocations
* **3.1:** Delete the separate "Shortcuts" and "Feedback" button structures from Row 1 Right Zone.
* **3.2:** Inside the File Menu dropdown container:
  * Verify "Keyboard Shortcuts" button is present.
  * Add the "Send Feedback" button under Keyboard Shortcuts:
    ```tsx
    <button
      onClick={() => { openFeedback(); setShowFileMenu(false); }}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", width: "100%", background: "none", border: "none", cursor: "pointer", color: effectiveDark ? "var(--t1)" : "rgba(0,0,0,0.85)", fontSize: 13, borderRadius: 4, transition: "background 0.12s" }}
      className="notepad-file-menu-item"
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = effectiveDark ? "var(--bg3)" : "rgba(0,0,0,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
    >
      <MessageSquarePlus size={13} style={{ opacity: 0.7 }} />
      <span style={{ flex: 1, textAlign: "left", fontFamily: "Inter,sans-serif" }}>Send Feedback</span>
    </button>
    ```
* **3.3:** Update panel dropdown heights:
  * File Menu dropdown: change `top` from `78` to `80`.
  * Doc Switcher menu: change `top` from `80` to `82`.
  * Export menu: change `top` from `82` to `84`.

## Verification
* Run `pnpm run build` from the workspace root to ensure typescript builds without error.
