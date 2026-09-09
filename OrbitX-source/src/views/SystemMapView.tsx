import {
  Rocket,
  Home,
  Calendar,
  Swords,
  Trophy,
  User,
  Search,
  MessageSquare,
  Users,
  Eye,
  Orbit,
  Shield,
  LifeBuoy,
  Timer,
  Zap,
  Flame,
  BarChart3,
  Gift,
  Hourglass,
  Bell,
  Database,
  UserCheck,
  Cloud,
  Cpu,
  Lock,
  AlertTriangle,
  GitBranch,
  Globe,
  MousePointer2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  X,
  Move,
  Workflow,
  Box,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../lib/utils";
import {
  NODES,
  EDGES,
  GROUPS_BY_KEY,
  WORLD,
  MapNode,
  NodeGroup,
} from "../data/systemMapData";

const NODE_ICONS: Record<string, any> = {
  Rocket,
  Home,
  Calendar,
  Swords,
  Trophy,
  User,
  Search,
  MessageSquare,
  Users,
  Eye,
  BlackHole: Orbit,
  Shield,
  LifeBuoy,
  Timer,
  Zap,
  Flame,
  BarChart3,
  Gift,
  Hourglass,
  Bell,
  Database,
  UserCheck,
  Cloud,
  Cpu,
  Lock,
  AlertTriangle,
  GitBranch,
  Globe,
};

const iconOf = (name: string) => NODE_ICONS[name] || Box;

const GROUP_COLOR: Record<NodeGroup, string> = {
  app: "#818cf8",
  logic: "#22d3ee",
  data: "#e879f9",
  security: "#34d399",
  deploy: "#fbbf24",
};

const GROUP_ORDER: NodeGroup[] = ["app", "logic", "data", "security", "deploy"];

const NODE_W = 220;
const NODE_H = 150;

const STORAGE_KEY = "orbitx_system_map_layout_v1";

export default function SystemMapView() {
  const { isAr } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<MapNode | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.55);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const nodeById = useMemo(() => {
    const m = new Map<string, MapNode>();
    NODES.forEach((n) => m.set(n.id, n));
    return m;
  }, []);

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    EDGES.forEach((e) => {
      if (!m.has(e.from)) m.set(e.from, new Set());
      m.get(e.from)!.add(e.to);
      if (!m.has(e.to)) m.set(e.to, new Set());
      m.get(e.to)!.add(e.from);
    });
    return m;
  }, []);

  const selectedNeighborIds = useMemo(() => {
    if (!selected) return new Set<string>();
    return adjacency.get(selected.id) || new Set<string>();
  }, [selected, adjacency]);

  const neighborsOf = useCallback(
    (id: string): MapNode[] =>
      Array.from(adjacency.get(id) || [])
        .map((nid) => nodeById.get(nid))
        .filter((n): n is MapNode => !!n),
    [adjacency, nodeById],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setOffsets(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(offsets));
    } catch {
      /* ignore */
    }
  }, [offsets]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fittedView = useCallback(
    (w: number, h: number) => {
      const fitScale = Math.min((w - 32) / WORLD.w, (h - 32) / WORLD.h);
      const zoomed = Math.min(1, Math.max(0.3, fitScale));
      return {
        zoom: zoomed,
        pan: { x: (w - WORLD.w * zoomed) / 2, y: (h - WORLD.h * zoomed) / 2 },
      };
    },
    [],
  );

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current || !containerSize.w || !containerSize.h) return;
    didInitRef.current = true;
    const fv = fittedView(containerSize.w, containerSize.h);
    setZoom(fv.zoom);
    setPan(fv.pan);
  }, [containerSize, fittedView]);

  const worldPosOf = useCallback(
    (node: MapNode) => {
      const o = offsets[node.id];
      return { x: node.x + (o?.dx || 0), y: node.y + (o?.dy || 0) };
    },
    [offsets],
  );

  const getPointerPos = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const dragRef = useRef<{
    mode: "pan" | "node";
    nodeId?: string;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
    baseOff?: { dx: number; dy: number };
    moved: boolean;
  } | null>(null);

  const applyZoomAt = useCallback((next: number, sx?: number, sy?: number) => {
    const z0 = zoomRef.current;
    const z1 = Math.min(1.6, Math.max(0.35, next));
    if (Math.abs(z1 - z0) < 0.0001) return;
    const f = z1 / z0;
    setPan((p) => {
      const nx = sx !== undefined ? sx - (sx - p.x) * f : p.x;
      const ny = sy !== undefined ? sy - (sy - p.y) * f : p.y;
      return { x: nx, y: ny };
    });
    setZoom(z1);
  }, []);

  const centerZoom = useCallback(() => {
    const r = containerRef.current?.getBoundingClientRect();
    return r ? { x: r.width / 2, y: r.height / 2 } : undefined;
  }, []);

  const zoomIn = useCallback(() => {
    const c = centerZoom();
    applyZoomAt(zoomRef.current * 1.25, c?.x, c?.y);
  }, [applyZoomAt, centerZoom]);

  const zoomOut = useCallback(() => {
    const c = centerZoom();
    applyZoomAt(zoomRef.current * 0.8, c?.x, c?.y);
  }, [applyZoomAt, centerZoom]);

  const resetView = useCallback(() => {
    setOffsets({});
    setSelected(null);
    const fv = fittedView(containerSize.w || 800, containerSize.h || 600);
    setZoom(fv.zoom);
    setPan(fv.pan);
  }, [fittedView, containerSize]);

  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    applyZoomAt(
      zoomRef.current * (e.deltaY < 0 ? 1.15 : 0.87),
      e.clientX - r.left,
      e.clientY - r.top,
    );
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => wheelRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const pos = getPointerPos(e);
    dragRef.current = {
      mode: "pan",
      startX: pos.x,
      startY: pos.y,
      origPanX: panRef.current.x,
      origPanY: panRef.current.y,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pos = getPointerPos(e);
    const dx = pos.x - drag.startX;
    const dy = pos.y - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    if (drag.mode === "pan") {
      setPan({ x: drag.origPanX + dx, y: drag.origPanY + dy });
    } else if (drag.nodeId) {
      const base = drag.baseOff || { dx: 0, dy: 0 };
      setOffsets((prev) => ({
        ...prev,
        [drag.nodeId as string]: {
          dx: base.dx + dx / zoomRef.current,
          dy: base.dy + dy / zoomRef.current,
        },
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    dragRef.current = null;
    if (drag.mode === "pan" && !drag.moved) {
      setSelected(null);
    } else if (drag.mode === "node" && !drag.moved && drag.nodeId) {
      const node = nodeById.get(drag.nodeId);
      if (node) setSelected(node);
    }
  };

  const onNodePointerDown = (e: React.PointerEvent, node: MapNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const pos = getPointerPos(e);
    dragRef.current = {
      mode: "node",
      nodeId: node.id,
      startX: pos.x,
      startY: pos.y,
      origPanX: panRef.current.x,
      origPanY: panRef.current.y,
      baseOff: offsets[node.id] || { dx: 0, dy: 0 },
      moved: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const edgeEndpoints = (from: MapNode, to: MapNode) => {
    const a = worldPosOf(from);
    const b = worldPosOf(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const padX = NODE_W / 2 - 10;
    const padY = NODE_H / 2 - 10;
    return {
      x1: a.x + ux * padX,
      y1: a.y + uy * padY,
      x2: b.x - ux * padX,
      y2: b.y - uy * padY,
      mx: (a.x + b.x) / 2,
      my: (a.y + b.y) / 2,
    };
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="relative w-full">
      <div className="mb-4">
        <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Workflow className="text-cyan-400" size={22} />
          </span>
          نظام OrbitX · خريطة النظام
        </h2>
        <p className="text-gray-400 text-xs sm:text-sm mt-1.5 leading-relaxed">
          {isAr
            ? "كل بطاقة كيان حقيقي في الموقع، والخطوط روابط فعلية بينها. اسحب الخلفية للتحرك، مرّر للتكبير/التصغير، اسحب بطاقة لتنقّلها، واضغطها لعرض شروحها وعلاقاتها."
            : "Every card is a real component; the lines are how they actually connect. Drag the background to roam, scroll to zoom, drag a card to reposition it, and tap a card for its details."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <div
          ref={containerRef}
          className="relative w-full h-[70vh] rounded-[1.5rem] overflow-hidden border border-white/10 bg-[#05060f]"
          onPointerDown={onBackgroundPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
              backgroundSize: "30px 30px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_rgba(0,0,0,0.55)_100%)]" />

          <div className="absolute top-3 left-3 z-20 flex items-center gap-2 text-[11px] font-mono text-cyan-400/70 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full border border-white/5 pointer-events-none">
            <MousePointer2 size={12} />
            <span>{Math.round(zoom * 100)}%</span>
            <span className="text-white/20">|</span>
            <Move size={12} />
            <span>{isAr ? "اسحب للتحرك" : "drag to roam"}</span>
          </div>

          <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1.5">
            <button
              onClick={zoomIn}
              className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 text-white hover:border-cyan-400/40 hover:text-cyan-300 backdrop-blur flex items-center justify-center transition-colors"
              title={isAr ? "تكبير" : "Zoom in"}
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={zoomOut}
              className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 text-white hover:border-cyan-400/40 hover:text-cyan-300 backdrop-blur flex items-center justify-center transition-colors"
              title={isAr ? "تصغير" : "Zoom out"}
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetView}
              className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 text-white hover:border-cyan-400/40 hover:text-cyan-300 backdrop-blur flex items-center justify-center transition-colors"
              title={isAr ? "إعادة الضبط" : "Reset"}
            >
              <Maximize2 size={16} />
            </button>
          </div>

          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 bg-black/40 backdrop-blur px-3 py-2.5 rounded-xl border border-white/5">
            {GROUP_ORDER.map((key) => {
              const g = GROUPS_BY_KEY[key];
              const count = NODES.filter((n) => n.group === key).length;
              return (
                <div key={key} className="flex items-center gap-2 text-[11px] text-gray-300">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: GROUP_COLOR[key] }}
                  />
                  {g.label}
                  <span className="text-white/30 text-[10px]">({count})</span>
                </div>
              );
            })}
          </div>

          <div
            className="absolute top-0 left-0"
            style={{
              width: WORLD.w,
              height: WORLD.h,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              className="absolute inset-0 overflow-visible"
              width={WORLD.w}
              height={WORLD.h}
            >
              <defs>
                <marker
                  id="sm-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="#8C52FF" />
                </marker>
              </defs>
              {EDGES.map((edge, i) => {
                const from = nodeById.get(edge.from);
                const to = nodeById.get(edge.to);
                if (!from || !to) return null;
                const p = edgeEndpoints(from, to);
                const touchesSel =
                  !!selected &&
                  (edge.from === selected.id || edge.to === selected.id);
                const bridgesSel =
                  !!selected &&
                  selectedNeighborIds.has(edge.from) &&
                  selectedNeighborIds.has(edge.to);
                const active = touchesSel || bridgesSel;
                const dim = !!selected && !active;
                return (
                  <g
                    key={i}
                    style={{ opacity: dim ? 0.12 : 1, transition: "opacity 0.25s" }}
                  >
                    {active && (
                      <line
                        x1={p.x1}
                        y1={p.y1}
                        x2={p.x2}
                        y2={p.y2}
                        stroke="#8C52FF"
                        strokeWidth={7}
                        opacity={0.22}
                        strokeLinecap="round"
                      />
                    )}
                    <line
                      x1={p.x1}
                      y1={p.y1}
                      x2={p.x2}
                      y2={p.y2}
                      stroke={active ? "#8C52FF" : "#3b4370"}
                      strokeWidth={active ? 2.5 : 1.4}
                      strokeLinecap="round"
                      strokeDasharray={active ? "0" : "5 4"}
                      markerEnd={active ? "url(#sm-arrow)" : "none"}
                    />
                    {edge.label && (
                      <g transform={`translate(${p.mx}, ${p.my})`}>
                        <rect
                          x={-34}
                          y={-11}
                          width={68}
                          height={22}
                          rx={11}
                          fill="#0b0c16"
                          stroke={active ? "#8C52FF" : "#252a3f"}
                          strokeWidth={1}
                          opacity={active ? 1 : 0.75}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#9aa3c7"
                          style={{ userSelect: "none", direction: "rtl" }}
                        >
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {NODES.map((node) => {
              const g = GROUPS_BY_KEY[node.group];
              const Icon = iconOf(node.icon);
              const pos = worldPosOf(node);
              const isSel = selected?.id === node.id;
              const isNeighbor = selected ? selectedNeighborIds.has(node.id) : false;
              const dimmed = selected ? !isSel && !isNeighbor : false;
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => onNodePointerDown(e, node)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className={cn(
                    "absolute select-none",
                    isSel ? "z-30" : isNeighbor ? "z-20" : "z-10",
                  )}
                  style={{
                    left: pos.x - NODE_W / 2,
                    top: pos.y - NODE_H / 2,
                    width: NODE_W,
                    height: NODE_H,
                    opacity: dimmed ? 0.3 : 1,
                    transition: "opacity 0.25s",
                    touchAction: "none",
                  }}
                >
                  <div
                    className={cn(
                      "w-full h-full rounded-2xl border bg-[#0b0c16]/95 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-shadow duration-200",
                      isSel
                        ? "ring-2 ring-cyan-400/70 shadow-[0_0_45px_rgba(34,211,238,0.3)]"
                        : "hover:shadow-[0_16px_46px_rgba(0,0,0,0.75)]",
                      g.ring,
                      g.glow,
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-white/5 cursor-grab active:cursor-grabbing">
                      <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", g.badge)}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-black text-white truncate leading-tight">
                          {node.title}
                        </div>
                        <div className="text-[9px] font-mono" style={{ color: GROUP_COLOR[node.group] }}>
                          {g.label}
                        </div>
                      </div>
                      <Move size={11} className="text-white/20 shrink-0" />
                    </div>
                    <div className="px-3 pt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                      {node.rows.slice(0, 4).map((row, i) => (
                        <div key={i} className="flex flex-col min-w-0">
                          <span className="text-[8px] uppercase tracking-wide text-gray-600 truncate">
                            {row.label}
                          </span>
                          <span className="text-[9px] font-semibold text-gray-300 truncate w-full">
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hidden lg:block">
          {selected ? (
            <DetailsPanel
              node={selected}
              neighbors={neighborsOf(selected.id)}
              onSelect={(n) => setSelected(n)}
              onClose={() => setSelected(null)}
              isAr={isAr}
            />
          ) : (
            <EmptyDetails isAr={isAr} />
          )}
        </div>
      </div>

      <div className="lg:hidden mt-4">
        {selected ? (
          <DetailsPanel
            node={selected}
            neighbors={neighborsOf(selected.id)}
            onSelect={(n) => setSelected(n)}
            onClose={() => setSelected(null)}
            isAr={isAr}
            mobile
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
            <p className="text-xs font-bold text-gray-300">
              {isAr
                ? "اضغط أي بطاقة على الخريطة لعرض تفاصيلها."
                : "Tap any card on the map to view its details."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsPanel({
  node,
  neighbors,
  onSelect,
  onClose,
  isAr,
  mobile,
}: {
  node: MapNode;
  neighbors: MapNode[];
  onSelect: (n: MapNode) => void;
  onClose: () => void;
  isAr: boolean;
  mobile?: boolean;
}) {
  const g = GROUPS_BY_KEY[node.group];
  const Icon = iconOf(node.icon);
  const edgeCount = EDGES.filter((e) => e.from === node.id || e.to === node.id).length;
  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className={cn(
        "relative rounded-2xl border border-white/10 bg-[#0b0c16]/95 backdrop-blur overflow-y-auto",
        mobile ? "p-4" : "p-5 h-full max-h-[70vh]",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold", g.badge)}>
          {g.label}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition"
          aria-label={isAr ? "إغلاق" : "Close"}
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", g.badge)}>
          <Icon size={22} />
        </span>
        <h3 className="text-lg font-black text-white font-display leading-tight">
          {node.title}
        </h3>
      </div>

      <p className="text-[13px] leading-relaxed text-gray-300 mb-4">{node.desc}</p>

      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        {isAr ? "الحقول" : "Fields"}
      </h4>
      <div className="overflow-hidden rounded-xl border border-white/5 mb-5">
        {node.rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2",
              i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent",
            )}
          >
            <span className="text-[10px] font-mono" style={{ color: GROUP_COLOR[node.group] }}>
              {row.label}
            </span>
            <span className="text-[11px] font-semibold text-gray-200 text-left">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
        {isAr ? "العلاقات" : "Connections"} ({edgeCount})
      </h4>
      <div className={cn("flex flex-col gap-1.5", mobile && "flex-row flex-wrap")}>
        {neighbors.map((c) => {
          const cg = GROUPS_BY_KEY[c.group];
          const CIcon = iconOf(c.icon);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className={cn(
                "flex items-center gap-2.5 text-left px-2.5 py-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition group",
                !mobile && "w-full",
                mobile && "flex-1 min-w-[45%]",
              )}
            >
              <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", cg.badge)}>
                <CIcon size={13} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-gray-200 truncate">
                  {c.title}
                </span>
                <span className="block text-[9px] text-gray-500 truncate">
                  {edgeRelation(node.id, c.id)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyDetails({ isAr }: { isAr: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 h-full flex flex-col items-center justify-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
        <MousePointer2 className="text-cyan-400" size={24} />
      </div>
      <p className="text-sm font-bold text-gray-300 mb-1.5">
        {isAr ? "اختر بطاقة لاستكشافها" : "Select a card to explore"}
      </p>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        {isAr
          ? "اضغط أي بطاقة على الخريطة لعرض وصفها وحقولها وجميع ارتباطاتها المباشرة."
          : "Click any card to view its description, fields, and direct connections."}
      </p>
    </div>
  );
}

function edgeRelation(fromId: string, toId: string) {
  const e = EDGES.find((x) => (x.from === fromId && x.to === toId) || (x.from === toId && x.to === fromId));
  if (e?.from === toId && e?.to === fromId) {
    return e.label ? `${e.label} · ←` : "←";
  }
  return e?.label ? `${e.label} · →` : "→";
}