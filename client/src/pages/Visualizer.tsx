import { useRef, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  VIEWS,
  ViewId,
  SKU_TYPES,
  SKU_MAP,
  SkuGroup,
  GROUP_LABELS,
  LIGHT_COLOR_MAP,
  LightNode,
  LightColorId,
  BuildParams,
  DEFAULT_PARAMS,
  Orientation,
  WAGONER_ESTIMATE,
  autoBuildFromEstimate,
  MatchResult,
  allowedColors,
  ColorSchemeId,
  COLOR_SCHEMES,
  schemeColors,
} from "@/lib/catalog";
import {
  VEHICLES,
  VEHICLE_MAP,
  DEFAULT_VEHICLE_ID,
} from "@/lib/vehicles";
import { VehicleOverlays } from "@/components/VehicleOverlays";
import { LightNodeMarker } from "@/components/LightNodeMarker";
import { LightFixture } from "@/components/LightFixture";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Download,
  FileText,
  Trash2,
  Plus,
  Sun,
  Moon,
  PackageOpen,
} from "lucide-react";
import { useTheme } from "@/lib/theme";

// Vehicle images live in the public folder and are referenced relative to the
// deploy base (import.meta.env.BASE_URL === "./"). This avoids the bundler's
// `new URL(asset, import.meta.url)` resolution, which breaks behind the deploy
// proxy path and left the vehicle image blank.
const ASSET_BASE = import.meta.env.BASE_URL;
// Resolve the 6 view images for a given vehicle id (files live in /public).
function viewImagesFor(vehicleId: string): Record<ViewId, string> {
  const v = VEHICLE_MAP[vehicleId] ?? VEHICLE_MAP[DEFAULT_VEHICLE_ID];
  return {
    front: `${ASSET_BASE}${v.images.front}`,
    rear: `${ASSET_BASE}${v.images.rear}`,
    rearOpen: `${ASSET_BASE}${v.images.rearOpen}`,
    left: `${ASSET_BASE}${v.images.left}`,
    right: `${ASSET_BASE}${v.images.right}`,
    hero: `${ASSET_BASE}${v.images.hero}`,
  };
}

const GROUP_ORDER: SkuGroup[] = ["front", "hatch", "siren"];

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
const uid = (typeId: string) =>
  `${typeId}-${Date.now()}-${(nodeCounter++).toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

export default function Visualizer() {
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<ViewId>("front");
  const [vehicleId, setVehicleId] = useState<string>(DEFAULT_VEHICLE_ID);
  const [params, setParams] = useState<BuildParams>(DEFAULT_PARAMS);
  const [nodes, setNodes] = useState<LightNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // Estimate match results (populated by auto-build) + whether the build is active
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [showMatchPanel, setShowMatchPanel] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragType = useRef<string | null>(null);

  const viewNodes = nodes.filter((n) => n.view === activeView);
  const vehicle = VEHICLE_MAP[vehicleId] ?? VEHICLE_MAP[DEFAULT_VEHICLE_ID];
  const VIEW_IMAGES = viewImagesFor(vehicleId);
  const projectName = vehicle.name;

  // Switch the active vehicle. Clears placed nodes so the new body starts from
  // its own baseline (the user re-runs Auto-Build, which copies the Wagoner
  // layout onto whichever vehicle is selected).
  const changeVehicle = useCallback((id: string) => {
    setVehicleId(id);
    setNodes([]);
    setMatches(null);
    setShowMatchPanel(false);
    setSelectedId(null);
  }, []);

  // Add a node of a given SKU type. If x/y omitted, use the SKU's suggested
  // default for the active view (falls back to center).
  const addNode = useCallback(
    (typeId: string, x?: number, y?: number) => {
      const type = SKU_MAP[typeId];
      const def = type.defaults[activeView];
      // Tri-color heads adopt the current department run scheme; others use their
      // own default colors.
      const run = schemeColors(params.colorScheme);
      const node: LightNode = {
        id: uid(typeId),
        view: activeView,
        typeId,
        color1: type.allowTriColor ? run.c1 : type.defaultC1,
        color2: type.allowTriColor ? run.c2 : type.defaultC2,
        x: x ?? def?.x ?? 50,
        y: y ?? def?.y ?? 50,
        rotation: def?.rot ?? (activeView === "rear" ? 180 : 0),
        orientation: type.defaultOrientation ?? "horizontal",
        label: type.sku,
      };
      setNodes((prev) => [...prev, node]);
      setSelectedId(node.id);
    },
    [activeView, params.colorScheme],
  );

  // Drag from palette — drop lands where released, snapped near default if close-ish
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragType.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    addNode(dragType.current, x, y);
    dragType.current = null;
  };

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
  const flipOrientation = (id: string) =>
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, orientation: n.orientation === "vertical" ? "horizontal" : "vertical" }
          : n,
      ),
    );
  // Change the department run scheme: recolor every tri-color-capable head to
  // the new scheme's two run colors. Fixed-color lights (solid 416300, amber
  // rear stick, equipment) are left untouched.
  const changeColorScheme = (scheme: ColorSchemeId) => {
    const run = schemeColors(scheme);
    setParams((p) => ({ ...p, colorScheme: scheme }));
    setNodes((prev) =>
      prev.map((n) =>
        SKU_MAP[n.typeId]?.allowTriColor
          ? { ...n, color1: run.c1, color2: run.c2 }
          : n,
      ),
    );
  };
  const setNodeColor1 = (id: string, color1: LightColorId) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color1 } : n)));
  const setNodeColor2 = (id: string, color2: LightColorId) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color2 } : n)));
  // Set both halves to the same color (single-color head)
  const setNodeSolid = (id: string, color: LightColorId) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color1: color, color2: color } : n)));

  const clearView = () => {
    setNodes((prev) => prev.filter((n) => n.view !== activeView));
    setSelectedId(null);
  };
  const clearAll = () => {
    setNodes([]);
    setSelectedId(null);
  };

  // Auto-build directly from the QuickBooks estimate: match each line to a
  // catalog SKU, place a node per unit (with color + orientation from the SKU),
  // and derive build params from the memo.
  const buildFromEstimate = () => {
    const est = WAGONER_ESTIMATE;
    // Honor the scheme the user currently has selected (e.g. Blue/White) rather
    // than always resetting to the department's state default.
    const { placements, matches: matchResults, params: builtParams } = autoBuildFromEstimate(est, params.colorScheme);
    const placed: LightNode[] = [];
    const nudge = vehicle.fixtureNudge ?? {};
    for (const p of placements) {
      const type = SKU_MAP[p.typeId];
      const def = type.defaults[p.view];
      const c1 = p.colorOverride?.c1 ?? type.defaultC1;
      const c2 = p.colorOverride?.c2 ?? type.defaultC2;
      const vn = nudge[p.view] ?? { dx: 0, dy: 0 };
      placed.push({
        id: uid(p.typeId),
        view: p.view,
        typeId: p.typeId,
        color1: c1,
        color2: c2,
        x: Math.max(2, Math.min(98, (p.absX ?? def?.x ?? 50) + p.dx + vn.dx)),
        y: Math.max(2, Math.min(98, (p.absY ?? def?.y ?? 50) + p.dy + vn.dy)),
        rotation: def?.rot ?? (p.view === "rear" ? 180 : 0),
        orientation: type.defaultOrientation ?? "horizontal",
        label: type.sku,
      });
    }
    setNodes(placed);
    setParams(builtParams);
    setMatches(matchResults);
    setShowMatchPanel(true);
    setSelectedId(null);
    const lit = placed.length;
    const matched = matchResults.filter((m) => m.typeId).length;
    toast({
      title: `Auto-built from Est. ${est.docNumber}`,
      description: `${matched} lighting SKUs matched · ${lit} nodes placed · ${
        builtParams.pushBar ? "push bar on" : "slicktop, no push bar"
      }.`,
    });
  };

  // ---- Export helpers ----
  const captureView = async (_view: ViewId, ratio = 2): Promise<string> => {
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
        await new Promise((r) => setTimeout(r, 240));
        const pngUrl = await captureView(v.id, 1.6);
        const img = await pngToJpeg(pngUrl, 0.85);

        if (i > 0) pdf.addPage();
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

        const imgW = pageW - 80;
        const imgH = imgW * 0.62;
        pdf.addImage(img, "JPEG", 40, 74, imgW, Math.min(imgH, pageH - 210));

        // SKU list for this view
        const vNodes = nodes.filter((n) => n.view === v.id);
        const skuList = vNodes.map((n) => SKU_MAP[n.typeId].sku).join(", ") || "None placed";
        pdf.setFontSize(8.5);
        pdf.setTextColor(210, 218, 230);
        pdf.text(`Federal Signal SKUs: ${skuList}`, 40, pageH - 108, { maxWidth: pageW - 80 });
        pdf.setTextColor(160, 170, 185);
        pdf.text(
          `Components: ${vNodes.length}  |  Push Bar: ${params.pushBar ? "Yes" : "No"}  |  Dash Lighting: ${params.dashLighting ? "Yes" : "No"}  |  Rear Hatch: ${params.rearHatchLights ? "Yes" : "No"}`,
          40,
          pageH - 92,
        );

        // Sign-off lines
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

      // Estimate summary page (only when an auto-build is active)
      if (matches) {
        pdf.addPage();
        pdf.setFillColor(15, 17, 21);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text("Estimate Build Summary", 40, 40);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(180, 190, 205);
        pdf.text(
          `Est. ${WAGONER_ESTIMATE.docNumber}  ·  ${WAGONER_ESTIMATE.agency}  ·  ${WAGONER_ESTIMATE.customer}`,
          40,
          58,
        );
        const schemeLabel =
          COLOR_SCHEMES.find((s) => s.id === params.colorScheme)?.label ?? params.colorScheme;
        pdf.setFontSize(9.5);
        pdf.setTextColor(150, 160, 175);
        pdf.text(`Run scheme: ${schemeLabel} (tri-color heads)`, 40, 68);

        // Memo / build-note banner
        pdf.setFillColor(60, 48, 10);
        pdf.rect(40, 78, pageW - 80, 26, "F");
        pdf.setTextColor(245, 210, 130);
        pdf.setFontSize(9.5);
        pdf.text(`Build note: ${WAGONER_ESTIMATE.memo}`, 48, 95, { maxWidth: pageW - 96 });

        // Match table header
        let y = 124;
        pdf.setTextColor(150, 160, 175);
        pdf.setFontSize(8);
        pdf.text("QuickBooks Line Item", 40, y);
        pdf.text("Qty", pageW - 200, y);
        pdf.text("Mapped SKU / Note", pageW - 170, y);
        pdf.setDrawColor(70, 78, 92);
        pdf.line(40, y + 4, pageW - 40, y + 4);
        y += 16;
        pdf.setFontSize(8);
        for (const m of matches) {
          if (y > pageH - 60) {
            pdf.addPage();
            pdf.setFillColor(15, 17, 21);
            pdf.rect(0, 0, pageW, pageH, "F");
            y = 50;
          }
          pdf.setTextColor(m.typeId ? 215 : 130, m.typeId ? 222 : 138, m.typeId ? 232 : 150);
          pdf.text(m.itemName, 40, y, { maxWidth: pageW - 230 });
          pdf.text(String(m.qty), pageW - 200, y);
          pdf.setTextColor(m.typeId ? 120 : 120, m.typeId ? 200 : 128, m.typeId ? 255 : 140);
          pdf.text(m.typeId ? SKU_MAP[m.typeId].sku : "reference only", pageW - 170, y);
          if (m.note) {
            y += 11;
            pdf.setTextColor(240, 190, 110);
            const noteLines = pdf.splitTextToSize(`[!] ${m.note}`, 150) as string[];
            pdf.text(noteLines, pageW - 170, y);
            y += (noteLines.length - 1) * 10;
          }
          y += 15;
        }
      }

      pdf.save(`PIU_Lighting_Coverage_SignOff.pdf`);
      toast({ title: "PDF exported", description: "View sheets + estimate summary saved." });
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
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 md:px-6" data-export-hide>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight md:text-base" data-testid="text-title">
              PIU Lighting Coverage Visualizer
            </h1>
            <p className="text-xs text-muted-foreground">Federal Signal · {projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="vehicle-select" className="text-xs text-muted-foreground">
              Vehicle
            </Label>
            <select
              id="vehicle-select"
              data-testid="select-vehicle"
              value={vehicleId}
              onChange={(e) => changeVehicle(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.short}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={buildFromEstimate} data-testid="button-load-wagoner">
            <PackageOpen className="mr-1.5 h-4 w-4" /> Auto-Build from QuickBooks (Est. 1233)
          </Button>
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
        {/* Left palette — grouped by function */}
        <aside className="w-full shrink-0 border-b border-border p-4 lg:w-80 lg:border-b-0 lg:border-r lg:overflow-y-auto" data-export-hide>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Federal Signal SKUs
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Drag onto the vehicle, or tap + to drop at the suggested mount. Then drag to fine-tune, select to rotate or recolor.
          </p>

          {GROUP_ORDER.map((group) => (
            <div key={group} className="mb-4">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                {GROUP_LABELS[group]}
              </h3>
              <div className="space-y-2">
                {SKU_TYPES.filter((t) => t.group === group).map((t) => {
                  return (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => (dragType.current = t.id)}
                      className="group flex cursor-grab items-start gap-2.5 rounded-md border border-border bg-card p-2.5 hover-elevate active:cursor-grabbing"
                      data-testid={`palette-${t.id}`}
                    >
                      <div className="mt-1 flex h-6 w-8 shrink-0 items-center justify-center">
                        <LightFixture sku={t} color1={t.defaultC1} color2={t.defaultC2} scale={0.7} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-semibold font-mono">{t.sku}</span>
                          <button
                            onClick={() => addNode(t.id)}
                            className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-secondary-foreground hover-elevate"
                            title="Drop at suggested mount"
                            data-testid={`button-add-${t.id}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-[11px] font-medium">{t.name}</p>
                        <p className="text-[10px] leading-snug text-muted-foreground">{t.mount}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Center stage */}
        <main className="flex flex-1 flex-col items-center p-4">
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

          <div
            ref={stageRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => setSelectedId(null)}
            className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg border border-border"
            style={{ background: "#0f1115" }}
            data-testid="stage"
          >
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
                stageRef={stageRef}
                onSelect={setSelectedId}
                onMove={moveNode}
                onRemove={removeNode}
                onRotate={rotateNode}
                onFlipOrientation={flipOrientation}
              />
            ))}
            <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-medium text-white/50">
              Integrity Upfitters · {projectName}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2" data-export-hide>
            <Button variant="outline" size="sm" onClick={clearView} data-testid="button-clear-view">
              <Trash2 className="mr-1.5 h-4 w-4" /> Clear View
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} data-testid="button-clear-all">
              Clear All
            </Button>
          </div>
        </main>

        {/* Right params panel */}
        <aside className="w-full shrink-0 border-t border-border p-4 lg:w-72 lg:border-t-0 lg:border-l lg:overflow-y-auto" data-export-hide>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Department Color Scheme
          </h2>
          <p className="mb-2 text-[11px] leading-snug text-muted-foreground">
            Run pattern for tri-color heads. OK depts usually run Red/Blue; AR usually Blue/White.
          </p>
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {COLOR_SCHEMES.map((s) => {
              const active = params.colorScheme === s.id;
              const swatches = [s.c1, s.c2, ...(s.c3 ? [s.c3] : [])];
              return (
                <button
                  key={s.id}
                  onClick={() => changeColorScheme(s.id)}
                  data-testid={`button-scheme-${s.id}`}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    active
                      ? "border-white bg-white/10 text-white"
                      : "border-border text-muted-foreground hover:border-white/40"
                  }`}
                >
                  <span className="flex">
                    {swatches.map((c, i) => (
                      <span
                        key={i}
                        className="h-3 w-3 rounded-full ring-1 ring-black/40"
                        style={{ background: LIGHT_COLOR_MAP[c].glow, marginLeft: i ? -4 : 0 }}
                      />
                    ))}
                  </span>
                  {s.label}
                </button>
              );
            })}
          </div>

          <Separator className="my-4" />

          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Build Parameters
          </h2>
          <div className="space-y-3">
            <ToggleRow
              id="pushBar"
              label="Push Bar"
              hint="Front bumper guard (off on Wagoner units)"
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
            Placement Summary
          </h2>
          <div className="space-y-1.5 text-xs">
            {VIEWS.map((v) => {
              const count = nodes.filter((n) => n.view === v.id).length;
              return (
                <div key={v.id} className="flex items-center justify-between" data-testid={`summary-${v.id}`}>
                  <span className="text-muted-foreground">{v.label}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold" data-testid="text-total-nodes">{nodes.length}</span>
            </div>
          </div>

          {showMatchPanel && matches && (
            <>
              <Separator className="my-4" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Est. {WAGONER_ESTIMATE.docNumber} · {WAGONER_ESTIMATE.agency}
                </h2>
                <button
                  onClick={() => setShowMatchPanel(false)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  data-testid="button-hide-matches"
                >
                  hide
                </button>
              </div>

              {/* Memo / build-note banner */}
              <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] leading-snug text-amber-200">
                <span className="font-semibold">Build note:</span> {WAGONER_ESTIMATE.memo}
              </div>

              <div className="space-y-1 text-[11px]">
                {matches.map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between gap-2 rounded border px-2 py-1 ${
                      m.typeId ? "border-border bg-card" : "border-transparent opacity-55"
                    }`}
                    data-testid={`match-${i}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-mono">{m.itemName}</div>
                      {m.note && <div className="text-[10px] text-amber-300">⚠ {m.note}</div>}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-muted-foreground">×{m.qty}</div>
                      <div className={m.typeId ? "font-medium text-primary" : "text-muted-foreground"}>
                        {m.typeId ? SKU_MAP[m.typeId].sku : "not placed"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                Lighting SKUs are auto-placed as draggable nodes. Non-lighting lines (consoles, mounts, radar, labor) are listed for reference only.
              </p>
            </>
          )}

          {selectedNode && (
            <>
              <Separator className="my-4" />
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected · {SKU_MAP[selectedNode.typeId].sku}
              </h2>
              <div className="rounded-md border border-border bg-card p-3 text-xs">
                <div className="mb-1 font-semibold">{SKU_MAP[selectedNode.typeId].name}</div>
                <div className="text-muted-foreground">{SKU_MAP[selectedNode.typeId].mount}</div>
                {SKU_MAP[selectedNode.typeId].spreadDeg > 0 && (
                  <>
                    <div className="mt-0.5 text-muted-foreground">Rotation: {selectedNode.rotation}°</div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Orientation: <span className="font-medium text-foreground">{selectedNode.orientation}</span>
                      </span>
                      <button
                        onClick={() => flipOrientation(selectedNode.id)}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover-elevate"
                        data-testid="button-flip-orientation"
                      >
                        {selectedNode.orientation === "vertical" ? "Make horizontal" : "Make vertical"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              {SKU_MAP[selectedNode.typeId].spreadDeg > 0 && (
                <>
                  {(() => {
                    const sku = SKU_MAP[selectedNode.typeId];
                    const colors = allowedColors(sku);
                    const isSolid = selectedNode.color1 === selectedNode.color2;
                    return (
                      <>
                        <div className="mt-3 mb-1.5 flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Colors</p>
                          <button
                            onClick={() =>
                              isSolid
                                ? setNodeColor2(selectedNode.id, sku.defaultC2 !== selectedNode.color1 ? sku.defaultC2 : colors.find((c) => c.id !== selectedNode.color1)?.id ?? selectedNode.color1)
                                : setNodeSolid(selectedNode.id, selectedNode.color1)
                            }
                            className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium hover-elevate"
                            data-testid="button-toggle-split"
                          >
                            {isSolid ? "Make split" : "Make solid"}
                          </button>
                        </div>

                        {/* Live preview of the head */}
                        <div className="mb-2 flex items-center justify-center rounded-md border border-border bg-black/40 py-2">
                          <LightFixture sku={sku} color1={selectedNode.color1} color2={selectedNode.color2} scale={1} />
                        </div>

                        {/* Primary / left color */}
                        <p className="mb-1 text-[10px] font-medium text-muted-foreground">
                          {isSolid ? "Color" : "Color 1 (left / odd LEDs)"}
                        </p>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {colors.map((c) => (
                            <button
                              key={c.id}
                              onClick={() =>
                                isSolid ? setNodeSolid(selectedNode.id, c.id) : setNodeColor1(selectedNode.id, c.id)
                              }
                              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                                selectedNode.color1 === c.id ? "border-white ring-2 ring-white/40" : "border-white/40"
                              }`}
                              style={{ backgroundColor: c.hex, boxShadow: `0 0 8px ${c.glow}` }}
                              title={c.name}
                              data-testid={`color1-${c.id}`}
                            />
                          ))}
                        </div>

                        {/* Secondary / right color (split only) */}
                        {!isSolid && (
                          <>
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Color 2 (right / even LEDs)</p>
                            <div className="flex flex-wrap gap-2">
                              {colors.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => setNodeColor2(selectedNode.id, c.id)}
                                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                                    selectedNode.color2 === c.id ? "border-white ring-2 ring-white/40" : "border-white/40"
                                  }`}
                                  style={{ backgroundColor: c.hex, boxShadow: `0 0 8px ${c.glow}` }}
                                  title={c.name}
                                  data-testid={`color2-${c.id}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
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
