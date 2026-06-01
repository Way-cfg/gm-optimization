import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { Cpu, MemoryStick, Activity } from "lucide-react";

interface SystemInfo {
  cpu: { label: string; value: string }[];
  ram: { label: string; value: string }[];
  gpu: { label: string; value: string }[];
  storage: { label: string; value: string }[];
  network: { label: string; value: string }[];
}

function StatusArc({ value, max, size = 200 }: { value: number; max: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const arcLength = circumference * 0.75;
  const offset = arcLength * (1 - pct) + circumference * 0.125;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arcLength} ${circumference}`}
        initial={{ strokeDashoffset: circumference * 0.875 }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        transform={`rotate(-135 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function MetricBadge({ icon: Icon, label, value, sub }: {
  icon: typeof Cpu; label: string; value: string; sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
        <Icon size={16} strokeWidth={1.5} className="text-white/35" />
      </div>
      <div>
        <div className="text-[11px] text-white/25 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-mono font-medium text-white/70 mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-white/20 font-mono">{sub}</div>}
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

export default function Dashboard({ initData }: { initData?: SystemInfo | null }) {
  const [info, setInfo] = useState<SystemInfo | null>(initData || null);
  const [cpuLoad] = useState(32);
  const [ramPct] = useState(45);
  const status: string = "OPTIMIZED";

  useEffect(() => {
    if (!initData) {
      invoke<SystemInfo>("get_system_info").then(setInfo).catch(() => {});
    }
  }, [initData]);

  const ramTotal = info ? parseFloat(info.ram.find(e => e.label === "Total")?.value.replace(" GB", "") || "16") : 16;
  const cpuName = info?.cpu.find(e => e.label === "Model")?.value || "";
  const cores = info?.cpu.find(e => e.label === "Cores")?.value || "";
  const gpuName = info?.gpu.find(e => e.label === "GPU")?.value || "";
  const osArch = info?.cpu.find(e => e.label === "Architecture")?.value || "x64";
  const drives = info?.storage.length || 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={item} className="mb-8 text-center">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/25 mt-1 font-mono">{cpuName || "Loading..."}</p>
        {gpuName && <p className="text-[11px] text-white/15 mt-0.5 font-mono">{gpuName}</p>}
      </motion.div>

      <motion.div variants={item} className="flex justify-center mb-10">
        <div className="relative">
          <StatusArc value={status === "EXTREME" ? 95 : 72} max={100} size={220} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="text-center"
            >
              <div className={`text-[11px] tracking-[0.2em] font-medium mb-1 ${status === "EXTREME" ? "text-white/60" : "text-white/40"}`}>
                PC STATUS
              </div>
              <div className={`text-lg font-mono font-bold tracking-tight ${status === "EXTREME" ? "text-white/80" : "text-white/60"}`}>
                {status === "EXTREME" ? "EXTREME MODE" : "OPTIMIZED"}
              </div>
              <div className="text-[10px] text-white/20 font-mono mt-2">
                {status === "EXTREME" ? "Ultimate Performance Profile" : "Safe & Balanced"}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-8">
        <MetricBadge icon={Cpu} label="CPU" value={`${cpuLoad}%`} sub={`${cores} cores`} />
        <MetricBadge icon={MemoryStick} label="RAM" value={`${ramTotal.toFixed(1)} GB`} sub={`${ramPct}% utilized`} />
        <MetricBadge icon={Activity} label="Drives" value={`${drives} drives`} sub={osArch} />
        <MetricBadge icon={Activity} label="GPU" value={gpuName.split(" ").slice(0, 2).join(" ") || "—"} sub={gpuName.split(" ").slice(2).join(" ") || ""} />
      </motion.div>

      <motion.div variants={item} className="bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-6">
        <div className="text-[11px] text-white/20 uppercase tracking-widest mb-5">System Overview</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
          {info?.cpu.filter(e => e.label !== "Architecture").map(e => (
            <div key={e.label} className="flex justify-between text-sm">
              <span className="text-white/25 font-mono text-[11px] uppercase tracking-wider">{e.label}</span>
              <span className="text-white/60 font-mono text-xs">{e.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
