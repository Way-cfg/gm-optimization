import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, MemoryStick, Activity, Thermometer, Wifi, Info, Lightbulb } from "lucide-react";
import GlowCard from "../components/GlowCard";

interface PerformanceMetrics {
  cpu_usage: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
  gpu_usage: number | null;
  vram_used_gb: number | null;
  vram_total_gb: number | null;
  vram_percent: number | null;
  cpu_temp_celsius: number | null;
  gpu_temp_celsius: number | null;
}

interface NetworkSpeed {
  download_bytes_per_sec: number;
  upload_bytes_per_sec: number;
}

interface SystemStatus {
  power_plan: string;
  uptime: string;
  windows_version: string;
  windows_build: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } as const },
} as const;

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB/s`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB/s`;
  return `${(bytes / 1073741824).toFixed(2)} GB/s`;
}

function formatTemp(celsius: number): string {
  return `${celsius.toFixed(0)}°C`;
}

function getTempStatus(celsius: number): "normal" | "warm" | "high" {
  if (celsius >= 70) return "high";
  if (celsius >= 50) return "warm";
  return "normal";
}

function getUsageStatus(value: number): "normal" | "warm" | "high" {
  if (value >= 80) return "high";
  if (value >= 50) return "warm";
  return "normal";
}

function StatusBadge({ status }: { status: "normal" | "warm" | "high" }) {
  const colors = {
    normal: "text-white/30 border-white/[0.06]",
    warm: "text-amber/70 border-amber/20",
    high: "text-crimson/70 border-crimson/20",
  };
  const labels = { normal: "Normal", warm: "Warm", high: "High" };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function ProgressRing({
  value,
  max = 100,
  size = 72,
  stroke = 5,
  label,
  unit,
  status,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label: string;
  unit: string;
  status?: "normal" | "warm" | "high";
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  const ringColor = status === "high" ? "#FF1744" : status === "warm" ? "#FF8F00" : "#FF5500";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 6px ${ringColor}40)` }}
        />
      </svg>
      <span className="text-sm font-mono font-medium text-white/80">{value.toFixed(0)}{unit}</span>
      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}

function ValueCard({
  icon: Icon,
  label,
  value,
  sub,
  children,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.5} className="text-white/35" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-white/25 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-mono font-medium text-white/70 mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-white/20 mt-0.5">{sub}</div>}
      </div>
      {children}
    </GlowCard>
  );
}

function UnavailableCard({ icon: Icon, label }: { icon: typeof Cpu; label: string }) {
  return (
    <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200 opacity-50">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
        <Icon size={16} strokeWidth={1.5} className="text-white/20" />
      </div>
      <div>
        <div className="text-[11px] text-white/20 uppercase tracking-widest">{label}</div>
        <div className="text-sm font-mono text-white/15 mt-0.5">Unavailable</div>
      </div>
    </GlowCard>
  );
}

export default function Monitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [network, setNetwork] = useState<NetworkSpeed | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const m = await invoke<PerformanceMetrics>("get_performance_metrics");
      setMetrics(m);
    } catch {}
  }, []);

  const fetchNetwork = useCallback(async () => {
    try {
      const n = await invoke<NetworkSpeed>("get_network_speed");
      setNetwork(n);
    } catch {}
  }, []);

  const fetchSystemStatus = useCallback(async () => {
    try {
      const s = await invoke<SystemStatus>("get_system_status");
      setStatus(s);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchNetwork();
    fetchSystemStatus();

    const mInterval = setInterval(fetchMetrics, 2000);
    const nInterval = setInterval(fetchNetwork, 2000);
    return () => {
      clearInterval(mInterval);
      clearInterval(nInterval);
    };
  }, [fetchMetrics, fetchNetwork, fetchSystemStatus]);

  const insights: string[] = [];
  if (metrics) {
    if (metrics.ram_percent > 80) insights.push("High RAM usage detected. Consider closing unused applications.");
    if (metrics.disk_percent > 90) insights.push("High disk usage detected. Consider freeing up disk space.");
  }
  if (status) {
    const plan = status.power_plan.toLowerCase();
    if (plan.includes("balanced") || plan.includes("power saver")) {
      insights.push("Balanced power plan active. High Performance may improve responsiveness.");
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={item} className="mb-6">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Monitoring</h1>
        <p className="text-sm text-white/25 mt-1">Live system performance overview</p>
      </motion.div>

      <motion.div variants={item} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={13} strokeWidth={1.5} className="text-white/20" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest">Live Performance Overview</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex flex-col items-center transition-all duration-200">
            <ProgressRing
              value={metrics?.cpu_usage ?? 0}
              label="CPU"
              unit="%"
              status={metrics ? getUsageStatus(metrics.cpu_usage) : undefined}
            />
          </GlowCard>
          <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex flex-col items-center transition-all duration-200">
            <ProgressRing
              value={metrics?.ram_percent ?? 0}
              label="RAM"
              unit="%"
              status={metrics ? getUsageStatus(metrics.ram_percent) : undefined}
            />
            {metrics && (
              <span className="text-[11px] font-mono text-white/20 mt-1">
                {metrics.ram_used_gb.toFixed(1)} / {metrics.ram_total_gb.toFixed(1)} GB
              </span>
            )}
          </GlowCard>
          <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex flex-col items-center transition-all duration-200">
            <ProgressRing
              value={metrics?.disk_percent ?? 0}
              label="Disk"
              unit="%"
              status={metrics ? getUsageStatus(metrics.disk_percent) : undefined}
            />
            {metrics && (
              <span className="text-[11px] font-mono text-white/20 mt-1">
                {metrics.disk_used_gb.toFixed(1)} / {metrics.disk_total_gb.toFixed(1)} GB
              </span>
            )}
          </GlowCard>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {metrics?.gpu_usage !== null && metrics?.gpu_usage !== undefined ? (
            <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex flex-col items-center transition-all duration-200">
              <ProgressRing
                value={metrics!.gpu_usage!}
                label="GPU"
                unit="%"
                status={getUsageStatus(metrics!.gpu_usage!)}
              />
            </GlowCard>
          ) : (
            <UnavailableCard icon={Cpu} label="GPU" />
          )}

          {metrics?.vram_percent !== null && metrics?.vram_percent !== undefined ? (
            <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex flex-col items-center transition-all duration-200">
              <ProgressRing
                value={metrics!.vram_percent!}
                label="VRAM"
                unit="%"
                status={getUsageStatus(metrics!.vram_percent!)}
              />
              <span className="text-[11px] font-mono text-white/20 mt-1">
                {metrics!.vram_used_gb!.toFixed(1)} / {metrics!.vram_total_gb!.toFixed(1)} GB
              </span>
            </GlowCard>
          ) : (
            <UnavailableCard icon={MemoryStick} label="VRAM" />
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer size={13} strokeWidth={1.5} className="text-white/20" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest">Temperatures</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {metrics?.cpu_temp_celsius !== null && metrics?.cpu_temp_celsius !== undefined ? (
            <ValueCard icon={Cpu} label="CPU Temperature" value={formatTemp(metrics.cpu_temp_celsius)}>
              <StatusBadge status={getTempStatus(metrics.cpu_temp_celsius)} />
            </ValueCard>
          ) : (
            <UnavailableCard icon={Cpu} label="CPU Temperature" />
          )}

          {metrics?.gpu_temp_celsius !== null && metrics?.gpu_temp_celsius !== undefined ? (
            <ValueCard icon={Cpu} label="GPU Temperature" value={formatTemp(metrics.gpu_temp_celsius)}>
              <StatusBadge status={getTempStatus(metrics.gpu_temp_celsius)} />
            </ValueCard>
          ) : (
            <UnavailableCard icon={Cpu} label="GPU Temperature" />
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Wifi size={13} strokeWidth={1.5} className="text-white/20" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest">Network Activity</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ValueCard icon={Activity} label="Download" value={network ? formatBytes(network.download_bytes_per_sec) : "—"} />
          <ValueCard icon={Activity} label="Upload" value={network ? formatBytes(network.upload_bytes_per_sec) : "—"} />
        </div>
      </motion.div>

      <motion.div variants={item} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Info size={13} strokeWidth={1.5} className="text-white/20" />
          <span className="text-[11px] text-white/20 uppercase tracking-widest">System Status</span>
        </div>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 transition-all duration-200">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/25 w-32 shrink-0">Active Power Plan</span>
              <span className="text-sm font-mono text-white/70">{status?.power_plan ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/25 w-32 shrink-0">Windows Uptime</span>
              <span className="text-sm font-mono text-white/70">{status?.uptime ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/25 w-32 shrink-0">Windows Version</span>
              <span className="text-sm font-mono text-white/70">{status?.windows_version ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/25 w-32 shrink-0">Build</span>
              <span className="text-sm font-mono text-white/70">{status?.windows_build ?? "—"}</span>
            </div>
          </div>
        </GlowCard>
      </motion.div>

      {insights.length > 0 && (
        <motion.div variants={item} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">Optimization Insights</span>
          </div>
          <div className="space-y-1.5">
            {insights.map((msg, i) => (
              <GlowCard key={i} className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-4 py-3 flex items-center gap-3 transition-all duration-200">
                <div className="w-6 h-6 rounded-full bg-neon/[0.08] flex items-center justify-center shrink-0">
                  <Lightbulb size={11} strokeWidth={2} className="text-neon/60" />
                </div>
                <span className="text-sm text-white/50">{msg}</span>
              </GlowCard>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
