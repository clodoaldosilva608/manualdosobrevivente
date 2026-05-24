export interface ManualEntry {
  slug: string;
  title: string;
  category: "first-aid" | "fire" | "water" | "shelter" | "knots" | "navigation";
  summary: string;
  body: string;
  checklist?: string[];
}

export const MANUAL: ManualEntry[] = [
  {
    slug: "wound-care",
    title: "Wound Care & Bleeding Control",
    category: "first-aid",
    summary: "Stop bleeding fast and protect against infection in the field.",
    body: `## Priorities

1. **Direct pressure** — apply firm, constant pressure with the cleanest cloth available.
2. **Elevate** the limb above heart level when possible.
3. **Pressure dressing** — wrap snugly; check pulse beyond the wound.
4. **Tourniquet** — only for life-threatening limb hemorrhage you cannot otherwise control. Note the time on the device.

## Cleaning

- Irrigate with clean drinkable water for at least 1–2 minutes.
- Remove visible debris; do not scrub muscle tissue.
- Cover with sterile, non-stick dressing.

## Signs of Infection

Redness, swelling, warmth, pus, fever, red streaks. Seek evacuation.`,
    checklist: [
      "Pressure applied",
      "Wound irrigated",
      "Dressing secured",
      "Pulse below wound checked",
      "Tourniquet time recorded (if used)",
    ],
  },
  {
    slug: "hypothermia",
    title: "Hypothermia Response",
    category: "first-aid",
    summary: "Recognize and rewarm a cold casualty without making things worse.",
    body: `## Stages

- **Mild**: shivering, clumsy, mumbling — *the umbles*.
- **Moderate**: violent shivering stops, confused, drowsy.
- **Severe**: rigid, weak pulse, may appear dead — handle gently.

## Actions

1. Get out of wind and wet.
2. Remove wet layers; insulate from ground.
3. Cover head and neck. Use a vapor barrier inside an insulating layer (the *hypothermia wrap*).
4. Warm sugary fluids only if alert.
5. **Do not** rub limbs or give alcohol.`,
    checklist: [
      "Casualty sheltered",
      "Wet clothing removed",
      "Insulated from ground",
      "Head & neck covered",
      "Warm fluids given (if alert)",
    ],
  },
  {
    slug: "fire-starting",
    title: "Fire Starting (Wet Conditions)",
    category: "fire",
    summary: "Get a flame going when everything is soaked.",
    body: `## Tinder Sources

- Inner bark of dead standing birch / cedar
- Pitch wood / fatwood splinters
- Char cloth, dryer lint, cotton ball + petroleum jelly

## Build the Lay

1. Platform of dry sticks to keep tinder off wet ground.
2. Pencil-lead → pencil → finger → wrist kindling sequence.
3. Light tinder from underneath; feed slowly.
4. Don't smother — fire needs oxygen between sticks.

## Ferro Rod

Hold rod still; pull the striker back toward you. Aim sparks into the tinder bundle, not the wind.`,
    checklist: [
      "Dry platform laid",
      "Tinder prepared",
      "Kindling sequence sorted",
      "Wind block in place",
      "Backup ignition tested",
    ],
  },
  {
    slug: "water-purification",
    title: "Water Purification",
    category: "water",
    summary: "Make found water safe to drink.",
    body: `## Method Hierarchy (best → worst)

1. **Boiling** — rolling boil for 1 minute (3 min above 2000 m). Kills everything biological.
2. **Filtering** — 0.2 micron pore filter removes bacteria + protozoa. Add chemical for viruses.
3. **Chemical** — chlorine dioxide tabs, 30 min wait (4 h for *Cryptosporidium*).
4. **UV** — clear water only. Stir during exposure.

## Pre-Filter

Strain through a bandana or coffee filter to remove sediment — your filter or boil works better on clean water.`,
    checklist: [
      "Water pre-filtered",
      "Treatment method selected",
      "Wait time observed",
      "Container sterilized",
    ],
  },
  {
    slug: "tarp-shelter",
    title: "Tarp Shelters",
    category: "shelter",
    summary: "Fast configurations from a single tarp.",
    body: `## A-Frame

Ridgeline between two trees, tarp draped over, corners staked low. Best all-weather.

## Lean-To

One edge high, opposite edge staked to ground. Open face away from wind, toward fire.

## Plow Point

Single high point, three corners staked. Fastest in open ground.

## Site Selection

- Above flood line, off game trails.
- Not under standing dead trees (*widow makers*).
- Wind block, water within 5 min walk.`,
    checklist: [
      "Site cleared of hazards",
      "Ridgeline tight",
      "Corners staked",
      "Drainage trench dug (if wet)",
    ],
  },
  {
    slug: "core-knots",
    title: "Five Essential Knots",
    category: "knots",
    summary: "If you only learn five, learn these.",
    body: `## Bowline

The "king of knots." A fixed loop that won't slip or jam. *Rabbit out, around the tree, back down the hole.*

## Taut-Line Hitch

Adjustable hitch for tent guy lines.

## Clove Hitch

Quick attachment to a post or branch. Easy to adjust; back up with a half-hitch.

## Trucker's Hitch

Mechanical-advantage tensioning system for ridgelines and loads.

## Square Knot

Joins two ropes of equal diameter — for bandages and bundles, *not* for life loads.`,
    checklist: [
      "Bowline (practice 5x)",
      "Taut-line (practice 5x)",
      "Clove hitch (practice 5x)",
      "Trucker's hitch (practice 5x)",
      "Square knot (practice 5x)",
    ],
  },
  {
    slug: "land-navigation",
    title: "Land Navigation Basics",
    category: "navigation",
    summary: "Map, compass, and terrain association.",
    body: `## Orient the Map

Lay flat. Align magnetic north arrow on the compass with the map's magnetic-north reference (add or subtract declination for true-north maps).

## Terrain Association

Match what you see on the map to what you see on the ground: ridges, drainages, saddles, knolls. Travel by *handrails* (linear features) and *catching features* (you've gone too far).

## Pace Count

Know your pace count for 100 m on flat, uphill, and dense terrain. Track with ranger beads.

## Backazimuth

If you can shoot a heading to a point, you can return on heading ± 180°.`,
    checklist: [
      "Map oriented to north",
      "Declination applied",
      "Pace count established",
      "Bearing recorded",
      "Backazimuth noted",
    ],
  },
];

export const MANUAL_BY_CATEGORY = MANUAL.reduce<Record<string, ManualEntry[]>>(
  (acc, e) => {
    (acc[e.category] = acc[e.category] || []).push(e);
    return acc;
  },
  {},
);

export const CATEGORY_LABELS: Record<ManualEntry["category"], string> = {
  "first-aid": "First Aid",
  fire: "Fire",
  water: "Water",
  shelter: "Shelter",
  knots: "Knots",
  navigation: "Navigation",
};
