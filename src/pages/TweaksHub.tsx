import { useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Check, History } from "lucide-react";
import { useToast } from "../components/Toast";

interface RegistryEntry {
  path: string;
  name: string;
  value: string;
  type_: string;
}

interface TweakDefinition {
  id: string;
  title: string;
  description: string;
  category: string;
  registry: RegistryEntry[];
}

const tweaks: TweakDefinition[] = [
  {
    id: "WPFTweaksActivity",
    title: "Activity History - Disable",
    description: "Erases recent docs, clipboard, and run history.",
    category: "Essential Tweaks",
    registry: [
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "EnableActivityFeed", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "PublishUserActivities", value: "0", type_: "DWord" },
      { path: "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System", name: "UploadUserActivities", value: "0", type_: "DWord" },
    ],
  },
];

const categories = [...new Set(tweaks.map(t => t.category))];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function TweaksHub() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleTweak = async (tweak: TweakDefinition) => {
    const turningOn = !enabled.has(tweak.id);
    setApplying(prev => new Set(prev).add(tweak.id));

    try {
      await invoke<string>("apply_registry_tweak", {
        entries: tweak.registry,
        enabled: turningOn,
      });

      if (turningOn) {
        setEnabled(prev => new Set(prev).add(tweak.id));
      } else {
        setEnabled(prev => {
          const next = new Set(prev);
          next.delete(tweak.id);
          return next;
        });
      }

      toast("success", `${tweak.title} ${turningOn ? "applied" : "removed"}`);
    } catch (e) {
      toast("error", `Failed: ${e}`);
    }

    setApplying(prev => {
      const next = new Set(prev);
      next.delete(tweak.id);
      return next;
    });
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Tweaks Hub</h1>
        <p className="text-sm text-white/25 mt-1">Toggle individual tweaks on or off</p>
      </motion.div>

      {categories.map(cat => (
        <motion.div key={cat} variants={child} className="bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <History size={14} strokeWidth={1.5} className="text-white/20" />
            <span className="text-[11px] text-white/20 uppercase tracking-widest">{cat}</span>
          </div>
          <div className="space-y-1">
            {tweaks.filter(t => t.category === cat).map(tweak => (
              <div
                key={tweak.id}
                onClick={() => !applying.has(tweak.id) && toggleTweak(tweak)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-all duration-200"
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
                  enabled.has(tweak.id)
                    ? "bg-neon/[0.15] border-neon/40"
                    : "border-white/[0.12] hover:border-white/25"
                }`}>
                  {applying.has(tweak.id) ? (
                    <div className="w-3 h-3 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                  ) : enabled.has(tweak.id) ? (
                    <Check size={12} strokeWidth={3} className="text-neon" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium transition-colors duration-200 ${enabled.has(tweak.id) ? "text-white/80" : "text-white/50"}`}>
                    {tweak.title}
                  </div>
                  <div className="text-[11px] text-white/20 mt-0.5">{tweak.description}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
