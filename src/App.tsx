import { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { ToastProvider } from "./components/Toast";
import SplashScreen from "./components/SplashScreen";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TweaksHub from "./pages/TweaksHub";
import AppSettings from "./pages/AppSettings";
import AboutSystem from "./pages/AboutSystem";

interface SystemInfo {
  cpu: { label: string; value: string }[];
  gpu: { label: string; value: string }[];
  ram: { label: string; value: string }[];
  storage: { label: string; value: string }[];
  network: { label: string; value: string }[];
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [initData, setInitData] = useState<SystemInfo | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("init_app")
      .then(setInitData)
      .catch(() => {});
  }, []);

  const handleFinish = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!ready && <SplashScreen onFinish={handleFinish} />}
      </AnimatePresence>
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
                <Route path="tweaks" element={<TweaksHub />} />
                <Route path="settings" element={<AppSettings />} />
                <Route path="about" element={<AboutSystem />} />
              </Route>
            </Routes>
          </ToastProvider>
        </motion.div>
      )}
    </>
  );
}
