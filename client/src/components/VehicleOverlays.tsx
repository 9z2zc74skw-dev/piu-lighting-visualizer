import { ViewId, BuildParams } from "@/lib/catalog";

// SVG overlays drawn on top of the vehicle render. Coordinates are in a
// 0-100 x 0-75 viewBox (4:3) so they line up with the object-contain image.

interface Props {
  view: ViewId;
  params: BuildParams;
}

// Push bar — front views only (front + hero)
function PushBar({ view }: { view: ViewId }) {
  if (view === "front") {
    return (
      <g data-testid="overlay-pushbar">
        {/* center + wing sections of a front push bar */}
        <rect x="30" y="46" width="40" height="3.4" rx="1.2" fill="#111827" stroke="#374151" strokeWidth="0.5" />
        <rect x="24" y="47" width="7" height="2.4" rx="1" fill="#1f2937" stroke="#374151" strokeWidth="0.4" />
        <rect x="69" y="47" width="7" height="2.4" rx="1" fill="#1f2937" stroke="#374151" strokeWidth="0.4" />
        {/* vertical uprights */}
        <rect x="36" y="42" width="2.4" height="8" rx="0.8" fill="#111827" />
        <rect x="61.6" y="42" width="2.4" height="8" rx="0.8" fill="#111827" />
      </g>
    );
  }
  if (view === "hero") {
    return (
      <g data-testid="overlay-pushbar">
        <rect x="19" y="42" width="30" height="3.2" rx="1.2" fill="#111827" stroke="#374151" strokeWidth="0.5" transform="rotate(-4 34 44)" />
        <rect x="22" y="38" width="2.2" height="8" rx="0.8" fill="#111827" transform="rotate(-4 23 42)" />
        <rect x="42" y="38" width="2.2" height="8" rx="0.8" fill="#111827" transform="rotate(-4 43 42)" />
      </g>
    );
  }
  return null;
}

// Interior dash lighting — visible through windshield (front/hero) and reflected feel
function DashLighting({ view }: { view: ViewId }) {
  const bar = (x: number, y: number, w: number) => (
    <rect x={x} y={y} width={w} height="1.6" rx="0.8" fill="url(#dashGrad)" />
  );
  if (view === "front") {
    return (
      <g data-testid="overlay-dash" opacity="0.95">
        {bar(33, 22, 34)}
      </g>
    );
  }
  if (view === "hero") {
    return (
      <g data-testid="overlay-dash" opacity="0.95">
        {bar(34, 20, 20)}
      </g>
    );
  }
  return null;
}

// Rear hatch warning lights — rear + hero back glass
function RearHatchLights({ view }: { view: ViewId }) {
  if (view === "rear") {
    return (
      <g data-testid="overlay-hatch">
        <rect x="26" y="22" width="48" height="2.4" rx="1.2" fill="url(#hatchGrad)" />
        <rect x="26" y="25" width="48" height="1.2" rx="0.6" fill="url(#hatchGrad)" opacity="0.6" />
      </g>
    );
  }
  if (view === "hero") {
    return (
      <g data-testid="overlay-hatch">
        <rect x="70" y="24" width="14" height="2" rx="1" fill="url(#hatchGrad)" transform="rotate(4 77 25)" />
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
        <linearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff2b2b" />
          <stop offset="50%" stopColor="#2b6bff" />
          <stop offset="100%" stopColor="#ff2b2b" />
        </linearGradient>
        <linearGradient id="hatchGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffab1a" />
          <stop offset="25%" stopColor="#ff2b2b" />
          <stop offset="50%" stopColor="#2b6bff" />
          <stop offset="75%" stopColor="#ff2b2b" />
          <stop offset="100%" stopColor="#ffab1a" />
        </linearGradient>
      </defs>
      {params.pushBar && <PushBar view={view} />}
      {params.dashLighting && <DashLighting view={view} />}
      {params.rearHatchLights && <RearHatchLights view={view} />}
    </svg>
  );
}
