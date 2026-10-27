import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Home from "../pages/Home";
import NotFound from "../pages/NotFound";
import MainLayout from "../layouts/MainLayout";
import Reporte from "../pages/Reporte";
import Usuarios from "../pages/Usuarios";
import Roles from "../pages/Roles";
import Permisos from "../pages/Permisos";
import Casos from "../pages/Casos";
import Mapas from "../pages/Mapas";
import Entel from "../pages/Entel";
import Tigo from "../pages/Tigo";
import Viva from "../pages/Viva";
import AntenasEntel from "../pages/AntenasEntel";
import AntenasTigo from "../pages/AntenasTigo";
import SoloAdmin from "../components/SoloAdmin";
import SumarDiplomado from "../pages/sumardiplomado";
import SumarMaestria from "../pages/sumarmaestria";
import SumarEspecialidad from "../pages/sumarespecialidad";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Layout padre */}
        <Route path="/app" element={<MainLayout />}>
          <Route path="home" element={<Home />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="roles" element={<Roles />} />
          <Route path="permisos" element={<Permisos />} />
          <Route path="casos" element={<Casos />} />
          <Route path="mapas" element={<Mapas />} />
          <Route path="entel" element={<Entel />} />
          <Route path="tigo" element={<Tigo />} />
          <Route path="viva" element={<Viva />} />
          <Route path="antenas-tigo" element={<SoloAdmin><AntenasTigo /></SoloAdmin>} />
          <Route path="antenas-entel" element={<SoloAdmin><AntenasEntel /></SoloAdmin>} />
          <Route path="monitoreo" element={<Reporte />} />
          <Route path="sumardiplomado" element={<SumarDiplomado />} />
          <Route path="sumarmaestria" element={<SumarMaestria />} />
          <Route path="sumarespecialidad" element={<SumarEspecialidad />} />
        </Route>

        {/* Error */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
