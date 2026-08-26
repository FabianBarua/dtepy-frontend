/**
 * Configuración de la URL del backend.
 *
 * Se resuelve en este orden (gana el primero que tenga valor):
 *
 *   1. localStorage  → lo que el usuario configuró desde la UI, en su navegador.
 *   2. public/config.js (`window.__APP_CONFIG__`) → configuración del deploy.
 *      Es un archivo suelto dentro de `dist/`: se puede editar o montar en el
 *      contenedor sin recompilar el frontend.
 *   3. VITE_API_BASE_URL → valor de compilación, tomado del `.env`.
 *   4. Vacío → mismo origen. El navegador llama a `/api/...` sobre el propio
 *      dominio del frontend, que es lo que espera el proxy de Vite en
 *      desarrollo y un `location /api/` de nginx en producción.
 *
 * Todas las llamadas de la app son relativas (`/api/...`), así que alcanza con
 * setear `axios.defaults.baseURL` para redirigirlas a otro backend.
 */

import axios from 'axios';

const CLAVE_STORAGE = 'apiBaseUrl';

export const ORIGENES = {
  navegador: 'Configurado en este navegador',
  deploy: 'Definido en el deploy (config.js)',
  build: 'Definido al compilar (VITE_API_BASE_URL)',
  mismoOrigen: 'Mismo origen que el frontend'
};

/**
 * Normaliza lo que escribe el usuario:
 * agrega esquema si falta y saca la barra final.
 *
 * @param {string} url
 * @returns {string}
 */
export function normalizarUrl(url) {
  const valor = String(url || '').trim();
  if (!valor) return '';

  const conEsquema = /^https?:\/\//i.test(valor)
    ? valor
    : `${window.location.protocol === 'https:' ? 'https' : 'http'}://${valor}`;

  return conEsquema.replace(/\/+$/, '');
}

/**
 * Valida una URL de backend. Devuelve el mensaje de error o null si está bien.
 *
 * @param {string} url
 * @returns {string|null}
 */
export function validarUrl(url) {
  const valor = String(url || '').trim();
  if (!valor) return null; // vacío = mismo origen, es válido

  try {
    const parsed = new URL(normalizarUrl(valor));
    if (!/^https?:$/.test(parsed.protocol)) return 'La URL debe empezar con http:// o https://';
    if (!parsed.hostname) return 'Falta el host';
    return null;
  } catch (error) {
    return 'La URL no es válida';
  }
}

function leerRuntime() {
  const config = typeof window !== 'undefined' ? window.__APP_CONFIG__ : null;
  return config && typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl : '';
}

function leerLocal() {
  try {
    return localStorage.getItem(CLAVE_STORAGE) || '';
  } catch (error) {
    // Modo privado o storage bloqueado
    return '';
  }
}

/**
 * Resuelve la URL efectiva del backend y de dónde salió.
 *
 * @returns {{ url: string, origen: keyof ORIGENES }}
 */
export function obtenerConfigApi() {
  const local = normalizarUrl(leerLocal());
  if (local) return { url: local, origen: 'navegador' };

  const runtime = normalizarUrl(leerRuntime());
  if (runtime) return { url: runtime, origen: 'deploy' };

  const build = normalizarUrl(import.meta.env.VITE_API_BASE_URL);
  if (build) return { url: build, origen: 'build' };

  return { url: '', origen: 'mismoOrigen' };
}

/**
 * URL efectiva del backend ('' = mismo origen).
 * @returns {string}
 */
export function obtenerApiBaseUrl() {
  return obtenerConfigApi().url;
}

/**
 * Cómo se ve la URL del backend para mostrarla en pantalla.
 * @returns {string}
 */
export function describirApiBaseUrl() {
  const { url } = obtenerConfigApi();
  return url || `${window.location.origin} (mismo origen)`;
}

/**
 * ¿Hay una URL configurada a mano en este navegador?
 * @returns {boolean}
 */
export function tieneOverrideLocal() {
  return Boolean(normalizarUrl(leerLocal()));
}

/**
 * Aplica la URL configurada a axios. Se llama al arrancar y tras cada cambio.
 * @returns {string} la URL aplicada
 */
export function aplicarApiBaseUrl() {
  const { url } = obtenerConfigApi();
  axios.defaults.baseURL = url;
  return url;
}

/**
 * Guarda la URL del backend en este navegador y la aplica.
 * Un valor vacío borra el override y vuelve a la configuración del deploy.
 *
 * @param {string} url
 * @returns {string} la URL efectiva resultante
 */
export function guardarApiBaseUrl(url) {
  const normalizada = normalizarUrl(url);

  try {
    if (normalizada) {
      localStorage.setItem(CLAVE_STORAGE, normalizada);
    } else {
      localStorage.removeItem(CLAVE_STORAGE);
    }
  } catch (error) {
    console.warn('No se pudo guardar la URL del backend:', error.message);
  }

  return aplicarApiBaseUrl();
}

/**
 * Borra el override de este navegador.
 * @returns {string} la URL efectiva resultante
 */
export function restablecerApiBaseUrl() {
  return guardarApiBaseUrl('');
}

/**
 * Prueba que haya un backend respondiendo en esa URL.
 *
 * Usa una instancia propia de axios para no pasar por los interceptores
 * globales (que redirigen al login ante un 401).
 *
 * @param {string} url URL a probar ('' = mismo origen)
 * @param {number} [timeout]
 * @returns {Promise<{ ok: boolean, mensaje: string, detalle?: object }>}
 */
export async function probarConexion(url, timeout = 8000) {
  const cliente = axios.create({ baseURL: normalizarUrl(url), timeout });

  try {
    const { data } = await cliente.get('/api/health');
    return {
      ok: true,
      mensaje: `Backend disponible${data?.version ? ` (v${data.version})` : ''}${
        data?.mongo ? ` · MongoDB: ${data.mongo}` : ''
      }`,
      detalle: data
    };
  } catch (error) {
    // Backends anteriores no tienen /api/health: probamos con /api/stats.
    if (error.response?.status === 404) {
      try {
        await cliente.get('/api/stats');
        return { ok: true, mensaje: 'Backend disponible (versión sin /api/health)' };
      } catch (fallback) {
        return { ok: false, mensaje: describirError(fallback) };
      }
    }

    return { ok: false, mensaje: describirError(error) };
  }
}

function describirError(error) {
  if (error.code === 'ECONNABORTED') return 'Se agotó el tiempo de espera';
  if (error.response) return `El servidor respondió ${error.response.status}`;
  // Sin `response` y sin timeout: DNS, servidor caído, HTTPS inválido o CORS.
  return 'No se pudo conectar. Revisá la URL, que el backend esté levantado y que CORS_ORIGINS lo permita.';
}
