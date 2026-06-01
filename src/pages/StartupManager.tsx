import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface StartupEntry {
  id: number | null;
  name: string;
  source: string;
  command: string;
  enabled: boolean;
  delay_seconds: number;
}

export default function StartupManager() {
  const [entries, setEntries] = useState<StartupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoke<StartupEntry[]>("get_startup_entries");
      setEntries(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (name: string, enabled: boolean) => {
    await invoke("toggle_startup_entry", { name, enabled });
    await load();
  };

  const remove = async (name: string) => {
    await invoke("delete_startup_entry", { name });
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Startup Manager</h2>
        <button onClick={load} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
          Refresh
        </button>
      </div>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.name} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded">
              <input
                type="checkbox"
                checked={e.enabled}
                onChange={() => toggle(e.name, !e.enabled)}
                className="accent-emerald-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{e.name}</p>
                <p className="text-xs text-gray-500 truncate">{e.command}</p>
                <p className="text-xs text-gray-600">{e.source}</p>
              </div>
              <button onClick={() => remove(e.name)} className="text-xs text-red-400 hover:text-red-300 shrink-0">
                Delete
              </button>
            </div>
          ))}
          {entries.length === 0 && <p className="text-gray-500 text-sm">No entries found.</p>}
        </div>
      )}
    </div>
  );
}
