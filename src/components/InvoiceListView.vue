<template>
  <v-container fluid>
    <v-card>
      <!-- ===================== Cabecera y filtros ===================== -->
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <div class="d-flex align-center">
          <v-icon start>mdi-file-document-multiple</v-icon>
          <span class="text-h6">Documentos</span>
          <v-chip class="ml-3" size="small" variant="tonal" color="primary">{{ total }} en total</v-chip>
        </div>
        <v-spacer></v-spacer>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadInvoices">Actualizar</v-btn>
        <v-btn variant="tonal" color="primary" prepend-icon="mdi-file-excel" :loading="exportando" @click="exportarCsv">
          Exportar CSV
        </v-btn>
      </v-card-title>

      <v-card-text class="pb-0">
        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filtros.search"
              prepend-inner-icon="mdi-magnify"
              :label="`Buscar por ${searchTypeLabel}`"
              variant="outlined" density="compact" hide-details clearable
            ></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filtros.searchType" :items="searchTypes" label="Campo"
              variant="outlined" density="compact" hide-details
            ></v-select>
          </v-col>
          <v-col cols="6" md="3">
            <v-select
              v-model="filtros.estado" :items="opcionesEstado" label="Estado" multiple chips closable-chips
              variant="outlined" density="compact" hide-details clearable
            ></v-select>
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filtros.de" :items="tiposDE" label="Tipo de documento"
              variant="outlined" density="compact" hide-details clearable
            ></v-select>
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="filtros.desde" type="date" label="Desde" variant="outlined" density="compact" hide-details clearable></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-text-field v-model="filtros.hasta" type="date" label="Hasta" variant="outlined" density="compact" hide-details clearable></v-text-field>
          </v-col>
          <v-col cols="6" md="2">
            <v-select
              v-model="filtros.tipoEmision" :items="[{ title: 'Normal', value: 1 }, { title: 'Contingencia', value: 2 }]"
              label="Emisión" variant="outlined" density="compact" hide-details clearable
            ></v-select>
          </v-col>
          <v-col cols="6" md="2" class="d-flex align-center">
            <v-btn variant="text" size="small" prepend-icon="mdi-filter-off" :disabled="!hayFiltros" @click="limpiarFiltros">Limpiar filtros</v-btn>
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center justify-end text-caption text-medium-emphasis">
            <template v-if="empresaActiva">Filtrando por la empresa RUC {{ empresaActiva }}</template>
            <template v-else>Todas las empresas</template>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- ===================== Barra de acciones masivas ===================== -->
      <v-expand-transition>
        <div v-if="seleccion.length" class="mx-4 mt-3">
          <v-sheet color="primary" variant="tonal" rounded class="pa-2 d-flex align-center flex-wrap ga-2">
            <v-chip color="primary" variant="flat" size="small">{{ seleccion.length }} seleccionado{{ seleccion.length === 1 ? '' : 's' }}</v-chip>

            <v-menu>
              <template #activator="{ props }">
                <v-btn v-bind="props" size="small" variant="flat" color="success" prepend-icon="mdi-download" append-icon="mdi-menu-down" :loading="ejecutando === 'zip'">
                  Descargar
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item prepend-icon="mdi-file-xml-box" title="XML" subtitle="Solo los XML firmados" @click="descargarZip(['xml'])"></v-list-item>
                <v-list-item prepend-icon="mdi-file-pdf-box" title="PDF (KUDE)" subtitle="Solo los PDF" @click="descargarZip(['pdf'])"></v-list-item>
                <v-list-item prepend-icon="mdi-folder-zip" title="XML + PDF" subtitle="Todo en un ZIP" @click="descargarZip(['xml', 'pdf'])"></v-list-item>
              </v-list>
            </v-menu>

            <v-btn size="small" variant="flat" color="info" prepend-icon="mdi-cloud-sync" :loading="ejecutando === 'refresh'" :disabled="!!ejecutando" @click="consultarEstadoMasivo">
              Consultar estado
              <v-tooltip activator="parent" location="bottom">Pregunta a SET el estado de los documentos que no están en estado final</v-tooltip>
            </v-btn>

            <v-btn size="small" variant="flat" color="warning" prepend-icon="mdi-reload" :disabled="!!ejecutando || elegibles.reintento === 0" :loading="ejecutando === 'retry'" @click="confirmar('retry')">
              Reintentar
              <v-chip v-if="elegibles.reintento" size="x-small" class="ml-1" variant="flat">{{ elegibles.reintento }}</v-chip>
            </v-btn>

            <v-btn size="small" variant="flat" color="deep-orange" prepend-icon="mdi-cancel" :disabled="!!ejecutando || elegibles.cancelacion === 0" :loading="ejecutando === 'cancel'" @click="confirmar('cancel')">
              Cancelar en SET
              <v-chip v-if="elegibles.cancelacion" size="x-small" class="ml-1" variant="flat">{{ elegibles.cancelacion }}</v-chip>
            </v-btn>

            <v-btn size="small" variant="flat" color="error" prepend-icon="mdi-delete" :disabled="!!ejecutando || elegibles.eliminacion === 0" :loading="ejecutando === 'delete'" @click="confirmar('delete')">
              Eliminar
              <v-chip v-if="elegibles.eliminacion" size="x-small" class="ml-1" variant="flat">{{ elegibles.eliminacion }}</v-chip>
            </v-btn>

            <v-spacer></v-spacer>
            <v-btn size="small" variant="text" prepend-icon="mdi-close" @click="seleccion = []">Quitar selección</v-btn>
          </v-sheet>
        </div>
      </v-expand-transition>

      <!-- ===================== Tabla ===================== -->
      <v-card-text>
        <v-data-table-server
          v-model="seleccion"
          v-model:items-per-page="itemsPerPage"
          v-model:page="currentPage"
          v-model:sort-by="sortBy"
          :headers="headers"
          :items="invoices"
          :items-length="total"
          :loading="loading"
          item-value="_id"
          show-select
          :items-per-page-options="[10, 25, 50, 100, 200]"
          items-per-page-text="Por página"
          :no-data-text="hayFiltros ? 'No hay documentos que coincidan con los filtros' : 'No hay documentos registrados'"
          loading-text="Cargando documentos..."
          density="comfortable"
          class="elevation-1"
          @update:options="onOptions"
        >
          <template #item.fechaCreacion="{ item }">
            <div class="text-no-wrap">{{ formatFechaHora(item.fechaCreacion) }}</div>
            <div class="text-caption text-medium-emphasis">{{ hace(item.fechaCreacion) }}</div>
          </template>

          <template #item.correlativo="{ item }">
            <router-link :to="`/invoices/${item._id}`" class="text-decoration-none font-weight-medium text-mono">{{ item.correlativo }}</router-link>
            <div>
              <v-chip size="x-small" variant="outlined" color="primary" label>{{ tipoCorto(item.de) }}</v-chip>
              <v-chip v-if="item.tipoEmision === 2" size="x-small" color="red" variant="flat" class="ml-1" label>Contingencia</v-chip>
            </div>
          </template>

          <template #item.cliente="{ item }">
            <div class="text-truncate" style="max-width: 260px" :title="item.cliente?.nombre">{{ item.cliente?.nombre || '-' }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.cliente?.ruc || '' }}</div>
          </template>

          <template #item.total="{ item }">
            <span class="text-no-wrap">{{ formatMonto(item.total, item.moneda) }}</span>
            <div v-if="item.moneda && item.moneda !== 'PYG' && item.tipoCambio" class="text-caption text-medium-emphasis">TC {{ formatNumero(item.tipoCambio) }}</div>
          </template>

          <template #item.estado="{ item }">
            <v-chip :color="estadoInfo(item.estado).color" variant="flat" size="small" :prepend-icon="estadoInfo(item.estado).icono">
              {{ estadoInfo(item.estado).etiqueta }}
              <v-tooltip v-if="item.codigoRetorno" activator="parent" location="top" max-width="420">
                <strong>{{ item.codigoRetorno }}</strong> — {{ item.mensajeRetorno }}
              </v-tooltip>
            </v-chip>
            <div v-if="item.codigoRetorno && item.estado !== 'aceptado'" class="text-caption text-medium-emphasis text-truncate" style="max-width: 220px">{{ item.codigoRetorno }} {{ item.mensajeRetorno }}</div>
          </template>

          <template #item.proceso="{ item }">
            <v-icon :color="procesoInfo(item.proceso).color" size="small">{{ procesoInfo(item.proceso).icono }}</v-icon>
            <v-tooltip activator="parent" location="top">{{ procesoInfo(item.proceso).etiqueta }}</v-tooltip>
          </template>

          <template #item.empresa="{ item }">
            <span class="text-caption">{{ item.empresa?.nombre || item.rucEmpresa || '-' }}</span>
          </template>

          <template #item.actions="{ item }">
            <v-menu>
              <template #activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text"></v-btn>
              </template>
              <v-list density="compact" min-width="230">
                <v-list-item prepend-icon="mdi-eye" title="Ver detalle" @click="router.push(`/invoices/${item._id}`)"></v-list-item>
                <v-divider></v-divider>
                <v-list-item prepend-icon="mdi-file-xml-box" title="Descargar XML" :disabled="!item.tieneXml" @click="descargarUno(item, 'xml')"></v-list-item>
                <v-list-item prepend-icon="mdi-file-pdf-box" title="Descargar PDF" :disabled="!item.tienePdf" @click="descargarUno(item, 'pdf')"></v-list-item>
                <v-divider></v-divider>
                <v-list-item prepend-icon="mdi-cloud-sync" title="Consultar estado en SET" :disabled="!item.cdc" @click="consultarEstadoUno(item)"></v-list-item>
                <v-list-item prepend-icon="mdi-reload" title="Reintentar emisión" :subtitle="item.elegibilidad?.reintento?.ok ? '' : item.elegibilidad?.reintento?.motivo" :disabled="!item.elegibilidad?.reintento?.ok" @click="confirmar('retry', [item._id])"></v-list-item>
                <v-list-item prepend-icon="mdi-cancel" title="Cancelar en SET" :subtitle="item.elegibilidad?.cancelacion?.ok ? plazoTexto(item) : item.elegibilidad?.cancelacion?.motivo" :disabled="!item.elegibilidad?.cancelacion?.ok" @click="confirmar('cancel', [item._id])"></v-list-item>
                <v-divider></v-divider>
                <v-list-item prepend-icon="mdi-delete" title="Eliminar" class="text-error" :subtitle="item.elegibilidad?.eliminacion?.ok ? '' : item.elegibilidad?.eliminacion?.motivo" :disabled="!item.elegibilidad?.eliminacion?.ok" @click="confirmar('delete', [item._id])"></v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <!-- ===================== Confirmación de acción masiva ===================== -->
    <v-dialog v-model="dialogo.visible" max-width="560" persistent>
      <v-card>
        <v-card-title class="d-flex align-center" :class="`bg-${dialogo.color}`">
          <v-icon start>{{ dialogo.icono }}</v-icon>
          {{ dialogo.titulo }}
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">{{ dialogo.texto }}</p>
          <v-alert v-if="dialogo.omitidos.length" type="warning" variant="tonal" density="compact" class="mb-3">
            <div class="font-weight-medium mb-1">{{ dialogo.omitidos.length }} documento(s) se van a omitir:</div>
            <div v-for="o in dialogo.omitidos.slice(0, 6)" :key="o.id" class="text-caption">• {{ o.correlativo }} — {{ o.motivo }}</div>
            <div v-if="dialogo.omitidos.length > 6" class="text-caption">… y {{ dialogo.omitidos.length - 6 }} más</div>
          </v-alert>
          <template v-if="dialogo.accion === 'cancel'">
            <v-alert type="error" variant="tonal" density="compact" class="mb-3">
              <div class="font-weight-medium mb-1">Se van a cancelar en SET {{ dialogo.elegibles.length }} documento(s):</div>
              <div v-for="c in dialogo.correlativos.slice(0, 8)" :key="c" class="text-caption text-mono">• {{ c }}</div>
              <div v-if="dialogo.correlativos.length > 8" class="text-caption">… y {{ dialogo.correlativos.length - 8 }} más</div>
            </v-alert>
            <v-textarea
              v-model="dialogo.motivo"
              label="Motivo de la cancelación *"
              variant="outlined" rows="3" counter="150" maxlength="150"
              hint="Queda registrado en SET junto con el evento. Mínimo 5 caracteres."
              persistent-hint
              class="mb-2"
            ></v-textarea>
            <v-text-field
              v-model="dialogo.confirmacion"
              label="Escribí CANCELAR para confirmar *"
              variant="outlined" density="compact"
              hint="Una cancelación registrada en SET no se puede revertir."
              persistent-hint
              autocomplete="off"
            ></v-text-field>
          </template>
          <v-alert v-if="dialogo.accion === 'delete'" type="error" variant="tonal" density="compact">
            Solo se borran registros que nunca existieron en SET (rechazados o con error). Esta acción no se puede deshacer.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="!!ejecutando" @click="dialogo.visible = false">Volver</v-btn>
          <v-btn :color="dialogo.color" variant="flat" :loading="!!ejecutando" :disabled="dialogo.elegibles.length === 0 || (dialogo.accion === 'cancel' && (dialogo.motivo.trim().length < 5 || dialogo.confirmacion.trim().toUpperCase() !== 'CANCELAR'))" @click="ejecutarDialogo">
            {{ dialogo.boton }} ({{ dialogo.elegibles.length }})
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ===================== Resultado de acción masiva ===================== -->
    <v-dialog v-model="resultado.visible" max-width="720">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon start :color="resultado.fallidos ? 'warning' : 'success'">{{ resultado.fallidos ? 'mdi-alert' : 'mdi-check-circle' }}</v-icon>
          {{ resultado.titulo }}
          <v-spacer></v-spacer>
          <v-chip size="small" color="success" variant="tonal" class="mr-1">{{ resultado.ok }} ok</v-chip>
          <v-chip v-if="resultado.fallidos" size="small" color="error" variant="tonal">{{ resultado.fallidos }} con error</v-chip>
        </v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr><th>Documento</th><th>Resultado</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in resultado.filas" :key="r.id">
                <td class="text-mono">{{ r.correlativo || r.id }}</td>
                <td>
                  <v-icon :color="r.ok ? 'success' : 'error'" size="small">{{ r.ok ? 'mdi-check' : 'mdi-close' }}</v-icon>
                  <span v-if="r.estadoActual" class="ml-1 text-caption">{{ r.estadoAnterior && r.cambio ? `${r.estadoAnterior} → ` : '' }}{{ r.estadoActual }}</span>
                </td>
                <td class="text-caption">{{ r.mensaje }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="flat" color="primary" @click="resultado.visible = false">Cerrar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useEmpresaActiva } from '../composables/useEmpresaActiva';
import { notificar } from '../composables/useNotificaciones';
import { formatMonto, formatNumero, formatFechaHora, hace, estadoInfo, procesoInfo, tipoCorto, OPCIONES_ESTADO, TIPOS_DE } from '../utils/formato';
import { descargarGet, descargarPost, mensajeDeErrorBlob } from '../utils/descargas';
import { mensajeDeError } from '../utils/errores';

const SEARCH_TYPES = [
  { title: 'Todo', value: 'auto' },
  { title: 'Número', value: 'correlativo' },
  { title: 'CDC', value: 'cdc' },
  { title: 'RUC cliente', value: 'ruc' },
  { title: 'Cliente', value: 'nombre' },
  { title: 'ID', value: 'id' }
];

const SORT_KEYS = { fechaCreacion: 'fecha', correlativo: 'correlativo', total: 'total', estado: 'estado', cliente: 'cliente' };

export default {
  name: 'InvoiceListView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { empresaActiva, sincronizarDesdeQuery } = useEmpresaActiva();

    const invoices = ref([]);
    const total = ref(0);
    const loading = ref(false);
    const exportando = ref(false);
    const currentPage = ref(1);
    const itemsPerPage = ref(25);
    const sortBy = ref([{ key: 'fechaCreacion', order: 'desc' }]);
    const seleccion = ref([]);
    const ejecutando = ref(null); // 'zip' | 'refresh' | 'retry' | 'cancel' | 'delete' | null

    const filtros = reactive({ search: '', searchType: 'auto', estado: [], de: null, desde: '', hasta: '', tipoEmision: null });

    const headers = [
      { title: 'Fecha', key: 'fechaCreacion', width: 150 },
      { title: 'Número', key: 'correlativo', width: 160 },
      { title: 'Cliente', key: 'cliente', sortable: true },
      { title: 'Total', key: 'total', align: 'end', width: 150 },
      { title: 'Estado', key: 'estado', width: 170 },
      { title: '', key: 'proceso', sortable: false, width: 40, align: 'center' },
      { title: 'Empresa', key: 'empresa', sortable: false, width: 140 },
      { title: '', key: 'actions', sortable: false, width: 56, align: 'end' }
    ];

    const searchTypeLabel = computed(() => SEARCH_TYPES.find(t => t.value === filtros.searchType)?.title.toLowerCase() || 'todo');
    const hayFiltros = computed(() => Boolean(filtros.search || filtros.estado.length || filtros.de || filtros.desde || filtros.hasta || filtros.tipoEmision));

    // ---------------- Carga ----------------
    const paramsActuales = () => {
      const p = new URLSearchParams();
      p.set('page', currentPage.value);
      p.set('limit', itemsPerPage.value);
      if (filtros.search) { p.set('search', filtros.search); p.set('searchType', filtros.searchType); }
      if (filtros.estado.length) p.set('estado', filtros.estado.join(','));
      if (filtros.de) p.set('de', filtros.de);
      if (filtros.desde) p.set('desde', filtros.desde);
      if (filtros.hasta) p.set('hasta', filtros.hasta);
      if (filtros.tipoEmision) p.set('tipoEmision', filtros.tipoEmision);
      if (empresaActiva.value) p.set('rucEmpresa', empresaActiva.value);
      const orden = sortBy.value?.[0];
      if (orden && SORT_KEYS[orden.key]) { p.set('sort', SORT_KEYS[orden.key]); p.set('dir', orden.order === 'asc' ? 'asc' : 'desc'); }
      return p;
    };

    let peticion = 0;
    const loadInvoices = async () => {
      const mia = ++peticion;
      loading.value = true;
      try {
        const { data } = await axios.get(`/api/invoices?${paramsActuales()}`);
        if (mia !== peticion) return; // llegó una respuesta más nueva
        invoices.value = data.invoices || [];
        total.value = data.total || 0;
        // si la página quedó vacía (p.ej. tras borrar), volver a la última
        if (invoices.value.length === 0 && currentPage.value > 1 && total.value > 0) {
          currentPage.value = Math.max(1, Math.ceil(total.value / itemsPerPage.value));
        }
      } catch (error) {
        notificar.error(`No se pudieron cargar los documentos: ${mensajeDeError(error)}`);
      } finally {
        if (mia === peticion) loading.value = false;
      }
    };

    // La tabla server-side avisa página/orden/tamaño por acá. Vuetify lo emite
    // dos veces al montar (una por cada v-model que sincroniza): se ignora el eco.
    let ultimasOpciones = '';
    const onOptions = (opciones) => {
      const firma = JSON.stringify({ p: opciones?.page, n: opciones?.itemsPerPage, s: opciones?.sortBy });
      if (firma === ultimasOpciones) return;
      ultimasOpciones = firma;
      actualizarUrl();
      loadInvoices();
    };

    // ---------------- URL <-> filtros ----------------
    const actualizarUrl = () => {
      const q = {};
      if (filtros.search) { q.search = filtros.search; q.searchType = filtros.searchType; }
      if (filtros.estado.length) q.estado = filtros.estado.join(',');
      if (filtros.de) q.de = filtros.de;
      if (filtros.desde) q.desde = filtros.desde;
      if (filtros.hasta) q.hasta = filtros.hasta;
      if (filtros.tipoEmision) q.tipoEmision = filtros.tipoEmision;
      if (empresaActiva.value) q.empresa = empresaActiva.value;
      if (currentPage.value > 1) q.page = currentPage.value;
      if (itemsPerPage.value !== 25) q.limit = itemsPerPage.value;
      const orden = sortBy.value?.[0];
      if (orden && !(orden.key === 'fechaCreacion' && orden.order === 'desc')) { q.sort = orden.key; q.dir = orden.order; }
      router.replace({ query: q }).catch(() => {});
    };

    const leerUrl = () => {
      const q = route.query;
      sincronizarDesdeQuery(q);
      filtros.search = q.search || '';
      filtros.searchType = q.searchType || 'auto';
      filtros.estado = q.estado ? String(q.estado).split(',') : [];
      filtros.de = q.de || null;
      filtros.desde = q.desde || '';
      filtros.hasta = q.hasta || '';
      filtros.tipoEmision = q.tipoEmision ? Number(q.tipoEmision) : null;
      currentPage.value = parseInt(q.page) || 1;
      itemsPerPage.value = parseInt(q.limit) || 25;
      if (q.sort) sortBy.value = [{ key: q.sort, order: q.dir === 'asc' ? 'asc' : 'desc' }];
    };
    // Se lee ANTES de registrar los watchers: así la carga inicial la dispara
    // solo la tabla (update:options) y no cada filtro que se acaba de asignar.
    leerUrl();

    let debounce = null;
    watch(() => filtros.search, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { currentPage.value = 1; actualizarUrl(); loadInvoices(); }, 350);
    });
    watch(() => [filtros.searchType, filtros.estado, filtros.de, filtros.desde, filtros.hasta, filtros.tipoEmision], () => {
      currentPage.value = 1; actualizarUrl(); loadInvoices();
    }, { deep: true });
    watch(empresaActiva, () => { currentPage.value = 1; seleccion.value = []; actualizarUrl(); loadInvoices(); });

    const limpiarFiltros = () => {
      Object.assign(filtros, { search: '', searchType: 'auto', estado: [], de: null, desde: '', hasta: '', tipoEmision: null });
    };

    onMounted(() => { /* la tabla dispara update:options al montar y carga */ });

    // ---------------- Elegibilidad de la selección ----------------
    const seleccionados = computed(() => {
      const ids = new Set(seleccion.value);
      return invoices.value.filter(i => ids.has(i._id));
    });
    const elegibles = computed(() => ({
      reintento: seleccionados.value.filter(i => i.elegibilidad?.reintento?.ok).length,
      cancelacion: seleccionados.value.filter(i => i.elegibilidad?.cancelacion?.ok).length,
      eliminacion: seleccionados.value.filter(i => i.elegibilidad?.eliminacion?.ok).length
    }));

    const plazoTexto = (item) => {
      const h = item.elegibilidad?.cancelacion?.horasRestantes;
      if (h === undefined) return '';
      return h < 1 ? `Quedan ${Math.round(h * 60)} min de plazo` : `Quedan ${Math.floor(h)} h de plazo`;
    };

    // ---------------- Descargas ----------------
    const descargarUno = async (item, tipo) => {
      try {
        await descargarGet(`/api/invoices/${item._id}/download-${tipo}`, `${item.correlativo}.${tipo}`);
        notificar.exito(`${tipo.toUpperCase()} descargado: ${item.correlativo}`);
      } catch (error) {
        notificar.error(`No se pudo descargar el ${tipo.toUpperCase()}: ${await mensajeDeErrorBlob(error)}`);
      }
    };

    const descargarZip = async (incluir) => {
      if (!seleccion.value.length) return;
      ejecutando.value = 'zip';
      try {
        const nombre = await descargarPost('/api/invoices/bulk/zip', { ids: seleccion.value, incluir }, 'documentos.zip');
        notificar.exito(`ZIP generado: ${nombre}`);
      } catch (error) {
        notificar.error(`No se pudo generar el ZIP: ${await mensajeDeErrorBlob(error)}`);
      } finally {
        ejecutando.value = null;
      }
    };

    const exportarCsv = async () => {
      exportando.value = true;
      try {
        const p = paramsActuales(); p.delete('page'); p.delete('limit');
        const nombre = await descargarGet(`/api/invoices/export.csv?${p}`, 'documentos.csv');
        notificar.exito(`CSV exportado: ${nombre}`);
      } catch (error) {
        notificar.error(`No se pudo exportar: ${await mensajeDeErrorBlob(error)}`);
      } finally {
        exportando.value = false;
      }
    };

    // ---------------- Acciones masivas ----------------
    const resultado = reactive({ visible: false, titulo: '', ok: 0, fallidos: 0, filas: [] });
    const mostrarResultado = (titulo, data) => {
      resultado.titulo = titulo;
      resultado.ok = data.ok || 0;
      resultado.fallidos = data.fallidos || 0;
      resultado.filas = data.resultados || [];
      resultado.visible = true;
    };

    const consultarEstadoUno = async (item) => {
      try {
        const { data } = await axios.post(`/api/invoices/${item._id}/refresh-status`);
        if (data.estadoCambio) notificar.exito(`${item.correlativo}: ${data.estadoAnterior} → ${data.estadoActual}`);
        else if (!data.consultoSET) notificar.info(`${item.correlativo}: estado final (${data.estadoActual}), no hace falta consultar a SET`);
        else notificar.info(`${item.correlativo}: sin cambios (${data.estadoActual})`);
        loadInvoices();
      } catch (error) {
        notificar.error(`${item.correlativo}: ${mensajeDeError(error)}`);
        loadInvoices();
      }
    };

    const consultarEstadoMasivo = async () => {
      ejecutando.value = 'refresh';
      try {
        const { data } = await axios.post('/api/invoices/bulk/refresh-status', { ids: seleccion.value });
        mostrarResultado('Consulta de estado en SET', data);
        loadInvoices();
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        ejecutando.value = null;
      }
    };

    const dialogo = reactive({ visible: false, accion: null, titulo: '', texto: '', boton: '', color: 'primary', icono: '', motivo: '', confirmacion: '', elegibles: [], correlativos: [], omitidos: [] });

    const DEFINICIONES = {
      retry: { titulo: 'Reintentar emisión', boton: 'Reintentar', color: 'warning', icono: 'mdi-reload', clave: 'reintento',
        texto: 'Se vuelve a generar y firmar cada documento con los datos guardados y se envía a SET por el canal configurado. Conservan su numeración.' },
      cancel: { titulo: 'Cancelar en SET', boton: 'Cancelar documentos', color: 'deep-orange', icono: 'mdi-cancel', clave: 'cancelacion',
        texto: 'Se registra en SET un evento de cancelación por cada documento. Es irreversible: un documento cancelado no vuelve a estar vigente.' },
      delete: { titulo: 'Eliminar registros', boton: 'Eliminar', color: 'error', icono: 'mdi-delete', clave: 'eliminacion',
        texto: 'Se borran de este sistema los registros seleccionados que nunca existieron en SET.' }
    };

    const confirmar = (accion, ids = null) => {
      const def = DEFINICIONES[accion];
      const lista = ids || seleccion.value;
      const docs = invoices.value.filter(i => lista.includes(i._id));
      dialogo.accion = accion;
      dialogo.titulo = def.titulo; dialogo.texto = def.texto; dialogo.boton = def.boton; dialogo.color = def.color; dialogo.icono = def.icono;
      dialogo.motivo = '';
      dialogo.confirmacion = '';
      const elegiblesDocs = docs.filter(i => i.elegibilidad?.[def.clave]?.ok);
      dialogo.elegibles = elegiblesDocs.map(i => i._id);
      dialogo.correlativos = elegiblesDocs.map(i => `${i.correlativo} · ${tipoCorto(i.de)} · ${formatMonto(i.total, i.moneda)}`);
      dialogo.omitidos = docs.filter(i => !i.elegibilidad?.[def.clave]?.ok).map(i => ({ id: i._id, correlativo: i.correlativo, motivo: i.elegibilidad?.[def.clave]?.motivo || 'No elegible' }));
      dialogo.visible = true;
    };

    const ejecutarDialogo = async () => {
      const accion = dialogo.accion;
      ejecutando.value = accion;
      try {
        let data;
        if (accion === 'retry') ({ data } = await axios.post('/api/invoices/bulk/retry', { ids: dialogo.elegibles }));
        else if (accion === 'delete') ({ data } = await axios.post('/api/invoices/bulk/delete', { ids: dialogo.elegibles }));
        else if (accion === 'cancel') ({ data } = await axios.post('/api/eventos/bulk/cancelar', { ids: dialogo.elegibles, descripcion: dialogo.motivo.trim() }));
        dialogo.visible = false;
        mostrarResultado(DEFINICIONES[accion].titulo, data);
        if (accion === 'delete') seleccion.value = seleccion.value.filter(id => !dialogo.elegibles.includes(id));
        loadInvoices();
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        ejecutando.value = null;
      }
    };

    return {
      router, empresaActiva,
      invoices, total, loading, exportando, currentPage, itemsPerPage, sortBy, seleccion, ejecutando,
      filtros, headers, searchTypes: SEARCH_TYPES, searchTypeLabel, hayFiltros, limpiarFiltros,
      opcionesEstado: OPCIONES_ESTADO, tiposDE: TIPOS_DE,
      loadInvoices, onOptions,
      formatMonto, formatNumero, formatFechaHora, hace, estadoInfo, procesoInfo, tipoCorto, plazoTexto,
      elegibles, descargarUno, descargarZip, exportarCsv, consultarEstadoUno, consultarEstadoMasivo,
      dialogo, confirmar, ejecutarDialogo, resultado
    };
  }
};
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
