/**
 * Formateo y catálogos compartidos por todas las vistas.
 */

const SIMBOLO = { PYG: 'Gs.', USD: 'US$', BRL: 'R$', EUR: '€', ARS: 'AR$' };
const DECIMALES = { PYG: 0 };

/** Monto con su moneda: "US$ 532.750,00" / "Gs. 3.196.500.000". */
export function formatMonto(monto, moneda = 'PYG') {
  const m = String(moneda || 'PYG').toUpperCase();
  const n = Number(monto);
  if (!Number.isFinite(n)) return '-';
  const dec = DECIMALES[m] ?? 2;
  const numero = new Intl.NumberFormat('es-PY', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);
  return `${SIMBOLO[m] || m} ${numero}`;
}

export function formatNumero(n) {
  return Number.isFinite(Number(n)) ? new Intl.NumberFormat('es-PY').format(Number(n)) : '-';
}

export function formatFecha(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatFechaHora(valor) {
  if (!valor) return '-';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "hace 3 h", "hace 2 d" — para columnas de fecha compactas. */
export function hace(valor) {
  if (!valor) return '';
  const ms = Date.now() - new Date(valor).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/** Catálogo único de estados SIFEN → etiqueta, color e icono. */
export const ESTADOS = {
  aceptado:   { etiqueta: 'Aprobado',     color: 'success', icono: 'mdi-check-circle' },
  observado:  { etiqueta: 'Observado',    color: 'amber',   icono: 'mdi-alert-circle-check' },
  cancelado:  { etiqueta: 'Cancelado',    color: 'grey-darken-1', icono: 'mdi-cancel' },
  rechazado:  { etiqueta: 'Rechazado',    color: 'error',   icono: 'mdi-close-circle' },
  error:      { etiqueta: 'Error',        color: 'error',   icono: 'mdi-alert-octagon' },
  encolado:   { etiqueta: 'En cola',      color: 'info',    icono: 'mdi-tray-full' },
  enviado:    { etiqueta: 'Enviado',      color: 'info',    icono: 'mdi-send' },
  procesando: { etiqueta: 'Procesando',   color: 'warning', icono: 'mdi-timer-sand' },
  recibido:   { etiqueta: 'Recibido',     color: 'grey',    icono: 'mdi-inbox' }
};

export function estadoInfo(estado) {
  return ESTADOS[estado] || { etiqueta: estado || '-', color: 'grey', icono: 'mdi-help-circle' };
}

export const OPCIONES_ESTADO = Object.entries(ESTADOS).map(([value, e]) => ({ value, title: e.etiqueta }));

export const TIPOS_DE = [
  'Factura electrónica',
  'Factura electrónica de exportación',
  'Factura electrónica de importación',
  'Autofactura electrónica',
  'Nota de crédito electrónica',
  'Nota de débito electrónica',
  'Nota de remisión electrónica',
  'Comprobante de retención electrónico'
];

/** Abreviatura del tipo de documento para columnas angostas. */
export function tipoCorto(de) {
  const t = String(de || 'Factura electrónica');
  if (/cr[ée]dito/i.test(t)) return 'NC';
  if (/d[ée]bito/i.test(t)) return 'ND';
  if (/remisi/i.test(t)) return 'NR';
  if (/autofactura/i.test(t)) return 'AF';
  if (/retenci/i.test(t)) return 'CR';
  if (/exportaci/i.test(t)) return 'FE-X';
  if (/importaci/i.test(t)) return 'FE-I';
  return 'FE';
}

export function procesoInfo(proceso) {
  if (proceso === 'Completado') return { etiqueta: 'XML + PDF', color: 'success', icono: 'mdi-file-check' };
  if (proceso === 'No completado') return { etiqueta: 'Incompleto', color: 'error', icono: 'mdi-file-alert' };
  return { etiqueta: 'Pendiente', color: 'warning', icono: 'mdi-file-clock' };
}

/** Formato "0580 0557 8320 …" para leer un CDC de 44 dígitos. */
export function cdcAgrupado(cdc) {
  return String(cdc || '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

export const URL_CONSULTA_SIFEN = 'https://ekuatia.set.gov.py/consultas/';
