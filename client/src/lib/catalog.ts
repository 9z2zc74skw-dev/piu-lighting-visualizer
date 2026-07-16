// Federal Signal emergency lighting catalog for the PIU visualizer.
// SKUs sourced from the Wagoner PIU build — Estimate 1233.
// Integrity Upfitters builds mainly on Federal Signal.

export type ViewId = "front" | "rear" | "left" | "right" | "hero";

export interface ViewDef {
  id: ViewId;
  label: string;
  short: string;
}

export const VIEWS: ViewDef[] = [
  { id: "front", label: "Front", short: "F" },
  { id: "rear", label: "Rear", short: "R" },
  { id: "left", label: "Left Side", short: "L" },
  { id: "right", label: "Right Side", short: "RT" },
  { id: "hero", label: "3/4 View", short: "3Q" },
];

// Functional grouping for the palette
export type SkuGroup = "front" | "hatch" | "siren";

export const GROUP_LABELS: Record<SkuGroup, string> = {
  front: "Front / Perimeter Warning",
  hatch: "Rear Hatch Warning",
  siren: "Siren / Control",
};

// Physical form factor of the light body — drives the rendered SVG shape.
// bar   = short linear MicroPulse LED bar
// wide  = wide low-profile mirror head
// stick = long multi-segment SignalMaster
// module= compact rectangular corner module
// equip = siren/control equipment box (no warning color)
// scene = takedown/scene flood (white only)
export type FixtureShape = "bar" | "wide" | "stick" | "module" | "equip" | "scene";

// Mounting orientation of a fixture's long axis. Horizontal = across (typical
// grille/visor); vertical = up/down (e.g. MPS1200-series on the rear hatch
// pillars / plate sides).
export type Orientation = "horizontal" | "vertical";

// A catalog SKU (product) that can be dropped as a node
export interface SkuType {
  id: string; // internal id
  sku: string; // Federal Signal part number
  name: string; // friendly name
  group: SkuGroup;
  mount: string; // where it mounts, shown in palette
  shape: FixtureShape; // rendered body form factor
  segments: number; // number of lit LED segments across the body
  spreadDeg: number; // coverage cone width
  lengthPx: number; // body length (long axis) in px on the stage
  defaultC1: LightColorId; // default primary color
  defaultC2: LightColorId; // default secondary color (split heads)
  allowWhite: boolean; // whether white is a valid color for this head
  allowTriColor?: boolean; // RBW/BRW heads: allow white as a selectable warning color
  defaultOrientation?: Orientation; // how it mounts by default (defaults to horizontal)
  // suggested default drop position per view (percent of stage). If a view is
  // missing, the SKU is not typically shown on that view but can still be placed.
  defaults: Partial<Record<ViewId, { x: number; y: number; rot: number }>>;
}

// ---- Federal Signal SKUs from Wagoner PIU (Est. 1233) ----
export const SKU_TYPES: SkuType[] = [
  // Front / perimeter warning
  {
    id: "mps63",
    sku: "MPS63",
    name: "MicroPulse 6-3 Grille",
    group: "front",
    mount: "Grille (pair, L/R of grille)",
    shape: "bar",
    segments: 6,
    spreadDeg: 90,
    lengthPx: 46,
    defaultC1: "red",
    defaultC2: "blue",
    allowWhite: false,
    allowTriColor: true,
    defaults: {
      front: { x: 40, y: 51, rot: 0 },
      hero: { x: 33, y: 52, rot: -20 },
    },
  },
  {
    id: "mpsw9",
    sku: "MPSW9",
    name: "MicroPulse Wide 9 Mirror",
    group: "front",
    mount: "Side mirrors (pair)",
    shape: "wide",
    segments: 3,
    spreadDeg: 100,
    lengthPx: 32,
    defaultC1: "red",
    defaultC2: "blue",
    allowWhite: false,
    allowTriColor: true,
    defaults: {
      front: { x: 24, y: 40, rot: 0 },
      left: { x: 30, y: 41, rot: 0 },
      right: { x: 30, y: 41, rot: 0 },
      hero: { x: 44, y: 36, rot: 0 },
    },
  },
  {
    id: "sifmjs",
    sku: "SIFMJS",
    name: "SignalMaster / Visor (Front)",
    group: "front",
    mount: "Windshield visor, interior",
    shape: "stick",
    segments: 8,
    spreadDeg: 120,
    lengthPx: 90,
    defaultC1: "red",
    defaultC2: "blue",
    allowWhite: false,
    defaults: {
      front: { x: 50, y: 30, rot: 0 },
      hero: { x: 45, y: 27, rot: -15 },
    },
  },
  // Rear hatch warning cluster (separate nodes)
  {
    id: "sifmjh",
    sku: "SIFMJH",
    name: "SignalMaster (Rear Hatch)",
    group: "hatch",
    mount: "Rear hatch glass, upper",
    shape: "stick",
    segments: 8,
    spreadDeg: 140,
    lengthPx: 96,
    defaultC1: "amber",
    defaultC2: "red",
    allowWhite: false,
    defaults: {
      rear: { x: 50, y: 30, rot: 180 },
      hero: { x: 76, y: 28, rot: 160 },
    },
  },
  {
    id: "mps123",
    sku: "MPS123",
    name: "MicroPulse 12-3 (Hatch)",
    group: "hatch",
    mount: "Rear hatch pillars (vertical, plate sides)",
    shape: "bar",
    segments: 6,
    spreadDeg: 110,
    lengthPx: 44,
    defaultC1: "red",
    defaultC2: "blue",
    allowWhite: false,
    allowTriColor: true,
    defaultOrientation: "vertical",
    defaults: {
      rear: { x: 26, y: 40, rot: 180 },
    },
  },
  {
    id: "fs416300",
    sku: "416300",
    name: "MicroPulse Ultra (Hatch)",
    group: "hatch",
    mount: "Rear hatch, lower glass",
    shape: "bar",
    segments: 5,
    spreadDeg: 100,
    lengthPx: 40,
    defaultC1: "blue",
    defaultC2: "amber",
    allowWhite: false,
    defaults: {
      rear: { x: 62, y: 36, rot: 180 },
    },
  },
  {
    id: "xsm2",
    sku: "XSM2",
    name: "SpectraLux XSM2 Module",
    group: "hatch",
    mount: "Rear hatch corners (pair)",
    shape: "module",
    segments: 2,
    spreadDeg: 90,
    lengthPx: 26,
    defaultC1: "blue",
    defaultC2: "red",
    allowWhite: false,
    allowTriColor: true,
    defaults: {
      rear: { x: 30, y: 42, rot: 200 },
    },
  },
  // Siren / control — mounted equipment, no warning color
  {
    id: "pf200",
    sku: "PF200",
    name: "PathFinder PF200 Siren Amp",
    group: "siren",
    mount: "Cargo / under-hood (equipment)",
    shape: "equip",
    segments: 0,
    spreadDeg: 0,
    lengthPx: 22,
    defaultC1: "white",
    defaultC2: "white",
    allowWhite: true,
    defaults: {
      rear: { x: 50, y: 55, rot: 0 },
    },
  },
  {
    id: "es100c",
    sku: "ES100C",
    name: "ES100C Speaker",
    group: "siren",
    mount: "Behind grille / push bar",
    shape: "equip",
    segments: 0,
    spreadDeg: 0,
    lengthPx: 22,
    defaultC1: "white",
    defaultC2: "white",
    allowWhite: true,
    defaults: {
      front: { x: 50, y: 62, rot: 0 },
      hero: { x: 30, y: 60, rot: 0 },
    },
  },
  {
    id: "esbl",
    sku: "ESBL",
    name: "ES100 Speaker Bracket",
    group: "siren",
    mount: "Speaker mount bracket",
    shape: "equip",
    segments: 0,
    spreadDeg: 0,
    lengthPx: 20,
    defaultC1: "white",
    defaultC2: "white",
    allowWhite: true,
    defaults: {
      front: { x: 56, y: 62, rot: 0 },
    },
  },
  {
    id: "obdford",
    sku: "OBDFORD",
    name: "OBD Interface (Ford)",
    group: "siren",
    mount: "Cab, OBD-II port",
    shape: "equip",
    segments: 0,
    spreadDeg: 0,
    lengthPx: 20,
    defaultC1: "white",
    defaultC2: "white",
    allowWhite: true,
    defaults: {
      front: { x: 42, y: 24, rot: 0 },
    },
  },
  {
    id: "expmod24",
    sku: "EXPMOD24",
    name: "Expansion Module 24",
    group: "siren",
    mount: "Cargo control area",
    shape: "equip",
    segments: 0,
    spreadDeg: 0,
    lengthPx: 20,
    defaultC1: "white",
    defaultC2: "white",
    allowWhite: true,
    defaults: {
      rear: { x: 60, y: 55, rot: 0 },
    },
  },
];

export const SKU_MAP: Record<string, SkuType> = Object.fromEntries(
  SKU_TYPES.map((t) => [t.id, t]),
) as Record<string, SkuType>;

// Warning colors available for each placed node
export type LightColorId = "red" | "blue" | "amber" | "white" | "green";

export interface LightColor {
  id: LightColorId;
  name: string;
  hex: string;
  glow: string;
}

export const LIGHT_COLORS: LightColor[] = [
  { id: "red", name: "Red", hex: "#ff2b2b", glow: "rgba(255,43,43,0.75)" },
  { id: "blue", name: "Blue", hex: "#2b6bff", glow: "rgba(43,107,255,0.75)" },
  { id: "amber", name: "Amber", hex: "#ffab1a", glow: "rgba(255,171,26,0.75)" },
  { id: "white", name: "White", hex: "#ffffff", glow: "rgba(255,255,255,0.85)" },
  { id: "green", name: "Green", hex: "#22d36a", glow: "rgba(34,211,106,0.75)" },
];

export const LIGHT_COLOR_MAP: Record<LightColorId, LightColor> = Object.fromEntries(
  LIGHT_COLORS.map((c) => [c.id, c]),
) as Record<LightColorId, LightColor>;

// A placed node on a specific view. Warning heads are split dual-color
// (color1 / color2); a single-color head simply has color1 === color2.
export interface LightNode {
  id: string;
  view: ViewId;
  typeId: string; // references SkuType.id
  color1: LightColorId; // primary / left-half color
  color2: LightColorId; // secondary / right-half color
  x: number; // percent 0-100
  y: number; // percent 0-100
  rotation: number;
  orientation: Orientation; // horizontal (long axis across) or vertical (long axis up/down)
  label: string; // the SKU shown on the marker
}

// Warning heads: red / blue / amber. White is reserved for takedown/scene
// (equipment) heads, plus tri-color RBW/BRW heads which explicitly allow it.
export function allowedColors(sku: SkuType): LightColor[] {
  if (sku.allowWhite) return LIGHT_COLORS.filter((c) => c.id === "white");
  const ids: LightColorId[] = sku.allowTriColor
    ? ["red", "blue", "amber", "white"]
    : ["red", "blue", "amber"];
  return LIGHT_COLORS.filter((c) => ids.includes(c.id));
}

// Parameter toggles for the build baseline
export interface BuildParams {
  pushBar: boolean;
  dashLighting: boolean;
  rearHatchLights: boolean;
  colorScheme: ColorSchemeId; // department run scheme for tri-color heads
}

export const DEFAULT_PARAMS: BuildParams = {
  pushBar: false, // Wagoner is slicktop — no push bar
  dashLighting: false,
  rearHatchLights: false,
  colorScheme: "rb", // OK depts (e.g. Wagoner) typically run Red/Blue
};

// ============================================================================
// QuickBooks estimate model + auto-build
// ============================================================================

// A line item as pulled from a QuickBooks estimate
export interface EstimateLine {
  itemName: string; // QB ItemRef name, e.g. "MPS63U-RBW" or "LIGHTS:416300-R"
  description: string;
  qty: number;
  amount: number;
}

export interface Estimate {
  docNumber: string;
  customer: string;
  agency: string;
  state?: string; // 2-letter state, drives the default run scheme (OK=R/B, AR=B/W)
  memo: string;
  total: number;
  lines: EstimateLine[];
}

// Default department run scheme by state: Oklahoma runs Red/Blue, Arkansas (and
// anything unspecified) runs Blue/White.
export function schemeForState(state?: string): ColorSchemeId {
  const s = (state ?? "").trim().toUpperCase();
  if (s === "OK" || s === "OKLAHOMA") return "rb";
  return "bw"; // AR and default
}

// ---- Wagoner PD estimate #1233 (pulled live from QuickBooks, Id 2439) ----
export const WAGONER_ESTIMATE: Estimate = {
  docNumber: "1233",
  customer: "Chief Bob Haley",
  agency: "Wagoner Police Department",
  state: "OK", // Wagoner, Oklahoma — runs Red/Blue
  memo: "Assumes 26 Ford PIU. No rear stick. No cage. Slicktop.",
  total: 11670.72,
  lines: [
    { itemName: "MPS63U-RBW", description: "MPS63U-RBW (grille)", qty: 4, amount: 556 },
    { itemName: "LIGHTS:MPSW9-RBW", description: "MPSW9 Wide angle tri color mirror light", qty: 2, amount: 374.88 },
    { itemName: "BRACKETS:FPIU20MIR", description: "FPIU20MIR-FORD Mirror mount (both sides)", qty: 1, amount: 74.7 },
    { itemName: "LIGHTS:SIFMJS-FPIU20-P3", description: "FedSig Ford PIU Tri-color visor(s)", qty: 1, amount: 1975 },
    { itemName: "PF200", description: "PF200 Siren controller (included)", qty: 1, amount: 0 },
    { itemName: "ES100C", description: "DynaMax ES100C Speaker/100 W (included)", qty: 1, amount: 0 },
    { itemName: "BRACKETS:ESBL-FPIU20", description: "ESBL-FPIU20 combo bracket", qty: 1, amount: 0 },
    { itemName: "OBDFORD", description: "OBDFORD", qty: 1, amount: 185.29 },
    { itemName: "EXPMOD24", description: "EXPMOD24 24 port expansion module", qty: 1, amount: 244.07 },
    { itemName: "Jotto:425-6505", description: "425-6505 Jotto desk contour console w/o printer", qty: 1, amount: 575.1 },
    { itemName: "Jotto:425-6287", description: "425-6287 Jotto PF-200 plate", qty: 1, amount: 49.94 },
    { itemName: "Jotto:425-6619", description: "425-6619 Harris XG-75M plate", qty: 1, amount: 49.49 },
    { itemName: "Services", description: "Ram Intelliskin iPad mount", qty: 1, amount: 391.77 },
    { itemName: "Jotto:475-0653", description: "475-0653 Jotto GR6 Dual gun mount No partition", qty: 1, amount: 688.44 },
    { itemName: "XSM2-BRW-US", description: "XSM2-BRW-US", qty: 2, amount: 389.54 },
    { itemName: "LIGHTS:Fed Sig COM9-B Interior Light", description: "Fed Sig COM9-B Interior Light", qty: 1, amount: 94.1 },
    { itemName: "SIFMJH-FPIU20-P3", description: "SIFMJH-FPIU20-P3 FIU Rear Hatch", qty: 1, amount: 977 },
    { itemName: "416300-B", description: "416300-B Blue 1 inch rear hatch light", qty: 2, amount: 154.2 },
    { itemName: "LIGHTS:416300-R", description: "416300-R Red 1 inch rear hatch light", qty: 2, amount: 154.2 },
    { itemName: "MPS123U-RBW", description: "MPS123U-RBW (rear hatch)", qty: 2, amount: 298 },
    { itemName: "RADAR:DECATUR G3", description: "DECATUR G3", qty: 1, amount: 2689 },
    { itemName: "Labor", description: "Labor/installation/supplies", qty: 1, amount: 1750 },
  ],
};

// The result of matching one estimate line to the catalog
export interface MatchResult {
  itemName: string;
  description: string;
  qty: number;
  typeId: string | null; // catalog SKU id, or null if unmatched/non-lighting
  colorOverride?: { c1: LightColorId; c2: LightColorId };
  triColor?: boolean; // head is RBW/BRW: colors follow the department run scheme,
  //                     not a fixed override (individual heads can still be edited)
  note?: string; // e.g. conflict flag
}

// ============================================================================
// Department run scheme
// ============================================================================
// A tri-color-capable head (RBW/BRW) does NOT mean the department runs all three
// colors. Most Oklahoma depts (e.g. Wagoner) run Red/Blue; many others run
// Blue/White. The scheme is picked once for the build and drives every tri-color
// head; solid/fixed-color lights (e.g. 416300-B, amber rear stick) are unaffected.
export type ColorSchemeId = "rb" | "bw" | "rw" | "rbw";

export interface ColorScheme {
  id: ColorSchemeId;
  label: string;
  c1: LightColorId;
  c2: LightColorId;
  c3?: LightColorId; // third color for tri-color runs
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: "rb", label: "Red / Blue", c1: "red", c2: "blue" },
  { id: "bw", label: "Blue / White", c1: "blue", c2: "white" },
  { id: "rw", label: "Red / White", c1: "red", c2: "white" },
  { id: "rbw", label: "Red / Blue / White", c1: "red", c2: "blue", c3: "white" },
];

export const COLOR_SCHEME_MAP: Record<ColorSchemeId, ColorScheme> = Object.fromEntries(
  COLOR_SCHEMES.map((s) => [s.id, s]),
) as Record<ColorSchemeId, ColorScheme>;

// Normalize a QB item name: strip the "CATEGORY:" prefix and uppercase.
function baseName(itemName: string): string {
  const parts = itemName.split(":");
  return parts[parts.length - 1].trim().toUpperCase();
}

// Map a QuickBooks estimate line to a catalog SKU id + color override.
// Handles color suffixes (-RBW, -BRW, -B, -R) and category prefixes.
export function matchLine(line: EstimateLine): MatchResult {
  const bn = baseName(line.itemName);
  const res: MatchResult = {
    itemName: line.itemName,
    description: line.description,
    qty: line.qty,
    typeId: null,
  };

  // Warning + equipment SKU matching by prefix of the base part number
  if (bn.startsWith("MPS63")) {
    res.typeId = "mps63";
    res.triColor = true; // RBW — colors follow the department run scheme
  } else if (bn.startsWith("MPSW9")) {
    res.typeId = "mpsw9";
    res.triColor = true; // RBW
  } else if (bn.startsWith("SIFMJS")) {
    res.typeId = "sifmjs";
    res.triColor = true; // front visor — follows the run scheme
  } else if (bn.startsWith("SIFMJH")) {
    res.typeId = "sifmjh";
    res.colorOverride = { c1: "amber", c2: "red" }; // rear stick: fixed amber/red
    res.note = "On quote, but memo says 'no rear stick' - verify";
  } else if (bn.startsWith("MPS123")) {
    res.typeId = "mps123";
    res.triColor = true; // RBW
  } else if (bn.startsWith("XSM2")) {
    res.typeId = "xsm2";
    res.triColor = true; // BRW
  } else if (bn.startsWith("416300")) {
    res.typeId = "fs416300";
    // color from suffix: -B blue, -R red, -A amber
    if (bn.endsWith("-B")) res.colorOverride = { c1: "blue", c2: "blue" };
    else if (bn.endsWith("-R")) res.colorOverride = { c1: "red", c2: "red" };
    else if (bn.endsWith("-A")) res.colorOverride = { c1: "amber", c2: "amber" };
  } else if (bn === "PF200") {
    res.typeId = "pf200";
  } else if (bn === "ES100C") {
    res.typeId = "es100c";
  } else if (bn.startsWith("ESBL")) {
    res.typeId = "esbl";
  } else if (bn === "OBDFORD") {
    res.typeId = "obdford";
  } else if (bn === "EXPMOD24") {
    res.typeId = "expmod24";
  }
  // Everything else (Jotto consoles, plates, gun mount, iPad mount, COM9-B
  // interior, Decatur radar, labor, mirror bracket) is non-visualized — listed
  // on the sheet but not placed as a light node.
  return res;
}

// Which view(s) a matched SKU auto-places on, and small offsets so multiple
// units of the same SKU don't stack exactly. Returns one placement per unit,
// capped so pairs render as L/R and larger quantities fan out sensibly.
export interface AutoPlacement {
  typeId: string;
  view: ViewId;
  dx: number; // percent offset from the SKU default for this view
  dy: number;
  absX?: number; // absolute x (percent) — overrides the SKU default x when set
  absY?: number; // absolute y (percent) — overrides the SKU default y when set
}

export function planPlacements(match: MatchResult): AutoPlacement[] {
  const { typeId, qty } = match;
  if (!typeId) return [];
  const sku = SKU_MAP[typeId];
  const out: AutoPlacement[] = [];

  // Grille bars (MPS63): a pair on the front, L/R of grille
  if (typeId === "mps63") {
    const n = Math.min(qty, 2);
    for (let i = 0; i < n; i++) out.push({ typeId, view: "front", dx: i === 0 ? -8 : 8, dy: 0 });
    return out;
  }
  // Mirror heads (MPSW9): a pair on the front view — one on each side mirror —
  // plus one on each side view at the mirror.
  if (typeId === "mpsw9") {
    // Front: driver + passenger mirrors. Absolute placement overrides default x.
    out.push({ typeId, view: "front", dx: 0, dy: 0, absX: 30, absY: 36 });
    out.push({ typeId, view: "front", dx: 0, dy: 0, absX: 70, absY: 36 });
    out.push({ typeId, view: "left", dx: 0, dy: 0 });
    out.push({ typeId, view: "right", dx: 0, dy: 0 });
    return out;
  }
  // Rear hatch pairs/singles: fan across the glass
  if (typeId === "mps123" || typeId === "fs416300" || typeId === "xsm2") {
    const n = Math.max(1, Math.min(qty, 2));
    for (let i = 0; i < n; i++) {
      const dx = n === 1 ? 0 : i === 0 ? -12 : 12;
      out.push({ typeId, view: "rear", dx, dy: 0 });
    }
    return out;
  }
  // Single-mount items: place one at the default view (first defined default)
  const view = (Object.keys(sku.defaults)[0] as ViewId) ?? "front";
  out.push({ typeId, view, dx: 0, dy: 0 });
  return out;
}

// Apply a department run scheme to a tri-color head, returning its two run colors.
export function schemeColors(scheme: ColorSchemeId): { c1: LightColorId; c2: LightColorId } {
  const s = COLOR_SCHEME_MAP[scheme];
  return { c1: s.c1, c2: s.c2 };
}

// Build a full auto-placement plan + parameter set from an estimate.
export function autoBuildFromEstimate(est: Estimate): {
  placements: (AutoPlacement & { colorOverride?: { c1: LightColorId; c2: LightColorId } })[];
  matches: MatchResult[];
  params: BuildParams;
} {
  const matches = est.lines.map(matchLine);
  // Default run scheme from the department's state (OK=R/B, AR=B/W).
  const colorScheme = schemeForState(est.state);
  const run = schemeColors(colorScheme);
  const placements: (AutoPlacement & { colorOverride?: { c1: LightColorId; c2: LightColorId } })[] = [];
  for (const m of matches) {
    // Tri-color heads take the department run scheme; fixed-color lights (solid
    // 416300, amber rear stick) keep their explicit override.
    const colorOverride = m.triColor ? run : m.colorOverride;
    for (const p of planPlacements(m)) {
      placements.push({ ...p, colorOverride });
    }
  }
  // Params derived from the build: Wagoner is slicktop + no push bar; it does
  // run interior dash + rear hatch warning.
  const memo = est.memo.toLowerCase();
  const params: BuildParams = {
    pushBar: !memo.includes("slicktop") && !memo.includes("no push"),
    dashLighting: true,
    rearHatchLights: true,
    colorScheme,
  };
  return { placements, matches, params };
}
