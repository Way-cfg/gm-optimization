import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import PageTransition from "./PageTransition";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <PageTransition key={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
