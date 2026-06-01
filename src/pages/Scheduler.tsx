import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

interface Schedule {
  id: number;
  name: string;
  module: string;
  schedule_type: string;
  time: string | null;
  day: string | null;
  enabled: boolean;
  created_at: string;
}

const MODULES = [
  "junk_cleaner",
  "registry_cleaner",
  "startup_manager",
  "disk_analyzer",
  "process_manager",
  "settings_tweaker",
];

const INTERVALS = [
  { value: "ONCE", label: "Once" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export default function Scheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [module, setModule] = useState("junk_cleaner");
  const [interval, setInterval] = useState("DAILY");
  const [time, setTime] = useState("02:00");
  const [day, setDay] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoke<Schedule[]>("get_schedules");
      setSchedules(res);
    } catch (e) {
      toast("error", `Failed to load schedules: ${e}`);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    try {
      await invoke("create_schedule", {
        name,
        module,
        scheduleType: interval,
        time: time ? `${time}:00` : null,
        day: day || null,
      });
      setShowForm(false);
      setName("");
      setModule("junk_cleaner");
      setInterval("DAILY");
      setTime("02:00");
      setDay("");
      toast("success", `Schedule "${name}" created`);
      await load();
    } catch (e) {
      toast("error", `Failed to create schedule: ${e}`);
    }
  };

  const remove = async (id: number) => {
    setConfirmDelete(null);
    try {
      await invoke("delete_schedule", { id });
      toast("success", "Schedule deleted");
      await load();
    } catch (e) {
      toast("error", `Failed to delete schedule: ${e}`);
    }
  };

  const toggle = async (id: number, enabled: boolean) => {
    try {
      await invoke("toggle_schedule", { id, enabled });
      await load();
    } catch (e) {
      toast("error", `Failed to toggle schedule: ${e}`);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Scheduler</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs transition-colors"
        >
          + Add Schedule
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This will remove the scheduled task from Windows Task Scheduler."
        confirmLabel="Delete"
        onConfirm={() => confirmDelete !== null && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {showForm && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded space-y-3">
          <h3 className="font-medium text-sm">New Schedule</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Interval</label>
              <select
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
              >
                {INTERVALS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            {(interval === "WEEKLY" || interval === "MONTHLY") && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  {interval === "WEEKLY" ? "Day of week" : "Day of month"}
                </label>
                {interval === "WEEKLY" ? (
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select...</option>
                    <option value="MON">Monday</option>
                    <option value="TUE">Tuesday</option>
                    <option value="WED">Wednesday</option>
                    <option value="THU">Thursday</option>
                    <option value="FRI">Friday</option>
                    <option value="SAT">Saturday</option>
                    <option value="SUN">Sunday</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs focus:outline-none focus:border-emerald-500"
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={create} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs transition-colors">
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-2">
          {schedules.length === 0 && !showForm && (
            <p className="text-gray-500 text-sm">No schedules configured. Click "+ Add Schedule" to create one.</p>
          )}
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded">
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={() => toggle(s.id, !s.enabled)}
                className="accent-emerald-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.module.replace(/_/g, " ")} &middot; {s.schedule_type.toLowerCase()} {s.time ? `at ${s.time.slice(0, 5)}` : ""}
                  {s.day && ` on ${s.day}`}
                </p>
              </div>
              <button onClick={() => setConfirmDelete(s.id)} className="text-xs text-red-400 hover:text-red-300 shrink-0">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
