import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface HistoryEntry {
  id: number;
  module: string;
  scanned_at: string;
  total_size: number;
  item_count: number;
  result_json: string;
}

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      const h = await invoke<HistoryEntry[]>("get_scan_history", { limit: 10 });
      setHistory(h);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadHistory(); }, []);

  const clearHistory = async () => {
    await invoke("clear_scan_history");
    setHistory([]);
    setConfirmClear(false);
    toast("success", "History cleared");
  };

  const moduleLabel = (m: string) =>
    m === "junk_cleaner" ? "Junk Cleaner" : m === "registry_cleaner" ? "Registry Cleaner" : m;

  const formatSize = (bytes: number) => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <ModuleCard title="Junk Cleaner" desc="Remove temporary files and caches" path="/junk-cleaner" />
        <ModuleCard title="Startup Manager" desc="Manage startup programs" path="/startup-manager" />
        <ModuleCard title="Registry Cleaner" desc="Scan and clean registry issues" path="/registry-cleaner" />
        <ModuleCard title="Disk Analyzer" desc="Visualize disk usage" path="/disk-analyzer" />
        <ModuleCard title="Process Manager" desc="Monitor processes and services" path="/process-manager" />
        <ModuleCard title="System Info" desc="Hardware and system details" path="/system-info" />
        <ModuleCard title="Benchmark" desc="CPU, disk, and network testing" path="/benchmark" />
        <ModuleCard title="System Restore" desc="Create and restore snapshots" path="/restore" />
        <ModuleCard title="Network Optimizer" desc="TCP/IP, DNS, and adapter tuning" path="/network-optimizer" />
        <ModuleCard title="Settings Tweaker" desc="System performance tweaks" path="/settings-tweaker" />
        <ModuleCard title="Scheduler" desc="Automate tasks on a schedule" path="/scheduler" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">Recent Activity</h3>
        {history.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
            Clear history
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear History"
        message="This will permanently delete all scan history. This action cannot be undone."
        confirmLabel="Clear"
        onConfirm={clearHistory}
        onCancel={() => setConfirmClear(false)}
      />

      {history.length === 0 ? (
        <p className="text-sm text-gray-600">No scans recorded yet. Run a scan to see results here.</p>
      ) : (
        <div className="space-y-1">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-4 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded text-sm">
              <span className="text-xs font-medium text-emerald-400 uppercase w-28 shrink-0">{moduleLabel(h.module)}</span>
              <span className="text-gray-400 w-36 shrink-0">{h.scanned_at.split("T")[0]} {h.scanned_at.split("T")[1]?.slice(0, 8)}</span>
              <span className="text-gray-300">{h.item_count} items</span>
              {h.total_size > 0 && <span className="text-gray-500">{formatSize(h.total_size)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ title, desc, path }: { title: string; desc: string; path: string }) {
  return (
    <Link
      to={path}
      className="block p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-emerald-500/50 transition-colors"
    >
      <h3 className="font-semibold text-gray-100 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{desc}</p>
    </Link>
  );
}
