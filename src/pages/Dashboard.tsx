import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import {
  Cpu, MemoryStick, HardDrive, Wifi,
  Activity, Clock, Trash2, Gauge,
  Zap, Shield,
} from "lucide-react";
import { RingSpinner } from "../components/ProgressBar";

interface SystemInfo {
  cpu: { label: string; value: string }[];
  ram: { label: string; value: string }[];
  gpu: { label: string; value: string }[];
  storage: { label: string; value: string }[];
  network: { label: string; value: string }[];
}

interface HistoryEntry {
  id: number;
  module: string;
  scanned_at: string;
  total_size: number;
  item_count: number;
}

function CircularMetric({ value, max, label, icon: Icon, color }: {
  value: number; max: number; label: string; icon: typeof Cpu; color: string;
}) {
  const r = 48;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <svg width={120} height={120} viewBox="0 0 120 120">
          <circle cx={60} cy={60} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={6} />
          <motion.circle
            cx={60} cy={60} r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - pct) }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={22} strokeWidth={1.5} style={{ color }} />
        </div>
        <span className="absolute bottom-[18px] left-1/2 -translate-x-1/2 text-xs font-mono text-white/60">
          {Math.round(pct * 100)}%
        </span>
      </div>
      <span className="text-[11px] text-white/40 uppercase tracking-widest">{label}</span>
    </motion.div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, loading }: {
  title: string; value: string; subtitle?: string; icon: typeof Activity; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.05] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center">
          <Icon size={16} strokeWidth={1.5} className="text-white/40" />
        </div>
        <span className="text-[11px] text-white/30 uppercase tracking-widest">{title}</span>
      </div>
      {loading ? (
        <RingSpinner size={20} strokeWidth={2} />
      ) : (
        <>
          <div className="text-2xl font-mono font-semibold text-white/90 tracking-tight">{value}</div>
          {subtitle && <div className="text-xs text-white/25 mt-1">{subtitle}</div>}
        </>
      )}
    </motion.div>
  );
}

const quickActions = [
  { path: "/junk-cleaner", label: "Clean Junk", icon: Trash2 },
  { path: "/benchmark", label: "Run Benchmark", icon: Gauge },
  { path: "/process-manager", label: "Processes", icon: Activity },
  { path: "/network-optimizer", label: "Net Tweak", icon: Zap },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 } as const,
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } as const },
} as const;

export default function Dashboard() {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const [info, hist] = await Promise.all([
          invoke<SystemInfo>("get_system_info"),
          invoke<HistoryEntry[]>("get_scan_history", { limit: 5 }),
        ]);
        setSysInfo(info);
        setHistory(hist);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const ramTotal = sysInfo ? parseFloat(sysInfo.ram.find(e => e.label === "Total")?.value.replace(" GB", "") || "16") : 16;
  const cpuModel = sysInfo?.cpu.find(e => e.label === "Model")?.value || "—";
  const storageInfo = sysInfo?.storage.map(s => s.value).join(", ") || "";

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const moduleLabel = (m: string) =>
    m === "junk_cleaner" ? "Junk Cleaner" : m === "registry_cleaner" ? "Registry Cleaner" : m;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-semibold text-white/90 tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/30 mt-1 font-mono">{cpuModel}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-1 mb-6">
          <Shield size={14} strokeWidth={1.5} className="text-white/20" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest">System Health</span>
        </div>
        <div className="flex justify-around items-center">
          <CircularMetric value={32} max={100} label="CPU" icon={Cpu} color="rgba(255,255,255,0.5)" />
          <CircularMetric value={45} max={100} label="RAM" icon={MemoryStick} color="rgba(255,255,255,0.35)" />
          <CircularMetric value={28} max={100} label="Disk" icon={HardDrive} color="rgba(255,255,255,0.4)" />
          <CircularMetric value={12} max={100} label="Network" icon={Wifi} color="rgba(255,255,255,0.3)" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <MetricCard
          title="Memory"
          value={loading ? "" : `${ramTotal.toFixed(1)} GB`}
          subtitle={loading ? "" : `DDR4`}
          icon={MemoryStick}
          loading={loading}
        />
        <MetricCard
          title="Cores"
          value={loading ? "" : sysInfo?.cpu.find(e => e.label === "Cores")?.value || "—"}
          subtitle={loading ? "" : `Threads: ${sysInfo?.cpu.find(e => e.label === "Threads")?.value || "—"}`}
          icon={Cpu}
          loading={loading}
        />
        <MetricCard
          title="Storage"
          value={loading ? "" : `${sysInfo?.storage.length || 0} Drives`}
          subtitle={loading ? "" : storageInfo.substring(0, 28)}
          icon={HardDrive}
          loading={loading}
        />
        <MetricCard
          title="Scans"
          value={loading ? "" : `${history.length}`}
          subtitle={loading ? "" : history.length > 0 ? `Last: ${moduleLabel(history[0].module)}` : "No scans yet"}
          icon={Activity}
          loading={loading}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center gap-2 mb-6">
        <Zap size={14} strokeWidth={1.5} className="text-white/20" />
        <span className="text-[11px] text-white/20 uppercase tracking-widest">Quick Actions</span>
      </motion.div>
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-10">
        {quickActions.map(action => (
          <Link
            key={action.path}
            to={action.path}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-lg hover:bg-white/[0.06] transition-all duration-200 text-sm text-white/50 hover:text-white/80"
          >
            <action.icon size={15} strokeWidth={1.5} />
            {action.label}
          </Link>
        ))}
      </motion.div>

      {history.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-1 mb-4">
            <Clock size={14} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">Recent Activity</span>
          </div>
          <div className="space-y-1">
            {history.map(h => (
              <div
                key={h.id}
                className="flex items-center gap-4 px-4 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg text-sm"
              >
                <span className="text-[11px] font-medium text-white/30 uppercase w-28 shrink-0">{moduleLabel(h.module)}</span>
                <span className="text-xs text-white/20 font-mono">{h.scanned_at.split("T")[0]}</span>
                <span className="text-xs text-white/30">{h.item_count} items</span>
                {h.total_size > 0 && <span className="text-xs text-white/20 font-mono">{formatSize(h.total_size)}</span>}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
