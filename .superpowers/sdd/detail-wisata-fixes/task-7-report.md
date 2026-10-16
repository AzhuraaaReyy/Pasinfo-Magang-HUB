# Task 7: Update route-dari/route-estimasi display

**Status:** DONE

## Summary
Improved the display of "Lokasi Anda" (`#route-dari`) and "Estimasi" (`#route-estimasi`) fields to show meaningful information based on geolocation availability.

## Changes Made

### File: `Frontend/public/js/pages/detail-wisata.js`

**Location:** Lines 174-197 (geolocation callback handler)

**What was added:**
1. When geolocation succeeds:
   - `#route-dari` now shows formatted coordinates: "Lat: XX.XXXX, Lng: YY.YYYY"
   - `#route-estimasi` now shows estimated travel time in minutes based on distance / 30 km/h average speed
   
2. When geolocation fails or is denied:
   - `#route-dari` shows helpful text: "Izinkan lokasi untuk melihat rute"
   - `#route-estimasi` remains "-" (no data to calculate)

**Implementation details:**
- Reuses existing `haversineDistance()` function for distance calculation
- Assumes 30 km/h average travel speed for estimation (ceil of minutes)
- Non-blocking async callback pattern (already established in codebase)
- Graceful fallback when geolocation unavailable

## Code Added

```javascript
/* Populate route-dari with user location */
setText("route-dari", 
  "Lat: " + loc.lat.toFixed(4) + ", Lng: " + loc.lng.toFixed(4)
);
/* Calculate and populate route-estimasi based on distance and average speed */
if (dest.place && dest.place.latitude && dest.place.longitude) {
  var distKm = haversineDistance(loc.lat, loc.lng, dest.place.latitude, dest.place.longitude);
  var estimasiMenit = Math.ceil(distKm / 30 * 60);
  setText("route-estimasi", estimasiMenit + " menit");
}
```

And fallback:
```javascript
/* Geolocation not available or denied */
setText("route-dari", "Izinkan lokasi untuk melihat rute");
```

## Validation

✅ Syntax check: `node --check` passed
✅ Commit successful: `af9e120`

## Testing Notes

**When geolocation available:**
- User sees their coordinates and estimated travel time
- Example: "Lat: -7.7283, Lng: 112.7468" and "45 menit"

**When geolocation unavailable/denied:**
- User sees "Izinkan lokasi untuk melihat rute" in Lokasi Anda field
- Estimasi field remains "-"

## Files Modified
- `Frontend/public/js/pages/detail-wisata.js` (+13 lines, -7 lines)

## Commit Hash
`af9e120`

## Status
✅ DONE
- Code implemented
- Geolocation handling added (both success and fallback)
- Syntax verified
- Committed to main
