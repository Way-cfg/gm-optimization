import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Check, RotateCw, Sparkles, ArrowLeft, LayoutDashboard } from "lucide-react";
import { useToast } from "../components/Toast";
import GlowCard from "../components/GlowCard";
import { profiles, type WizardProfile } from "../data/wizard";
import { tweaks, type TweakDefinition } from "../data/tweaks";
import { toggles, type ToggleDefinition } from "../data/preferences";

type Step = "welcome" | "review" | "applying" | "done";

interface ApplyResult {
  id: string;
  title: string;
  success: boolean;
  error?: string;
  requiresReboot?: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } as const },
} as const;

const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

function ProfileCard({
  profile,
  onClick,
}: {
  profile: WizardProfile;
  onClick: () => void;
}) {
  const Icon = profile.icon;
  return (
    <GlowCard
      className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:border-neon/30 hover:bg-neon/[0.03]"
      onClick={onClick}
      tilt
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
        <Icon size={18} strokeWidth={1.5} className="text-white/40" />
      </div>
      <div className="text-sm font-medium text-white/70 mb-1">{profile.label}</div>
      <div className="text-[11px] text-white/25 leading-relaxed">{profile.description}</div>
    </GlowCard>
  );
}

function TweakRow({
  tweak,
  checked,
  disabled,
  onToggle,
}: {
  tweak: TweakDefinition;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <GlowCard
      className={`card-glow flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border transition-all duration-200 ${
        disabled ? "" : "cursor-pointer"
      } ${checked ? "border-white/[0.08]" : "border-white/[0.04]"}`}
      onClick={disabled ? undefined : onToggle}
      tilt
    >
      <div
        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0 ${
          checked
            ? "bg-neon/[0.15] border-neon/40"
            : "border-white/[0.12]"
        }`}
      >
        {checked && <Check size={12} strokeWidth={3} className="text-neon" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium transition-colors duration-200 ${checked ? "text-white/80" : "text-white/50"}`}>
          {tweak.title}
        </div>
        <div className="text-[11px] text-white/20 mt-0.5">{tweak.description}</div>
      </div>
      {tweak.requiresReboot && (
        <RotateCw size={12} strokeWidth={1.5} className="text-neon/40 shrink-0" />
      )}
    </GlowCard>
  );
}

function PrefToggleRow({
  toggle,
  enabled,
  disabled,
  onToggle,
}: {
  toggle: ToggleDefinition;
  enabled: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <GlowCard className="card-glow bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 flex items-center gap-4 transition-all duration-200">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium transition-colors duration-200 ${enabled ? "text-white/80" : "text-white/50"}`}>
            {toggle.title}
          </span>
          {toggle.requiresReboot && (
            <RotateCw size={11} strokeWidth={1.5} className="text-neon/40 shrink-0" />
          )}
        </div>
        <div className="text-[11px] text-white/20 mt-0.5">{toggle.description}</div>
      </div>

      <button
        onClick={disabled ? undefined : onToggle}
        className={`relative w-11 h-[26px] rounded-full shrink-0 transition-all duration-300 ${
          enabled ? "bg-neon/30" : "bg-white/[0.08]"
        }`}
      >
        <div
          className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
            enabled ? "left-[22px] bg-neon" : "left-[3px] bg-white/40"
          }`}
        />
      </button>
    </GlowCard>
  );
}

export default function OptimizationWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<WizardProfile | null>(null);
  const [selectedTweaks, setSelectedTweaks] = useState<Set<string>>(new Set());
  const [selectedPrefs, setSelectedPrefs] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentTitle, setCurrentTitle] = useState("");
  const [results, setResults] = useState<ApplyResult[]>([]);

  const selectProfile = (p: WizardProfile) => {
    setProfile(p);
    setSelectedTweaks(new Set(p.tweaks));
    setSelectedPrefs(Object.fromEntries(p.preferences.map(r => [r.id, r.state])));
    setStep("review");
  };

  const totalCount = useMemo(
    () => selectedTweaks.size + Object.keys(selectedPrefs).length,
    [selectedTweaks, selectedPrefs]
  );

  const toggleTweak = (id: string) => {
    setSelectedTweaks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePref = (id: string) => {
    setSelectedPrefs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const applyTweak = async (id: string) => {
    const tweak = tweaks.find(t => t.id === id);
    if (!tweak) return;

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
  };

  const applyPref = async (id: string, enabled: boolean) => {
    const pref = toggles.find(t => t.id === id);
    if (!pref) return;

    if (pref.registry) {
      await invoke<string>("apply_registry_tweak", { entries: pref.registry, enabled });
    }
    if (pref.enableScript && pref.disableScript) {
      await invoke<string>("execute_powershell_tweak", {
        enabled,
        enableScript: pref.enableScript,
        disableScript: pref.disableScript,
      });
    }
  };

  const runApply = async () => {
    if (!profile || totalCount === 0) return;

    setRunning(true);
    setStep("applying");
    setResults([]);

    const tweakIds = Array.from(selectedTweaks);
    const prefIds = Object.keys(selectedPrefs);
    const total = tweakIds.length + prefIds.length;
    setProgress({ current: 0, total });

    const newResults: ApplyResult[] = [];

    for (const id of tweakIds) {
      const tweak = tweaks.find(t => t.id === id);
      const title = tweak?.title ?? id;
      setCurrentTitle(title);

      try {
        await applyTweak(id);
        newResults.push({ id, title, success: true, requiresReboot: tweak?.requiresReboot });
      } catch (e) {
        newResults.push({ id, title, success: false, error: String(e) });
      }

      setResults([...newResults]);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    for (const id of prefIds) {
      const pref = toggles.find(t => t.id === id);
      const title = pref?.title ?? id;
      const enabled = selectedPrefs[id];
      setCurrentTitle(title);

      try {
        await applyPref(id, enabled);
        newResults.push({ id, title, success: true, requiresReboot: pref?.requiresReboot });
      } catch (e) {
        newResults.push({ id, title, success: false, error: String(e) });
      }

      setResults([...newResults]);
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setRunning(false);
    setCurrentTitle("");
    setStep("done");

    const succeeded = newResults.filter(r => r.success).length;
    const failed = newResults.length - succeeded;
    if (failed > 0) {
      toast("error", `Applied ${succeeded}/${total} items — ${failed} failed`);
    } else {
      toast("success", `Applied all ${succeeded} items successfully`);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            variants={child}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            <div className="mb-8">
              <h1 className="text-xl font-semibold text-white/90 tracking-tight">Optimization Wizard</h1>
              <p className="text-sm text-white/25 mt-1">What is this PC mainly used for?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map(p => (
                <ProfileCard key={p.id} profile={p} onClick={() => selectProfile(p)} />
              ))}
            </div>
          </motion.div>
        )}

        {step === "review" && profile && (
          <motion.div
            key="review"
            variants={child}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            <button
              onClick={() => setStep("welcome")}
              className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors mb-4"
            >
              <ArrowLeft size={12} strokeWidth={1.5} />
              Back to profiles
            </button>

            <div className="mb-6">
              <h1 className="text-xl font-semibold text-white/90 tracking-tight">Review Recommended Configuration</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-white/25">{profile.label} profile</p>
                <span className="text-white/10">·</span>
                <p className="text-sm text-white/25">{totalCount} items</p>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 mb-6">
              <h3 className="text-[11px] text-white/25 uppercase tracking-widest mb-3">Expected Benefits</h3>
              <ul className="space-y-2">
                {profile.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon/40 mt-1.5 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-[11px] text-white/25 uppercase tracking-widest">System Tweaks</h3>
              {profile.tweaks.map(id => {
                const tweak = tweaks.find(t => t.id === id);
                if (!tweak) return null;
                return (
                  <TweakRow
                    key={id}
                    tweak={tweak}
                    checked={selectedTweaks.has(id)}
                    disabled={running}
                    onToggle={() => toggleTweak(id)}
                  />
                );
              })}
            </div>

            <div className="space-y-2 mb-8">
              <h3 className="text-[11px] text-white/25 uppercase tracking-widest">Customize Preferences</h3>
              {profile.preferences.map(ref => {
                const toggle = toggles.find(t => t.id === ref.id);
                if (!toggle) return null;
                return (
                  <PrefToggleRow
                    key={ref.id}
                    toggle={toggle}
                    enabled={selectedPrefs[ref.id] ?? ref.state}
                    disabled={running}
                    onToggle={() => togglePref(ref.id)}
                  />
                );
              })}
            </div>

            <button
              onClick={runApply}
              disabled={totalCount === 0}
              className="relative w-full py-3.5 rounded-2xl bg-neon/15 border border-neon/25 text-neon text-sm font-medium hover:bg-neon/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2.5 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.04] to-transparent group-hover:via-neon/[0.08] transition-all duration-500" />
              <span className="relative flex items-center gap-2.5">
                <Sparkles size={15} strokeWidth={1.5} />
                Apply Configuration
                <span className="text-[11px] text-neon/40 font-normal">({totalCount})</span>
              </span>
            </button>
          </motion.div>
        )}

        {step === "applying" && (
          <motion.div
            key="applying"
            variants={child}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            <div className="mb-8">
              <h1 className="text-xl font-semibold text-white/90 tracking-tight">Applying Configuration</h1>
              <p className="text-sm text-white/25 mt-1">{currentTitle}</p>
            </div>

            <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-neon rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>

            <div className="text-xs text-white/20 font-mono mb-6">
              {progress.current} / {progress.total}
            </div>

            <div className="space-y-1.5">
              {results.map((r, i) => (
                <div key={`${r.id}-${i}`} className="flex items-center gap-2.5 text-sm">
                  {r.success ? (
                    <div className="w-4 h-4 rounded-full bg-neon/[0.12] flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} className="text-neon" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-crimson/[0.12] flex items-center justify-center shrink-0">
                      <span className="text-crimson text-[10px] font-bold">!</span>
                    </div>
                  )}
                  <span className={r.success ? "text-white/50" : "text-white/30 line-through"}>
                    {r.title}
                  </span>
                </div>
              ))}
              {progress.current < progress.total && (
                <div className="flex items-center gap-2.5 text-sm text-white/30">
                  <div className="w-4 h-4 border-2 border-neon/20 border-t-neon rounded-full animate-spin shrink-0" />
                  <span>{currentTitle}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            variants={child}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            <div className="mb-8">
              <h1 className="text-xl font-semibold text-white/90 tracking-tight">Configuration Applied</h1>
              <p className="text-sm text-white/25 mt-1">
                {results.filter(r => r.success).length} of {results.length} items applied successfully
              </p>
            </div>

            <div className="space-y-1.5 mb-8">
              {results.map((r, i) => (
                <div key={`${r.id}-${i}`} className="flex items-center gap-2.5 text-sm">
                  {r.success ? (
                    <div className="w-4 h-4 rounded-full bg-neon/[0.12] flex items-center justify-center shrink-0">
                      <Check size={10} strokeWidth={3} className="text-neon" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-crimson/[0.12] flex items-center justify-center shrink-0">
                      <span className="text-crimson text-[10px] font-bold">!</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className={r.success ? "text-white/50" : "text-white/30 line-through"}>
                      {r.title}
                    </span>
                    {r.error && (
                      <div className="text-[11px] text-crimson/60 mt-0.5 font-mono truncate">{r.error}</div>
                    )}
                  </div>
                  {r.requiresReboot && r.success && (
                    <RotateCw size={11} strokeWidth={1.5} className="text-neon/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {results.some(r => r.requiresReboot && r.success) && (
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 mb-6 flex items-center gap-2.5">
                <RotateCw size={13} strokeWidth={1.5} className="text-neon/50 shrink-0" />
                <span className="text-xs text-white/30">
                  Some changes require a reboot to take full effect.
                </span>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="relative w-full py-3.5 rounded-2xl bg-neon/15 border border-neon/25 text-neon text-sm font-medium hover:bg-neon/25 transition-all duration-200 flex items-center justify-center gap-2.5 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon/[0.04] to-transparent group-hover:via-neon/[0.08] transition-all duration-500" />
              <span className="relative flex items-center gap-2.5">
                <LayoutDashboard size={15} strokeWidth={1.5} />
                Return to Dashboard
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
