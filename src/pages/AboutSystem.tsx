import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, Monitor, HardDrive, Wifi, CircuitBoard, Info } from "lucide-react";
import GlowCard from "../components/GlowCard";

interface SystemInfo {
  cpu: { label: string; value: string }[];
  gpu: { label: string; value: string }[];
  ram: { label: string; value: string }[];
  motherboard: { label: string; value: string }[];
  storage: { label: string; value: string }[];
  network: { label: string; value: string }[];
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

function SpecSection({ icon: Icon, title, entries }: {
  icon: typeof Cpu; title: string; entries: { label: string; value: string }[];
}) {
  if (entries.length === 0) return null;
  return (
    <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} strokeWidth={1.5} className="text-white/20" />
        <span className="text-[11px] text-white/20 uppercase tracking-widest">{title}</span>
      </div>
      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.label} className="flex justify-between items-center py-1 border-b border-white/[0.03] last:border-0">
            <span className="text-xs text-white/25 font-mono uppercase tracking-wider">{e.label}</span>
            <span className="text-xs text-white/60 font-mono text-right max-w-[60%] truncate">{e.value}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
}

export default function AboutSystem() {
  const [info, setInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("get_system_info").then(setInfo).catch(() => {});
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">About System</h1>
        <p className="text-sm text-white/25 mt-1 font-mono">Hardware specifications & application info</p>
      </motion.div>

      <motion.div variants={child} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SpecSection icon={Cpu} title="Processor" entries={info?.cpu || []} />
        <SpecSection icon={Monitor} title="Graphics" entries={info?.gpu || []} />
        <SpecSection icon={CircuitBoard} title="Memory" entries={info?.ram || []} />
        <SpecSection icon={HardDrive} title="Storage" entries={info?.storage || []} />
      </motion.div>

      <motion.div variants={child} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SpecSection icon={Info} title="Motherboard" entries={info?.motherboard || []} />
        <SpecSection icon={Wifi} title="Network" entries={info?.network || []} />
      </motion.div>

      <motion.div variants={child}>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5">
          <div className="text-[11px] text-white/20 uppercase tracking-widest mb-4">Application</div>
          <div className="space-y-2">
            {[
              { label: "App", value: "Optimization Way" },
              { label: "Version", value: "0.1.0" },
              { label: "Platform", value: "Windows (x64)" },
              { label: "Framework", value: "Tauri 2 + React 19" },
              { label: "License", value: "MIT" },
            ].map(e => (
              <div key={e.label} className="flex justify-between py-1 border-b border-white/[0.03] last:border-0">
                <span className="text-xs text-white/25 font-mono uppercase tracking-wider">{e.label}</span>
                <span className="text-xs text-white/60 font-mono">{e.value}</span>
              </div>
            ))}
          </div>
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
