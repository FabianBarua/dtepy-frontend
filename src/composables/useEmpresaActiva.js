/**
 * Empresa activa (filtro global por RUC), una sola fuente de verdad.
 *
 * Antes cada vista leía una clave distinta de localStorage ('empresaActiva'
 * vs 'filtro-empresa'), registraba su propio listener de `storage` (que nunca
 * se quitaba) y reaccionaba solo a través del query param. Ahora:
 *
 *   - El selector del header llama `establecerEmpresaActiva(ruc | null)`.
 *   - Cualquier vista hace `const { empresaActiva } = useEmpresaActiva()` y
 *     obtiene un ref reactivo (null = todas las empresas).
 *   - Se persiste en localStorage 'empresaActiva' y se refleja en la URL
 *     (?empresa=RUC) para que un link compartido abra con el mismo filtro.
 */

import { ref, computed } from 'vue';

const CLAVE = 'empresaActiva';

function leer() {
  try {
    const v = localStorage.getItem(CLAVE);
    return v && v !== 'all' && v !== 'null' ? v : null;
  } catch (e) {
    return null;
  }
}

const empresaActiva = ref(leer());

export function establecerEmpresaActiva(ruc) {
  const valor = ruc && ruc !== 'all' ? String(ruc) : null;
  empresaActiva.value = valor;
  try {
    if (valor) localStorage.setItem(CLAVE, valor);
    else localStorage.removeItem(CLAVE);
  } catch (e) { /* storage bloqueado: queda solo en memoria */ }
}

/** Sincroniza desde la URL al montar una vista (?empresa=RUC gana al storage). */
export function sincronizarDesdeQuery(query) {
  if (query && Object.prototype.hasOwnProperty.call(query, 'empresa')) {
    establecerEmpresaActiva(query.empresa);
  }
}

// Otra pestaña cambió la empresa: reflejarlo acá también (un solo listener)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVE) empresaActiva.value = leer();
  });
}

export function useEmpresaActiva() {
  return {
    empresaActiva,
    filtrandoPorEmpresa: computed(() => Boolean(empresaActiva.value)),
    establecerEmpresaActiva,
    sincronizarDesdeQuery
  };
}
