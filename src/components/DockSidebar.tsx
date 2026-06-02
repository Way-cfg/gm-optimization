import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
} from 'framer-motion';
import { useMemo, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, SlidersHorizontal, Settings, Info, type LucideIcon } from 'lucide-react';
import appLogo from "../assets/applogo.png";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tweaks", label: "Tweaks Hub", icon: Zap },
  { path: "/customize", label: "Customize", icon: SlidersHorizontal },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/about", label: "About System", icon: Info },
];

function DockItem({
  children,
  mouseY,
  spring,
  distance,
  magnification,
  baseItemSize,
  isActive,
}: {
  children: React.ReactNode;
  mouseY: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  isActive: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const mouseDistance = useTransform(mouseY, val => {
    const rect = ref.current?.getBoundingClientRect() ?? { y: 0, height: baseItemSize };
    return val - rect.y - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center rounded-full border-2 transition-colors duration-200 cursor-pointer ${
        isActive
          ? "bg-neon/[0.12] border-neon/40 shadow-[0_0_12px_rgba(255,85,0,0.15)]"
          : "bg-[#141619] border-white/[0.06] hover:border-white/[0.15]"
      }`}
      tabIndex={0}
      role="button"
    >
      {children}
    </motion.div>
  );
}

export default function DockSidebar() {
  const location = useLocation();
  const mouseY = useMotionValue(Infinity);
  const isPanelHovered = useMotionValue(0);

  const spring: SpringOptions = { mass: 0.1, stiffness: 150, damping: 12 };
  const magnification = 70;
  const distance = 200;
  const baseItemSize = 50;
  const panelWidth = 76;
  const maxWidth = useMemo(() => Math.max(panelWidth, magnification + magnification / 2 + 4), [magnification]);

  const widthRow = useTransform(isPanelHovered, [0, 1], [panelWidth, maxWidth]);
  const width = useSpring(widthRow, spring);

  return (
    <aside className="h-screen flex items-center relative z-20 shrink-0">
      <motion.div
        style={{ width }}
        onMouseMove={({ clientY }) => {
          isPanelHovered.set(1);
          mouseY.set(clientY);
        }}
        onMouseLeave={() => {
          isPanelHovered.set(0);
          mouseY.set(Infinity);
        }}
        className="h-full flex flex-col items-center bg-frosted/80 backdrop-blur-xl border-r border-white/[0.04] py-4 overflow-hidden"
      >
        <div className="flex items-center justify-center mb-6 px-3 shrink-0">
          <img src={appLogo} alt="Optimization Way" className="h-12 w-auto" />
        </div>

        <nav className="flex flex-col items-center gap-3 flex-1">
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <NavLink key={item.path} to={item.path} end={item.path === "/"}>
                <DockItem
                  mouseY={mouseY}
                  spring={spring}
                  distance={distance}
                  magnification={magnification}
                  baseItemSize={baseItemSize}
                  isActive={isActive}
                >
                  <Icon size={18} strokeWidth={1.5} className={isActive ? "text-neon" : "text-white/35"} />
                </DockItem>
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto px-3 shrink-0">
          <span className="text-[10px] text-white/12">v0.1.0</span>
        </div>
      </motion.div>
    </aside>
  );
}
