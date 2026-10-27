export const puede = (codigo: string): boolean => {
  const permisos: string[] = JSON.parse(localStorage.getItem("permisos") || "[]");
  return permisos.includes(codigo);
};

/** El usuario con sesión tiene el rol Administrador (el login guarda los nombres de sus roles) */
export const esAdmin = (): boolean => {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  return String(usuario.rol || "")
    .split(",")
    .some((r) => r.trim().toLowerCase() === "administrador");
};
