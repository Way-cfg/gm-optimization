import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { ToastProvider } from "./components/Toast";
import SplashScreen from "./components/SplashScreen";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TweaksHub from "./pages/TweaksHub";
import CustomizePrefs from "./pages/CustomizePrefs";
import AppSettings from "./pages/AppSettings";
import AboutSystem from "./pages/AboutSystem";
import OptimizationWizard from "./pages/OptimizationWizard";
import JunkCleaner from "./pages/JunkCleaner";
import Benchmark from "./pages/Benchmark";
import Restore from "./pages/Restore";
import Profiles from "./pages/Profiles";
import StartupManager from "./pages/StartupManager";
interface DriveSummary {
  letter: string;
  size: string;
}

interface InitResult {
  cpu_name: string;
  gpu_name: string;
  ram_total: string;
  drives: DriveSummary[];
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [initData, setInitData] = useState<InitResult | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    invoke<InitResult>("init_app")
      .then(data => {
        setInitData(data);
        setLoading(false);
        t = setTimeout(() => setReady(true), 600);
      })
      .catch(() => {
        setLoading(false);
        setInitError(true);
      });
    return () => { if (t) clearTimeout(t); };
  }, []);

  if (initError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#030508]">
        <p className="text-sm text-white/30 font-mono mb-2">Failed to initialize</p>
        <p className="text-xs text-white/15 font-mono">Try restarting the application</p>
      </div>
    );
  }

  return (
    <>
      <SplashScreen loading={loading} />
      {ready && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <ToastProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard initData={initData} />} />
                <Route path="wizard" element={<OptimizationWizard />} />
                <Route path="tweaks" element={<TweaksHub />} />
                <Route path="customize" element={<CustomizePrefs />} />
                <Route path="settings" element={<AppSettings />} />
                <Route path="about" element={<AboutSystem />} />
                <Route path="junk-cleaner" element={<JunkCleaner />} />
                <Route path="benchmark" element={<Benchmark />} />
                <Route path="restore" element={<Restore />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="startup" element={<StartupManager />} />
              </Route>
            </Routes>
          </ToastProvider>
        </motion.div>
      )}
    </>
  );
}
