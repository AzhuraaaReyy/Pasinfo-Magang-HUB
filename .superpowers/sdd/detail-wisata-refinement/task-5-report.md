# Task 5: Limit Jelajah Sekitar to 4 Items with Category-Matched Images

## Summary
Implemented image mapping helper and limited "Jelajah Sekitar" section to display 4 items instead of 8.

## Changes Made

### File: `Frontend/public/js/pages/detail-wisata.js`

**Lines added:** 28 insertions, 14 deletions (net: +14 lines)

**Changes:**

1. **Added `getImageForItem()` helper (lines 560-568)**
   - Maps cross-domain items (Kuliner, Budaya, Acara) to poster-dummy.svg
   - Falls back to wisata/lain photos for same-domain items
   - Located before sekitarList population

2. **Added limit logic (lines 580-582)**
   - Slices sekitarList to max 4 items after nearest() call
   - Preserves fallback behavior when no ref point exists

3. **Updated renderReco call (line 583)**
   - Changed from `renderReco("reco-sekitar", sekitarList, 8)`
   - To: `renderReco("reco-sekitar", sekitarList, 4)`

## Verification

### Syntax Check
```
node --check public/js/pages/detail-wisata.js
Result: PASS (no output = valid)
```

## Git Commit

**Hash:** `e4baf78`

**Message:** `feat: limit jelajah sekitar to 4 items`

**Files changed:** 1
- Frontend/public/js/pages/detail-wisata.js

## Status

✅ **DONE**

- Image mapping helper added
- Sekitar list limited to 4 items
- renderReco parameter updated
- Syntax verified
- Changes committed

## Interfaces Used

- `sekitarList` variable (consumed/modified)
- `window.PasinfoNearby.nearest()` (existing)
- `wisataPhoto()`, `lainPhoto()` (existing helpers)
- `PLACEHOLDER_MEDIA` (existing constant)
