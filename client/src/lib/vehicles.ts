// Vehicle registry for the multi-vehicle visualizer.
//
// Each vehicle supplies its own 6 view images plus display metadata. Fixture
// placement defaults are shared across vehicles because emergency-light layouts
// are broadly similar across police platforms (grille pair, mirror heads, visor
// stick, rear-hatch cluster). Per-vehicle nudges live in `fixtureNudge` so a
// body-specific tweak (e.g. taller SUV rear glass) can shift the shared defaults
// without forking the whole layout.

import { ViewId } from "./catalog";

export interface VehicleDef {
  id: string;
  name: string; // full display name
  short: string; // dropdown label
  // image file basenames (in /public), keyed by view
  images: Record<ViewId, string>;
  // optional per-view {dx,dy} percent nudge applied to shared fixture defaults
  fixtureNudge?: Partial<Record<ViewId, { dx: number; dy: number }>>;
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
  },
];

export const VEHICLE_MAP: Record<string, VehicleDef> = Object.fromEntries(
  VEHICLES.map((v) => [v.id, v]),
) as Record<string, VehicleDef>;

export const DEFAULT_VEHICLE_ID = "piu";
