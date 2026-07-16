import { useRef } from "react";
import { LightNode, SKU_MAP, LIGHT_COLOR_MAP } from "@/lib/catalog";
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
  const color = LIGHT_COLOR_MAP[node.color];
  const dragging = useRef(false);
  const isEquipment = type.spreadDeg === 0; // siren/control = no warning cone

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
      {/* coverage cone (warning lights only) */}
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
              borderBottom: `${type.spreadDeg / 1.6}px solid ${color.glow}`,
              opacity: 0.4,
              transformOrigin: "top center",
              filter: "blur(1px)",
            }}
          />
        </div>
      )}

      {/* the node marker */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative flex items-center justify-center cursor-grab active:cursor-grabbing border-2 transition-shadow ${
          isEquipment ? "rounded-sm" : "rounded-full"
        } ${selected ? "ring-2 ring-white ring-offset-1 ring-offset-black" : ""}`}
        style={{
          width: type.size,
          height: type.size,
          backgroundColor: isEquipment ? "#1f2937" : color.hex,
          borderColor: isEquipment ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.85)",
          boxShadow: isEquipment
            ? "0 0 6px 1px rgba(0,0,0,0.5)"
            : `0 0 ${selected ? 18 : 10}px 2px ${color.glow}`,
        }}
        data-testid={`marker-${node.id}`}
      >
        <span
          className={`text-[8px] font-bold leading-none select-none ${
            isEquipment ? "text-white/90" : "text-black/80"
          }`}
        >
          {node.label}
        </span>
      </div>

      {/* SKU tag on hover/selected */}
      {selected && (
        <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {type.sku} · {type.name}
        </div>
      )}

      {/* controls when selected */}
      {selected && (
        <div className="absolute -top-3 left-full ml-1 flex gap-1">
          {!isEquipment && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(node.id);
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-secondary-foreground border border-border hover-elevate"
              title="Rotate coverage"
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
            title="Remove node"
            data-testid={`button-remove-${node.id}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
