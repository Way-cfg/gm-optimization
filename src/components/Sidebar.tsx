import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Trash2, FileJson, HardDrive,
  Activity, SlidersHorizontal, Wifi, Rocket,
  Monitor, Gauge, RotateCcw,
  Clock, FolderKanban,
  ChevronDown, PanelLeftClose, PanelLeft,
  Brush, Zap, Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

interface NavCategory {
  name: string;
  categoryIcon: LucideIcon;
  items: NavItem[];
}

const categories: NavCategory[] = [
  {
    name: "System Cleanup",
    categoryIcon: Brush,
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/junk-cleaner", label: "Junk Cleaner", icon: Trash2 },
      { path: "/registry-cleaner", label: "Registry Cleaner", icon: FileJson },
      { path: "/disk-analyzer", label: "Disk Analyzer", icon: HardDrive },
    ],
  },
  {
    name: "Performance & Tweaks",
    categoryIcon: Zap,
    items: [
      { path: "/process-manager", label: "Process Manager", icon: Activity },
      { path: "/startup-manager", label: "Startup Manager", icon: Rocket },
      { path: "/settings-tweaker", label: "Settings Tweaker", icon: SlidersHorizontal },
      { path: "/network-optimizer", label: "Network Optimizer", icon: Wifi },
    ],
  },
  {
    name: "Diagnostics & Tools",
    categoryIcon: Activity,
    items: [
      { path: "/system-info", label: "System Info", icon: Monitor },
      { path: "/benchmark", label: "Benchmark", icon: Gauge },
      { path: "/restore", label: "System Restore", icon: RotateCcw },
    ],
  },
  {
    name: "Automation & Config",
    categoryIcon: Settings,
    items: [
      { path: "/scheduler", label: "Scheduler", icon: Clock },
      { path: "/profiles", label: "Profiles", icon: FolderKanban },
    ],
  },
];

function NavIcon({ icon: Icon, collapsed }: { icon: LucideIcon; collapsed: boolean }) {
  return (
    <span className="shrink-0 flex items-center justify-center">
      <Icon size={collapsed ? 20 : 18} strokeWidth={1.5} />
    </span>
  );
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => new Set(categories.map(c => c.name)));

  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (collapsed) {
    return (
      <aside className="w-[60px] bg-[#0A0D14]/80 border-r border-white/[0.04] flex flex-col h-screen shrink-0 backdrop-blur-xl">
        <div className="h-14 flex items-center justify-center border-b border-white/[0.04]">
          <span className="text-lg font-bold text-white/80 tracking-tight">O</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-1">
          {categories.map(cat =>
            cat.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  }`
                }
              >
                <item.icon size={18} strokeWidth={1.5} />
              </NavLink>
            ))
          )}
        </nav>
        <div className="py-3 flex justify-center border-t border-white/[0.04]">
          <button onClick={onToggle} className="text-white/20 hover:text-white/50 transition-colors">
            <PanelLeft size={18} strokeWidth={1.5} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[220px] bg-[#0A0D14]/80 border-r border-white/[0.04] flex flex-col h-screen shrink-0 backdrop-blur-xl">
      <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/[0.04]">
        <span className="text-base font-bold text-white/90 tracking-tight">Optimization</span>
        <span className="text-base font-light text-white/40">Way</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {categories.map(cat => (
          <div key={cat.name}>
            <button
              onClick={() => toggleCategory(cat.name)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-medium text-white/25 uppercase tracking-widest hover:text-white/40 transition-colors"
            >
              <cat.categoryIcon size={12} strokeWidth={1.5} />
              <span className="flex-1 text-left">{cat.name}</span>
              <motion.span
                animate={{ rotate: expandedCategories.has(cat.name) ? 0 : -90 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={12} strokeWidth={1.5} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {expandedCategories.has(cat.name) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {cat.items.map(item => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-all duration-200 ${
                          isActive
                            ? "bg-white/[0.07] text-white"
                            : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                        }`
                      }
                    >
                      <NavIcon icon={item.icon} collapsed={false} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>
      <div className="py-3 px-4 flex items-center justify-between border-t border-white/[0.04]">
        <span className="text-[11px] text-white/15">v0.1.0</span>
        <button onClick={onToggle} className="text-white/15 hover:text-white/40 transition-colors">
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
}
