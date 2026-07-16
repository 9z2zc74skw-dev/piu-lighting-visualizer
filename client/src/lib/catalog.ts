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

// A catalog SKU (product) that can be dropped as a node
export interface SkuType {
  id: string; // internal id
  sku: string; // Federal Signal part number
  name: string; // friendly name
  group: SkuGroup;
  mount: string; // where it mounts, shown in palette
  spreadDeg: number; // coverage cone width
  size: number; // marker diameter px
  defaultColor: LightColorId;
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
    spreadDeg: 90,
    size: 24,
    defaultColor: "blue",
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
    spreadDeg: 100,
    size: 22,
    defaultColor: "red",
    defaults: {
      front: { x: 24, y: 40, rot: -30 },
      left: { x: 30, y: 41, rot: 200 },
      right: { x: 30, y: 41, rot: 160 },
      hero: { x: 44, y: 36, rot: -40 },
    },
  },
  {
    id: "sifmjs",
    sku: "SIFMJS",
    name: "SignalMaster / Visor (Front)",
    group: "front",
    mount: "Windshield visor, interior",
    spreadDeg: 120,
    size: 30,
    defaultColor: "blue",
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
    spreadDeg: 140,
    size: 34,
    defaultColor: "amber",
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
    mount: "Rear hatch, mid glass",
    spreadDeg: 110,
    size: 26,
    defaultColor: "red",
    defaults: {
      rear: { x: 38, y: 36, rot: 180 },
    },
  },
  {
    id: "fs416300",
    sku: "416300",
    name: "MicroPulse Ultra (Hatch)",
    group: "hatch",
    mount: "Rear hatch, lower glass",
    spreadDeg: 100,
    size: 24,
    defaultColor: "blue",
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
    spreadDeg: 90,
    size: 22,
    defaultColor: "red",
    defaults: {
      rear: { x: 30, y: 42, rot: 200 },
    },
  },
  // Siren / control — mounted, no external warning coverage, shown as equipment markers
  {
    id: "pf200",
    sku: "PF200",
    name: "PathFinder PF200 Siren Amp",
    group: "siren",
    mount: "Cargo / under-hood (equipment)",
    spreadDeg: 0,
    size: 20,
    defaultColor: "white",
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
    spreadDeg: 0,
    size: 20,
    defaultColor: "white",
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
    spreadDeg: 0,
    size: 18,
    defaultColor: "white",
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
    spreadDeg: 0,
    size: 18,
    defaultColor: "white",
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
    spreadDeg: 0,
    size: 18,
    defaultColor: "white",
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

// A placed node on a specific view
export interface LightNode {
  id: string;
  view: ViewId;
  typeId: string; // references SkuType.id
  color: LightColorId;
  x: number; // percent 0-100
  y: number; // percent 0-100
  rotation: number;
  label: string; // the SKU shown on the marker
}

// Parameter toggles for the build baseline
export interface BuildParams {
  pushBar: boolean;
  dashLighting: boolean;
  rearHatchLights: boolean;
}

export const DEFAULT_PARAMS: BuildParams = {
  pushBar: true, // baseline includes a push bar on most builds
  dashLighting: false,
  rearHatchLights: false,
};

// ---- Wagoner PIU preset (Est. 1233) ----
// Push bar OFF (Wagoner exception), all SKUs placed at their default positions.
export interface Preset {
  name: string;
  params: BuildParams;
  // which SKUs to place and on which of their default views
  place: { typeId: string; views: ViewId[] }[];
}

export const WAGONER_PRESET: Preset = {
  name: "Wagoner PIU — Est. 1233",
  params: { pushBar: false, dashLighting: true, rearHatchLights: true },
  place: [
    { typeId: "mps63", views: ["front"] },
    { typeId: "mpsw9", views: ["front", "left", "right"] },
    { typeId: "sifmjs", views: ["front"] },
    { typeId: "sifmjh", views: ["rear"] },
    { typeId: "mps123", views: ["rear"] },
    { typeId: "fs416300", views: ["rear"] },
    { typeId: "xsm2", views: ["rear"] },
    { typeId: "es100c", views: ["front"] },
    { typeId: "esbl", views: ["front"] },
    { typeId: "pf200", views: ["rear"] },
    { typeId: "expmod24", views: ["rear"] },
    { typeId: "obdford", views: ["front"] },
  ],
};
