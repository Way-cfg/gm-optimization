import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";

interface InfoEntry {
  label: string;
  value: string;
}

interface SystemInfo {
  cpu: InfoEntry[];
  gpu: InfoEntry[];
  ram: InfoEntry[];
  motherboard: InfoEntry[];
  storage: InfoEntry[];
  network: InfoEntry[];
}

export default function SystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<SystemInfo>("get_system_info");
      setInfo(res);
    } catch (e) {
      toast("error", `Failed: ${e}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const sections: { key: keyof SystemInfo; label: string }[] = [
    { key: "cpu", label: "CPU" },
    { key: "gpu", label: "GPU" },
    { key: "ram", label: "RAM" },
    { key: "motherboard", label: "Motherboard" },
    { key: "storage", label: "Storage" },
    { key: "network", label: "System" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">System Information</h2>
        <button onClick={load} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : info ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map(({ key, label }) => (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">{label}</h3>
              <div className="space-y-2">
                {info[key].map((entry, i) => (
                  <div key={i} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-gray-500 shrink-0 w-28">{entry.label}</span>
                    <span className="text-xs text-gray-200 text-right break-all">{entry.value || "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
