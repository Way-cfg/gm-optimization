import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface ProcessInfo {
  pid: number;
  name: string;
  cpu_usage: number;
  memory_mb: number;
  is_system: boolean;
}

interface ServiceInfo {
  name: string;
  display_name: string;
  status: string;
  startup_type: string;
  is_system: boolean;
}

type Tab = "processes" | "services";

export default function ProcessManager() {
  const [tab, setTab] = useState<Tab>("processes");
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmKill, setConfirmKill] = useState<{ pid: number; name: string } | null>(null);
  const { toast } = useToast();

  const loadProcesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<ProcessInfo[]>("get_processes");
      setProcs(res);
    } catch (e) { setMsg(`Error: ${e}`); }
    setLoading(false);
  }, []);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoke<ServiceInfo[]>("get_services");
      setServices(res);
    } catch (e) { setMsg(`Error: ${e}`); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "processes") loadProcesses();
    else loadServices();
  }, [tab, loadProcesses, loadServices]);

  const killPid = async (pid: number, name: string) => {
    try {
      await invoke("kill_process", { pid });
      setMsg(`Killed ${name} (PID ${pid})`);
      toast("success", `Killed ${name} (PID ${pid})`);
      loadProcesses();
    } catch (e) { setMsg(`Error: ${e}`); toast("error", `Failed to kill ${name}: ${e}`); }
  };

  const controlService = async (name: string, action: string) => {
    try {
      await invoke("control_service", { serviceName: name, action });
      setMsg(`${action}ed ${name}`);
      toast("success", `${action}ed ${name}`);
      loadServices();
    } catch (e) { setMsg(`Error: ${e}`); toast("error", `Failed to ${action} ${name}: ${e}`); }
  };

  const changeStartup = async (name: string, startupType: string) => {
    try {
      await invoke("change_service_startup", { serviceName: name, startupType });
      setMsg(`Changed ${name} to ${startupType}`);
      toast("info", `Changed ${name} to ${startupType}`);
      loadServices();
    } catch (e) { setMsg(`Error: ${e}`); toast("error", `Failed to change ${name}: ${e}`); }
  };

  const startupColor = (s: string) =>
    s === "Automatic" ? "text-green-400" : s === "Manual" ? "text-yellow-400" : "text-red-400";

  const statusColor = (s: string) =>
    s === "Running" ? "text-green-400" : s === "Stopped" ? "text-gray-500" : "text-yellow-400";

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <h2 className="text-2xl font-bold">Process Manager</h2>
        <div className="flex bg-gray-900 rounded-lg border border-gray-800 p-0.5">
          <button onClick={() => setTab("processes")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === "processes" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
            Processes
          </button>
          <button onClick={() => setTab("services")} className={`px-3 py-1.5 text-xs rounded-md transition-colors ${tab === "services" ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
            Services
          </button>
        </div>
      </div>

      {msg && <p className="text-sm text-emerald-400 mb-3">{msg}</p>}

      <ConfirmDialog
        open={confirmKill !== null}
        title="Kill Process"
        message={`Are you sure you want to kill "${confirmKill?.name}" (PID ${confirmKill?.pid})? This will terminate the process immediately.`}
        confirmLabel="Kill"
        onConfirm={() => { if (confirmKill) killPid(confirmKill.pid, confirmKill.name); setConfirmKill(null); }}
        onCancel={() => setConfirmKill(null)}
      />

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : tab === "processes" ? (
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          <div className="flex text-xs text-gray-500 px-3 pb-1 font-medium">
            <span className="w-16">PID</span>
            <span className="flex-1">Name</span>
            <span className="w-20 text-right">CPU%</span>
            <span className="w-20 text-right">MB</span>
            <span className="w-16 text-right">Action</span>
          </div>
          {procs.map((p) => (
            <div key={p.pid} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded text-sm">
              <span className="w-16 text-gray-500">{p.pid}</span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="w-20 text-right text-gray-300">{p.cpu_usage.toFixed(1)}</span>
              <span className="w-20 text-right text-gray-300">{p.memory_mb}</span>
              <button onClick={() => setConfirmKill({ pid: p.pid, name: p.name })} disabled={p.is_system} className="w-16 text-right text-xs text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed">
                {p.is_system ? "System" : "Kill"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 max-h-[70vh] overflow-y-auto">
          {services.map((s) => (
            <div key={s.name} className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate">{s.display_name || s.name}</p>
                <p className="text-xs">
                  <span className={statusColor(s.status)}>{s.status}</span>
                  <span className="text-gray-600 mx-1">·</span>
                  <span className={startupColor(s.startup_type)}>{s.startup_type}</span>
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {s.status === "Stopped" ? (
                  <button onClick={() => controlService(s.name, "start")} className="px-2 py-1 bg-green-800/50 hover:bg-green-700/50 rounded text-xs transition-colors">Start</button>
                ) : (
                  <button onClick={() => controlService(s.name, "stop")} className="px-2 py-1 bg-red-800/50 hover:bg-red-700/50 rounded text-xs transition-colors">Stop</button>
                )}
                <select
                  value={s.startup_type}
                  onChange={(e) => changeStartup(s.name, e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded text-xs px-2 py-1"
                >
                  <option value="Automatic">Auto</option>
                  <option value="Automatic (Delayed)">Delayed</option>
                  <option value="Manual">Manual</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
