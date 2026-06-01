import { Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import TweaksHub from "./pages/TweaksHub";
import AppSettings from "./pages/AppSettings";
import AboutSystem from "./pages/AboutSystem";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tweaks" element={<TweaksHub />} />
          <Route path="settings" element={<AppSettings />} />
          <Route path="about" element={<AboutSystem />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
