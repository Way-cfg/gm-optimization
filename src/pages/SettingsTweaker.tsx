import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";
import confetti from "canvas-confetti";

interface TweakInfo {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  requires_reboot: boolean;
}

interface TweakPreset {
  id: string;
  name: string;
  description: string;
  tweak_keys: string[];
}

export default function SettingsTweaker() {
  const [tweaks, setTweaks] = useState<TweakInfo[]>([]);
  const [presets, setPresets] = useState<TweakPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        invoke<TweakInfo[]>("get_all_tweaks"),
        invoke<TweakPreset[]>("get_presets"),
      ]);
      setTweaks(t);
      setPresets(p);
    } catch (e) {
      setMsg(`Error: ${e}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async (key: string, enabled: boolean) => {
    try {
      await invoke("apply_tweak", { tweakKey: key, enabled });
      setMsg(`${enabled ? "Applied" : "Disabled"}: ${key}`);
      toast(enabled ? "success" : "info", `${enabled ? "Applied" : "Disabled"}: ${key}`);
      load();
    } catch (e) {
      setMsg(`Error: ${e}`);
      toast("error", `Error applying tweak: ${e}`);
    }
  };

  const applyPreset = async (preset: TweakPreset) => {
    for (const key of preset.tweak_keys) {
      await invoke("apply_tweak", { tweakKey: key, enabled: true });
    }
    setMsg(`Applied preset: ${preset.name}`);
    toast("success", `Applied preset: ${preset.name}`);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    load();
  };

  const categories = [...new Set(tweaks.map((t) => t.category))];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Settings Tweaker</h2>

      {msg && <p className="text-sm text-emerald-400 mb-3">{msg}</p>}

      {/* Presets */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-2">Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              className="text-left p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors"
            >
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-gray-500 mt-1">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Tweaks by category */}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="mb-5">
            <h3 className="text-sm font-medium text-gray-400 mb-2">{cat}</h3>
            <div className="space-y-1">
              {tweaks.filter((t) => t.category === cat).map((t) => (
                <label key={t.key} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded cursor-pointer hover:border-gray-700">
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={() => apply(t.key, !t.enabled)}
                    className="accent-emerald-500 shrink-0"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.description}</p>
                    {t.requires_reboot && <p className="text-xs text-yellow-500 mt-0.5">Requires reboot</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
