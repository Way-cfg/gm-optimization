import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { Search, Play } from "lucide-react";
import GlowCard from "../components/GlowCard";
import { useToast } from "../components/Toast";

interface StartupItem {
  id: string;
  name: string;
  command: string;
  location: string;
  enabled: boolean;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } as const },
} as const;
const child = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } as const },
} as const;

export default function StartupManager() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [filtered, setFiltered] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    invoke<StartupItem[]>("get_startup_items")
      .then(data => {
        setItems(data);
        setFiltered(data);
      })
      .catch(() => toast("error", "Failed to scan startup items"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(items.filter(i => i.name.toLowerCase().includes(q) || i.command.toLowerCase().includes(q)));
  }, [search, items]);

  const toggle = async (item: StartupItem) => {
    setToggling(prev => new Set(prev).add(item.id));
    const newEnabled = !item.enabled;

    setItems(prev => prev.map(i => i.id === item.id ? { ...i, enabled: newEnabled } : i));

    try {
      await invoke("toggle_startup_item", { id: item.id, enabled: newEnabled });
      toast("success", newEnabled ? `${item.name} enabled` : `${item.name} disabled`);
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, enabled: !newEnabled } : i));
      toast("error", `Failed to toggle ${item.name}`);
    } finally {
      setToggling(prev => { const next = new Set(prev); next.delete(item.id); return next; });
    }
  };

  const disableAll = async () => {
    const enabled = items.filter(i => i.enabled);
    for (const item of enabled) {
      await toggle(item);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl mx-auto">
      <motion.div variants={child} className="mb-6">
        <h1 className="text-xl font-semibold text-white/90 tracking-tight">Startup Manager</h1>
        <p className="text-sm text-white/25 mt-1">Manage which programs launch when Windows starts</p>
      </motion.div>

      <motion.div variants={child} className="mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15" />
          <input
            type="text"
            placeholder="Search startup items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-frosted/60 backdrop-blur-xl border border-white/[0.05] text-sm text-white/70 placeholder-white/20 outline-none focus:border-neon/30 transition-all"
          />
        </div>
        <button
          onClick={disableAll}
          className="px-4 py-2.5 rounded-xl bg-crimson/[0.08] border border-crimson/15 text-crimson text-xs font-medium hover:bg-crimson/[0.12] transition-all shrink-0"
        >
          Disable All
        </button>
      </motion.div>

      <motion.div variants={child}>
        <GlowCard className="card-glow bg-frosted/80 backdrop-blur-xl border border-white/[0.05] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Play size={32} strokeWidth={1.5} className="text-white/10 mb-3" />
              <p className="text-sm text-white/20 font-mono">
                {search ? "No startup items match your search" : "No startup programs found"}
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_1.5fr_1fr_80px] gap-3 px-5 py-3 text-[11px] text-white/15 uppercase tracking-widest border-b border-white/[0.04]">
                <span>Name</span>
                <span>Command</span>
                <span>Location</span>
                <span className="text-center">Status</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className={`grid grid-cols-[1fr_1.5fr_1fr_80px] gap-3 px-5 py-3 items-center transition-all ${
                      !item.enabled ? "opacity-40" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className="text-sm text-white/70 truncate">{item.name}</span>
                    <span className="text-sm text-white/30 font-mono truncate text-[13px]" title={item.command}>
                      {item.command}
                    </span>
                    <span className="text-xs text-white/20">{item.location}</span>
                    <div className="flex justify-center">
                      <button
                        onClick={() => toggle(item)}
                        disabled={toggling.has(item.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          item.enabled
                            ? "bg-neon/[0.12] text-neon"
                            : "bg-white/[0.03] text-white/20"
                        } disabled:opacity-50`}
                      >
                        {item.enabled ? "On" : "Off"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </GlowCard>
      </motion.div>

      {!loading && items.length > 0 && (
        <motion.p variants={child} className="mt-4 text-[11px] text-white/12 text-center">
          {items.filter(i => i.enabled).length} enabled / {items.length} total
        </motion.p>
      )}
    </motion.div>
  );
}
