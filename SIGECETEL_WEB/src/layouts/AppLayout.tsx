
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useLayout } from "../context/LayoutContext";

export default function AppLayout({ children }: any) {
  const { mode } = useLayout();

  return (
    <div className="flex h-screen bg-slate-950 text-white">

      {/* SIDEBAR SOLO SI ESTÁ ACTIVADO */}
      {mode === "sidebar" && <Sidebar />}

      <div className="flex-1 flex flex-col">

        {/* NAVBAR SIEMPRE */}
        <Navbar />

        <main className="p-4 flex-1 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}