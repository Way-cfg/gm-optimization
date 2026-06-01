import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import JunkCleaner from "./pages/JunkCleaner";
import StartupManager from "./pages/StartupManager";
import RegistryCleaner from "./pages/RegistryCleaner";
import DiskAnalyzer from "./pages/DiskAnalyzer";
import ProcessManager from "./pages/ProcessManager";
import SettingsTweaker from "./pages/SettingsTweaker";
import Scheduler from "./pages/Scheduler";
import NetworkOptimizer from "./pages/NetworkOptimizer";
import SystemInfo from "./pages/SystemInfo";
import Benchmark from "./pages/Benchmark";
import Restore from "./pages/Restore";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="junk-cleaner" element={<JunkCleaner />} />
          <Route path="startup-manager" element={<StartupManager />} />
          <Route path="registry-cleaner" element={<RegistryCleaner />} />
          <Route path="disk-analyzer" element={<DiskAnalyzer />} />
          <Route path="process-manager" element={<ProcessManager />} />
        <Route path="settings-tweaker" element={<SettingsTweaker />} />
        <Route path="network-optimizer" element={<NetworkOptimizer />} />
        <Route path="system-info" element={<SystemInfo />} />
        <Route path="benchmark" element={<Benchmark />} />
        <Route path="restore" element={<Restore />} />
        <Route path="scheduler" element={<Scheduler />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
