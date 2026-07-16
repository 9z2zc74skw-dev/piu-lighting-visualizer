import { useRef } from "react";
import { LightNode, SKU_MAP, LIGHT_COLOR_MAP } from "@/lib/catalog";
import { LightFixture } from "./LightFixture";
import { X, RotateCw, FlipVertical2 } from "lucide-react";

interface Props {
  node: LightNode;
  selected: boolean;
  stageRef: React.RefObject<HTMLDivElement>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
  onFlipOrientation: (id: string) => void;
}

export function LightNodeMarker({
  node,
  selected,
  stageRef,
  onSelect,
  onMove,
  onRemove,
  onRotate,
  onFlipOrientation,
}: Props) {
  const type = SKU_MAP[node.typeId];
  const dragging = useRef(false);
  const isEquipment = type.spreadDeg === 0; // siren/control = no warning cone
  // Vertical orientation rotates the fixture body (and its cone) an extra 90°
  // so the long axis runs up/down (e.g. MPS1200-series on the hatch pillars).
  const orientDeg = node.orientation === "vertical" ? 90 : 0;
  const bodyRot = node.rotation + orientDeg;

  const c1 = LIGHT_COLOR_MAP[node.color1];
  const c2 = LIGHT_COLOR_MAP[node.color2];

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
    onMove(node.id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    dragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 touch-none"
      style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: selected ? 40 : 20 }}
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
          transform: `rotate(${bodyRot}deg)`,
          filter: isEquipment
            ? "drop-shadow(0 1px 3px rgba(0,0,0,0.6))"
            : `drop-shadow(0 0 ${selected ? 8 : 5}px ${c1.glow}) drop-shadow(0 0 ${
                selected ? 10 : 6
              }px ${c2.glow})`,
        }}
        data-testid={`marker-${node.id}`}
      >
        <LightFixture sku={type} color1={node.color1} color2={node.color2} scale={selected ? 1.15 : 1} />
      </div>

      {/* SKU tag on selected */}
      {selected && (
        <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {type.sku} · {type.name}
        </div>
      )}

      {/* controls when selected */}
      {selected && (
        <div className="absolute -top-4 left-full ml-1 flex gap-1">
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
