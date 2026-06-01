import { NavLink } from "react-router-dom";
import { LayoutDashboard, Zap, Settings, Info, type LucideIcon } from "lucide-react";
import appLogo from "../../branding_assets/applogo.png";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tweaks", label: "Tweaks Hub", icon: Zap },
  { path: "/settings", label: "App Settings", icon: Settings },
  { path: "/about", label: "About System", icon: Info },
];

export default function Sidebar() {
  return (
    <aside className="w-[200px] bg-frosted/80 border-r border-white/[0.04] flex flex-col h-screen shrink-0 backdrop-blur-xl">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-white/[0.04]">
        <img src={appLogo} alt="Optimization Way" className="h-7 w-auto" />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
             className={({ isActive }) =>
               `flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                 isActive
                   ? "bg-neon/[0.1] text-neon"
                   : "text-white/35 hover:text-white/60 hover:bg-white/[0.02]"
               }`
             }
          >
            <item.icon size={16} strokeWidth={1.5} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="py-3 px-4 border-t border-white/[0.04]">
        <span className="text-[11px] text-white/12">v0.1.0</span>
      </div>
    </aside>
  );
}
