import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  VIEWS,
  ViewId,
  LIGHT_TYPES,
  LIGHT_COLORS,
  LIGHT_TYPE_MAP,
  LIGHT_COLOR_MAP,
  LightNode,
  LightTypeId,
  LightColorId,
  BuildParams,
  DEFAULT_PARAMS,
} from "@/lib/catalog";
import { VehicleOverlays } from "@/components/VehicleOverlays";
import { LightNodeMarker } from "@/components/LightNodeMarker";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Download,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

import frontImg from "@/assets/piu_front.png";
import rearImg from "@/assets/piu_rear.png";
import leftImg from "@/assets/piu_left.png";
import rightImg from "@/assets/piu_right.png";
import heroImg from "@/assets/piu_hero.png";

const VIEW_IMAGES: Record<ViewId, string> = {
  front: frontImg,
  rear: rearImg,
  left: leftImg,
  right: rightImg,
  hero: heroImg,
};

// Convert a PNG data URL to a compressed JPEG data URL (over a dark backdrop).
async function pngToJpeg(pngUrl: string, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.fillStyle = "#0f1115";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = pngUrl;
  });
}

let nodeCounter = 0;
const labelFor = (type: LightTypeId) => {
  nodeCounter += 1;
  const prefix =
    type === "t_series" ? "T" : type === "edge_9xt" ? "E" : "W";
  return `${prefix}${nodeCounter}`;
};

export default function Visualizer() {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ViewId>("front");
  const [params, setParams] = useState<BuildParams>(DEFAULT_PARAMS);
  const [nodes, setNodes] = useState<LightNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCoverage, setShowCoverage] = useState(true);
  const [activeColor, setActiveColor] = useState<LightColorId>("blue");
  const [exporting, setExporting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragType = useRef<LightTypeId | null>(null);

  const viewNodes = nodes.filter((n) => n.view === activeView);
  const projectName = "2025 Ford Police Interceptor Utility";

  const addNode = useCallback(
    (type: LightTypeId, x: number, y: number) => {
      const node: LightNode = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        view: activeView,
        type,
        color: activeColor,
        x,
        y,
        rotation: activeView === "rear" ? 180 : 0,
        label: labelFor(type),
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(node.id);
    },
    [activeView, activeColor],
  );

  // Drag from palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragType.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    addNode(dragType.current, x, y);
    dragType.current = null;
  };

  // Click-to-add (mobile / accessibility fallback)
  const handleAddCentered = (type: LightTypeId) => addNode(type, 50, 50);

  const moveNode = (id: string, x: number, y: number) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const rotateNode = (id: string) =>
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, rotation: (n.rotation + 45) % 360 } : n)),
    );
  const setNodeColor = (id: string, color: LightColorId) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)));

  const clearView = () => {
    setNodes((prev) => prev.filter((n) => n.view !== activeView));
    setSelectedId(null);
  };

  // ---- Export helpers ----
  const captureView = async (_view: ViewId, ratio = 2): Promise<string> => {
    // Snapshot the current stage DOM at high resolution.
    if (!stageRef.current) throw new Error("stage not ready");
    return toPng(stageRef.current, {
      pixelRatio: ratio,
      backgroundColor: "#0f1115",
      skipFonts: true,
      cacheBust: true,
      filter: (node) => !(node as HTMLElement).dataset?.exportHide,
    });
  };

  const exportPng = async () => {
    setExporting(true);
    setSelectedId(null);
    await new Promise((r) => setTimeout(r, 60));
    try {
      const url = await captureView(activeView);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PIU_${activeView}_coverage.png`;
      a.click();
      toast({ title: "PNG exported", description: `${activeView.toUpperCase()} view saved.` });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    setSelectedId(null);
    const originalView = activeView;
    try {
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < VIEWS.length; i++) {
        const v = VIEWS[i];
        setActiveView(v.id);
        await new Promise((r) => setTimeout(r, 240)); // allow render
        const pngUrl = await captureView(v.id, 1.6);
        const img = await pngToJpeg(pngUrl, 0.85);

        if (i > 0) pdf.addPage();
        // Header band
        pdf.setFillColor(15, 17, 21);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Integrity Upfitters — Emergency Lighting Coverage", 40, 40);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(180, 190, 205);
        pdf.text(`${projectName}  ·  ${v.label} View`, 40, 58);

        // Image
        const imgW = pageW - 80;
        const imgH = imgW * 0.62;
        pdf.addImage(img, "JPEG", 40, 74, imgW, Math.min(imgH, pageH - 190));

        // Legend of nodes on this view
        const vNodes = nodes.filter((n) => n.view === v.id);
        let ly = pageH - 96;
        pdf.setFontSize(9);
        pdf.setTextColor(210, 218, 230);
        pdf.text(
          `Nodes: ${vNodes.length}  |  Push Bar: ${params.pushBar ? "Yes" : "No"}  |  Dash Lighting: ${params.dashLighting ? "Yes" : "No"}  |  Rear Hatch: ${params.rearHatchLights ? "Yes" : "No"}`,
          40,
          ly,
        );

        // Sign-off line
        pdf.setDrawColor(120, 130, 145);
        pdf.setLineWidth(0.8);
        pdf.line(40, pageH - 52, 260, pageH - 52);
        pdf.line(pageW - 260, pageH - 52, pageW - 40, pageH - 52);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 160, 175);
        pdf.text("Department Representative / Signature", 40, pageH - 40);
        pdf.text("Date", pageW - 260, pageH - 40);
        pdf.text(
          `Page ${i + 1} of ${VIEWS.length}  ·  Generated ${new Date().toLocaleDateString()}`,
          pageW - 40,
          pageH - 22,
          { align: "right" },
        );
      }

      pdf.save(`PIU_Lighting_Coverage_SignOff.pdf`);
      toast({ title: "PDF exported", description: "5-view sign-off sheet saved." });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    } finally {
      setActiveView(originalView);
      setExporting(false);
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6" data-export-hide>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight md:text-base" data-testid="text-title">
              PIU Lighting Coverage Visualizer
            </h1>
            <p className="text-xs text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting} data-testid="button-export-png">
            <Download className="mr-1.5 h-4 w-4" /> PNG
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting} data-testid="button-export-pdf">
            <FileText className="mr-1.5 h-4 w-4" /> PDF Sign-off
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="button-theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left palette */}
        <aside className="w-full shrink-0 border-b border-border p-4 lg:w-72 lg:border-b-0 lg:border-r" data-export-hide>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Light Nodes
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Drag onto the vehicle, or tap Add. Drag to reposition; select to rotate coverage or recolor.
          </p>
          <div className="space-y-2">
            {LIGHT_TYPES.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={() => (dragType.current = t.id)}
                className="group flex cursor-grab items-start gap-3 rounded-md border border-border bg-card p-3 hover-elevate active:cursor-grabbing"
                data-testid={`palette-${t.id}`}
              >
                <div
                  className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-white/80"
                  style={{ backgroundColor: LIGHT_COLOR_MAP[activeColor].hex, boxShadow: `0 0 8px ${LIGHT_COLOR_MAP[activeColor].glow}` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold">{t.name}</span>
                    <button
                      onClick={() => handleAddCentered(t.id)}
                      className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-secondary-foreground hover-elevate"
                      title="Add to center"
                      data-testid={`button-add-${t.id}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.category}</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Active Color
          </h2>
          <div className="flex flex-wrap gap-2">
            {LIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveColor(c.id);
                  if (selectedNode) setNodeColor(selectedNode.id, c.id);
                }}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  activeColor === c.id ? "border-white ring-2 ring-white/40" : "border-white/40"
                }`}
                style={{ backgroundColor: c.hex, boxShadow: `0 0 8px ${c.glow}` }}
                title={c.name}
                data-testid={`color-${c.id}`}
              />
            ))}
          </div>
          {selectedNode && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Selecting a color recolors the highlighted node ({selectedNode.label}).
            </p>
          )}
        </aside>

        {/* Center stage */}
        <main className="flex flex-1 flex-col items-center p-4">
          {/* View switcher */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2" data-export-hide>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setActiveView(v.id);
                  setSelectedId(null);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeView === v.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover-elevate"
                }`}
                data-testid={`view-${v.id}`}
              >
                {v.label}
                <span className="ml-1.5 rounded bg-black/20 px-1 text-[10px]">
                  {nodes.filter((n) => n.view === v.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Stage */}
          <div
            ref={stageRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => setSelectedId(null)}
            className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg border border-border"
            style={{ background: "#0f1115" }}
            data-testid="stage"
          >
            {/* subtle grid for coverage reference */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  "linear-gradient(#5b6472 1px,transparent 1px),linear-gradient(90deg,#5b6472 1px,transparent 1px)",
                backgroundSize: "5% 6.66%",
              }}
            />
            <img
              src={VIEW_IMAGES[activeView]}
              alt={`PIU ${activeView} view`}
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
            <VehicleOverlays view={activeView} params={params} />
            {viewNodes.map((n) => (
              <LightNodeMarker
                key={n.id}
                node={n}
                selected={n.id === selectedId}
                showCoverage={showCoverage}
                stageRef={stageRef}
                onSelect={setSelectedId}
                onMove={moveNode}
                onRemove={removeNode}
                onRotate={rotateNode}
              />
            ))}
            {/* Export watermark - only visible baked into capture */}
            <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-white/50">
              Integrity Upfitters · {projectName}
            </div>
          </div>

          {/* Stage controls */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2" data-export-hide>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCoverage((s) => !s)}
              data-testid="button-toggle-coverage"
            >
              {showCoverage ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
              {showCoverage ? "Hide" : "Show"} Coverage
            </Button>
            <Button variant="outline" size="sm" onClick={clearView} data-testid="button-clear-view">
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear View
            </Button>
          </div>
        </main>

        {/* Right params panel */}
        <aside className="w-full shrink-0 border-t border-border p-4 lg:w-72 lg:border-t-0 lg:border-l" data-export-hide>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Build Parameters
          </h2>
          <div className="space-y-3">
            <ToggleRow
              id="pushBar"
              label="Push Bar"
              hint="Front bumper guard (baseline on most builds)"
              checked={params.pushBar}
              onChange={(v) => setParams((p) => ({ ...p, pushBar: v }))}
            />
            <ToggleRow
              id="dashLighting"
              label="Interior Dash Lighting"
              hint="Windshield-mount interior warning"
              checked={params.dashLighting}
              onChange={(v) => setParams((p) => ({ ...p, dashLighting: v }))}
            />
            <ToggleRow
              id="rearHatchLights"
              label="Rear Hatch Warning Lights"
              hint="Liftgate glass warning stick"
              checked={params.rearHatchLights}
              onChange={(v) => setParams((p) => ({ ...p, rearHatchLights: v }))}
            />
          </div>

          <Separator className="my-4" />

          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coverage Summary
          </h2>
          <div className="space-y-1.5 text-xs">
            {VIEWS.map((v) => {
              const count = nodes.filter((n) => n.view === v.id).length;
              return (
                <div key={v.id} className="flex items-center justify-between" data-testid={`summary-${v.id}`}>
                  <span className="text-muted-foreground">{v.label}</span>
                  <span className="font-semibold">{count} node{count !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold" data-testid="text-total-nodes">{nodes.length}</span>
            </div>
          </div>

          {selectedNode && (
            <>
              <Separator className="my-4" />
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected Node
              </h2>
              <div className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="mb-1 font-semibold">{LIGHT_TYPE_MAP[selectedNode.type].name} · {selectedNode.label}</div>
                <div className="text-muted-foreground">Color: {LIGHT_COLOR_MAP[selectedNode.color].name}</div>
                <div className="text-muted-foreground">Rotation: {selectedNode.rotation}°</div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} data-testid={`switch-${id}`} />
    </div>
  );
}
