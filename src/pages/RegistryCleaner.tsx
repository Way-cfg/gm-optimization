import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";
import confetti from "canvas-confetti";

interface RegistryIssue {
  id: string;
  key_path: string;
  value_name: string;
  current_value: string;
  risk_level: string;
  description: string;
}

interface RegistryResult {
  safe: RegistryIssue[];
  moderate: RegistryIssue[];
  risky: RegistryIssue[];
}

interface ExclusionEntry {
  id: number;
  path: string;
  added_at: string;
}

export default function RegistryCleaner() {
  const [result, setResult] = useState<RegistryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);
  const [exclusions, setExclusions] = useState<ExclusionEntry[]>([]);
  const [showExclusions, setShowExclusions] = useState(false);
  const [newExclusion, setNewExclusion] = useState("");
  const { toast } = useToast();

  const loadExclusions = useCallback(async () => {
    try {
      setExclusions(await invoke<ExclusionEntry[]>("get_exclusions"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadExclusions(); }, [loadExclusions]);

  const scan = async () => {
    setLoading(true);
    setCleanMsg(null);
    try {
      const res = await invoke<RegistryResult>("scan_registry");
      setResult(res);
      const total = res.risky.length + res.moderate.length + res.safe.length;
      toast("info", `Found ${total} issues (${res.risky.length} risky, ${res.moderate.length} moderate, ${res.safe.length} safe)`);
    } catch (e) {
      setCleanMsg(`Error: ${e}`);
      toast("error", `Scan failed: ${e}`);
    }
    setLoading(false);
  };

  const getIssues = () => [
    ...(result?.risky || []),
    ...(result?.moderate || []),
    ...(result?.safe || []),
  ];

  const clean = async () => {
    setLoading(true);
    try {
      const issues = getIssues().filter((i) => selected.includes(i.id));
      const res = await invoke<{ items_removed: number; errors: string[] }>("clean_registry", { issues });
      setCleanMsg(`Removed ${res.items_removed} issues${res.errors.length ? ` (${res.errors.length} errors)` : ""}`);
      setResult(null);
      toast("success", `Fixed ${res.items_removed} registry issues`);
      if (res.errors.length === 0) {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.5 } });
      }
    } catch (e) {
      setCleanMsg(`Error: ${e}`);
      toast("error", `Clean failed: ${e}`);
    }
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const addExclusion = async () => {
    const trimmed = newExclusion.trim();
    if (!trimmed) return;
    try {
      await invoke("add_exclusion", { path: trimmed });
      setNewExclusion("");
      await loadExclusions();
      toast("success", "Exclusion added");
    } catch (e) {
      toast("error", `Error adding exclusion: ${e}`);
    }
  };

  const removeExclusion = async (id: number) => {
    try {
      await invoke("remove_exclusion", { id });
      await loadExclusions();
      toast("success", "Exclusion removed");
    } catch (e) {
      toast("error", `Error removing exclusion: ${e}`);
    }
  };

  const riskColor = (level: string) =>
    level === "risky" ? "text-red-400" : level === "moderate" ? "text-yellow-400" : "text-gray-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Registry Cleaner</h2>
        <button
          onClick={() => setShowExclusions(!showExclusions)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
        >
          {showExclusions ? "Hide Exclusions" : `Exclusions (${exclusions.length})`}
        </button>
      </div>

      {/* Exclusions section */}
      {showExclusions && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Excluded Paths</h3>
          <p className="text-xs text-gray-500 mb-3">
            Registry paths starting with these strings will be skipped during scans.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExclusion()}
              placeholder="e.g. HKLM\Software\Microsoft\Windows"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
            />
            <button onClick={addExclusion} className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded text-xs transition-colors">
              Add
            </button>
          </div>
          {exclusions.length === 0 ? (
            <p className="text-xs text-gray-600">No exclusions configured.</p>
          ) : (
            <div className="space-y-1">
              {exclusions.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-gray-400">{e.path}</span>
                  <button onClick={() => removeExclusion(e.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scan / Clean UI */}
      {!result && !loading && (
        <button onClick={scan} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors">
          Scan Registry
        </button>
      )}
      {loading && <p className="text-gray-400">Scanning...</p>}
      {result && !loading && (
        <div>
          <p className="text-sm text-gray-400 mb-3">
            Found {getIssues().length} issues ({result.risky.length} risky, {result.moderate.length} moderate, {result.safe.length} safe)
          </p>
          <div className="space-y-1 mb-4 max-h-[60vh] overflow-y-auto">
            {getIssues().map((issue) => (
              <label key={issue.id} className="flex items-start gap-3 p-2.5 bg-gray-900 border border-gray-800 rounded cursor-pointer hover:border-gray-700">
                <input
                  type="checkbox"
                  checked={selected.includes(issue.id)}
                  onChange={() => toggle(issue.id)}
                  className="accent-emerald-500 mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{issue.description}</p>
                  <p className={`text-xs ${riskColor(issue.risk_level)}`}>{issue.risk_level}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={clean} disabled={selected.length === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors">
              Fix Selected
            </button>
            <button onClick={() => setResult(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
      {cleanMsg && (
        <div className="mt-4">
          <p className="text-sm text-emerald-400">{cleanMsg}</p>
          <button onClick={() => { setCleanMsg(null); setSelected([]); }} className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
