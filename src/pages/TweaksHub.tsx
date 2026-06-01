import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Zap, Shield, Flame, ChevronDown, Check, Sparkles } from "lucide-react";
import { useToast } from "../components/Toast";

interface TweakItem {
  id: string;
  label: string;
  category: string;
  presets: ("simple" | "balanced" | "extreme")[];
}

const tweakItems: TweakItem[] = [
  { id: "junk_temp", label: "Clear Temp Files", category: "Storage", presets: ["simple", "balanced", "extreme"] },
  { id: "junk_cache", label: "Clear System Cache", category: "Storage", presets: ["simple", "balanced", "extreme"] },
  { id: "junk_recycle", label: "Empty Recycle Bin", category: "Storage", presets: ["simple", "balanced", "extreme"] },
  { id: "junk_logs", label: "Rotate & Clear Logs", category: "Storage", presets: ["balanced", "extreme"] },
  { id: "junk_downloads", label: "Clear Downloads Folder", category: "Storage", presets: ["extreme"] },
  { id: "reg_invalid", label: "Remove Invalid Paths", category: "Registry", presets: ["simple", "balanced", "extreme"] },
  { id: "reg_empty", label: "Remove Empty Keys", category: "Registry", presets: ["simple", "balanced", "extreme"] },
  { id: "reg_uninstall", label: "Clean Orphan Uninstall Entries", category: "Registry", presets: ["balanced", "extreme"] },
  { id: "reg_fonts", label: "Clean Font Cache Entries", category: "Registry", presets: ["balanced", "extreme"] },
  { id: "reg_history", label: "Clear MRU History", category: "Registry", presets: ["extreme"] },
  { id: "startup_basic", label: "Disable Redundant Startup Programs", category: "Startup", presets: ["simple", "balanced", "extreme"] },
  { id: "startup_delay", label: "Delay Non-Essential Startup Tasks", category: "Startup", presets: ["balanced", "extreme"] },
  { id: "startup_aggressive", label: "Disable All Non-Critical Startup Entries", category: "Startup", presets: ["extreme"] },
  { id: "net_dns", label: "Set Optimized DNS Servers", category: "Network", presets: ["balanced", "extreme"] },
  { id: "net_tcp", label: "Apply TCP/IP Auto-Tuning", category: "Network", presets: ["balanced", "extreme"] },
  { id: "net_flush", label: "Flush DNS Cache", category: "Network", presets: ["simple", "balanced", "extreme"] },
  { id: "net_mtu", label: "Optimize MTU for Gaming", category: "Network", presets: ["extreme"] },
  { id: "os_visuals", label: "Disable Visual Animations", category: "Windows OS", presets: ["balanced", "extreme"] },
  { id: "os_services", label: "Strip Non-Essential Services", category: "Windows OS", presets: ["extreme"] },
  { id: "os_hpet", label: "Disable HPET Timer", category: "Windows OS", presets: ["extreme"] },
  { id: "os_mitigations", label: "Disable Spectre/Meltdown Mitigations", category: "Windows OS", presets: ["extreme"] },
  { id: "os_isolation", label: "Disable Core Isolation / VBS", category: "Windows OS", presets: ["extreme"] },
  { id: "os_power", label: "Set High Performance Power Plan", category: "Windows OS", presets: ["balanced", "extreme"] },
];

interface Preset {
  key: "simple" | "balanced" | "extreme";
  label: string;
  desc: string;
  icon: typeof Shield;
  color: string;
}

const presets: Preset[] = [
  { key: "simple", label: "Simple Tweak", desc: "Basic cleanups and safe configurations", icon: Shield, color: "rgba(255,255,255,0.25)" },
  { key: "balanced", label: "Balanced Tweak", desc: "Gaming optimization & privacy controls", icon: Zap, color: "rgba(255,255,255,0.35)" },
  { key: "extreme", label: "Extreme Plus Tweak", desc: "Deep latency & service stripping", icon: Flame, color: "rgba(255,255,255,0.45)" },
];

const categories = ["Storage", "Registry", "Startup", "Network", "Windows OS"];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function TweaksHub() {
  const [activePreset, setActivePreset] = useState<"simple" | "balanced" | "extreme" | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(categories));
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const selectPreset = (key: "simple" | "balanced" | "extreme") => {
    setActivePreset(key);
    const ids = tweakItems.filter(t => t.presets.includes(key)).map(t => t.id);
    setChecked(new Set(ids));
  };

  const toggleItem = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActivePreset(null);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const runEngine = async () => {
    if (checked.size === 0) {
      toast("error", "No tweaks selected — check some items first");
      return;
    }
    setRunning(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#ffffff", "#888888", "#cccccc"] });
      toast("success", "Optimization Way Engine completed successfully");
    } catch {
      toast("error", "Engine run failed");
    }
    setRunning(false);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Tweaks Hub</h1>
        <p className="text-sm text-white/25 mt-1">Consolidated optimization engine</p>
      </motion.div>

      <motion.div variants={child} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {presets.map(p => (
          <button
            key={p.key}
            onClick={() => selectPreset(p.key)}
            className={`text-left p-4 rounded-xl border transition-all duration-300 ${
              activePreset === p.key
                ? "bg-white/[0.06] border-white/[0.12]"
                : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
                <p.icon size={17} strokeWidth={1.5} style={{ color: p.color }} />
              </div>
              <div>
                <div className="text-sm font-medium text-white/70">{p.label}</div>
                <div className="text-[11px] text-white/25">{p.desc}</div>
              </div>
              {activePreset === p.key && <Check size={16} strokeWidth={1.5} className="text-white/40 ml-auto" />}
            </div>
            <div className="text-[11px] text-white/15 font-mono">
              {tweakItems.filter(t => t.presets.includes(p.key)).length} tweaks
            </div>
          </button>
        ))}
      </motion.div>

      <motion.div variants={child} className="space-y-2 mb-8">
        {categories.map(cat => {
          const items = tweakItems.filter(t => t.category === cat && (!activePreset || t.presets.includes(activePreset)));
          if (items.length === 0) return null;
          return (
            <div key={cat} className="bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-2 w-full px-4 py-3 text-[11px] text-white/25 uppercase tracking-widest hover:text-white/40 transition-colors"
              >
                <motion.span animate={{ rotate: expandedCats.has(cat) ? 0 : -90 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={12} strokeWidth={1.5} />
                </motion.span>
                {cat}
                <span className="text-white/12 font-mono ml-auto">{items.length}</span>
              </button>
              {expandedCats.has(cat) && (
                <div className="px-1 pb-1">
                  {items.map(t => (
                      <div
                          key={t.id}
                          onClick={() => toggleItem(t.id)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${
                        checked.has(t.id)
                          ? "bg-white/20 border-white/30"
                          : "border-white/[0.12] hover:border-white/25"
                      }`}>
                        {checked.has(t.id) && <Check size={10} strokeWidth={3} className="text-white/80" />}
                      </div>
                      <span className="text-sm text-white/50">{t.label}</span>
                      </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      <motion.div variants={child} className="flex justify-center pb-8">
        <button
          onClick={runEngine}
          disabled={running}
          className="flex items-center gap-2.5 px-8 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-sm font-medium text-white/70 hover:bg-white/[0.09] transition-all duration-300 disabled:opacity-30"
          style={{ animation: running ? "none" : "glow-pulse 3s ease-in-out infinite" }}
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Sparkles size={16} strokeWidth={1.5} />
              Run Optimization Way Engine
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
