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

// Push bumper — modeled on the Westin Public Safety Push Bumper EliteXD:
// two heavy HRPO-steel uprights wrapped in rubber, a removable punch-plate
// grille guard, and an extra-wide stylized center cross-plate. Front + hero.
function PushBar({ view }: { view: ViewId }) {
  if (view === "front") {
    return (
      <g data-testid="overlay-pushbar">
        {/* punch-plate grille guard behind the uprights */}
        <rect x="32" y="40" width="36" height="9.5" rx="1.2" fill="#0e1116" stroke="#2b313b" strokeWidth="0.4" />
        {/* perforation dots (punch plate) */}
        {Array.from({ length: 9 }).map((_, r) =>
          Array.from({ length: 30 }).map((_, c) => (
            <circle key={`${r}-${c}`} cx={33 + c * 1.13} cy={41 + r * 0.95} r="0.22" fill="#00000055" />
          ))
        )}
        {/* two heavy uprights with rubber wrap */}
        <rect x="38" y="39" width="3" height="11" rx="1" fill="#151a20" stroke="#333b46" strokeWidth="0.4" />
        <rect x="59" y="39" width="3" height="11" rx="1" fill="#151a20" stroke="#333b46" strokeWidth="0.4" />
        {/* rubber strip highlight on uprights */}
        <rect x="38.9" y="40" width="1.2" height="9" rx="0.6" fill="#2a2f37" />
        <rect x="59.9" y="40" width="1.2" height="9" rx="0.6" fill="#2a2f37" />
        {/* extra-wide stylized center cross-plate */}
        <rect x="41" y="43" width="18" height="3.4" rx="0.8" fill="#1b212a" stroke="#3a424e" strokeWidth="0.4" />
        <rect x="41" y="44" width="18" height="1" rx="0.5" fill="#0b0e13" opacity="0.7" />
        {/* outboard wrap-around wings */}
        <path d="M32 44 Q28 44.5 27 47.5" fill="none" stroke="#1b212a" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M68 44 Q72 44.5 73 47.5" fill="none" stroke="#1b212a" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    );
  }
  if (view === "hero") {
    return (
      <g data-testid="overlay-pushbar" transform="rotate(-4 33 44)">
        <rect x="19" y="40" width="30" height="8.5" rx="1.2" fill="#0e1116" stroke="#2b313b" strokeWidth="0.4" />
        {Array.from({ length: 7 }).map((_, r) =>
          Array.from({ length: 24 }).map((_, c) => (
            <circle key={`${r}-${c}`} cx={20 + c * 1.2} cy={41 + r * 1.0} r="0.2" fill="#00000055" />
          ))
        )}
        <rect x="23" y="39" width="2.8" height="10" rx="1" fill="#151a20" stroke="#333b46" strokeWidth="0.4" />
        <rect x="42" y="39" width="2.8" height="10" rx="1" fill="#151a20" stroke="#333b46" strokeWidth="0.4" />
        <rect x="26" y="43" width="16" height="3" rx="0.8" fill="#1b212a" stroke="#3a424e" strokeWidth="0.4" />
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
