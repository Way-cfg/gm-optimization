import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, MemoryStick, HardDrive, Activity } from "lucide-react";
import appLogo from "../../branding_assets/applogo.png";

interface DriveSummary {
  letter: string;
  size: string;
}

interface InitResult {
  cpu_name: string;
  gpu_name: string;
  ram_total: string;
  drives: DriveSummary[];
}

interface ScanEntry {
  id: number;
  module: string;
  scanned_at: string;
  total_size: number;
  item_count: number;
}

function OptimizationArc({ value, max, size = 260 }: { value: number; max: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const arcLength = circumference * 0.75;
  const offset = arcLength * (1 - pct) + circumference * 0.125;
  const isFull = pct >= 1;

  return (
    <div className="relative neon-glow">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={isFull ? "#00C853" : "#FF5500"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          initial={{ strokeDashoffset: circumference * 0.875 }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform={`rotate(-135 ${size / 2} ${size / 2})`}
          style={{ filter: isFull ? "drop-shadow(0 0 12px rgba(0,200,83,0.5))" : "drop-shadow(0 0 12px rgba(255,85,0,0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-center"
        >
          <div className={`text-[10px] tracking-[0.25em] font-medium mb-1 ${isFull ? "text-emerald/80" : "text-neon/60"}`}>
            OPTIMIZATION SCORE
          </div>
          <div className={`text-2xl font-mono font-bold tracking-tight ${isFull ? "text-emerald" : "text-white/80"}`}>
            {Math.round(pct * 100)}%
          </div>
          <div className={`text-[10px] font-mono mt-2 ${isFull ? "text-emerald/50" : "text-white/20"}`}>
            {isFull ? "Fully Optimized" : "Optimized"}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SpecCard({ icon: Icon, label, value }: {
  icon: typeof Cpu; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.5} className="text-white/35" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-white/25 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-mono font-medium text-white/70 mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function ActivityStream({ entries }: { entries: ScanEntry[] }) {
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const describe = (e: ScanEntry) => {
    const m = e.module.toLowerCase();
    if (m.includes("junk")) return `Cleaned ${formatSize(e.total_size)} Junk Files`;
    if (m.includes("registry")) return `Resolved ${e.item_count} Registry Issues`;
    if (m.includes("network")) return `Applied Network Low-Latency Tweak`;
    if (m.includes("startup")) return `Optimized ${e.item_count} Startup Entries`;
    if (m.includes("tweak")) return `Applied ${e.item_count} System Tweaks`;
    return `${e.module}: ${e.item_count} items`;
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
        <Activity size={12} strokeWidth={1.5} className="text-white/20" />
        <span className="text-[10px] text-white/15 uppercase tracking-widest">Optimization Log</span>
        <span className="text-[10px] text-white/10 font-mono ml-auto">LIVE</span>
      </div>
      <div className="px-4 py-3 max-h-[140px] overflow-y-auto space-y-1.5 font-mono">
        {entries.length === 0 ? (
          <div className="text-xs text-white/12 italic">No activity recorded yet</div>
        ) : (
          entries.map(e => (
            <div key={e.id} className="flex gap-3 text-xs">
              <span className="text-white/15 shrink-0">[{formatTime(e.scanned_at)}]</span>
              <span className="text-white/35 truncate">{describe(e)}</span>
            </div>
          ))
        )}
        <div className="flex gap-3 text-xs">
          <span className="text-white/10 shrink-0">[--:--:--]</span>
          <span className="text-white/12 terminal-cursor">awaiting next task</span>
        </div>
      </div>
    </div>
  );
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } as const },
} as const;
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } as const },
} as const;

export default function Dashboard({ initData }: { initData?: InitResult | null }) {
  const [history, setHistory] = useState<ScanEntry[]>([]);
  const status: string = "OPTIMIZED";
  const drivesText = initData?.drives.map(d => `${d.letter} ${d.size}`).join(", ") || "—";

  useEffect(() => {
    invoke<ScanEntry[]>("get_scan_history", { limit: 15 }).then(setHistory).catch(() => {});
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={item} className="bg-frosted/80 backdrop-blur-xl border border-white/[0.04] rounded-2xl p-6 mb-8 mt-2">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <img src={appLogo} alt="Optimization Way" className="h-20 md:h-24 w-auto" />
          <div className="hidden md:block w-px h-28 bg-white/[0.04]" />
          <OptimizationArc value={status === "EXTREME" ? 100 : 45} max={100} size={240} />
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
        <SpecCard icon={Cpu} label="CPU" value={initData?.cpu_name || "—"} />
        <SpecCard icon={Cpu} label="GPU" value={initData?.gpu_name || "—"} />
        <SpecCard icon={MemoryStick} label="RAM" value={initData?.ram_total || "—"} />
        <SpecCard icon={HardDrive} label="Drives" value={drivesText} />
      </motion.div>

      <motion.div variants={item}>
        <ActivityStream entries={history} />
      </motion.div>
    </motion.div>
  );
}
