import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";

interface RestorePointInfo {
  description: string;
  created_at: string;
  sequence_number: number;
}

export default function Restore() {
  const [points, setPoints] = useState<RestorePointInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoke<RestorePointInfo[]>("get_restore_points");
      setPoints(res);
    } catch (e) {
      toast("error", `Failed to load restore points: ${e}`);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const desc = label.trim() || "manual";
    setCreating(true);
    try {
      const msg = await invoke<string>("create_restore_point", { label: desc });
      toast("success", msg);
      setLabel("");
      load();
    } catch (e) {
      toast("error", `${e}`);
    }
    setCreating(false);
  };

  const restore = async (seq: number, desc: string) => {
    setRestoring(true);
    try {
      const msg = await invoke<string>("restore_system", { sequenceNumber: seq });
      toast("info", `${msg} — "${desc}"`);
      load();
    } catch (e) {
      toast("error", `Restore failed: ${e}`);
    }
    setRestoring(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Restore</h2>

      {/* Create restore point */}
      <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Create Restore Point</h3>
        <p className="text-xs text-gray-500 mb-3">
          Creates a Windows System Restore point before applying tweaks, so you can roll back if something goes wrong.
        </p>
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Before gaming tweaks"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
          />
          <button onClick={create} disabled={creating} className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 rounded text-xs transition-colors">
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* Restore points list */}
      <h3 className="text-sm font-medium text-gray-400 mb-2">Available Restore Points</h3>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-gray-600">No restore points found. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {points.map((p) => (
            <div key={p.sequence_number} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.description}</p>
                <p className="text-xs text-gray-500">{p.created_at.replace("T", " ").slice(0, 19)}</p>
              </div>
              <button
                onClick={() => restore(p.sequence_number, p.description)}
                disabled={restoring}
                className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded text-xs transition-colors"
              >
                {restoring ? "..." : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
