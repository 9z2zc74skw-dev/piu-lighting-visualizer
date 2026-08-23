import { LightNode, SKU_MAP } from "@/lib/catalog";
import { LightFixture } from "./LightFixture";

/**
 * A read-only, non-interactive mirror of a front-view roof lightbar shown on the
 * OTHER views, because a roof-mounted bar is physically visible from more than
 * one angle:
 *   - rear (closed hatch): the FULL width of the bar across the roofline
 *   - left / right side:    just the END of the bar (a short end-cap slice)
 *
 * These ghosts are derived from the real front-view node at render time — they
 * are not stored, cannot be selected/moved/deleted, and always follow the front
 * bar. Editing (move / recolor / remove) happens on the front node.
 */

export type GhostKind = "full" | "endcap";

interface Props {
  node: LightNode; // the source front-view bar node
  kind: GhostKind;
  x: number; // stage position (percent)
  y: number;
  barScale?: number; // per-vehicle roof-bar width multiplier
}

export function GhostBar({ node, kind, x, y, barScale = 1 }: Props) {
  const type = SKU_MAP[node.typeId];
  if (!type) return null;

  // The end-cap on a side view shows only the tip of the bar. We clip the full
  // fixture to a narrow sliver and align it to the roof edge so it reads as the
  // bar seen edge-on. The full (rear) ghost renders the whole fixture.
  const isEndcap = kind === "endcap";

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: 15,
        // Slightly dimmed so it reads as a secondary/derived indicator rather
        // than a primary editable light.
        opacity: 0.92,
        // Clip to an end-cap sliver for the side views.
        width: isEndcap ? 22 : undefined,
        height: isEndcap ? 40 : undefined,
        overflow: isEndcap ? "hidden" : "visible",
        display: "flex",
        alignItems: "center",
        justifyContent: isEndcap ? "flex-start" : "center",
        filter: `drop-shadow(0 0 4px rgba(0,0,0,0.5))`,
      }}
      data-testid={`ghost-${kind}-${node.id}`}
      aria-hidden="true"
    >
      <LightFixture
        sku={type}
        color1={node.color1}
        color2={node.color2}
        scale={(isEndcap ? 0.9 : 1) * barScale}
      />
    </div>
  );
}
