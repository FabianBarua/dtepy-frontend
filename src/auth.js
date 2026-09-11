import { reactive, readonly, computed } from 'vue';

const state = reactive({
  usuario: null,
  token: null,
  autenticado: false
});

function leerUsuario() {
  try {
    const raw = localStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Cargar datos del localStorage al iniciar
export function cargarSesion() {
  const token = localStorage.getItem('token');
  const usuario = leerUsuario();

  if (token && usuario) {
    state.token = token;
    state.usuario = usuario;
    state.autenticado = true;
    return true;
  }
  state.token = null;
  state.usuario = null;
  state.autenticado = false;
  return false;
}

// Guardar sesión (login). El filtro de empresa del usuario anterior no debe
// sobrevivir al cambio de cuenta.
export function guardarSesion(token, usuario) {
  state.token = token;
  state.usuario = usuario;
  state.autenticado = true;
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
  localStorage.removeItem('empresaActiva');
  localStorage.removeItem('filtro-empresa');
}

// Cerrar sesión
export function cerrarSesion() {
  state.token = null;
  state.usuario = null;
  state.autenticado = false;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('empresaActiva');
  localStorage.removeItem('filtro-empresa');

  // Redirigir al login inmediatamente
  window.location.href = '/login';
}

/** Usuario logueado (o null). Lee del estado en memoria, con fallback al storage. */
export function usuarioActual() {
  return state.usuario || leerUsuario();
}

export function rolActual() {
  return usuarioActual()?.rol || null;
}

export function esAdmin() {
  return rolActual() === 'admin';
}

// ---------------------------------------------------------------------
// Compatibilidad: la empresa activa ahora vive en composables/useEmpresaActiva
// (misma clave 'empresaActiva'). Estas funciones quedan para no romper a
// quien todavía las importe.
// ---------------------------------------------------------------------
export function guardarEmpresaActiva(empresaRuc) {
  if (empresaRuc && empresaRuc !== 'all') localStorage.setItem('empresaActiva', empresaRuc);
  else localStorage.removeItem('empresaActiva');
}

export function obtenerEmpresaActiva() {
  const v = localStorage.getItem('empresaActiva');
  return v && v !== 'all' && v !== 'null' ? v : null;
}

export function limpiarEmpresaActiva() {
  localStorage.removeItem('empresaActiva');
}

// Obtener estado de autenticación
export function useAuth() {
  return {
    usuario: computed(() => state.usuario),
    autenticado: computed(() => state.autenticado),
    esAdmin: computed(() => state.usuario?.rol === 'admin'),
    rol: computed(() => state.usuario?.rol || null)
  };
}

export default {
  state: readonly(state),
  cargarSesion,
  guardarSesion,
  cerrarSesion,
  usuarioActual,
  rolActual,
  esAdmin,
  guardarEmpresaActiva,
  obtenerEmpresaActiva,
  limpiarEmpresaActiva,
  useAuth
};
