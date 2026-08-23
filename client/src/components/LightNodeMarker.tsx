import { useRef } from "react";
import { LightNode, SKU_MAP, LIGHT_COLOR_MAP } from "@/lib/catalog";
import { LightFixture } from "./LightFixture";
import { X, RotateCw, FlipVertical2 } from "lucide-react";

interface Props {
  node: LightNode;
  selected: boolean;
  stageRef: React.RefObject<HTMLDivElement>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number, alt: boolean) => void;
  onEndDrag: () => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onFlipOrientation: (id: string) => void;
  // Per-vehicle roof-bar width multiplier (applies only to the ALGT roof bar).
  barScale?: number;
}

export function LightNodeMarker({
  node,
  selected,
  stageRef,
  onSelect,
  onMove,
  onEndDrag,
  onRemove,
  onRotate,
  onFlipOrientation,
  barScale = 1,
}: Props) {
  const type = SKU_MAP[node.typeId];
  // The full-width roof lightbar scales per vehicle so it fits each roofline.
  const fixtureScaleMul = type?.shape === "algt" ? barScale : 1;
  const dragging = useRef(false);
  const isEquipment = type.spreadDeg === 0; // siren/control = no warning cone
  // Vertical orientation rotates the fixture body (and its cone) an extra 90°
  // so the long axis runs up/down (e.g. MPS1200-series on the hatch pillars).
  const orientDeg = node.orientation === "vertical" ? 90 : 0;
  const bodyRot = node.rotation + orientDeg;

  const c1 = LIGHT_COLOR_MAP[node.color1];
  const c2 = LIGHT_COLOR_MAP[node.color2];

  // Edge awareness: when a light sits near the RIGHT edge, the control cluster
  // (rotate/flip/remove) would overflow off the stage and become unclickable —
  // this is what made corner placements (e.g. rear quarter glass) hard to grab.
  // Flip the controls to the LEFT of the fixture near the right edge, and drop
  // the SKU tag ABOVE the fixture when it's near the bottom.
  const nearRight = node.x > 72;
  const nearTop = node.y < 14;
  const nearBottom = node.y > 86;

  // Stacking: narrower fixtures sit ABOVE wider ones so that a wide bar (roof
  // lightbar / ILS stick) never traps a small light beneath its hit box. A
  // selected node always jumps to the very top. Width is the fixture's on-stage
  // base width; smaller width -> higher z (base 20, +up to ~15 for tiny heads).
  const fxW = type.baseW ?? type.lengthPx ?? 60;
  const widthZ = 20 + Math.round(Math.max(0, Math.min(15, (200 - fxW) / 12)));
  const zIndex = selected ? 60 : widthZ;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(node.id);
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Hold Option (⌥) OR Command (⌘) on Mac — or Alt/Ctrl on Windows — to
    // temporarily bypass snapping for fine, free placement.
    const bypass = e.altKey || e.metaKey || e.ctrlKey;
    onMove(node.id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)), bypass);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    onEndDrag();
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 touch-none"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        zIndex,
        // The wrapper must NOT capture pointer events across its full bounding
        // box — otherwise a wide fixture (roof bar / ILS stick) blankets and
        // "locks" the smaller lights beneath it. Only the fixture body below
        // re-enables pointer events, so clicks fall through transparent areas
        // to whatever light is actually underneath the cursor.
        pointerEvents: "none",
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid={`node-${node.id}`}
    >
      {/* the fixture body */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative cursor-grab active:cursor-grabbing rounded-[3px] transition-shadow ${
          selected ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : ""
        }`}
        style={{
          // Re-enable pointer events on the fixture body only (the wrapper is
          // set to pointer-events:none so wide bars don't blanket smaller
          // lights). The image inside has pointer-events:none, so the grab area
          // is this body box — sized to the fixture, not the wrapper's padding.
          pointerEvents: "auto",
          transform: `rotate(${bodyRot}deg)`,
          filter: isEquipment
            ? "drop-shadow(0 1px 3px rgba(0,0,0,0.6))"
            : `drop-shadow(0 0 ${selected ? 8 : 5}px ${c1.glow}) drop-shadow(0 0 ${
                selected ? 10 : 6
              }px ${c2.glow})`,
        }}
        data-testid={`marker-${node.id}`}
      >
        <LightFixture
          sku={type}
          color1={node.color1}
          color2={node.color2}
          // Roof bar keeps a constant width when selected (no 1.12x zoom) so its
          // ends don't visually pop past the roof edge on selection.
          scale={(selected && type?.shape !== "algt" ? 1.12 : 1) * fixtureScaleMul}
        />
      </div>

      {/* SKU tag on selected — drops below by default, flips above near bottom */}
      {selected && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-medium text-white ${
            nearBottom ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {type.sku} · {type.name}
        </div>
      )}

      {/* controls when selected — sit to the right by default, flip to the left
          near the right edge so they never overflow off the stage */}
      {selected && (
        <div
          className={`absolute flex gap-1 ${nearTop ? "top-0" : "-top-4"} ${
            nearRight ? "right-full mr-1" : "left-full ml-1"
          }`}
          // The wrapper is pointer-events:none (so wide bars don't blanket
          // smaller lights). Re-enable events here so the rotate/flip/remove
          // buttons are actually clickable.
          style={{ pointerEvents: "auto" }}
        >
          {!isEquipment && (
            <>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate(node.id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border hover-elevate"
                title="Rotate 45°"
                data-testid={`button-rotate-${node.id}`}
              >
                <RotateCw className="h-3 w-3" />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onFlipOrientation(node.id);
                }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border hover-elevate"
                title={node.orientation === "vertical" ? "Make horizontal" : "Make vertical"}
                data-testid={`button-orient-${node.id}`}
              >
                <FlipVertical2 className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(node.id);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground border border-border hover-elevate"
            title="Remove"
            data-testid={`button-remove-${node.id}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
