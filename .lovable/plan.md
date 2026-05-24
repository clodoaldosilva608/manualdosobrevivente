
# TacticalGIS — Survivalist & Bushcraft Field App

A mobile-first, tactical-themed full-stack GIS + survival app inspired by BDGEx. MapLibre GL powers the map; Lovable Cloud (Supabase) handles auth and sync; IndexedDB provides true offline capability.

## Phasing

This is a very large spec. I'll deliver in 5 sequential phases, each fully working before moving to the next. After each phase you can review and request changes.

### Phase 1 — Foundation, Theme & Map Shell
- Enable Lovable Cloud (auth + DB ready)
- Tactical dark design system in `src/styles.css` (Charcoal #121212, Olive #3E4A3D, Matte Black, Emergency Orange #FF6B35, Tactical Red). Large gloved-finger tap targets, JetBrains Mono for coords.
- Routes: `/` (map), `/manual`, `/inventory`, `/sos`, `/settings`, `/login`, `/_authenticated/*` for synced data
- App shell: full-screen MapLibre canvas with collapsible bottom sheet (mobile) / slide-out side panel (tablet+), floating action rail
- Install: `maplibre-gl`, `@turf/turf`, `mgrs`, `idb`, `localforage`, `recharts`, `togeojson`, `@tmcw/togeojson`, `gpx-builder`

### Phase 2 — Core GIS Engine
- MapLibre canvas with multi-touch, smooth zoom/pan, scale bar
- **Layer Manager**: Satellite (Esri World Imagery), Topographic (OpenTopoMap), Streets (OSM), Dark Tactical (Carto Dark Matter). Toggle stack with opacity sliders.
- **Custom WMS/WMTS/XYZ input**: form to add user-defined tile servers, persisted to Cloud + IndexedDB
- **Coordinate readouts** (live): cursor + map-center in DD / DMS / MGRS via `mgrs` lib. Tap-to-copy.
- **Go-to-coordinate** tool: accepts MGRS, DD, DMS; validates and flies to target
- **Offline tile cache**: Service Worker + IndexedDB. "Download area" tool: drag bbox, pick zoom range, progress bar, size estimate, list of cached regions with delete.

### Phase 3 — Tactical Toolkit
- **Measurement**: linear paths (m/km/nm) and polygon area (m², ha, acres) using Turf. Live readout, segment labels, undo/clear.
- **Elevation Profiler**: sample drawn path, fetch via Open-Meteo Elevation API in batches, render Recharts area chart with min/max/gain/loss
- **Markers/Waypoints**: typed icons (Water, Shelter, Danger, Foraging, Cache, Custom) with color, title, description, photo URL. Cloud + IndexedDB synced. Cluster at low zoom.
- **GPX/KML import/export**: drop file or paste; parse with `@tmcw/togeojson`; export selected markers/routes
- **Compass HUD**: device orientation API; shows heading, bearing to active waypoint (Turf bearing), magnetic declination (NOAA WMM approx or static table)

### Phase 4 — Survival Modules
- **Offline Survival Manual**: bundled markdown content (First Aid, Fire, Water Purification, Shelters, Knots) with categories, full-text search (Fuse.js), interactive checklists (state persisted), step-by-step rendering
- **Bug-Out Bag Manager**: CRUD items with category, weight, quantity, expiration date. Virtualized list (`@tanstack/react-virtual`). Total weight gauge with customizable threshold warning. Expiration alerts dashboard.
- **S.O.S Hub**: full-screen mode with screen-strobe SOS in Morse, flashlight via `ImageCapture`/torch where supported, giant-text current coords (DD/DMS/MGRS) for radio dictation, share-location button

### Phase 5 — Backend, Auth, Sync, Polish
- Cloud schema: `profiles`, `user_roles`, `saved_maps` (tactical map configs), `waypoints`, `routes`, `gear_items`, `custom_tile_sources`. RLS scoped to `auth.uid()`.
- Auth: email/password + Google via Lovable broker. `_authenticated` layout for synced views; offline-only mode still works without login.
- Sync engine: optimistic local writes to IndexedDB, background push to Supabase via `createServerFn` with `requireSupabaseAuth`. Conflict = last-write-wins with timestamp.
- Performance pass: route code-splitting, virtualized lists, tile prefetch throttling, lazy-load Recharts/SOS modules, 60fps verification.
- SEO + meta per route, error/notFound boundaries.

## Technical Details

```text
src/
  routes/
    __root.tsx                 # shell, providers, Sonner, auth listener
    index.tsx                  # map (public; auth optional)
    manual.tsx, manual.$slug.tsx
    inventory.tsx              # offline-capable
    sos.tsx
    settings.tsx
    login.tsx
    _authenticated.tsx         # guard for cloud-synced views
    _authenticated/sync.tsx
    api/public/health.ts
  components/
    map/{MapCanvas, LayerPanel, CoordHUD, GoToDialog,
         MeasureTool, ElevationChart, MarkerLayer,
         OfflineAreaDialog, CompassHUD, BottomSheet}.tsx
    survival/{ManualReader, BobList, GearForm, SosScreen}.tsx
    ui/* (shadcn)
  lib/
    coords.ts                  # mgrs/dd/dms parsers
    geo.ts                     # turf wrappers
    elevation.functions.ts     # Open-Meteo proxy serverFn
    gpx-kml.ts
    offline-tiles.ts           # IDB tile cache
    sync.functions.ts          # cloud sync serverFns
    db.ts                      # idb schema
  integrations/supabase/*      # generated
  content/manual/*.md          # bundled survival docs
```

Maps via `maplibre-gl` raster tile sources (Esri/OSM/OpenTopoMap/Carto — all free, no token). Service Worker caches tile URLs under a versioned cache; IndexedDB stores binary blobs for areas explicitly downloaded.

Elevation via `createServerFn` proxy to `api.open-meteo.com/v1/elevation` to avoid CORS and rate-limit per user.

Magnetic declination: bundled WMM2025 coefficient lookup (simplified) for offline accuracy.

Server functions use `createServerFn` + `requireSupabaseAuth` for all writes; loaders on `_authenticated/*` only.

## Out of scope (this build)

- Real satellite SOS/Iridium hardware integration (browser cannot reach those)
- True peer-to-peer mesh sync between devices
- Native push notifications (web-only)

## Confirmation

Ready to start with Phase 1 once you approve. I'll pause after each phase for review.
