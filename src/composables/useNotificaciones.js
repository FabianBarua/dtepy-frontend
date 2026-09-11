/**
 * Notificaciones globales (snackbar) para toda la app.
 *
 * Reemplaza los `alert()` y los snackbars copiados en cada vista: cualquier
 * componente llama `notificar.exito('...')` y el `<AppSnackbar>` montado en
 * App.vue lo muestra. Se encolan: si llegan varias seguidas se ven una tras
 * otra en vez de pisarse.
 */

import { reactive, readonly } from 'vue';

const estado = reactive({
  visible: false,
  texto: '',
  color: 'info',
  icono: 'mdi-information',
  timeout: 5000,
  cola: []
});

const ICONOS = {
  success: 'mdi-check-circle',
  error: 'mdi-alert-circle',
  warning: 'mdi-alert',
  info: 'mdi-information'
};

function mostrarSiguiente() {
  if (estado.visible || estado.cola.length === 0) return;
  const { texto, color, timeout } = estado.cola.shift();
  estado.texto = texto;
  estado.color = color;
  estado.icono = ICONOS[color] || ICONOS.info;
  estado.timeout = timeout;
  estado.visible = true;
}

function encolar(texto, color = 'info', timeout = 5000) {
  estado.cola.push({ texto, color, timeout });
  mostrarSiguiente();
}

export const notificar = {
  exito: (texto, timeout) => encolar(texto, 'success', timeout ?? 4000),
  error: (texto, timeout) => encolar(texto, 'error', timeout ?? 7000),
  aviso: (texto, timeout) => encolar(texto, 'warning', timeout ?? 6000),
  info: (texto, timeout) => encolar(texto, 'info', timeout ?? 5000)
};

/** Lo usa <AppSnackbar>: estado de solo lectura + cierre que avanza la cola. */
export function useNotificaciones() {
  const cerrar = () => {
    estado.visible = false;
    // pequeña pausa para que la animación de salida no se pise con la entrada
    setTimeout(mostrarSiguiente, 250);
  };
  return { estado: readonly(estado), cerrar, notificar };
}
