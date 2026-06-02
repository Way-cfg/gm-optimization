import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import DockSidebar from "./DockSidebar";
import GlobalSpotlight from "./GlobalSpotlight";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-obsidian">
      <GlobalSpotlight />
      <DockSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
