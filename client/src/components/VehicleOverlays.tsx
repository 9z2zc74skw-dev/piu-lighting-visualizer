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
    // Westin HDX base push bumper (front, straight-on). 0-100 x 0-75 viewBox.
    // Inverted-U tube frame (top hoop + two side rails) with a full expanded-
    // metal mesh center panel and a heavy bottom rail.
    const fx = 38, frw = 24;        // frame left / width
    const topY = 34, botY = 50;     // frame top / bottom
    const tw = 1.9;                 // tube thickness
    const inX = fx + tw, inW = frw - tw * 2;         // mesh interior
    const inY = topY + tw, inH = botY - topY - tw * 2;
    return (
      <g data-testid="overlay-pushbar">
        <defs>
          <linearGradient id="hdxTube" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04060a" />
            <stop offset="32%" stopColor="#3a4250" />
            <stop offset="55%" stopColor="#1a1f27" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="hdxMesh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20252d" />
            <stop offset="45%" stopColor="#12161c" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
          {/* fine expanded-metal mesh: diagonal cross weave */}
          <pattern id="hdxMeshPat" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="1.4" height="1.4" fill="#0b0e13" />
            <rect width="0.5" height="1.4" fill="#2b323d" opacity="0.85" />
            <rect width="1.4" height="0.5" fill="#232a33" opacity="0.7" />
          </pattern>
          <clipPath id="hdxMeshClip">
            <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" />
          </clipPath>
        </defs>

        {/* mesh center panel (fills the frame) */}
        <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" fill="url(#hdxMesh)" />
        <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" fill="url(#hdxMeshPat)" clipPath="url(#hdxMeshClip)" />

        {/* inverted-U tube frame: top hoop + two side rails, drawn as one path */}
        <path
          d={`M${fx} ${botY} L${fx} ${topY + 2.4} Q${fx} ${topY} ${fx + 2.4} ${topY} L${fx + frw - 2.4} ${topY} Q${fx + frw} ${topY} ${fx + frw} ${topY + 2.4} L${fx + frw} ${botY}`}
          fill="none" stroke="url(#hdxTube)" strokeWidth={tw} strokeLinecap="round" strokeLinejoin="round"
        />
        {/* specular highlight along the top hoop */}
        <path
          d={`M${fx + 0.6} ${topY + 3} Q${fx + 0.6} ${topY + 0.6} ${fx + 3} ${topY + 0.6} L${fx + frw - 3} ${topY + 0.6}`}
          fill="none" stroke="#5f6a7a" strokeWidth="0.45" strokeLinecap="round" opacity="0.75"
        />

        {/* heavy bottom rail across the base */}
        <rect x={fx - 0.4} y={botY - 1.2} width={frw + 0.8} height="2.4" rx="1.2" fill="url(#hdxTube)" />
        <rect x={fx + 0.6} y={botY - 0.9} width={frw - 1.2} height="0.5" rx="0.25" fill="#5f6a7a" opacity="0.7" />

        {/* two mounting legs dropping from the bottom rail to the bumper */}
        <rect x={fx + 4} y={botY + 0.8} width={tw * 0.9} height="3" rx="0.6" fill="url(#hdxTube)" />
        <rect x={fx + frw - 4 - tw * 0.9} y={botY + 0.8} width={tw * 0.9} height="3" rx="0.6" fill="url(#hdxTube)" />

        {/* optional PIT bars / wing wraps (off by default — gated for later) */}
        {HDX_WINGS && (
          <>
            <path d={`M${fx} ${topY + 2} Q${fx - 6} ${topY + 3} ${fx - 8} ${botY - 1}`}
              fill="none" stroke="url(#hdxTube)" strokeWidth={tw} strokeLinecap="round" />
            <path d={`M${fx + frw} ${topY + 2} Q${fx + frw + 6} ${topY + 3} ${fx + frw + 8} ${botY - 1}`}
              fill="none" stroke="url(#hdxTube)" strokeWidth={tw} strokeLinecap="round" />
          </>
        )}
      </g>
    );
  }
  if (view === "hero") {
    // 3/4 hero: HDX base push bumper, foreshortened & rotated onto the fascia.
    const fx = 22, frw = 22;
    const topY = 33, botY = 49;
    const tw = 1.8;
    const inX = fx + tw, inW = frw - tw * 2;
    const inY = topY + tw, inH = botY - topY - tw * 2;
    return (
      <g data-testid="overlay-pushbar" transform="rotate(-5 33 44)">
        <defs>
          <linearGradient id="hdxTube2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#04060a" />
            <stop offset="32%" stopColor="#3a4250" />
            <stop offset="55%" stopColor="#1a1f27" />
            <stop offset="100%" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="hdxMesh2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20252d" />
            <stop offset="45%" stopColor="#12161c" />
            <stop offset="100%" stopColor="#080a0e" />
          </linearGradient>
          <pattern id="hdxMeshPat2" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="1.4" height="1.4" fill="#0b0e13" />
            <rect width="0.5" height="1.4" fill="#2b323d" opacity="0.85" />
            <rect width="1.4" height="0.5" fill="#232a33" opacity="0.7" />
          </pattern>
          <clipPath id="hdxMeshClip2">
            <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" />
          </clipPath>
        </defs>
        {/* mesh center panel */}
        <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" fill="url(#hdxMesh2)" />
        <rect x={inX} y={inY} width={inW} height={inH} rx="0.8" fill="url(#hdxMeshPat2)" clipPath="url(#hdxMeshClip2)" />
        {/* inverted-U tube frame */}
        <path
          d={`M${fx} ${botY} L${fx} ${topY + 2.2} Q${fx} ${topY} ${fx + 2.2} ${topY} L${fx + frw - 2.2} ${topY} Q${fx + frw} ${topY} ${fx + frw} ${topY + 2.2} L${fx + frw} ${botY}`}
          fill="none" stroke="url(#hdxTube2)" strokeWidth={tw} strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d={`M${fx + 0.5} ${topY + 2.6} Q${fx + 0.5} ${topY + 0.5} ${fx + 2.6} ${topY + 0.5} L${fx + frw - 2.6} ${topY + 0.5}`}
          fill="none" stroke="#5f6a7a" strokeWidth="0.4" strokeLinecap="round" opacity="0.75"
        />
        {/* heavy bottom rail */}
        <rect x={fx - 0.4} y={botY - 1.1} width={frw + 0.8} height="2.2" rx="1.1" fill="url(#hdxTube2)" />
        <rect x={fx + 0.6} y={botY - 0.8} width={frw - 1.2} height="0.45" rx="0.22" fill="#5f6a7a" opacity="0.7" />
        {/* mounting legs */}
        <rect x={fx + 3.5} y={botY + 0.6} width={tw * 0.9} height="2.6" rx="0.55" fill="url(#hdxTube2)" />
        <rect x={fx + frw - 3.5 - tw * 0.9} y={botY + 0.6} width={tw * 0.9} height="2.6" rx="0.55" fill="url(#hdxTube2)" />
        {/* optional PIT bars / wing wraps (off by default) */}
        {HDX_WINGS && (
          <path d={`M${fx + frw} ${topY + 2} Q${fx + frw + 5} ${topY + 3} ${fx + frw + 6} ${botY - 1}`}
            fill="none" stroke="url(#hdxTube2)" strokeWidth={tw} strokeLinecap="round" />
        )}
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
