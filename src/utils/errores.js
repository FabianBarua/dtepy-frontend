/**
 * Mensaje legible a partir de un error de axios / del backend.
 *
 * El backend responde `{ success:false, error:'CODIGO', message:'texto' }`
 * (a veces solo `error` con el texto). Acá se unifica para las vistas.
 */
export function mensajeDeError(error, fallback = 'Ocurrió un error') {
  if (!error) return fallback;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'El servidor no respondió a tiempo';
  const data = error.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (data.message && data.message !== data.error) return data.message;
    if (data.error && !/^[A-Z0-9_]+$/.test(data.error)) return data.error; // texto, no un código
    if (data.message) return data.message;
    if (data.error) return `${fallback} (${data.error})`;
  }
  if (!error.response && error.request) return 'Sin respuesta del servidor. Verificá que el backend esté en ejecución.';
  return error.message || fallback;
}

/** Código de error del backend ('FACTURA_YA_APROBADA', ...) o null. */
export function codigoDeError(error) {
  const e = error?.response?.data?.error;
  return typeof e === 'string' && /^[A-Z0-9_]+$/.test(e) ? e : null;
}
