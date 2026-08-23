import { useRef, useState, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
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
  Estimate,
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
import { GhostBar, GhostKind } from "@/components/GhostBar";
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
  Search,
  ChevronDown,
  ChevronRight,
  Save,
  FolderOpen,
  Magnet,
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
async function pngToJpeg(
  pngUrl: string,
  quality = 0.85,
): Promise<{ data: string; w: number; h: number }> {
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
      resolve({
        data: canvas.toDataURL("image/jpeg", quality),
        w: img.width,
        h: img.height,
      });
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
  // The estimate the current build came from (drives the match-panel header +
  // memo banner). Defaults to Wagoner #1233 until a build runs.
  const [activeEstimate, setActiveEstimate] = useState<Estimate>(WAGONER_ESTIMATE);
  // Palette search + per-group collapse. Groups start expanded; searching
  // temporarily overrides collapse so all matches are visible.
  const [paletteQuery, setPaletteQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // Per-family selected variant (SKU id) for the palette dropdowns. Seeded from
  // each family's `familyDefault` variant on first render.
  const [familyVariant, setFamilyVariant] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const t of SKU_TYPES) {
      if (t.family && (t.familyDefault || !seed[t.family])) seed[t.family] = t.id;
    }
    return seed;
  });

  // ---- Saved builds (server-backed, survives reload + redeploy) ----
  const [savedBuilds, setSavedBuilds] = useState<{ name: string; updatedAt: number }[]>([]);
  const [saveName, setSaveName] = useState("");
  const [busy, setBusy] = useState(false);

  // ---- Estimate # input (Auto-Build source) ----
  // Which QuickBooks estimate the Auto-Build pulls from. Defaults to 1233
  // (Wagoner PD, seeded on the server). Any imported estimate # can be entered.
  const [estimateNum, setEstimateNum] = useState("1233");
  const [fetchingEst, setFetchingEst] = useState(false);

  // ---- Snapping ----
  const [snapOn, setSnapOn] = useState(true);
  // active alignment guides during a drag: vertical (x%) and horizontal (y%) lines
  const [guides, setGuides] = useState<{ vx: number[]; hy: number[] }>({ vx: [], hy: [] });
  const [dragActive, setDragActive] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragType = useRef<string | null>(null);

  const refreshBuilds = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/builds");
      setSavedBuilds(await res.json());
    } catch {
      /* ignore — list stays as-is */
    }
  }, []);

  useEffect(() => {
    refreshBuilds();
  }, [refreshBuilds]);

  // Save the current build (vehicle + params + placed nodes) under a name.
  const saveBuild = async () => {
    const name = saveName.trim();
    if (!name) {
      toast({ title: "Name required", description: "Enter a customer / department name first.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const payload = { vehicleId, params, nodes };
      await apiRequest("POST", "/api/builds", { name, data: JSON.stringify(payload) });
      await refreshBuilds();
      toast({ title: "Build saved", description: `“${name}” saved (${nodes.length} lights). It will survive reloads.` });
    } catch (err) {
      toast({ title: "Save failed", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Load a saved build by name and restore vehicle + params + nodes.
  const loadBuild = async (name: string) => {
    if (!name) return;
    setBusy(true);
    try {
      const res = await apiRequest("GET", `/api/builds/${encodeURIComponent(name)}`);
      const build = await res.json();
      const parsed = JSON.parse(build.data) as {
        vehicleId: string;
        params: BuildParams;
        nodes: LightNode[];
      };
      setVehicleId(parsed.vehicleId ?? DEFAULT_VEHICLE_ID);
      setParams(parsed.params ?? DEFAULT_PARAMS);
      setNodes(parsed.nodes ?? []);
      setSelectedId(null);
      setSaveName(name);
      toast({ title: "Build loaded", description: `“${name}” restored (${parsed.nodes?.length ?? 0} lights).` });
    } catch (err) {
      toast({ title: "Load failed", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Delete the currently-named saved build.
  const deleteBuild = async () => {
    const name = saveName.trim();
    if (!name) return;
    if (!savedBuilds.some((b) => b.name === name)) {
      toast({ title: "No such build", description: `“${name}” isn't a saved build.`, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await apiRequest("DELETE", `/api/builds/${encodeURIComponent(name)}`);
      await refreshBuilds();
      toast({ title: "Build deleted", description: `“${name}” removed.` });
    } catch (err) {
      toast({ title: "Delete failed", description: String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const viewNodes = nodes.filter((n) => n.view === activeView);

  // A roof lightbar is physically visible from more than the front view. For any
  // full-width roof bar placed on the FRONT, derive read-only "ghost" mirrors on
  // the other views: the FULL bar across the rear roofline, and an END-CAP slice
  // at the roof edge on the left/right side views. These follow the front node
  // (not stored, not editable) — edit the front bar to change them.
  const ROOF_GHOST_VIEWS: Partial<Record<ViewId, { kind: GhostKind; x: number; y: number }>> = {
    // rear: full bar centered on the rear roofline
    rear: { kind: "full", x: 50, y: 20 },
    // sides: end-cap at the roofline B-pillar (between the front & rear doors),
    // where the end of a roof bar reads on a side profile.
    left: { kind: "endcap", x: 49, y: 35 },
    right: { kind: "endcap", x: 51, y: 35 },
  };
  const isRoofBar = (n: LightNode) => SKU_MAP[n.typeId]?.shape === "algt";
  const ghostSpec = ROOF_GHOST_VIEWS[activeView];
  const ghostBars =
    ghostSpec != null
      ? nodes.filter((n) => n.view === "front" && isRoofBar(n)).map((n) => ({ node: n, spec: ghostSpec }))
      : [];

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
      // Solid MicroPulse bars show ONE color per node and ALTERNATE across the
      // grille (run.c1, run.c2, run.c1 …). Pick the color by how many of this SKU
      // already sit in this view so a Red/Blue dept lays down R,B,R,B…
      const c1 = type.allowTriColor ? run.c1 : type.defaultC1;
      const c2 = type.allowTriColor ? run.c2 : type.defaultC2;
      const nodeId = uid(typeId);
      setNodes((prev) => {
        // All tri-color heads (MicroPulse bars, DynaFlare, round, wide) render a
        // two-color split sprite using c1/c2. A single MicroPulse 6-3 grille head
        // physically splits half red / half blue across its own LEDs, so we keep
        // the split rather than forcing a single solid color per node.
        const nc1 = c1;
        const nc2 = c2;
        const node: LightNode = {
          id: nodeId,
          view: activeView,
          typeId,
          color1: nc1,
          color2: nc2,
          x: x ?? def?.x ?? 50,
          y: y ?? def?.y ?? 50,
          rotation: def?.rot ?? (activeView === "rear" ? 180 : 0),
          orientation: type.defaultOrientation ?? "horizontal",
          label: type.sku,
        };
        return [...prev, node];
      });
      setSelectedId(nodeId);
    },
    [activeView, params.colorScheme],
  );

  // Drag from palette — drop lands where released, snapped near default if close-ish
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragType.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * 100;
    const ry = ((e.clientY - rect.top) / rect.height) * 100;
    // Snap the drop position too (id "__new__" excludes nothing existing).
    const s = snapCoords("__new__", rx, ry, e.altKey);
    addNode(dragType.current, s.x, s.y);
    dragType.current = null;
  };

  // ---- Snapping helpers ----
  // Grid is intentionally very fine so free placement feels 1:1 with the cursor
  // (no visible "jump"). Real assistance comes from alignment snapping to other
  // lights / the centerline, which only engages within GUIDE_TOL.
  const GRID = 0.25; // grid step, percent (~ sub-half-inch to scale)
  const GUIDE_TOL = 1.0; // snap-to-alignment tolerance, percent
  const CENTER = 50; // vehicle centerline (x)

  // Given a raw x/y for node `id`, return snapped coords + which guide lines are
  // active. Priority: alignment to another light / centerline (tight) wins over
  // the coarser grid. Alt held (`bypass`) disables all snapping.
  const snapCoords = useCallback(
    (id: string, x: number, y: number, bypass: boolean) => {
      if (bypass || !snapOn) return { x, y, vx: [] as number[], hy: [] as number[] };
      const others = nodes.filter((n) => n.id !== id && n.view === activeView);
      const vx: number[] = [];
      const hy: number[] = [];

      // X: snap to centerline or another light's x
      let sx = x;
      const xTargets = [CENTER, ...others.map((n) => n.x)];
      let bestX = Infinity;
      for (const t of xTargets) {
        const d = Math.abs(x - t);
        if (d < GUIDE_TOL && d < bestX) {
          bestX = d;
          sx = t;
        }
      }
      if (bestX !== Infinity) vx.push(sx);
      else sx = Math.round(x / GRID) * GRID;

      // Y: snap to another light's y
      let sy = y;
      let bestY = Infinity;
      for (const n of others) {
        const d = Math.abs(y - n.y);
        if (d < GUIDE_TOL && d < bestY) {
          bestY = d;
          sy = n.y;
        }
      }
      if (bestY !== Infinity) hy.push(sy);
      else sy = Math.round(y / GRID) * GRID;

      return { x: sx, y: sy, vx, hy };
    },
    [nodes, activeView, snapOn],
  );

  const moveNode = (id: string, x: number, y: number, alt = false) => {
    const s = snapCoords(id, x, y, alt);
    setGuides({ vx: s.vx, hy: s.hy });
    setDragActive(true);
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x: s.x, y: s.y } : n)));
  };
  const endDrag = () => {
    setDragActive(false);
    setGuides({ vx: [], hy: [] });
  };
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
      prev.map((n) => {
        const t = SKU_MAP[n.typeId];
        if (!t?.allowTriColor) return n;
        // Every tri-color head takes the scheme's split colors (c1/c2). Heads
        // that carry a single color (e.g. amber-only) fall back to their default.
        return { ...n, color1: run.c1, color2: run.c2 };
      }),
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
  const buildFromEstimate = (estArg?: Estimate) => {
    const est = estArg ?? WAGONER_ESTIMATE;
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
      // The roof bar gets an extra per-vehicle nudge so it seats on the crown.
      const bn = type.shape === "algt" ? (vehicle.barNudge ?? { dx: 0, dy: 0 }) : { dx: 0, dy: 0 };
      placed.push({
        id: uid(p.typeId),
        view: p.view,
        typeId: p.typeId,
        color1: c1,
        color2: c2,
        x: Math.max(2, Math.min(98, (p.absX ?? def?.x ?? 50) + p.dx + vn.dx + bn.dx)),
        y: Math.max(2, Math.min(98, (p.absY ?? def?.y ?? 50) + p.dy + vn.dy + bn.dy)),
        rotation: def?.rot ?? (p.view === "rear" ? 180 : 0),
        orientation: type.defaultOrientation ?? "horizontal",
        label: type.sku,
      });
    }
    // De-stack coincident nodes: when two lights land on nearly the same spot
    // (e.g. a paired red + blue 416300 perimeter light), the top one covers the
    // other and the buried one feels "locked". Nudge overlapping same-view nodes
    // apart by a few percent so every light is individually grabbable.
    const SEP = 3.2; // percent of stage
    for (let i = 0; i < placed.length; i++) {
      for (let j = 0; j < i; j++) {
        if (placed[i].view !== placed[j].view) continue;
        const dx = placed[i].x - placed[j].x;
        const dy = placed[i].y - placed[j].y;
        if (Math.hypot(dx, dy) < SEP) {
          // push the later node to the right/down a touch (clamped to stage)
          placed[i].x = Math.max(2, Math.min(98, placed[i].x + SEP));
          placed[i].y = Math.max(2, Math.min(98, placed[i].y + SEP * 0.4));
        }
      }
    }
    setNodes(placed);
    setParams(builtParams);
    setMatches(matchResults);
    setActiveEstimate(est);
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

  // Fetch the entered estimate # from the server, then auto-build from it. If
  // the estimate hasn't been imported yet, show a clear message telling the
  // operator to have it pulled live from QuickBooks.
  const runAutoBuild = async () => {
    const num = estimateNum.trim();
    if (!num) {
      toast({ title: "Enter an estimate number", variant: "destructive" });
      return;
    }
    setFetchingEst(true);
    try {
      const res = await apiRequest("GET", `/api/estimates/${encodeURIComponent(num)}`);
      const est = (await res.json()) as Estimate;
      buildFromEstimate(est);
    } catch (err: any) {
      // apiRequest throws on non-2xx; a 404 means the estimate isn't imported.
      const msg = String(err?.message ?? "");
      const notImported = msg.includes("404") || msg.toLowerCase().includes("not_imported");
      toast({
        title: notImported ? `Estimate #${num} not imported yet` : "Could not load estimate",
        description: notImported
          ? "Ask your Perplexity assistant to pull this estimate live from QuickBooks, then try again."
          : msg,
        variant: "destructive",
      });
    } finally {
      setFetchingEst(false);
    }
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

      // Only include views that actually have lights placed on them. An empty
      // view (e.g. Rear Hatch Open with nothing on it) is skipped entirely.
      const exportViews = VIEWS.filter((v) =>
        nodes.some((n) => n.view === v.id),
      );
      if (exportViews.length === 0) {
        toast({
          title: "Nothing to export",
          description: "Place at least one light on a view before exporting a PDF.",
          variant: "destructive",
        });
        setExporting(false);
        return;
      }
      const totalPages = exportViews.length + (matches ? 1 : 0);

      for (let i = 0; i < exportViews.length; i++) {
        const v = exportViews[i];
        setActiveView(v.id);
        await new Promise((r) => setTimeout(r, 240));
        const pngUrl = await captureView(v.id, 1.6);
        const { data: img, w: srcW, h: srcH } = await pngToJpeg(pngUrl, 0.85);

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

        // Fit the captured stage into the available box WITHOUT distortion:
        // scale to the source's true aspect ratio and center it (letterbox).
        const boxX = 40;
        const boxY = 74;
        const boxW = pageW - 80;
        const boxH = pageH - 210;
        const srcAspect = srcW / srcH; // e.g. 4:3 stage => 1.333
        let drawW = boxW;
        let drawH = boxW / srcAspect;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = boxH * srcAspect;
        }
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY + (boxH - drawH) / 2;
        pdf.addImage(img, "JPEG", drawX, drawY, drawW, drawH);

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
          `Page ${i + 1} of ${totalPages}  ·  Generated ${new Date().toLocaleDateString()}`,
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
          `Est. ${activeEstimate.docNumber}  ·  ${activeEstimate.agency}  ·  ${activeEstimate.customer}`,
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
        pdf.text(`Build note: ${activeEstimate.memo}`, 48, 95, { maxWidth: pageW - 96 });

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
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col">
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
          {/* Estimate # input + Auto-Build. Type any imported QuickBooks
              estimate number; #1233 (Wagoner PD) ships seeded. */}
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-card/60 pl-2">
            <span className="text-[11px] font-medium text-muted-foreground">Est. #</span>
            <input
              value={estimateNum}
              onChange={(e) => setEstimateNum(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !fetchingEst) runAutoBuild();
              }}
              placeholder="1233"
              inputMode="numeric"
              className="w-16 bg-transparent py-1 text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
              data-testid="input-estimate-num"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={runAutoBuild}
              disabled={fetchingEst}
              data-testid="button-load-wagoner"
            >
              <PackageOpen className="mr-1.5 h-4 w-4" />
              {fetchingEst ? "Loading…" : "Auto-Build from QuickBooks"}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportPng} disabled={exporting} data-testid="button-export-png">
            <Download className="mr-1.5 h-4 w-4" /> PNG
          </Button>
          <Button size="sm" onClick={exportPdf} disabled={exporting} data-testid="button-export-pdf">
            <FileText className="mr-1.5 h-4 w-4" /> PDF Sign-off
          </Button>
          <Button
            variant={snapOn ? "default" : "outline"}
            size="sm"
            onClick={() => setSnapOn((s) => !s)}
            title="Align to other lights & centerline. Hold ⌥ Option or ⌘ Command while dragging for free placement."
            data-testid="button-snap"
          >
            <Magnet className="mr-1.5 h-4 w-4" /> Snap {snapOn ? "On" : "Off"}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} data-testid="button-theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Save / Load bar — server-backed builds survive reload & redeploy */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/60 px-3 py-2" data-export-hide>
        <div className="flex items-center gap-1.5">
          <Save className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Customer / department name"
            className="h-8 w-56 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="input-build-name"
          />
        </div>
        <Button variant="default" size="sm" onClick={saveBuild} disabled={busy} data-testid="button-save-build">
          <Save className="mr-1.5 h-4 w-4" /> Save
        </Button>
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <select
            value=""
            onChange={(e) => loadBuild(e.target.value)}
            disabled={busy || savedBuilds.length === 0}
            className="h-8 w-52 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            data-testid="select-load-build"
          >
            <option value="" disabled>
              {savedBuilds.length ? "Load saved build…" : "No saved builds yet"}
            </option>
            {savedBuilds.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={deleteBuild}
          disabled={busy || !savedBuilds.some((b) => b.name === saveName.trim())}
          data-testid="button-delete-build"
        >
          <Trash2 className="mr-1.5 h-4 w-4" /> Delete
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {nodes.length} light{nodes.length === 1 ? "" : "s"} placed · saves persist across reloads
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left palette — compact, searchable, collapsible. Sticky header +
            internal scroll so the vehicle stays on screen no matter how many
            parts the catalog grows to. */}
        <aside
          className="flex w-full shrink-0 flex-col border-b border-border max-h-[38vh] lg:max-h-none lg:h-full lg:w-72 lg:border-b-0 lg:border-r"
          data-export-hide
        >
          {/* Sticky search / title header */}
          <div className="shrink-0 border-b border-border bg-background/95 px-3 py-2.5 backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Parts
              </h2>
              <span className="text-[10px] text-muted-foreground">{SKU_TYPES.length} SKUs</span>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Search SKU or name…"
                data-testid="input-palette-search"
                className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Scrollable, grouped, collapsible list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {(() => {
              const q = paletteQuery.trim().toLowerCase();
              const searching = q.length > 0;
              let shown = 0;
              const rendered = GROUP_ORDER.map((group) => {
                const items = SKU_TYPES.filter(
                  (t) =>
                    t.group === group &&
                    (!searching ||
                      t.sku.toLowerCase().includes(q) ||
                      t.name.toLowerCase().includes(q) ||
                      t.mount.toLowerCase().includes(q)),
                );
                if (items.length === 0) return null;
                shown += items.length;
                // visible row count: families collapse to a single row
                const famsSeen = new Set<string>();
                let rowCount = 0;
                for (const t of items) {
                  if (t.family) {
                    if (famsSeen.has(t.family)) continue;
                    famsSeen.add(t.family);
                  }
                  rowCount++;
                }
                const collapsed = !searching && collapsedGroups[group];
                return (
                  <div key={group} className="mb-1.5">
                    <button
                      onClick={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
                      }
                      className="flex w-full items-center gap-1 rounded px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary/80 hover-elevate"
                      data-testid={`group-toggle-${group}`}
                    >
                      {collapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {GROUP_LABELS[group]}
                      <span className="ml-1 font-normal text-muted-foreground">({rowCount})</span>
                    </button>
                    {!collapsed && (
                      <div className="mt-0.5">
                        {(() => {
                          // Build an ordered list of entries: a family appears
                          // once (at its first variant's position) as a single
                          // row with a variant dropdown; standalone SKUs render
                          // as normal rows.
                          const seenFamilies = new Set<string>();
                          const entries: JSX.Element[] = [];
                          for (const t of items) {
                            if (t.family) {
                              if (seenFamilies.has(t.family)) continue;
                              seenFamilies.add(t.family);
                              const variants = SKU_TYPES.filter((s) => s.family === t.family);
                              // active variant: honor current selection if it's
                              // still in the (possibly filtered) list, else first.
                              const selId =
                                variants.find((v) => v.id === familyVariant[t.family!])?.id ??
                                variants[0].id;
                              const active = SKU_MAP[selId];
                              entries.push(
                                <div
                                  key={`fam-${t.family}`}
                                  className="group flex items-center gap-2 rounded px-1.5 py-1 hover-elevate"
                                  data-testid={`palette-family-${t.family}`}
                                >
                                  <div
                                    draggable
                                    onDragStart={() => (dragType.current = selId)}
                                    onClick={() => addNode(selId)}
                                    title={`${active.name} — ${active.mount}\n(drag onto vehicle, or click to drop at suggested mount)`}
                                    className="flex shrink-0 cursor-grab items-center gap-2 active:cursor-grabbing"
                                    data-testid={`palette-${selId}`}
                                  >
                                    <div className="flex h-4 w-7 shrink-0 items-center justify-center">
                                      <LightFixture sku={active} color1={active.defaultC1} color2={active.defaultC2} scale={0.55} />
                                    </div>
                                    <span className="shrink-0 font-mono text-[11px] font-semibold">
                                      {(active.familyName ?? active.sku).split(" (")[0]}
                                    </span>
                                  </div>
                                  <select
                                    value={selId}
                                    onChange={(e) =>
                                      setFamilyVariant((prev) => ({ ...prev, [t.family!]: e.target.value }))
                                    }
                                    className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                    data-testid={`palette-variant-${t.family}`}
                                  >
                                    {variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.variantLabel ?? v.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addNode(selId);
                                    }}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground opacity-0 hover-elevate group-hover:opacity-100"
                                    title="Drop selected variant at suggested mount"
                                    data-testid={`button-add-family-${t.family}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>,
                              );
                            } else {
                              entries.push(
                                <div
                                  key={t.id}
                                  draggable
                                  onDragStart={() => (dragType.current = t.id)}
                                  onClick={() => addNode(t.id)}
                                  title={`${t.name} — ${t.mount}\n(drag onto vehicle, or click to drop at suggested mount)`}
                                  className="group flex cursor-grab items-center gap-2 rounded px-1.5 py-1 hover-elevate active:cursor-grabbing"
                                  data-testid={`palette-${t.id}`}
                                >
                                  <div className="flex h-4 w-7 shrink-0 items-center justify-center">
                                    <LightFixture sku={t} color1={t.defaultC1} color2={t.defaultC2} scale={0.55} />
                                  </div>
                                  <span className="shrink-0 font-mono text-[11px] font-semibold">{t.sku}</span>
                                  <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                                    {t.name}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addNode(t.id);
                                    }}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground opacity-0 hover-elevate group-hover:opacity-100"
                                    title="Drop at suggested mount"
                                    data-testid={`button-add-${t.id}`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>,
                              );
                            }
                          }
                          return entries;
                        })()}
                      </div>
                    )}
                  </div>
                );
              });
              return (
                <>
                  {rendered}
                  {shown === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                      No parts match “{paletteQuery}”.
                    </p>
                  )}
                </>
              );
            })()}
          </div>
          <p className="shrink-0 border-t border-border px-3 py-2 text-[10px] leading-snug text-muted-foreground">
            Drag onto the vehicle, or click a row / the + to drop at its mount. Then drag to fine-tune, select to rotate or recolor.
          </p>
        </aside>

        {/* Center stage */}
        <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto p-4">
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
            <VehicleOverlays view={activeView} params={params} pushBarPlacement={vehicle.pushBarPlacement} />
            {ghostBars.map(({ node, spec }) => (
              <GhostBar
                key={`ghost-${node.id}`}
                node={node}
                kind={spec.kind}
                x={spec.x}
                y={spec.y}
                barScale={vehicle.barScale ?? 1}
              />
            ))}
            {viewNodes.map((n) => (
              <LightNodeMarker
                key={n.id}
                node={n}
                selected={n.id === selectedId}
                stageRef={stageRef}
                onSelect={setSelectedId}
                onMove={moveNode}
                onEndDrag={endDrag}
                onRemove={removeNode}
                onRotate={rotateNode}
                onFlipOrientation={flipOrientation}
                barScale={vehicle.barScale ?? 1}
              />
            ))}
            {/* Alignment guide lines (only while dragging with snap on). Hidden
                from PNG/PDF export via data-export-hide. */}
            {dragActive && (guides.vx.length > 0 || guides.hy.length > 0) && (
              <div className="pointer-events-none absolute inset-0 z-30" data-export-hide>
                {guides.vx.map((x, i) => (
                  <div
                    key={`vx-${i}`}
                    className="absolute top-0 bottom-0 w-px bg-cyan-300/80"
                    style={{ left: `${x}%` }}
                  />
                ))}
                {guides.hy.map((y, i) => (
                  <div
                    key={`hy-${i}`}
                    className="absolute left-0 right-0 h-px bg-cyan-300/80"
                    style={{ top: `${y}%` }}
                  />
                ))}
              </div>
            )}
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
        <aside className="w-full shrink-0 border-t border-border p-4 max-h-[45vh] overflow-y-auto lg:max-h-none lg:h-full lg:w-72 lg:border-t-0 lg:border-l" data-export-hide>
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
                  Est. {activeEstimate.docNumber} · {activeEstimate.agency}
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
                <span className="font-semibold">Build note:</span> {activeEstimate.memo}
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
                      {m.placement && (
                        <div className="text-[10px] text-emerald-300">
                          → {m.placement.label} (from description)
                        </div>
                      )}
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
