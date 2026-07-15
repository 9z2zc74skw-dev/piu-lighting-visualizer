// Emergency lighting catalog for the PIU visualizer.
// Node types reflect real upfit products used by Integrity Upfitters.

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

export type LightTypeId = "t_series" | "edge_9xt" | "wnx_2250";

export interface LightType {
  id: LightTypeId;
  name: string;
  category: string;
  // beam footprint in on-canvas units (relative to a 100-wide coverage cone)
  spreadDeg: number;
  // default marker size in px on the stage
  size: number;
  desc: string;
}

// Catalog of draggable light node products
export const LIGHT_TYPES: LightType[] = [
  {
    id: "t_series",
    name: "T-Series",
    category: "Surface / Perimeter",
    spreadDeg: 90,
    size: 26,
    desc: "Linear surface-mount / grille & mirror perimeter warning module.",
  },
  {
    id: "edge_9xt",
    name: "Edge 9XT",
    category: "Interior Windshield/Rear",
    spreadDeg: 120,
    size: 32,
    desc: "Interior mount windshield or rear cargo/hatch light stick head.",
  },
  {
    id: "wnx_2250",
    name: "WNX 2250 Stick",
    category: "Interior Stick",
    spreadDeg: 140,
    size: 40,
    desc: "Full-width interior light stick (windshield or rear hatch glass).",
  },
];

export const LIGHT_TYPE_MAP: Record<LightTypeId, LightType> = Object.fromEntries(
  LIGHT_TYPES.map((t) => [t.id, t]),
) as Record<LightTypeId, LightType>;

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

// A placed light node on a specific view
export interface LightNode {
  id: string;
  view: ViewId;
  type: LightTypeId;
  color: LightColorId;
  // position as a percentage of stage dimensions (0-100) so it scales responsively
  x: number;
  y: number;
  rotation: number; // degrees, direction the coverage points
  label: string;
}

// Parameter toggles for the build baseline
export interface BuildParams {
  pushBar: boolean;
  dashLighting: boolean;
  rearHatchLights: boolean;
}

export const DEFAULT_PARAMS: BuildParams = {
  pushBar: true, // baseline includes a push bar per shop standard (except Wagoner units)
  dashLighting: false,
  rearHatchLights: false,
};
