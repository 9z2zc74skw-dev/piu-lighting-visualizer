import { ViewId, BuildParams, schemeColors, LIGHT_COLOR_MAP } from "@/lib/catalog";
import { PushBarPlacement } from "@/lib/vehicles";

const BASE = import.meta.env.BASE_URL;

// Which SpectraLux ILS sprite (red/blue vs blue/white) matches the dept scheme.
function ilsSprite(params: BuildParams): string {
  const run = schemeColors(params.colorScheme);
  const white = run.c1 === "white" || run.c2 === "white";
  return `${BASE}fx/fx_ils_${white ? "bw" : "rb"}.png`;
}

// SVG overlays drawn on top of the vehicle render. Coordinates are in a
// 0-100 x 0-75 viewBox (4:3) so they line up with the object-contain image.

interface Props {
  view: ViewId;
  params: BuildParams;
  pushBarPlacement?: Partial<Record<ViewId, PushBarPlacement>>;
}

// Alternating LED colors for the interior deck lights, from the dept scheme.
function deckColors(params: BuildParams): string[] {
  const run = schemeColors(params.colorScheme);
  return [LIGHT_COLOR_MAP[run.c1].hex, LIGHT_COLOR_MAP[run.c2].hex];
}

// Westin HDX Grille Guard (base "Push Bumper"). Rendered from the real Westin
// product photo (fx_pushbar_front.png) keyed to transparency, so the honeycomb
// mesh, curved outer uprights and low tube read exactly like the actual part.
// The image is placed per-vehicle via PushBarPlacement (center + width + rot)
// so it sits correctly on each body's grille.
// PIT bars / headlight wing-wraps are separate Westin accessories; add them as
// their own keyed overlays + quote line items when a customer orders them.
const PUSHBAR_ASPECT = 810 / 630; // intrinsic w/h of the keyed product image
function PushBar({ place }: { place?: PushBarPlacement }) {
  if (!place) return null;
  const w = place.w;
  const h = w / PUSHBAR_ASPECT;
  const x = place.cx - w / 2;
  const y = place.cy - h / 2;
  const rot = place.rot ?? 0;
  return (
    <g
      data-testid="overlay-pushbar"
      transform={rot ? `rotate(${rot} ${place.cx} ${place.cy})` : undefined}
    >
      <image
        href={`${BASE}fx/fx_pushbar_front.png`}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="none"
        style={{ filter: "drop-shadow(0 0.4px 0.8px rgba(0,0,0,0.55))" }}
      />
    </g>
  );
}

// A slim interior deck/light-bar drawn as a real fixture: dark housing with a
// row of discrete glowing LED dots (alternating colors) sitting behind glass,
// plus a soft light bloom — not a flat gradient smear.
function DeckLight({
  x,
  y,
  w,
  colors,
  id,
  rot = 0,
}: {
  x: number;
  y: number;
  w: number;
  colors: string[];
  id: string;
  rot?: number;
}) {
  const h = 1.9;
  const cx = x + w / 2;
  const n = Math.max(6, Math.round(w / 3.2));
  const pad = 1.4;
  const step = (w - pad * 2) / (n - 1);
  return (
    <g transform={rot ? `rotate(${rot} ${cx} ${y + h / 2})` : undefined}>
      {/* soft bloom behind the bar */}
      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} rx={h} fill={`url(#${id}Bloom)`} opacity="0.55" />
      {/* dark housing */}
      <rect x={x} y={y} width={w} height={h} rx="0.7" fill="#0b0d12" stroke="#05070b" strokeWidth="0.25" />
      {/* glass lens inset */}
      <rect x={x + 0.4} y={y + 0.35} width={w - 0.8} height={h - 0.7} rx="0.5" fill="#05070b" />
      {/* discrete LED dots */}
      {Array.from({ length: n }).map((_, i) => {
        const px = x + pad + i * step;
        const col = colors[i % colors.length];
        return (
          <g key={i}>
            <circle cx={px} cy={y + h / 2} r="0.75" fill={col} filter={`url(#${id}Glow)`} />
            <circle cx={px} cy={y + h / 2} r="0.3" fill="#ffffff" />
          </g>
        );
      })}
    </g>
  );
}

// Interior dash lighting — the SpectraLux ILS tapered wedge pair mounted along
// the top of the windshield interior, visible through the glass.
function DashLighting({ view, sprite }: { view: ViewId; sprite: string }) {
  // sprite intrinsic aspect ~16.78 (very wide, thin)
  if (view === "front") {
    const w = 34;
    const h = w / 16.78;
    return (
      <g data-testid="overlay-dash">
        <image href={sprite} x={50 - w / 2} y={21.2} width={w} height={h} preserveAspectRatio="none"
          style={{ filter: "drop-shadow(0 0 1.4px rgba(255,60,60,0.5)) drop-shadow(0 0 1.4px rgba(60,120,255,0.5))" }} />
      </g>
    );
  }
  if (view === "hero") {
    const w = 22;
    const h = w / 16.78;
    return (
      <g data-testid="overlay-dash" transform="rotate(-3 44 20)">
        <image href={sprite} x={35} y={19.2} width={w} height={h} preserveAspectRatio="none"
          style={{ filter: "drop-shadow(0 0 1.2px rgba(255,60,60,0.5)) drop-shadow(0 0 1.2px rgba(60,120,255,0.5))" }} />
      </g>
    );
  }
  return null;
}

// Rear hatch warning lights — interior deck light on the rear glass/liftgate
function RearHatchLights({ view, colors }: { view: ViewId; colors: string[] }) {
  if (view === "rear") {
    return (
      <g data-testid="overlay-hatch">
        <DeckLight x={28} y={21.8} w={44} colors={colors} id="hatch" />
      </g>
    );
  }
  if (view === "hero") {
    return (
      <g data-testid="overlay-hatch">
        <DeckLight x={70} y={23.6} w={13} colors={colors} id="hatch" rot={4} />
      </g>
    );
  }
  return null;
}

export function VehicleOverlays({ view, params, pushBarPlacement }: Props) {
  const pbPlace = pushBarPlacement?.[view];
  return (
    <svg
      viewBox="0 0 100 75"
      className="absolute inset-0 h-full w-full pointer-events-none"
      preserveAspectRatio="xMidYMid meet"
      data-testid="svg-overlays"
    >
      <defs>
        <filter id="dashGlow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <filter id="hatchGlow" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <radialGradient id="dashBloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="hatchBloom" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      {params.pushBar && <PushBar place={pbPlace} />}
      {params.dashLighting && <DashLighting view={view} sprite={ilsSprite(params)} />}
      {params.rearHatchLights && <RearHatchLights view={view} colors={deckColors(params)} />}
    </svg>
  );
}
