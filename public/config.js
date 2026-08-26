/**
 * Configuración de runtime del frontend.
 *
 * Este archivo NO pasa por el build: se copia tal cual a `dist/config.js`.
 * Se puede editar en el servidor (o montar como volumen en Docker) para
 * apuntar el frontend a otro backend sin recompilar nada.
 *
 * Precedencia: lo que el usuario configure desde la UI (se guarda en su
 * navegador) le gana a este archivo.
 */
window.__APP_CONFIG__ = {
  // URL base del backend, sin barra final.
  //   ""                          -> mismo origen (proxy de Vite o de nginx)
  //   "http://192.168.1.50:8081"  -> backend en otro equipo de la red
  //   "https://api.midominio.com" -> backend en otro dominio
  //
  // Si el backend está en otro origen, acordate de habilitarlo allá con
  // CORS_ORIGINS.
  apiBaseUrl: ""
};
