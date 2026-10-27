import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import UserDropdown from "../components/UserDropdown";
import BarraCaso from "../components/BarraCaso";
import { Outlet } from "react-router-dom";
import { useLayout } from "../context/LayoutContext";

function MainLayout() {
  const { mode, scale } = useLayout();

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">

      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
        }}
        className="flex h-full"
      >

        {mode === "sidebar" && <Sidebar />}

        <div className="flex flex-col flex-1">

          {mode === "navbar" && <Navbar />}

          <BarraCaso />

          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>

        </div>

      </div>

      {/* UI GLOBAL */}
      <UserDropdown />

    </div>
  );
}

export default MainLayout;