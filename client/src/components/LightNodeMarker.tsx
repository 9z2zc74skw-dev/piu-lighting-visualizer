import { useRef } from "react";
import { LightNode, SKU_MAP, LIGHT_COLOR_MAP } from "@/lib/catalog";
import { LightFixture } from "./LightFixture";
import { X, RotateCw } from "lucide-react";

interface Props {
  node: LightNode;
  selected: boolean;
  showCoverage: boolean;
  stageRef: React.RefObject<HTMLDivElement>;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  onRotate: (id: string) => void;
}

export function LightNodeMarker({
  node,
  selected,
  showCoverage,
  stageRef,
  onSelect,
  onMove,
  onRemove,
  onRotate,
}: Props) {
  const type = SKU_MAP[node.typeId];
  const dragging = useRef(false);
  const isEquipment = type.spreadDeg === 0; // siren/control = no warning cone

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
      data-testid={`node-${node.id}`}
    >
      {/* coverage cone (warning lights only) — split gradient of both colors */}
      {showCoverage && !isEquipment && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ transform: `translate(-50%,-50%) rotate(${node.rotation}deg)` }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: `${type.spreadDeg / 3}px solid transparent`,
              borderRight: `${type.spreadDeg / 3}px solid transparent`,
              borderBottom: `${type.spreadDeg / 1.6}px solid ${c1.glow}`,
              opacity: 0.32,
              transformOrigin: "top center",
              filter: "blur(1.5px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 0,
              height: 0,
              borderLeft: `${type.spreadDeg / 3}px solid transparent`,
              borderRight: `${type.spreadDeg / 3}px solid transparent`,
              borderBottom: `${type.spreadDeg / 1.6}px solid ${c2.glow}`,
              opacity: 0.22,
              transformOrigin: "top center",
              transform: "scaleX(0.5) translateX(100%)",
              filter: "blur(1.5px)",
            }}
          />
        </div>
      )}

      {/* the fixture body */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative cursor-grab active:cursor-grabbing rounded-[3px] transition-shadow ${
          selected ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : ""
        }`}
        style={{
          transform: `rotate(${node.rotation}deg)`,
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
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(node.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border hover-elevate"
              title="Rotate"
              data-testid={`button-rotate-${node.id}`}
            >
              <RotateCw className="h-3 w-3" />
            </button>
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
