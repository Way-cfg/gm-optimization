import { useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Check, History, AlertTriangle, RotateCw, Sparkles } from "lucide-react";
import { useToast } from "../components/Toast";
import GlowCard from "../components/GlowCard";
import { tweaks, presets, categories, type Preset } from "../data/tweaks";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function TweaksHub() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleCheck = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActivePreset(null);
  };

  const applyPreset = (preset: Preset) => {
    setSelected(new Set(preset.tweaks));
    setActivePreset(preset.id);
  };

  const runSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast("info", "No tweaks selected");
      return;
    }

    await executeBatch(ids);
  };

  const executeBatch = async (ids: string[]) => {
    setRunning(true);
    let success = 0;
    let fail = 0;
    const errors: string[] = [];

    for (const id of ids) {
      setApplying(prev => new Set(prev).add(id));
      const tweak = tweaks.find(t => t.id === id)!;

      try {
        if (tweak.registry) {
          await invoke<string>("apply_registry_tweak", { entries: tweak.registry, enabled: true });
        }
        if (tweak.enableScript && tweak.disableScript) {
          await invoke<string>("execute_powershell_tweak", {
            enabled: true,
            enableScript: tweak.enableScript,
            disableScript: tweak.disableScript,
          });
        }
        if (tweak.commands) {
          await invoke<string>("execute_native_commands", { commands: tweak.commands });
        }
        if (tweak.services) {
          await invoke<string>("configure_services", { entries: tweak.services });
        }
        success++;
      } catch (e) {
        fail++;
        errors.push(`${tweak.title}: ${e}`);
      }

      setApplying(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }

    setRunning(false);

    if (fail > 0) {
      toast("error", `Applied ${success}/${ids.length} tweaks — ${fail} failed`);
    } else {
      toast("success", `Applied all ${success} tweaks successfully`);
    }
  };

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
        <motion.div variants={child} className="mb-8">
          <h1 className="text-xl font-semibold text-white/90 tracking-tight">Tweaks Hub</h1>
          <p className="text-sm text-white/25 mt-1">Select tweaks or use a preset, then run all at once</p>
        </motion.div>

        <motion.div variants={child} className="flex gap-3 mb-6">
          {presets.map(p => {
            const Icon = p.icon;
            const isActive = activePreset === p.id;
            const count = p.tweaks.filter(id => selected.has(id)).length;
            return (
              <GlowCard
                key={p.id}
                className={`card-glow flex-1 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-neon/[0.06] border-neon/30"
                    : "bg-frosted/80 backdrop-blur-xl border-white/[0.05]"
                }`}
                onClick={() => applyPreset(p)}
                tilt
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-neon/[0.12]" : "bg-white/[0.04]"
                  }`}>
                    <Icon size={15} strokeWidth={1.5} className={isActive ? "text-neon" : "text-white/30"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${isActive ? "text-white/90" : "text-white/60"}`}>{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? "text-white/25" : "text-white/[0.15]"}`}>{count}/36 selected</div>
                  </div>
                </div>
                <div className={`text-[11px] leading-relaxed ${isActive ? "text-white/30" : "text-white/[0.15]"}`}>{p.description}</div>
              </GlowCard>
            );
          })}
        </motion.div>

        {categories.map(cat => (
          <motion.div key={cat} variants={child}>
            <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <History size={14} strokeWidth={1.5} className="text-white/20" />
                <span className="text-[11px] text-white/20 uppercase tracking-widest">{cat}</span>
              </div>
            <div className="space-y-1">
              {tweaks.filter(t => t.category === cat).map(tweak => {
                const isChecked = selected.has(tweak.id);
                const isApplying = applying.has(tweak.id);
                return (
                  <GlowCard key={tweak.id} className={`card-glow flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border transition-all duration-200 ${
                    running ? "opacity-50 pointer-events-none" : "cursor-pointer"
                  } ${isChecked ? "border-white/[0.08]" : "border-white/[0.04]"}`} onClick={() => !running && toggleCheck(tweak.id)} tilt>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
                      isApplying
                        ? "border-neon/40 bg-neon/[0.1]"
                        : isChecked
                          ? "bg-neon/[0.15] border-neon/40"
                          : "border-white/[0.12] hover:border-white/25"
                    }`}>
                      {isApplying ? (
                        <div className="w-3 h-3 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                      ) : isChecked ? (
                        <Check size={12} strokeWidth={3} className="text-neon" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium transition-colors duration-200 ${isChecked ? "text-white/80" : "text-white/50"}`}>
                        {tweak.title}
                      </div>
                      <div className="text-[11px] text-white/20 mt-0.5">{tweak.description}</div>
                    </div>
                    {tweak.requiresReboot && (
                      <RotateCw size={12} strokeWidth={1.5} className="text-neon/40 shrink-0" />
                    )}
                    {tweak.requiresConfirmation && (
                      <AlertTriangle size={12} strokeWidth={1.5} className="text-white/15 shrink-0" />
                    )}
                  </GlowCard>
                );
              })}
              </div>
            </GlowCard>
          </motion.div>
        ))}

        <motion.div variants={child} className="pb-8">
          <button
            onClick={runSelected}
            disabled={running || selected.size === 0}
            className="relative w-full py-3.5 rounded-2xl bg-neon/15 border border-neon/25 text-neon text-sm font-medium hover:bg-neon/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.04] to-transparent group-hover:via-neon/[0.08] transition-all duration-500" />
            <span className="relative flex items-center gap-2.5">
              {running ? (
                <>
                  <div className="w-4 h-4 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                  Running Optimization…
                </>
              ) : (
                <>
                  <Sparkles size={15} strokeWidth={1.5} />
                  Run Optimization Way Engine
                  <span className="text-[11px] text-neon/40 font-normal">({selected.size})</span>
                </>
              )}
            </span>
          </button>
        </motion.div>
      </motion.div>
    </>
  );
}
