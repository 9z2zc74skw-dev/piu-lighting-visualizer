import { ViewId, BuildParams, schemeColors, LIGHT_COLOR_MAP } from "@/lib/catalog";

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
}

// Alternating LED colors for the interior deck lights, from the dept scheme.
function deckColors(params: BuildParams): string[] {
  const run = schemeColors(params.colorScheme);
  return [LIGHT_COLOR_MAP[run.c1].hex, LIGHT_COLOR_MAP[run.c2].hex];
}

// Westin HDX Grille Guard — CENTER SECTION ONLY (current customer spec):
//  • two heavy vertical uprights framing the grille
//  • a top cross-tube spanning between them
//  • a perforated punch-plate (Westin logo skid plate) at the bottom center
//  • textured black powder-coat finish with tubular steel shading
// The optional PIT / headlight wrap wings are gated behind HDX_WINGS so we can
// switch them on later if a customer orders the full wrap-around guard.
const HDX_WINGS = false;
function PushBar({ view }: { view: ViewId }) {
  if (view === "front") {
    // grille-guard geometry (0-100 x 0-75 viewBox)
    const topY = 33;          // top cross-tube height
    const botY = 50;          // bottom of uprights
    const uL = 39, uR = 59;   // upright centers
    const tw = 2.4;           // tube thickness
    // punch plate
    const px = 42, pw = 16, py = 44, ph = 6.5;
    return (
      <g data-testid="overlay-pushbar">
        <defs>
          <linearGradient id="hdxTube" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04060a" />
            <stop offset="30%" stopColor="#333b48" />
            <stop offset="52%" stopColor="#1a1f27" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="hdxTubeH" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#333b48" />
            <stop offset="45%" stopColor="#1a1f27" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="hdxPlate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c333f" />
            <stop offset="40%" stopColor="#12161c" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
          <clipPath id="hdxPlateClip">
            <rect x={px} y={py} width={pw} height={ph} rx="1" />
          </clipPath>
        </defs>

        {/* optional PIT / headlight wrap wings (off by default) */}
        {HDX_WINGS && (
          <>
            <path d={`M${uL} ${topY + 1} Q31 ${topY + 2} 29 ${botY - 1}`}
              fill="none" stroke="url(#hdxTubeH)" strokeWidth={tw} strokeLinecap="round" />
            <path d={`M${uR} ${topY + 1} Q69 ${topY + 2} 71 ${botY - 1}`}
              fill="none" stroke="url(#hdxTubeH)" strokeWidth={tw} strokeLinecap="round" />
          </>
        )}

        {/* top cross-tube spanning the two uprights (with a slight bow up) */}
        <path d={`M${uL} ${topY} Q50 ${topY - 2.4} ${uR} ${topY}`}
          fill="none" stroke="url(#hdxTube)" strokeWidth={tw} strokeLinecap="round" />
        {/* specular highlight on the top tube */}
        <path d={`M${uL + 1} ${topY - 0.7} Q50 ${topY - 3} ${uR - 1} ${topY - 0.7}`}
          fill="none" stroke="#5a6474" strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />

        {/* two vertical uprights */}
        <rect x={uL - tw / 2} y={topY} width={tw} height={botY - topY} rx={tw / 2} fill="url(#hdxTube)" />
        <rect x={uR - tw / 2} y={topY} width={tw} height={botY - topY} rx={tw / 2} fill="url(#hdxTube)" />
        {/* specular edge on uprights */}
        <rect x={uL - tw / 2 + 0.5} y={topY + 1} width="0.5" height={botY - topY - 2} rx="0.25" fill="#5a6474" opacity="0.7" />
        <rect x={uR - tw / 2 + 0.5} y={topY + 1} width="0.5" height={botY - topY - 2} rx="0.25" fill="#5a6474" opacity="0.7" />

        {/* mid brace tube between uprights (above the plate) */}
        <rect x={uL} y="41" width={uR - uL} height={tw * 0.8} rx={tw * 0.4} fill="url(#hdxTube)" transform="" />

        {/* perforated punch-plate skid guard at bottom center */}
        <rect x={px} y={py} width={pw} height={ph} rx="1" fill="url(#hdxPlate)" stroke="#454e5c" strokeWidth="0.4" />
        <g clipPath="url(#hdxPlateClip)">
          {Array.from({ length: 5 }).map((_, r) =>
            Array.from({ length: 13 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={px + 1.3 + c * 1.15} cy={py + 1.2 + r * 1.1} r="0.26" fill="#00000070" />
            ))
          )}
        </g>
        <rect x={px + 0.4} y={py + 0.3} width={pw - 0.8} height="0.6" rx="0.3" fill="#4a5361" opacity="0.8" />
      </g>
    );
  }
  if (view === "hero") {
    // 3/4 hero: same guard, foreshortened & rotated to sit on the front fascia
    const topY = 33, botY = 49;
    const uL = 24, uR = 43, tw = 2.2;
    const px = 27, pw = 14, py = 43.5, ph = 6;
    return (
      <g data-testid="overlay-pushbar" transform="rotate(-5 34 44)">
        <defs>
          <linearGradient id="hdxTube2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04060a" />
            <stop offset="30%" stopColor="#333b48" />
            <stop offset="52%" stopColor="#1a1f27" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="hdxPlate2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c333f" />
            <stop offset="40%" stopColor="#12161c" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
          <clipPath id="hdxPlateClip2">
            <rect x={px} y={py} width={pw} height={ph} rx="1" />
          </clipPath>
        </defs>
        {/* optional PIT / headlight wrap wing (off by default) */}
        {HDX_WINGS && (
          <path d={`M${uR} ${topY + 1} Q${uR + 4} ${topY + 2} ${uR + 5} ${botY - 1}`}
            fill="none" stroke="url(#hdxTube2)" strokeWidth={tw} strokeLinecap="round" />
        )}
        {/* top cross-tube */}
        <path d={`M${uL} ${topY} Q${(uL + uR) / 2} ${topY - 2.2} ${uR} ${topY}`}
          fill="none" stroke="url(#hdxTube2)" strokeWidth={tw} strokeLinecap="round" />
        <path d={`M${uL + 1} ${topY - 0.6} Q${(uL + uR) / 2} ${topY - 2.7} ${uR - 1} ${topY - 0.6}`}
          fill="none" stroke="#5a6474" strokeWidth="0.45" strokeLinecap="round" opacity="0.7" />
        {/* uprights */}
        <rect x={uL - tw / 2} y={topY} width={tw} height={botY - topY} rx={tw / 2} fill="url(#hdxTube2)" />
        <rect x={uR - tw / 2} y={topY} width={tw} height={botY - topY} rx={tw / 2} fill="url(#hdxTube2)" />
        <rect x={uL - tw / 2 + 0.4} y={topY + 1} width="0.45" height={botY - topY - 2} rx="0.2" fill="#5a6474" opacity="0.7" />
        {/* mid brace */}
        <rect x={uL} y="41" width={uR - uL} height={tw * 0.8} rx={tw * 0.4} fill="url(#hdxTube2)" />
        {/* punch-plate */}
        <rect x={px} y={py} width={pw} height={ph} rx="1" fill="url(#hdxPlate2)" stroke="#454e5c" strokeWidth="0.4" />
        <g clipPath="url(#hdxPlateClip2)">
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 11 }).map((_, c) => (
              <circle key={`${r}-${c}`} cx={px + 1.3 + c * 1.18} cy={py + 1.2 + r * 1.15} r="0.24" fill="#00000070" />
            ))
          )}
        </g>
        <rect x={px + 0.4} y={py + 0.3} width={pw - 0.8} height="0.5" rx="0.25" fill="#4a5361" opacity="0.8" />
      </g>
    );
  }
  return null;
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

export function VehicleOverlays({ view, params }: Props) {
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
      {params.pushBar && <PushBar view={view} />}
      {params.dashLighting && <DashLighting view={view} sprite={ilsSprite(params)} />}
      {params.rearHatchLights && <RearHatchLights view={view} colors={deckColors(params)} />}
    </svg>
  );
}
