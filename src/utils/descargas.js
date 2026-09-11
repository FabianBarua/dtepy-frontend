/**
 * Descargas desde el navegador: blobs de axios → archivo.
 */

import axios from 'axios';

/** Saca el nombre del header Content-Disposition (soporta filename*=UTF-8''...). */
export function nombreDesdeHeaders(headers, fallback) {
  const cd = headers?.['content-disposition'] || headers?.get?.('content-disposition') || '';
  const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try { return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, '')); } catch (e) { /* sigue */ }
  }
  const simple = cd.match(/filename="?([^";]+)"?/i);
  return simple ? simple[1].trim() : fallback;
}

export function guardarBlob(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // dar tiempo al navegador a tomar el objeto antes de liberarlo
  setTimeout(() => window.URL.revokeObjectURL(url), 1500);
}

/**
 * GET binario y guardado. Si el backend responde JSON (error), lo lee y lanza
 * un Error con su `message` para que la vista lo muestre.
 */
export async function descargarGet(url, nombreFallback) {
  const respuesta = await axios.get(url, { responseType: 'blob' });
  return guardarRespuesta(respuesta, nombreFallback);
}

export async function descargarPost(url, body, nombreFallback) {
  const respuesta = await axios.post(url, body, { responseType: 'blob' });
  return guardarRespuesta(respuesta, nombreFallback);
}

async function guardarRespuesta(respuesta, nombreFallback) {
  const tipo = respuesta.headers?.['content-type'] || '';
  if (tipo.includes('application/json')) {
    const texto = await respuesta.data.text();
    let mensaje = texto;
    try { mensaje = JSON.parse(texto).message || texto; } catch (e) { /* texto plano */ }
    throw new Error(mensaje);
  }
  const nombre = nombreDesdeHeaders(respuesta.headers, nombreFallback);
  guardarBlob(respuesta.data, nombre);
  return nombre;
}

/** Cuando axios devolvió un blob de error, extrae el mensaje JSON que trae. */
export async function mensajeDeErrorBlob(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.message || json.error || error.message;
    } catch (e) { /* no era JSON */ }
  }
  return error?.response?.data?.message || error?.message || 'Error desconocido';
}
