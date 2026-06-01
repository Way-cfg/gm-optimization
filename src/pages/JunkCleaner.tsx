import { useEffect, useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useToast } from "../components/Toast";
import ProgressBar from "../components/ProgressBar";
import confetti from "canvas-confetti";

interface JunkCategory {
  category_id: string;
  category_name: string;
  file_count: number;
  total_size: number;
  files: string[];
}

interface JunkResult {
  categories: JunkCategory[];
  total_size: number;
  total_files: number;
}

interface ExclusionEntry {
  id: number;
  path: string;
  added_at: string;
}

export default function JunkCleaner() {
  const [result, setResult] = useState<JunkResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [cleanResult, setCleanResult] = useState<string | null>(null);
  const [exclusions, setExclusions] = useState<ExclusionEntry[]>([]);
  const [showExclusions, setShowExclusions] = useState(false);
  const [newExclusion, setNewExclusion] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  const loadExclusions = useCallback(async () => {
    try {
      setExclusions(await invoke<ExclusionEntry[]>("get_exclusions"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadExclusions(); }, [loadExclusions]);

  useEffect(() => {
    return () => { unlistenRef.current?.(); };
  }, []);

  const listenProgress = async () => {
    unlistenRef.current?.();
    const unlisten = await listen<{ current: number; total: number; label: string }>("scan-progress", (e) => {
      setProgress(e.payload);
    });
    unlistenRef.current = unlisten;
  };

  const scan = async () => {
    setLoading(true);
    setCleanResult(null);
    setProgress(null);
    await listenProgress();
    try {
      const res = await invoke<JunkResult>("scan_junk", { request: { custom_paths: [] } });
      setResult(res);
      toast("info", `Found ${res.total_files} files (${(res.total_size / (1024 * 1024)).toFixed(1)} MB)`);
    } catch (e) {
      setCleanResult(`Error: ${e}`);
      toast("error", `Scan failed: ${e}`);
    }
    setProgress(null);
    setLoading(false);
  };

  const clean = async () => {
    setLoading(true);
    setProgress(null);
    await listenProgress();
    try {
      const res = await invoke<{ items_removed: number; space_freed: number; errors: string[] }>("clean_junk", {
        selectedCategories: selected,
      });
      const mb = (res.space_freed / (1024 * 1024)).toFixed(1);
      setCleanResult(`Removed ${res.items_removed} items, freed ${mb} MB${res.errors.length ? ` (${res.errors.length} errors)` : ""}`);
      setResult(null);
      toast("success", `Cleaned ${res.items_removed} items, freed ${mb} MB`);
      if (res.errors.length === 0) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e) {
      setCleanResult(`Error: ${e}`);
      toast("error", `Clean failed: ${e}`);
    }
    setProgress(null);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Junk Cleaner</h2>
        <button
          onClick={() => setShowExclusions(!showExclusions)}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors"
        >
          {showExclusions ? "Hide Exclusions" : `Exclusions (${exclusions.length})`}
        </button>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="mb-4">
          <ProgressBar current={progress.current} total={progress.total} label={progress.label} />
        </div>
      )}

      {/* Exclusions section */}
      {showExclusions && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Excluded Paths</h3>
          <p className="text-xs text-gray-500 mb-3">
            Files and folders matching these paths will be skipped during junk scans.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExclusion()}
              placeholder="e.g. C:\Users\Way\AppData\Local\Temp\cache"
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
          Scan for Junk Files
        </button>
      )}
      {loading && !progress && <p className="text-gray-400">Working...</p>}
      {result && !loading && (
        <div>
          <p className="text-sm text-gray-400 mb-3">
            Found {result.total_files} files ({(result.total_size / (1024 * 1024)).toFixed(1)} MB)
          </p>
          <div className="space-y-2 mb-4">
            {result.categories.map((cat) => (
              <label key={cat.category_id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded cursor-pointer hover:border-gray-700">
                <input
                  type="checkbox"
                  checked={selected.includes(cat.category_id)}
                  onChange={() => toggle(cat.category_id)}
                  className="accent-emerald-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{cat.category_name}</p>
                  <p className="text-xs text-gray-500">{cat.file_count} files, {(cat.total_size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={clean} disabled={selected.length === 0} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm font-medium transition-colors">
              Clean Selected
            </button>
            <button onClick={() => setResult(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
              Back
            </button>
          </div>
        </div>
      )}
      {cleanResult && (
        <div className="mt-4">
          <p className="text-sm text-emerald-400">{cleanResult}</p>
          <button onClick={() => { setCleanResult(null); setSelected([]); }} className="mt-3 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
