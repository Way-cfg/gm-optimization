import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";

interface BenchmarkResult {
  id: number;
  benchmark_type: string;
  score: number;
  unit: string;
  profile_name: string | null;
  created_at: string;
}

export default function Benchmark() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [history, setHistory] = useState<BenchmarkResult[]>([]);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      const h = await invoke<BenchmarkResult[]>("get_benchmark_history");
      setHistory(h);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadHistory(); }, []);

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    try {
      const res = await invoke<BenchmarkResult[]>("run_all_benchmarks");
      setResults(res);
      toast("success", "All benchmarks completed");
      loadHistory();
    } catch (e) {
      toast("error", `Benchmark failed: ${e}`);
    }
    setRunning(false);
  };

  const runSingle = async (benchType: string) => {
    setRunning(true);
    try {
      const cmd = benchType === "disk" ? "run_disk_benchmark" :
                  benchType === "network" ? "run_network_benchmark" : "run_cpu_benchmark";
      const res = await invoke<BenchmarkResult>(cmd);
      setResults([res]);
      toast("success", `${benchType} benchmark complete: ${res.score.toFixed(1)} ${res.unit}`);
      loadHistory();
    } catch (e) {
      toast("error", `Benchmark failed: ${e}`);
    }
    setRunning(false);
  };

  const clearHistory = async () => {
    await invoke("clear_benchmark_history");
    setHistory([]);
    toast("info", "History cleared");
  };

  const typeIcon = (t: string) =>
    t === "disk" ? "💾" : t === "network" ? "🌐" : "⚡";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Benchmark</h2>
        <div className="flex gap-2">
          <button onClick={runAll} disabled={running} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded text-xs transition-colors">
            {running ? "Running..." : "Run All"}
          </button>
        </div>
      </div>

      {/* Single benchmark buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={() => runSingle("disk")} disabled={running} className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors text-left">
          <p className="text-lg mb-1">💾</p>
          <p className="font-semibold text-sm">Disk</p>
          <p className="text-xs text-gray-500">512 MB write/read speed</p>
        </button>
        <button onClick={() => runSingle("network")} disabled={running} className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors text-left">
          <p className="text-lg mb-1">🌐</p>
          <p className="font-semibold text-sm">Network</p>
          <p className="text-xs text-gray-500">Ping to Cloudflare, Google</p>
        </button>
        <button onClick={() => runSingle("cpu")} disabled={running} className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors text-left">
          <p className="text-lg mb-1">⚡</p>
          <p className="font-semibold text-sm">CPU</p>
          <p className="text-xs text-gray-500">Multi-threaded calculation</p>
        </button>
      </div>

      {/* Latest results */}
      {results.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Latest Results</h3>
          <div className="grid grid-cols-3 gap-3">
            {results.map((r, i) => (
              <div key={i} className="p-4 bg-gray-900 border border-emerald-800 rounded-lg">
                <p className="text-lg mb-1">{typeIcon(r.benchmark_type)}</p>
                <p className="text-2xl font-bold text-emerald-400">{r.score.toFixed(1)}</p>
                <p className="text-xs text-gray-500">{r.unit}</p>
                <p className="text-xs text-gray-600 mt-1">{r.profile_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">History</h3>
        {history.length > 0 && (
          <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear</button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-600">No benchmarks recorded yet.</p>
      ) : (
        <div className="space-y-1">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm">
              <span>{typeIcon(h.benchmark_type)}</span>
              <span className="font-medium text-emerald-400">{h.score.toFixed(1)}</span>
              <span className="text-gray-500 text-xs">{h.unit}</span>
              <span className="flex-1 text-xs text-gray-600 truncate">{h.profile_name}</span>
              <span className="text-xs text-gray-600 shrink-0">{h.created_at.split("T")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
