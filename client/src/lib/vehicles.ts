// Vehicle registry for the multi-vehicle visualizer.
//
// Each vehicle supplies its own 6 view images plus display metadata. Fixture
// placement defaults are shared across vehicles because emergency-light layouts
// are broadly similar across police platforms (grille pair, mirror heads, visor
// stick, rear-hatch cluster). Per-vehicle nudges live in `fixtureNudge` so a
// body-specific tweak (e.g. taller SUV rear glass) can shift the shared defaults
// without forking the whole layout.

import { ViewId } from "./catalog";

// Placement for the Westin HDX push bar image overlay within the 0-100 x 0-75
// viewBox. cx/cy = center of the guard; w = width in viewBox units (height is
// derived from the image aspect). rot = optional rotation (deg) for 3/4 views.
export interface PushBarPlacement {
  cx: number;
  cy: number;
  w: number;
  rot?: number;
}

export interface VehicleDef {
  id: string;
  name: string; // full display name
  short: string; // dropdown label
  // image file basenames (in /public), keyed by view
  images: Record<ViewId, string>;
  // optional per-view {dx,dy} percent nudge applied to shared fixture defaults
  fixtureNudge?: Partial<Record<ViewId, { dx: number; dy: number }>>;
  // optional per-view placement for the Westin HDX push bar overlay. The base
  // HDX geometry is authored for the Ford PIU grille; each other body scales &
  // shifts it to sit on its own grille. tx/ty are percent offsets in the
  // 0-100 x 0-75 viewBox; scale is about the guard's own center.
  pushBarPlacement?: Partial<Record<ViewId, PushBarPlacement>>;
}

export const VEHICLES: VehicleDef[] = [
  {
    id: "piu",
    name: "2026 Ford Police Interceptor Utility",
    short: "Ford PIU",
    images: {
      front: "piu_front.png",
      rear: "piu_rear.png",
      rearOpen: "piu_rear_open.png",
      left: "piu_left.png",
      right: "piu_right.png",
      hero: "piu_hero.png",
    },
    pushBarPlacement: {
      front: { cx: 50, cy: 41, w: 30 },
      hero: { cx: 32, cy: 40, w: 23, rot: -5 },
    },
  },
  {
    id: "tahoe",
    name: "2026 Chevrolet Tahoe PPV",
    short: "Chevy Tahoe",
    images: {
      front: "tahoe_front.png",
      rear: "tahoe_rear.png",
      rearOpen: "tahoe_rear_open.png",
      left: "tahoe_left.png",
      right: "tahoe_right.png",
      hero: "tahoe_hero.png",
    },
    // The Tahoe body is taller/boxier than the PIU. Small nudges keep the shared
    // Wagoner layout reading correctly against the Tahoe sheet metal.
    fixtureNudge: {
      front: { dx: 0, dy: 2 },
      rear: { dx: 0, dy: 2 },
      hero: { dx: 0, dy: 1 },
    },
    // Tahoe grille sits lower and is wider/shorter than the PIU. Drop the guard
    // down onto the lower grille opening and size it to the Tahoe fascia.
    pushBarPlacement: {
      front: { cx: 50, cy: 44, w: 30 },
      hero: { cx: 33, cy: 43, w: 23, rot: -5 },
    },
  },
];

export const VEHICLE_MAP: Record<string, VehicleDef> = Object.fromEntries(
  VEHICLES.map((v) => [v.id, v]),
) as Record<string, VehicleDef>;

export const DEFAULT_VEHICLE_ID = "piu";
