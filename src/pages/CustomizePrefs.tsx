import { useState } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { RotateCw } from "lucide-react";
import { useToast } from "../components/Toast";

interface RegistryEntry {
  path: string;
  name: string;
  value: string;
  type_: string;
}

interface ToggleDefinition {
  id: string;
  title: string;
  description: string;
  defaultState: boolean;
  registry?: RegistryEntry[];
  enableScript?: string[];
  disableScript?: string[];
  requiresReboot?: boolean;
}

const toggles: ToggleDefinition[] = [
  {
    id: "WPFToggleDetailedBSoD",
    title: "BSoD Verbose Mode",
    description: "If enabled, you will see a detailed Blue Screen of Death (BSOD) with more information.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl", name: "DisplayParameters", value: "1", type_: "DWord" },
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\CrashControl", name: "DisableEmoticon", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleDisableCrossDeviceResume",
    title: "Cross-Device Resume",
    description: "This tweak controls the Resume function in Windows 11 24H2 and later, which allows you to resume an activity from a mobile device and vice-versa.",
    defaultState: true,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CrossDeviceResume\\Configuration", name: "IsResumeAllowed", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleDarkMode",
    title: "Dark Theme for Windows",
    description: "Enable/Disable Dark Mode.",
    defaultState: false,
    registry: [
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "AppsUseLightTheme", value: "0", type_: "DWord" },
      { path: "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize", name: "SystemUsesLightTheme", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleHiddenFiles",
    title: "File Explorer Hidden Files",
    description: "If enabled, Hidden Files will be shown.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "Hidden", value: "1", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
  {
    id: "WPFToggleLongPaths",
    title: "Enable Long Paths",
    description: "Enables support for file paths longer than 260 characters.",
    defaultState: false,
    registry: [
      { path: "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem", name: "LongPathsEnabled", value: "1", type_: "DWord" },
    ],
  },
  {
    id: "WPFToggleShowExt",
    title: "File Explorer File Extensions",
    description: "If enabled, file extensions (e.g., .txt, .jpg) are visible.",
    defaultState: false,
    registry: [
      { path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced", name: "HideFileExt", value: "0", type_: "DWord" },
    ],
    enableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
    disableScript: [
      "Stop-Process -Name 'explorer' -Force",
    ],
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as const },
} as const;

export default function CustomizePrefs() {
  const [states, setStates] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const { toast } = useToast();

  const isOn = (t: ToggleDefinition) => states[t.id] ?? t.defaultState;

  const handleToggle = async (tweak: ToggleDefinition) => {
    const newState = !isOn(tweak);
    setStates(prev => ({ ...prev, [tweak.id]: newState }));
    setApplying(tweak.id);

    try {
      if (tweak.registry) {
        await invoke<string>("apply_registry_tweak", { entries: tweak.registry, enabled: newState });
      }
      if (tweak.enableScript && tweak.disableScript) {
        await invoke<string>("execute_powershell_tweak", {
          enabled: newState,
          enableScript: tweak.enableScript,
          disableScript: tweak.disableScript,
        });
      }
      toast("success", `${tweak.title} ${newState ? "enabled" : "disabled"}`);
    } catch (e) {
      setStates(prev => ({ ...prev, [tweak.id]: !newState }));
      toast("error", `${tweak.title}: ${e}`);
    }

    setApplying(null);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl mx-auto">
      <motion.div variants={child} className="mb-8">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Customize Preferences</h1>
        <p className="text-sm text-white/25 mt-1">Toggle individual Windows settings — changes apply immediately</p>
      </motion.div>

      <div className="space-y-2">
        {toggles.map(tweak => {
          const on = isOn(tweak);
          const busy = applying === tweak.id;
          return (
            <motion.div
              key={tweak.id}
              variants={child}
              className="bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl px-5 py-4 flex items-center gap-4 transition-all duration-200 hover:border-white/[0.08]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/70">{tweak.title}</span>
                  {tweak.requiresReboot && (
                    <RotateCw size={11} strokeWidth={1.5} className="text-neon/40 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-white/25 mt-0.5">{tweak.description}</div>
              </div>

              <button
                onClick={() => !busy && handleToggle(tweak)}
                disabled={busy}
                className={`relative w-11 h-[26px] rounded-full shrink-0 transition-all duration-300 ${
                  busy
                    ? "bg-white/[0.06]"
                    : on
                      ? "bg-neon/30"
                      : "bg-white/[0.08]"
                }`}
              >
                {busy ? (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-neon/20 border-t-neon rounded-full animate-spin" />
                ) : (
                  <div
                    className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      on ? "left-[22px] bg-neon" : "left-[3px] bg-white/40"
                    }`}
                  />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {toggles.length === 0 && (
        <div className="text-center py-20">
          <p className="text-sm text-white/15">No preferences loaded yet.</p>
        </div>
      )}
    </motion.div>
  );
}
