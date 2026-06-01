import { NavLink } from "react-router-dom";
import { JSX } from "react";

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: <span className="text-lg">📊</span> },
  { path: "/junk-cleaner", label: "Junk Cleaner", icon: <span className="text-lg">🗑️</span> },
  { path: "/startup-manager", label: "Startup Manager", icon: <span className="text-lg">🚀</span> },
  { path: "/registry-cleaner", label: "Registry Cleaner", icon: <span className="text-lg">📋</span> },
  { path: "/disk-analyzer", label: "Disk Analyzer", icon: <span className="text-lg">💾</span> },
  { path: "/process-manager", label: "Process Manager", icon: <span className="text-lg">⚙️</span> },
  { path: "/settings-tweaker", label: "Settings Tweaker", icon: <span className="text-lg">🔧</span> },
  { path: "/network-optimizer", label: "Network Optimizer", icon: <span className="text-lg">🌐</span> },
  { path: "/system-info", label: "System Info", icon: <span className="text-lg">🖥️</span> },
  { path: "/benchmark", label: "Benchmark", icon: <span className="text-lg">📊</span> },
  { path: "/restore", label: "System Restore", icon: <span className="text-lg">🔄</span> },
  { path: "/scheduler", label: "Scheduler", icon: <span className="text-lg">⏰</span> },
  { path: "/profiles", label: "Profiles", icon: <span className="text-lg">📁</span> },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen shrink-0">
      <div className="px-5 py-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-emerald-400 tracking-tight">Optimization Way</h1>
        <p className="text-xs text-gray-500 mt-0.5">System Utility</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-400"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-3 border-t border-gray-800 text-xs text-gray-500">
        v0.1.0 • Windows
      </div>
    </aside>
  );
}
