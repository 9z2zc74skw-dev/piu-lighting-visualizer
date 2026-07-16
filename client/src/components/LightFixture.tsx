import { SkuType, LightColorId, LIGHT_COLOR_MAP } from "@/lib/catalog";

interface Props {
  sku: SkuType;
  color1: LightColorId;
  color2: LightColorId;
  scale?: number; // multiply base dimensions (default 1)
}

// Renders a realistic emergency-light fixture body with individually lit
// LED segments. Segments alternate between color1 and color2 to represent
// a split dual-color head (e.g. red/blue). Equipment (siren/control) renders
// as a dark control box with a status LED.
export function LightFixture({ sku, color1, color2, scale = 1 }: Props) {
  const c1 = LIGHT_COLOR_MAP[color1];
  const c2 = LIGHT_COLOR_MAP[color2];

  // ---- Equipment: dark control box, no warning color ----
  if (sku.shape === "equip") {
    const w = 26 * scale;
    const h = 16 * scale;
    return (
      <svg width={w} height={h} viewBox="0 0 26 16" style={{ overflow: "visible" }}>
        <rect x="0.5" y="0.5" width="25" height="15" rx="2.5" fill="#1f2937" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />
        <rect x="3" y="3" width="20" height="6" rx="1" fill="#111827" />
        <circle cx="21.5" cy="12" r="1.4" fill="#8b5cf6" />
        <line x1="4" y1="12" x2="14" y2="12" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }

  // ---- Warning heads: linear bodies with lit LED segments ----
  // Base body dimensions per shape (long axis x short axis, in svg units)
  const geom: Record<string, { w: number; h: number; r: number }> = {
    bar: { w: 46, h: 12, r: 3 },
    wide: { w: 34, h: 14, r: 3 },
    stick: { w: 92, h: 10, r: 2.5 },
    module: { w: 22, h: 16, r: 3 },
    scene: { w: 30, h: 12, r: 3 },
  };
  const g = geom[sku.shape] ?? geom.bar;
  const segCount = Math.max(1, sku.segments);
  const w = g.w * scale;
  const h = g.h * scale;

  // Segment layout inside the body
  const pad = 1.6;
  const gap = 0.8;
  const innerW = g.w - pad * 2;
  const segW = (innerW - gap * (segCount - 1)) / segCount;

  const segColorId = (i: number) => (i % 2 === 0 ? color1 : color2);
  const segColor = (i: number) => LIGHT_COLOR_MAP[segColorId(i)];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${g.w} ${g.h}`}
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        <filter id={`glow-${sku.id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* housing */}
      <rect
        x="0.4"
        y="0.4"
        width={g.w - 0.8}
        height={g.h - 0.8}
        rx={g.r}
        fill="#0b0d12"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.9"
      />

      {/* lit LED segments */}
      <g filter={`url(#glow-${sku.id})`}>
        {Array.from({ length: segCount }).map((_, i) => {
          const col = segColor(i);
          const x = pad + i * (segW + gap);
          return (
            <g key={i}>
              <rect
                x={x}
                y={pad}
                width={segW}
                height={g.h - pad * 2}
                rx={Math.min(1.4, segW / 2)}
                fill={col.hex}
              />
              {/* bright center highlight for lit look */}
              <rect
                x={x + segW * 0.22}
                y={pad + (g.h - pad * 2) * 0.22}
                width={segW * 0.56}
                height={(g.h - pad * 2) * 0.56}
                rx={0.8}
                fill="rgba(255,255,255,0.55)"
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
