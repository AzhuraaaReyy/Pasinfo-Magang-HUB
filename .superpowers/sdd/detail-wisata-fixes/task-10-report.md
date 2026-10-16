# Task 10: Document location/distance/estimasi in schema.md

**Date:** 2026-10-13  
**Status:** DONE

## Objective

Ensure schema.md documents the location, distance, and estimasi fields for the backend contract, reflecting frontend display of `route-lokasi`, `route-jarak`, and `route-estimasi`.

## Findings

### Frontend Usage

Located in detail pages:
- `detail_wisata.html`: Lines 258, 272, 279 (3 fields)
- `detail_budaya.html`: Lines 202, 216, 223 (3 fields)

JavaScript calculations:
- `detail-wisata.js:186-190`: Calculates estimasi based on distance ÷ 30 km/h
- `detail-wisata.js:288-289`: Displays location address and distance
- `detail-budaya.js:148-151`: Mock location/distance/estimasi

### Schema Verification

**Places Table (§6, lines 196-235):**
- ✓ `latitude` DECIMAL(10,7) nullable
- ✓ `longitude` DECIMAL(10,7) nullable
- ✓ Coordinate contract documented (latitude=Y, longitude=X)

## Changes Made

### Added §8.1 — Frontend Location Calculations

New section inserted at lines 425-445 in `Frontend/docs/schema.md`:

**Documents:**
1. Frontend-calculated fields table:
   - `distance_km`: Haversine from user location → destination
   - `estimated_time`: distance ÷ 30 km/h average speed
   - `user_location`: Browser Geolocation (not persisted)

2. Backend API requirement:
   ```json
   {
     "place": {
       "latitude": -7.1234567,
       "longitude": 112.1234567
     }
   }
   ```

3. Frontend calculation flow:
   - Geolocation API for user coordinates
   - Haversine formula for distance
   - Real-time calculation (not persisted)

4. Data persistence boundary:
   - User location NOT saved to database
   - Distance/estimasi calculated real-time

## Validation

- [x] Places table latitude/longitude documented in §6
- [x] Geolocation API usage documented in §8.1
- [x] Frontend calculation logic documented
- [x] Backend API requirement defined
- [x] Data persistence boundary clarified
- [x] No schema changes needed (fields already existed)

## Git Commit

```
4fce864 docs: add location/distance/estimasi schema documentation
```

Commit added `Frontend/docs/schema.md` to repository (forced add due to gitignore).

## Summary

✓ Schema verified: latitude/longitude fields already in Places table  
✓ New documentation added: §8.1 Frontend Location Calculations  
✓ Location fields documented with coordinate precision  
✓ Frontend calculations explained with data boundaries  
✓ Commit hash: 4fce864
