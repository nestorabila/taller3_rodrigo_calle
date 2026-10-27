import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CredencialService } from "../services/CredencialService";
import { TokenService } from "../services/TokenService";
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  Loader2,
  RadioTower,
  MapPinned,
} from "lucide-react";
import { PermisoService } from "../services/PermisoService";
import sigecetelHero from "../assets/sigecetel-bolivia-antenas-login.png";

export default function Login() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaDone, setCaptchaDone] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleCaptcha = () => {
    if (captchaDone || captchaLoading) return;
    setCaptchaChecked(true);
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaDone(true);
    }, 1600);
  };

  const handleLogin = async () => {
    if (!captchaDone) {
      setError("Por favor completa la verificación de seguridad.");
      return;
    }
    if (!usuario || !contrasena) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    try {
      setError("");
      setLoginLoading(true);
      const data = await CredencialService.login(usuario, contrasena);

      TokenService.setToken(data.token);
      localStorage.setItem("usuario", JSON.stringify(data));
      localStorage.removeItem("casoActivo");
      const permisosRes = await PermisoService.misPermisos();
      localStorage.setItem("permisos", JSON.stringify(permisosRes.data));
      navigate("/app/home");
    } catch (err: any) {
      setError("Usuario o contraseña incorrectos");
      setLoginLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <img
        src={sigecetelHero}
        alt="Mapa de Bolivia con antenas telefónicas"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.08),transparent_34%),linear-gradient(90deg,rgba(2,6,23,0.30),rgba(2,6,23,0.12)_42%,rgba(2,6,23,0.55))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/50 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-lg shadow-blue-600/25">
            <RadioTower size={18} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">SIGECETEL</div>
            <div className="text-[10px] uppercase tracking-widest text-sky-200/80">v1.0</div>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-sky-300/20 bg-slate-950/55 px-3 py-1.5 text-xs text-slate-200 backdrop-blur md:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Sistema en línea
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-72px)] items-center justify-center px-5 pb-10">
        <div className="w-full max-w-md">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-slate-950/55 px-3 py-1.5 text-xs text-sky-100 backdrop-blur">
              <MapPinned size={13} className="text-sky-300" />
              SISTEMA DE GEOREFERENCIACION DE CELDAS TELEFONICAS
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">SIGECETEL</h1>
          </div>

          <div className="relative">
            <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-sky-400/30 via-blue-600/15 to-emerald-400/10 opacity-70 blur-2xl" />

            <div className="relative rounded-[2rem] border border-sky-200/15 bg-slate-950/78 p-8 shadow-2xl backdrop-blur-2xl">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-600/30">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Iniciar sesión</h2>
                <p className="mt-1 text-xs text-slate-300">
                  Ingresa con tus credenciales para acceder al sistema
                </p>
              </div>

              <div className="mb-3">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-300">
                  Usuario
                </label>
                <div className="group relative">
                  <User
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-sky-300"
                  />
                  <input
                    type="text"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    className="w-full rounded-xl border border-sky-100/15 bg-slate-900/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/20"
                  />
                </div>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                    Contraseña
                  </label>
                  <button className="text-[11px] font-medium text-sky-300 transition hover:text-sky-200">
                    ¿Olvidaste?
                  </button>
                </div>
                <div className="group relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition group-focus-within:text-sky-300"
                  />
                  <input
                    type={showPass ? "text" : "password"}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                    className="w-full rounded-xl border border-sky-100/15 bg-slate-900/80 py-3 pl-10 pr-10 text-sm text-white outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div
                  onClick={handleCaptcha}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                    captchaDone
                      ? "border-emerald-400/45 bg-emerald-500/10"
                      : "border-sky-100/15 bg-slate-900/80 hover:border-sky-300/35"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                        captchaDone
                          ? "border-emerald-500 bg-emerald-500"
                          : captchaLoading
                          ? "border-sky-300 bg-transparent"
                          : captchaChecked
                          ? "border-sky-300 bg-transparent"
                          : "border-slate-500 bg-transparent"
                      }`}
                    >
                      {captchaLoading && (
                        <Loader2 size={14} className="animate-spin text-sky-300" />
                      )}
                      {captchaDone && <CheckCircle2 size={16} className="text-white" />}
                    </div>

                    <div>
                      <div className="text-sm font-medium">
                        {captchaLoading
                          ? "Verificando…"
                          : captchaDone
                          ? "Verificación completada"
                          : "Verifica que eres humano"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {captchaLoading
                          ? "Analizando conexión, espera un momento"
                          : captchaDone
                          ? "Éxito · puedes continuar"
                          : "Marca la casilla para continuar"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <Shield size={10} /> Protegido
                    </div>
                    <div className="text-[10px] text-slate-500">SIGECETEL</div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loginLoading || !captchaDone}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-500 hover:to-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loginLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Ingresando…
                  </>
                ) : (
                  <>
                    Ingresar
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Shield size={11} className="text-emerald-400" />
                  Conexión cifrada
                </div>
                <div>© 2026 SIGECETEL</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}