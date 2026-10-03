# Remix of Wilderness Compass

Create a comprehensive, production-grade, mobile-first Full-Stack Web Application tailored for the Survivalist and Bushcraft niche, heavily inspired by military geographic information systems (like BDGEx). The application must be high-performance, visually tactical (dark military/outdoor theme), and fully responsive.

Use React, Vite, Tailwind CSS, Shadcn UI, Lucide Icons, and Leaflet.js (or Mapbox GL JS) for the core mapping engine. Ensure the state management is optimized for heavy geospatial data.

### 1. CORE ARCHITECTURE & GIS ENGINE (Inspired by BDGEx)

- **Interactive Map Canvas:** A full-screen map component supporting multi-touch gestures, smooth zooming, and panning.

- **Layer Management (Mapeamento e Camadas):**

  - Ability to toggle between multiple base maps: Satellite/Imagery, Topographic (Contour lines), Street Maps, and Dark Tactical.

  - WMS/WMTS/XYZ Tile Layer Integration: Allow users to input custom military or geographic server URLs to load official topographic charts.

  - Offline Map Caching: Implement a mechanism (using Service Workers and IndexedDB) to cache map tiles for specific geographic areas for true offline wilderness survival use.

- **Coordinate Systems & Readouts:**

  - Real-time display of cursor/center coordinates in multiple formats: Decimal Degrees (DD), Degrees Minutes Seconds (DMS), and Military Grid Reference System (MGRS).

  - "Go to Coordinate" tool allowing users to input specific MGRS or Lat/Long values to center the map.

### 2. TACTICAL GIS TOOLS (The "BDGEx App" Feature Suite)

- **Advanced Measurement Toolkit:**

  - Linear Distance: Click to draw paths and calculate total distance in meters/kilometers/nautical miles.

  - Area Measurement: Polygon drawing tool calculating total area in square meters, hectares, and acres.

  - Elevation Profiler: When a path is drawn, generate a dynamic 2D cross-section chart showing elevation changes over distance (using an open elevation API).

- **Marker & Waypoint System:**

  - Drop custom survival markers on the map (Water Source, Shelter, Danger Zone, Foraging, Cache).

  - Each marker must have a customizable title, description, tactical icon, and color.

  - Export/Import markers and routes via standard GPX and KML formats.

- **Compass & Orientation Overlay:**

  - An interactive digital compass HUD showing current heading, bearing to the next waypoint, and magnetic declination calculation.

### 3. SURVIVAL & OFF-GRID MODULES

- **Offline Survival Manual & Wiki:**

  - A searchable, categorized offline knowledge base (First Aid, Fire Starting, Water Purification, Shelters, Knot Tying).

  - Step-by-step guides with clean markdown rendering and interactive checklist components.

- **Bug-Out Bag (BOB) & Inventory Manager:**

  - CRUD system to manage survival gear categories (Tools, Nutrition, Hydration, Medical, Warmth).

  - Weight tracking: Automatically calculate total backpack weight, signaling warnings if it exceeds a customizable threshold.

  - Expiration alerts for food, water rations, and medical supplies.

- **S.O.S & Emergency Signaling Hub:**

  - One-click screen strobe/flashlight signaling (Morse code for SOS).

  - Display current location info in giant, easy-to-read text for quick dictation over radio or satellite communicators.

### 4. UI/UX & VISUAL DESIGN

- **Theme:** Strict tactical dark mode. Dominant colors: Deep Charcoal (#121212), Military Olive Green (#3E4A3D), Matte Black, with high-visibility accents like Emergency Orange (#FF6B35) or Tactical Red for alerts.

- **Layout:** Mobile-first design with a collapsible bottom sheet or slide-out side panel for tools, keeping the map view as unobstructed as possible. Buttons must be large enough for gloved fingers to tap easily.

- **Performance:** Virtualized lists for large gear inventories or waypoint logs to guarantee 60fps performance on mobile browsers.

### 5. BACKEND & DATA PERSISTENCE (Supabase Integration ready)

- Design mock schemas or local storage fallbacks for user authentication, saved tactical maps, customized gear configurations, and active survival routes, ready to be seamlessly synced with a Supabase PostgreSQL backend.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://manualdosobrevivente.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2cd218e-fdc6-4dcc-82f1-76bc555bdda0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
