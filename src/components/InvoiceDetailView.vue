<template>
  <v-container fluid>
    <v-skeleton-loader v-if="cargando && !invoice._id" type="article, table"></v-skeleton-loader>

    <v-alert v-else-if="noEncontrada" type="warning" variant="tonal" prominent>
      <div class="text-h6">Documento no encontrado</div>
      <div>No existe o no pertenece a tus empresas.</div>
      <v-btn class="mt-3" variant="tonal" prepend-icon="mdi-arrow-left" @click="router.push('/invoices')">Volver al listado</v-btn>
    </v-alert>

    <template v-else>
      <!-- ===================== Cabecera ===================== -->
      <v-card class="mb-4">
        <v-card-title class="d-flex align-center flex-wrap ga-2">
          <v-btn icon="mdi-arrow-left" variant="text" size="small" @click="router.push('/invoices')"><v-tooltip activator="parent">Volver</v-tooltip></v-btn>
          <div>
            <div class="d-flex align-center ga-2">
              <span class="text-h6 text-mono">{{ invoice.correlativo }}</span>
              <v-chip size="small" variant="outlined" color="primary" label>{{ invoice.de || 'Factura electrónica' }}</v-chip>
              <v-chip v-if="invoice.tipoEmision === 2" size="small" color="red" variant="flat" label>Contingencia</v-chip>
            </div>
            <div class="text-caption text-medium-emphasis">Emitida {{ formatFechaHora(fechaEmision) }} · {{ hace(invoice.fechaCreacion) }} el último envío</div>
          </div>
          <v-spacer></v-spacer>
          <v-chip :color="estadoInfo(estado).color" variant="flat" :prepend-icon="estadoInfo(estado).icono">{{ estadoInfo(estado).etiqueta }}</v-chip>
        </v-card-title>

        <v-card-text class="d-flex flex-wrap ga-2 pt-0">
          <v-btn color="info" variant="tonal" prepend-icon="mdi-cloud-sync" :loading="refreshingStatus" :disabled="!invoice.cdc" @click="refreshStatus">Consultar estado</v-btn>
          <v-btn color="success" variant="tonal" prepend-icon="mdi-file-xml-box" :disabled="!invoice.xmlPath" @click="descargar('xml')">XML</v-btn>
          <v-btn color="error" variant="tonal" prepend-icon="mdi-file-pdf-box" :disabled="!invoice.kudePath" @click="descargar('pdf')">PDF (KUDE)</v-btn>
          <v-btn v-if="elegible.reintento.ok" color="warning" variant="tonal" prepend-icon="mdi-reload" :loading="reintentando" @click="dialogoReintento = true">Reintentar emisión</v-btn>
          <v-btn v-if="elegible.cancelacion.ok" color="deep-orange" variant="tonal" prepend-icon="mdi-cancel" @click="abrirEvento('cancelacion')">
            Cancelar en SET
            <v-tooltip activator="parent">{{ elegible.cancelacion.texto }}</v-tooltip>
          </v-btn>
          <v-btn v-if="elegible.eliminacion.ok" color="error" variant="text" prepend-icon="mdi-delete" @click="dialogoEliminar = true">Eliminar registro</v-btn>
        </v-card-text>

        <v-alert v-if="invoice.mensajeRetorno && estado !== 'aceptado'" :type="estado === 'observado' ? 'warning' : 'error'" variant="tonal" density="compact" class="mx-4 mb-4">
          <strong>{{ invoice.codigoRetorno }}</strong> — {{ invoice.mensajeRetorno }}
        </v-alert>
      </v-card>

      <v-row>
        <!-- ===================== Datos del documento ===================== -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="h-100">
            <v-card-title class="text-subtitle-1">Documento</v-card-title>
            <v-card-text>
              <v-table density="compact" class="tabla-datos">
                <tbody>
                  <tr><th>Total</th><td class="text-h6">{{ formatMonto(invoice.total, moneda) }}<span v-if="moneda !== 'PYG' && tipoCambio" class="text-caption text-medium-emphasis ml-2">TC {{ formatNumero(tipoCambio) }} → {{ formatMonto(invoice.total * tipoCambio, 'PYG') }}</span></td></tr>
                  <tr><th>Fecha de emisión</th><td>{{ formatFechaHora(fechaEmision) }}</td></tr>
                  <tr v-if="invoice.fechaEnvio"><th>Último envío</th><td>{{ formatFechaHora(invoice.fechaEnvio) }}</td></tr>
                  <tr v-if="invoice.fechaProceso"><th>Procesado por SET</th><td>{{ invoice.fechaProceso }}</td></tr>
                  <tr><th>Código SET</th><td>{{ invoice.codigoRetorno || '-' }} <span class="text-medium-emphasis">{{ invoice.mensajeRetorno }}</span></td></tr>
                  <tr v-if="invoice.protocolo"><th>Protocolo SET</th><td class="text-mono">{{ invoice.protocolo }}<v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" class="ml-1" @click="copiar(invoice.protocolo, 'Protocolo')">Copiar</v-btn></td></tr>
                  <tr><th>Archivos</th><td><v-chip size="small" :color="procesoInfo(invoice.proceso).color" variant="tonal" :prepend-icon="procesoInfo(invoice.proceso).icono">{{ procesoInfo(invoice.proceso).etiqueta }}</v-chip></td></tr>
                  <tr v-if="invoice.grupoLoteId"><th>Lote</th><td><router-link :to="`/lotes/${invoice.grupoLoteId}`" class="text-mono text-caption">{{ invoice.grupoLoteId }}</router-link></td></tr>
                  <tr><th>Emisor</th><td>{{ invoice.rucEmpresa || '-' }}</td></tr>
                  <tr v-if="invoice.cdc">
                    <th>CDC</th>
                    <td>
                      <div class="text-mono">{{ cdcAgrupado(invoice.cdc) }}</div>
                      <v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" @click="copiar(invoice.cdc, 'CDC')">Copiar</v-btn>
                      <v-btn size="x-small" variant="text" prepend-icon="mdi-open-in-new" :href="URL_CONSULTA_SIFEN" target="_blank">Consultar en e-Kuatia</v-btn>
                    </td>
                  </tr>
                  <tr v-if="invoice.digestValue"><th>Digest</th><td class="text-mono text-caption" style="word-break: break-all">{{ invoice.digestValue }}</td></tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- ===================== Cliente ===================== -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="h-100">
            <v-card-title class="text-subtitle-1">Cliente</v-card-title>
            <v-card-text>
              <v-table density="compact" class="tabla-datos">
                <tbody>
                  <tr><th>Nombre</th><td>{{ invoice.cliente?.nombre || invoice.cliente?.razonSocial || '-' }}</td></tr>
                  <tr><th>RUC / Documento</th><td>{{ invoice.cliente?.ruc || invoice.cliente?.documentoNumero || '-' }}</td></tr>
                  <tr v-if="invoice.cliente?.direccion"><th>Dirección</th><td>{{ invoice.cliente.direccion }}</td></tr>
                  <tr v-if="invoice.cliente?.telefono"><th>Teléfono</th><td>{{ invoice.cliente.telefono }}</td></tr>
                  <tr v-if="invoice.cliente?.email"><th>Email</th><td>{{ invoice.cliente.email }}</td></tr>
                </tbody>
              </v-table>

              <template v-if="documentoAsociado">
                <div class="text-subtitle-2 mt-4 mb-1">Documento asociado</div>
                <div class="text-mono text-caption">{{ cdcAgrupado(documentoAsociado) }}</div>
                <v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" @click="copiar(documentoAsociado, 'CDC asociado')">Copiar</v-btn>
              </template>

              <template v-if="items.length">
                <div class="text-subtitle-2 mt-4 mb-1">Ítems ({{ items.length }})</div>
                <v-table density="compact">
                  <thead><tr><th>Código</th><th>Descripción</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">Subtotal</th></tr></thead>
                  <tbody>
                    <tr v-for="(it, i) in items" :key="i">
                      <td class="text-mono text-caption">{{ it.codigo }}</td>
                      <td>{{ it.descripcion }}</td>
                      <td class="text-end">{{ formatNumero(it.cantidad) }}</td>
                      <td class="text-end">{{ formatMonto(it.precioUnitario, moneda) }}</td>
                      <td class="text-end">{{ formatMonto((it.cantidad || 0) * (it.precioUnitario || 0), moneda) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </template>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- ===================== Eventos SIFEN ===================== -->
      <v-card v-if="invoice.cdc && ['aceptado', 'observado', 'cancelado'].includes(estado)" class="mt-4" variant="outlined">
        <v-card-title class="text-subtitle-1 d-flex align-center">
          Eventos SIFEN
          <v-chip class="ml-2" size="small" variant="tonal">{{ eventos.length }}</v-chip>
          <v-spacer></v-spacer>
          <v-btn color="primary" variant="tonal" size="small" prepend-icon="mdi-plus" @click="abrirEvento()">Registrar evento</v-btn>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="elegible.cancelacion.ok" type="info" variant="tonal" density="compact" class="mb-3">
            {{ elegible.cancelacion.texto }}
          </v-alert>
          <v-data-table v-if="eventos.length" :headers="eventoHeaders" :items="eventos" density="compact" items-per-page="-1" hide-default-footer>
            <template #item.tipoEvento="{ item }">
              <v-chip :color="getTipoEventoColor(item.tipoEvento)" size="small" variant="flat">{{ getTipoEventoNombre(item.tipoEvento) }}</v-chip>
            </template>
            <template #item.estadoEvento="{ item }">
              <v-chip :color="getEstadoEventoColor(item.estadoEvento)" size="small" variant="tonal">{{ item.estadoEvento }}</v-chip>
            </template>
            <template #item.createdAt="{ item }">{{ formatFechaHora(item.createdAt) }}</template>
            <template #item.codigoRetorno="{ item }"><span class="text-mono">{{ item.codigoRetorno }}</span> {{ item.mensajeRetorno }}</template>
          </v-data-table>
          <div v-else class="text-medium-emphasis">Sin eventos registrados para este documento.</div>
        </v-card-text>
      </v-card>

      <!-- ===================== Registros ===================== -->
      <v-card class="mt-4" variant="outlined">
        <v-card-title class="text-subtitle-1">Registros de operación</v-card-title>
        <v-card-text>
          <v-data-table :headers="logHeaders" :items="logs" density="compact" :items-per-page="10">
            <template #item.tipoOperacion="{ item }">
              <v-chip :color="getLogStatusColor(item.tipoOperacion, item.estado)" size="small" variant="tonal">{{ item.tipoOperacion }}</v-chip>
            </template>
            <template #item.fecha="{ item }">{{ formatFechaHora(item.fecha) }}</template>
            <template #item.detalle="{ item }">
              <v-btn v-if="item.detalle && Object.keys(item.detalle).length" size="x-small" variant="text" @click="verDetalle(item)">ver</v-btn>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- ===================== Datos técnicos ===================== -->
      <v-expansion-panels class="mt-4" variant="accordion">
        <v-expansion-panel title="Payload de emisión (JSON)">
          <v-expansion-panel-text>
            <div class="d-flex justify-end mb-1"><v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" @click="copiar(JSON.stringify(invoice.datosFactura, null, 2), 'JSON')">Copiar</v-btn></div>
            <pre class="bloque">{{ JSON.stringify(invoice.datosFactura, null, 2) }}</pre>
          </v-expansion-panel-text>
        </v-expansion-panel>
        <v-expansion-panel title="XML firmado">
          <v-expansion-panel-text>
            <template v-if="invoice.xmlContent">
              <div class="d-flex justify-end mb-1"><v-btn size="x-small" variant="text" prepend-icon="mdi-content-copy" @click="copiar(invoice.xmlContent, 'XML')">Copiar</v-btn></div>
              <pre class="bloque">{{ invoice.xmlContent }}</pre>
            </template>
            <v-alert v-else type="info" variant="tonal" density="compact">El XML se genera cuando el documento se procesa.</v-alert>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <!-- ===================== Diálogos ===================== -->
    <v-dialog v-model="dialogoEvento" max-width="600" persistent>
      <v-card>
        <v-card-title class="bg-primary"><v-icon start>mdi-bell-plus</v-icon>Registrar evento en SET</v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">Los eventos son irreversibles una vez registrados en SET.</v-alert>
          <v-form ref="formEvento" @submit.prevent="enviarEvento">
            <v-select v-model="nuevoEvento.tipoEvento" :items="tiposEvento" label="Tipo de evento *" variant="outlined" density="compact" :rules="[requerido]" :hint="hintEvento" persistent-hint class="mb-2"></v-select>
            <v-textarea v-model="nuevoEvento.descripcion" label="Motivo *" variant="outlined" rows="3" counter="150" maxlength="150" :rules="[requerido, minimo5]"></v-textarea>
            <v-row dense>
              <v-col cols="7"><v-text-field v-model="nuevoEvento.usuarioNombre" label="Registrado por" variant="outlined" density="compact"></v-text-field></v-col>
              <v-col cols="5"><v-text-field v-model="nuevoEvento.usuarioDocumento" label="CI / RUC" variant="outlined" density="compact"></v-text-field></v-col>
            </v-row>
            <template v-if="nuevoEvento.tipoEvento === 'cancelacion'">
              <v-alert type="error" variant="tonal" density="compact" class="mb-2">
                Vas a cancelar en SET el documento <strong class="text-mono">{{ invoice.correlativo }}</strong> ({{ invoice.de }}, {{ formatMonto(invoice.total, moneda) }}). No se puede revertir.
              </v-alert>
              <v-text-field
                v-model="nuevoEvento.confirmacion"
                :label="`Escribí ${invoice.correlativo} para confirmar *`"
                variant="outlined" density="compact" autocomplete="off"
                :rules="[v => String(v || '').trim() === invoice.correlativo || 'Tiene que coincidir exactamente con el número del documento']"
              ></v-text-field>
            </template>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="enviandoEvento" @click="dialogoEvento = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="enviandoEvento" :disabled="nuevoEvento.tipoEvento === 'cancelacion' && nuevoEvento.confirmacion.trim() !== invoice.correlativo" @click="enviarEvento">Enviar a SET</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoReintento" max-width="480" persistent>
      <v-card>
        <v-card-title class="bg-warning"><v-icon start>mdi-reload</v-icon>Reintentar emisión</v-card-title>
        <v-card-text class="pt-4">
          Se vuelve a generar y firmar el documento <strong>{{ invoice.correlativo }}</strong> con los datos guardados y se envía a SET por el canal configurado en la empresa. Conserva su numeración.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="reintentando" @click="dialogoReintento = false">Volver</v-btn>
          <v-btn color="warning" variant="flat" :loading="reintentando" @click="reintentar">Reintentar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoEliminar" max-width="480" persistent>
      <v-card>
        <v-card-title class="bg-error"><v-icon start>mdi-delete</v-icon>Eliminar registro</v-card-title>
        <v-card-text class="pt-4">
          <p>El documento <strong>{{ invoice.correlativo }}</strong> nunca existió en SET (estado {{ estado }}); se borra solo de este sistema. No se puede deshacer.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="eliminando" @click="dialogoEliminar = false">Volver</v-btn>
          <v-btn color="error" variant="flat" :loading="eliminando" @click="eliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="dialogoDetalle" max-width="720">
      <v-card>
        <v-card-title class="text-subtitle-1">Detalle del registro</v-card-title>
        <v-card-text><pre class="bloque">{{ JSON.stringify(detalleLog, null, 2) }}</pre></v-card-text>
        <v-card-actions><v-spacer></v-spacer><v-btn variant="text" @click="dialogoDetalle = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { descargarGet, mensajeDeErrorBlob } from '../utils/descargas';
import { formatMonto, formatNumero, formatFechaHora, hace, estadoInfo, procesoInfo, cdcAgrupado, URL_CONSULTA_SIFEN } from '../utils/formato';
import { usuarioActual } from '../auth';

const TIPOS_EVENTO = [
  { title: 'Cancelación — anular el documento (solo emisor, dentro del plazo)', value: 'cancelacion' },
  { title: 'Conformidad — el receptor confirma que está correcto', value: 'conformidad' },
  { title: 'Disconformidad — el receptor reporta errores', value: 'disconformidad' },
  { title: 'Desconocimiento — el receptor desconoce la operación', value: 'desconocimiento' },
  { title: 'Notificación de recepción — acuse de recibo', value: 'notificacion_recepcion' }
];

export default {
  name: 'InvoiceDetailView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const invoice = ref({});
    const logs = ref([]);
    const eventos = ref([]);
    const cargando = ref(true);
    const noEncontrada = ref(false);
    const refreshingStatus = ref(false);
    const reintentando = ref(false);
    const eliminando = ref(false);
    const enviandoEvento = ref(false);
    const dialogoEvento = ref(false);
    const dialogoReintento = ref(false);
    const dialogoEliminar = ref(false);
    const dialogoDetalle = ref(false);
    const detalleLog = ref(null);
    const formEvento = ref(null);
    const nuevoEvento = ref({ tipoEvento: '', descripcion: '', usuarioNombre: '', usuarioDocumento: '', confirmacion: '' });

    const estado = computed(() => invoice.value.estado || invoice.value.estadoSifen || '');
    const datos = computed(() => invoice.value.datosFactura?.data || {});
    const moneda = computed(() => datos.value.moneda || 'PYG');
    const tipoCambio = computed(() => Number(datos.value.cambio) || null);
    const fechaEmision = computed(() => datos.value.fecha || invoice.value.fechaCreacion);
    const items = computed(() => Array.isArray(datos.value.items) ? datos.value.items : []);
    const documentoAsociado = computed(() => datos.value.documentoAsociado?.cdc || null);

    // Espejo de la elegibilidad del backend (él la impone; esto decide qué botones mostrar)
    const elegible = computed(() => {
      const e = estado.value;
      const enSet = ['aceptado', 'observado', 'cancelado'].includes(e) && invoice.value.cdc;
      const enCurso = ['encolado', 'procesando', 'enviado'].includes(e);
      const tieneDatos = Object.keys(datos.value).length > 0;
      const reintento = { ok: !enSet && !enCurso && tieneDatos };
      const eliminacion = { ok: ['rechazado', 'error', 'recibido'].includes(e) };
      let cancelacion = { ok: false, texto: '' };
      if (['aceptado', 'observado'].includes(e) && invoice.value.cdc) {
        const esFactura = /\bfactura/i.test(invoice.value.de || 'Factura electrónica');
        const limite = esFactura ? 48 : 168;
        const desde = new Date(invoice.value.fechaProceso || invoice.value.updatedAt).getTime();
        const transcurridas = Number.isFinite(desde) ? (Date.now() - desde) / 3600000 : 0;
        const restantes = limite - transcurridas;
        cancelacion = restantes > 0
          ? { ok: true, texto: `Se puede cancelar en SET durante ${restantes < 1 ? Math.round(restantes * 60) + ' min' : Math.floor(restantes) + ' h'} más (plazo de ${limite} h desde la aprobación).` }
          : { ok: false, texto: `Plazo de cancelación vencido (${limite} h). Para anularlo corresponde una Nota de Crédito.` };
      }
      return { reintento, cancelacion, eliminacion };
    });

    const hintEvento = computed(() => nuevoEvento.value.tipoEvento === 'cancelacion' ? elegible.value.cancelacion.texto : '');

    const logHeaders = [
      { title: 'Fecha', key: 'fecha', width: 150 },
      { title: 'Tipo', key: 'tipoOperacion', width: 170 },
      { title: 'Descripción', key: 'descripcion' },
      { title: '', key: 'detalle', sortable: false, width: 60 }
    ];
    const eventoHeaders = [
      { title: 'Tipo', key: 'tipoEvento', width: 170 },
      { title: 'Motivo', key: 'descripcion' },
      { title: 'Estado', key: 'estadoEvento', width: 120 },
      { title: 'Fecha', key: 'createdAt', width: 150 },
      { title: 'Respuesta SET', key: 'codigoRetorno' }
    ];

    const getTipoEventoColor = (tipo) => ({ cancelacion: 'red', conformidad: 'green', disconformidad: 'orange', desconocimiento: 'purple', notificacion_recepcion: 'blue', devolucion_ajuste: 'amber' }[tipo] || 'grey');
    const getTipoEventoNombre = (tipo) => ({ cancelacion: 'Cancelación', conformidad: 'Conformidad', disconformidad: 'Disconformidad', desconocimiento: 'Desconocimiento', notificacion_recepcion: 'Notificación de recepción', devolucion_ajuste: 'Devolución/Ajuste' }[tipo] || tipo);
    const getEstadoEventoColor = (e) => ({ registrado: 'success', enviado: 'info', rechazado: 'error', error: 'error' }[e] || 'grey');
    const getLogStatusColor = (tipo, e) => e === 'error' ? 'error' : e === 'warning' ? 'warning' : (['envio_exitoso', 'inicio_proceso', 'consulta_estado'].includes(tipo) ? 'success' : ['envio_sifen', 'respuesta_sifen', 'envio_lote', 'encolado_lote'].includes(tipo) ? 'primary' : 'info');

    const requerido = (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Obligatorio';
    const minimo5 = (v) => String(v || '').trim().length >= 5 || 'Mínimo 5 caracteres';

    // ---------------- Carga ----------------
    const loadInvoice = async () => {
      try {
        const { data } = await axios.get(`/api/invoices/${route.params.id}`);
        invoice.value = data.data || data;
        noEncontrada.value = false;
      } catch (error) {
        if (error.response?.status === 404) noEncontrada.value = true;
        else notificar.error(`No se pudo cargar el documento: ${mensajeDeError(error)}`);
      }
    };
    const loadLogs = async () => {
      try {
        const { data } = await axios.get(`/api/invoices/${route.params.id}/logs`);
        logs.value = Array.isArray(data) ? data : (data.logs || data.data || []);
      } catch (error) { /* los registros son complementarios */ }
    };
    const loadEventos = async () => {
      try {
        const { data } = await axios.get(`/api/invoices/${route.params.id}/eventos`);
        eventos.value = data.eventos || data.data || [];
      } catch (error) { /* ídem */ }
    };
    const cargarTodo = async () => {
      cargando.value = true;
      await Promise.all([loadInvoice(), loadLogs(), loadEventos()]);
      cargando.value = false;
    };

    // ---------------- Acciones ----------------
    const copiar = async (texto, que) => {
      try { await navigator.clipboard.writeText(texto); notificar.exito(`${que} copiado`); }
      catch (e) { notificar.aviso('No se pudo copiar al portapapeles'); }
    };

    const descargar = async (tipo) => {
      try {
        await descargarGet(`/api/invoices/${route.params.id}/download-${tipo}`, `${invoice.value.correlativo}.${tipo}`);
        notificar.exito(`${tipo.toUpperCase()} descargado`);
      } catch (error) {
        notificar.error(`No se pudo descargar el ${tipo.toUpperCase()}: ${await mensajeDeErrorBlob(error)}`);
      }
    };

    const refreshStatus = async () => {
      refreshingStatus.value = true;
      try {
        const { data } = await axios.post(`/api/invoices/${route.params.id}/refresh-status`);
        if (data.estadoCambio) notificar.exito(`Estado actualizado: ${data.estadoAnterior} → ${data.estadoActual}`);
        else if (!data.consultoSET) notificar.info(`Estado final (${data.estadoActual}): no hace falta consultar a SET`);
        else notificar.info(`Sin cambios: ${data.estadoActual}`);
        await cargarTodo();
      } catch (error) {
        notificar.error(mensajeDeError(error));
        await cargarTodo();
      } finally {
        refreshingStatus.value = false;
      }
    };

    const reintentar = async () => {
      reintentando.value = true;
      try {
        const { data } = await axios.post(`/api/invoices/${route.params.id}/retry`);
        dialogoReintento.value = false;
        notificar.exito(`${data.message || 'Reintento encolado'}${data.data?.correlativo ? ` (${data.data.correlativo})` : ''}`);
        if (data.data?.facturaId && String(data.data.facturaId) !== String(route.params.id)) {
          router.push(`/invoices/${data.data.facturaId}`);
        } else {
          await cargarTodo();
        }
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        reintentando.value = false;
      }
    };

    const eliminar = async () => {
      eliminando.value = true;
      try {
        const { data } = await axios.delete(`/api/invoices/${route.params.id}`);
        notificar.exito(data.message || 'Registro eliminado');
        router.push('/invoices');
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        eliminando.value = false;
        dialogoEliminar.value = false;
      }
    };

    const abrirEvento = (tipo = '') => {
      const yo = usuarioActual();
      nuevoEvento.value = { tipoEvento: tipo, descripcion: '', usuarioNombre: yo ? `${yo.nombre || ''} ${yo.apellido || ''}`.trim() : '', usuarioDocumento: '', confirmacion: '' };
      dialogoEvento.value = true;
      formEvento.value?.resetValidation();
    };

    const enviarEvento = async () => {
      const { valid } = await formEvento.value.validate();
      if (!valid) return;
      if (nuevoEvento.value.tipoEvento === 'cancelacion' && nuevoEvento.value.confirmacion.trim() !== invoice.value.correlativo) return;
      enviandoEvento.value = true;
      try {
        const body = { invoiceId: route.params.id, tipoEvento: nuevoEvento.value.tipoEvento, descripcion: nuevoEvento.value.descripcion.trim() };
        if (nuevoEvento.value.usuarioNombre || nuevoEvento.value.usuarioDocumento) {
          body.usuario = { nombre: nuevoEvento.value.usuarioNombre || 'Sistema', documentoNumero: nuevoEvento.value.usuarioDocumento || '0' };
        }
        const { data } = await axios.post('/api/eventos/enviar', body);
        dialogoEvento.value = false;
        const r = data.data || {};
        if (r.codigoRetorno === '0600' || r.estadoEvento === 'registrado') notificar.exito(`Evento ${getTipoEventoNombre(body.tipoEvento)} registrado en SET`);
        else notificar.aviso(`SET respondió ${r.codigoRetorno || ''}: ${r.mensajeRetorno || data.message}`);
        await cargarTodo();
      } catch (error) {
        notificar.error(`No se pudo registrar el evento: ${mensajeDeError(error)}`);
      } finally {
        enviandoEvento.value = false;
      }
    };

    const verDetalle = (log) => { detalleLog.value = log.detalle; dialogoDetalle.value = true; };

    onMounted(cargarTodo);
    watch(() => route.params.id, (nuevo, viejo) => { if (nuevo && nuevo !== viejo) cargarTodo(); });

    return {
      router, invoice, logs, eventos, cargando, noEncontrada, estado, moneda, tipoCambio, fechaEmision, items, documentoAsociado, elegible,
      refreshingStatus, reintentando, eliminando, enviandoEvento,
      dialogoEvento, dialogoReintento, dialogoEliminar, dialogoDetalle, detalleLog, formEvento, nuevoEvento, tiposEvento: TIPOS_EVENTO, hintEvento,
      logHeaders, eventoHeaders, getTipoEventoColor, getTipoEventoNombre, getEstadoEventoColor, getLogStatusColor, requerido, minimo5,
      formatMonto, formatNumero, formatFechaHora, hace, estadoInfo, procesoInfo, cdcAgrupado, URL_CONSULTA_SIFEN,
      copiar, descargar, refreshStatus, reintentar, eliminar, abrirEvento, enviarEvento, verDetalle
    };
  }
};
</script>

<style scoped>
.text-mono { font-family: 'Courier New', Courier, monospace; }
.tabla-datos th { text-align: left; width: 160px; color: rgba(0,0,0,.6); font-weight: 500; }
.bloque { white-space: pre-wrap; word-break: break-all; max-height: 520px; overflow: auto; background: rgba(0,0,0,.04); padding: 12px; border-radius: 6px; font-size: 12px; }
</style>
