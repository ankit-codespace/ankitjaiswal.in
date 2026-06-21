# Build Plan: Image Annotation Hardening

## Phase 1: Stabilize Toolbar Layout (Prevent CLS)
Wrap the conditional rendering inside a static-width `w-[270px]` flex container:
```tsx
<div className="w-[270px] flex items-center justify-center shrink-0">
  {currentTool === "text" ? (...) : (...)}
</div>
```

## Phase 2: Calibrate Canvas Display Text Centering
Update `redrawCanvas` display rendering for `type === "text"` to compute and add `halfLeading` when placing text lines:
```typescript
const halfLeading = (lineHeight - displayFontSize) / 2;
lines.forEach((line, i) => {
  ctx.fillText(line, sx, sy + i * lineHeight + halfLeading);
});
```

## Phase 3: Calibrate Canvas Export Text Centering
Update export rendering for `type === "text"` to compute and add `halfLeading` when placing text lines:
```typescript
const halfLeading = (lineHeight - fs) / 2;
lines.forEach((line, i) => {
  ctx.fillText(line, px, py + i * lineHeight + halfLeading);
});
```

## Phase 4: Verification
Build the web assets and verify type safety.
