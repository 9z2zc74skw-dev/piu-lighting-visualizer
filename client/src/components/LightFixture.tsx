import { SkuType, LightColorId } from "@/lib/catalog";

interface Props {
  sku: SkuType;
  color1: LightColorId;
  color2: LightColorId;
  scale?: number; // multiply base dimensions (default 1)
}

const BASE = import.meta.env.BASE_URL;

// ---------------------------------------------------------------------------
// Photorealistic Federal Signal fixture sprites.
//
// Each fixture is a real product photo (background keyed to transparent) chosen
// by body shape + the two lit colors. Split heads map (red,blue) -> "rb" and
// (blue,white) -> "bw"; solid round heads map to a single color r/b/a.
// Base widths are tuned so the fixture reads at true proportion on the vehicle.
// ---------------------------------------------------------------------------

// intrinsic aspect ratios (w/h) of the processed sprite files (measured)
const ASPECT: Record<string, number> = {
  bar: 3.97,
  wide: 5.25,
  module: 3.97,
  stick: 11.3,
  round: 1.02,
  dyna: 11, // slim DynaFlare linear stick (fixed so R/B nodes match)
  algt: 18.7, // Allegiant roof lightbar (keyed sprite ~2090x112)
};

// solid single-color bars have a slightly different intrinsic aspect
const BAR_SOLID_ASPECT = 3.6;

// base on-vehicle width in px for each shape (before scale multiplier).
// The stage is ~720px wide; these are tuned so fixtures read at realistic
// scale against the vehicle (a grille light head is small).
const BASE_W: Record<string, number> = {
  bar: 26,
  wide: 24,
  module: 18,
  stick: 60,
  round: 9,
  dyna: 39, // 1-foot DynaFlare (DR1) — slim perimeter stick; longer models via baseW
  algt: 250, // Allegiant full-width roof bar — spans the roofline (~38% of stage)
};

function pairKey(c1: LightColorId, c2: LightColorId): "rb" | "bw" {
  // white present -> blue/white scheme; otherwise red/blue
  if (c1 === "white" || c2 === "white") return "bw";
  return "rb";
}

// solid single-color sprite suffix for a bar node (real MicroPulse heads
// alternate R then B rather than showing a split, so we render one solid color
// per node — picked by color1).
function solidKey(c1: LightColorId): "r" | "b" | "w" {
  if (c1 === "blue") return "b";
  if (c1 === "white") return "w";
  return "r";
}

function spriteFor(sku: SkuType, c1: LightColorId, c2: LightColorId): string | null {
  switch (sku.shape) {
    case "bar": {
      // MicroPulse bars (MPS63 / MPS123): a single head splits half c1 / half c2
      // (e.g. red/blue) across its own LEDs. Smoked-lens variants use the darker
      // tinted sprite. Only render a single solid color if both colors match.
      const smk = sku.smokedLens ? "_smk" : "";
      if (c1 === c2) return `${BASE}fx/fx_bar${smk}_${solidKey(c1)}.png`;
      return `${BASE}fx/fx_bar${smk}_${pairKey(c1, c2)}.png`;
    }
    case "wide":
      return `${BASE}fx/fx_wide_${pairKey(c1, c2)}.png`;
    case "module": {
      // no dedicated module sprite yet; reuse the slim bar head
      const smk = sku.smokedLens ? "_smk" : "";
      if (c1 === c2) return `${BASE}fx/fx_bar${smk}_${solidKey(c1)}.png`;
      return `${BASE}fx/fx_bar${smk}_${pairKey(c1, c2)}.png`;
    }
    case "stick": {
      // amber traffic advisor (rear directional); otherwise SignalMaster in the
      // dept scheme: blue/white when white is present, else red/blue.
      const amber = c1 === "amber" || c2 === "amber";
      if (amber) return `${BASE}fx/fx_stick_amber.png`;
      return `${BASE}fx/fx_stick_${pairKey(c1, c2)}.png`;
    }
    case "dyna": {
      // DynaFlare is a tri-color R/B/W perimeter stick. In warning mode it shows
      // red AND blue across the bar, so the default (split) node renders a
      // red/blue split sprite. If the user forces the node to a single solid
      // color, fall back to that color's solid sprite. Smoked variants use
      // dedicated dark-lens sprites.
      const pfx = sku.smokedLens ? "fx_dyna_smk" : "fx_dyna";
      const solid = c1 === c2;
      if (solid) {
        const c = solidKey(c1) === "b" ? "b" : "r"; // only red/blue solids exist
        return `${BASE}fx/${pfx}_${c}.png`;
      }
      // split R/B warning look (both clear and smoked have an _rb split sprite)
      return `${BASE}fx/${pfx}_rb.png`;
    }
    case "algt": {
      // Federal Signal Allegiant roof lightbar — a full-width bar that flashes
      // both colors across its length. Blue/White when white is present
      // (AR depts), otherwise Red/Blue (OK depts). Only two keyed split sprites
      // exist (rb / bw), so a forced single-color node still maps to its pair.
      const hasW = c1 === "white" || c2 === "white";
      const hasR = c1 === "red" || c2 === "red";
      const pair = hasW && !hasR ? "bw" : "rb";
      return `${BASE}fx/fx_algt_${pair}.png`;
    }
    case "round": {
      // Tri-color R/B/W perimeter round: in warning mode it flashes two colors,
      // so a two-color node (c1 != c2) renders a split dome sprite (mirrors the
      // DynaFlare stick). OK depts run Red/Blue; AR depts run Blue/White. Forcing
      // the node to a single solid color (c1 == c2), or an amber head, falls back
      // to that color's solid sprite.
      const amber = c1 === "amber" || c2 === "amber";
      const smk = sku.smokedLens ? "fx_round_smk" : "fx_round";
      if (amber) return `${BASE}fx/fx_round_a.png`;
      if (sku.allowTriColor && c1 !== c2) {
        const hasW = c1 === "white" || c2 === "white";
        const hasR = c1 === "red" || c2 === "red";
        // Blue/White split (no red) -> _bw; otherwise the Red/Blue split -> _rb.
        const pair = hasW && !hasR ? "bw" : "rb";
        return `${BASE}fx/${smk}_${pair}.png`;
      }
      const c = c1 === "blue" ? "b" : c1 === "white" ? "w" : "r";
      return `${BASE}fx/${smk}_${c}.png`;
    }
    default:
      return null;
  }
}

export function LightFixture({ sku, color1, color2, scale = 1 }: Props) {
  // ---- Equipment: dark control box with a status LED (no warning color) ----
  if (sku.shape === "equip" || sku.shape === "scene") {
    const w = 26 * scale;
    const h = 16 * scale;
    return (
      <svg width={w} height={h} viewBox="0 0 26 16" style={{ overflow: "visible", display: "block" }}>
        <rect x="0.5" y="0.5" width="25" height="15" rx="2.5" fill="#20262f" stroke="#0a0d12" strokeWidth="1" />
        <rect x="3" y="3" width="20" height="6" rx="1" fill="#0b0f16" />
        <line x1="4" y1="6" x2="22" y2="6" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
        <circle cx="21.5" cy="12" r="1.4" fill="#8b5cf6" />
        <circle cx="4.5" cy="12" r="0.8" fill="rgba(255,255,255,0.35)" />
      </svg>
    );
  }

  const src = spriteFor(sku, color1, color2);
  if (!src) return null;

  const w = (sku.baseW ?? BASE_W[sku.shape] ?? 40) * scale;
  const aspect =
    sku.solidBar && (sku.shape === "bar" || sku.shape === "module")
      ? BAR_SOLID_ASPECT
      : (ASPECT[sku.shape] ?? 4);
  // DynaFlare sticks keep a CONSTANT thickness regardless of length: a 5-ft bar
  // is longer than a 1-ft bar, not taller. Derive height from the 1-ft base so
  // every DR1..DR6 shares the same height; only width (length) grows via baseW.
  const h =
    sku.shape === "dyna"
      ? (BASE_W.dyna / ASPECT.dyna) * scale
      : w / aspect;

  return (
    <img
      src={src}
      alt={sku.name}
      width={w}
      height={h}
      draggable={false}
      style={{
        display: "block",
        width: `${w}px`,
        height: `${h}px`,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
