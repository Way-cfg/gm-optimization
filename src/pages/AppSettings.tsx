import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "react-router-dom";
import { Sun, Moon, Shield, Upload, Download, Clock, Palette, User } from "lucide-react";
import { useToast } from "../components/Toast";
import GlowCard from "../components/GlowCard";

interface Schedule {
  id: number;
  module: string;
  cron: string;
  enabled: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function AppSettings() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    invoke<Schedule[]>("get_schedules").then(setSchedules).catch(() => {});
  }, []);

  const exportProfile = async () => {
    try {
      const json = await invoke<string>("export_profile");
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `optimization-profile-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", "Profile exported");
    } catch {
      toast("error", "Export failed");
    }
  };

  const importProfile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await invoke("import_profile", { json: text, name: data.name || file.name, description: data.description || "" });
        toast("success", "Profile imported");
      } catch {
        toast("error", "Invalid profile file");
      }
    };
    input.click();
  };

  const toggleSchedule = async (id: number, enabled: boolean) => {
    try {
      await invoke("toggle_schedule", { id, enabled });
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
      toast("success", enabled ? "Schedule enabled" : "Schedule disabled");
    } catch {
      toast("error", "Failed to toggle schedule");
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">App Settings</h1>
        <p className="text-sm text-white/25 mt-1">Theme, backup, profiles, automation</p>
      </motion.div>

      <motion.div variants={child}>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={14} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">Appearance</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/50">Theme</span>
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon/[0.12] text-neon text-xs transition-all">
                <Moon size={13} strokeWidth={1.5} />
                Dark
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/20 text-xs transition-all hover:text-white/40">
                <Sun size={13} strokeWidth={1.5} />
                Light
              </button>
            </div>
          </div>
        </GlowCard>
      </motion.div>

      <motion.div variants={child}>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">Backup & Profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportProfile} className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-neon/[0.08] hover:border-neon/20 transition-all text-sm text-white/50 hover:text-neon">
              <Upload size={14} strokeWidth={1.5} />
              Export Profile
            </button>
            <button onClick={importProfile} className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-neon/[0.08] hover:border-neon/20 transition-all text-sm text-white/50 hover:text-neon">
              <Download size={14} strokeWidth={1.5} />
              Import Profile
            </button>
          </div>
          <Link to="/profiles" className="flex items-center gap-2 px-3 py-2.5 mt-2 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-neon/[0.08] hover:border-neon/20 transition-all text-sm text-white/50 hover:text-neon">
            <User size={14} strokeWidth={1.5} />
            Manage Profiles
          </Link>
        </GlowCard>
      </motion.div>

      <motion.div variants={child}>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">Task Scheduler</span>
          </div>
          {schedules.length === 0 ? (
            <p className="text-sm text-white/20 font-mono">No scheduled tasks configured</p>
          ) : (
            <div className="space-y-1">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center justify-between px-3 py-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl text-sm">
                  <div>
                    <span className="text-white/50">{s.module}</span>
                    <span className="text-white/20 font-mono text-xs ml-3">{s.cron}</span>
                  </div>
                  <button
                    onClick={() => toggleSchedule(s.id, !s.enabled)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all ${
                      s.enabled ? "bg-neon/[0.12] text-neon" : "bg-white/[0.03] text-white/20"
                    }`}
                  >
                    {s.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlowCard>
      </motion.div>
    </motion.div>
  );
}
