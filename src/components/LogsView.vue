<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon start>mdi-clipboard-text-clock</v-icon>
        <span class="text-h6">Registros de operación</span>
        <v-chip class="ml-2" size="small" variant="tonal" color="primary">{{ total }}</v-chip>
        <v-spacer></v-spacer>
        <v-select
          v-model="selectedFilter" :items="filterOptions" label="Estado"
          variant="outlined" density="compact" hide-details style="max-width: 180px;"
        ></v-select>
        <v-text-field
          v-model="search" prepend-inner-icon="mdi-magnify" label="Buscar en descripción o tipo"
          variant="outlined" density="compact" hide-details clearable style="max-width: 340px;"
        ></v-text-field>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="loadLogs">Actualizar</v-btn>
      </v-card-title>

      <v-card-text>
        <v-data-table-server
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="logs"
          :items-length="total"
          :loading="loading"
          :items-per-page-options="[15, 25, 50, 100]"
          items-per-page-text="Por página"
          density="compact"
          class="elevation-1"
          no-data-text="No hay registros"
          @update:options="onOptions"
        >
          <template #item.invoiceId="{ item }">
            <router-link v-if="item.invoiceId?._id" :to="`/invoices/${item.invoiceId._id}`" class="text-decoration-none text-mono">{{ item.invoiceId.correlativo || item.invoiceId._id }}</router-link>
            <span v-else class="text-medium-emphasis">-</span>
            <div v-if="item.invoiceId?.cdc" class="text-caption text-medium-emphasis text-mono">…{{ String(item.invoiceId.cdc).slice(-10) }}</div>
          </template>
          <template #item.tipoOperacion="{ item }">
            <v-chip :color="getLogStatusColor(item.tipoOperacion, item.estado)" size="small" variant="tonal">{{ item.tipoOperacion }}</v-chip>
          </template>
          <template #item.estado="{ item }">
            <v-icon :color="getLogStateColor(item.estado)" size="small">{{ item.estado === 'error' ? 'mdi-close-circle' : item.estado === 'warning' ? 'mdi-alert' : 'mdi-check-circle' }}</v-icon>
          </template>
          <template #item.fecha="{ item }">
            <span class="text-no-wrap">{{ formatFechaHora(item.fecha) }}</span>
          </template>
          <template #item.detalle="{ item }">
            <v-btn v-if="item.detalle && Object.keys(item.detalle).length" size="x-small" variant="text" @click="verDetalle(item)">ver</v-btn>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialogoDetalle" max-width="720">
      <v-card>
        <v-card-title class="text-subtitle-1">Detalle del registro</v-card-title>
        <v-card-text><pre class="bloque">{{ JSON.stringify(detalle, null, 2) }}</pre></v-card-text>
        <v-card-actions><v-spacer></v-spacer><v-btn variant="text" @click="dialogoDetalle = false">Cerrar</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { formatFechaHora } from '../utils/formato';

export default {
  name: 'LogsView',
  setup() {
    const route = useRoute();
    const router = useRouter();

    const logs = ref([]);
    const total = ref(0);
    const loading = ref(false);
    const search = ref(route.query.search || '');
    const currentPage = ref(parseInt(route.query.page) || 1);
    const itemsPerPage = ref(parseInt(route.query.limit) || 25);
    const selectedFilter = ref(route.query.estado || 'all');
    const dialogoDetalle = ref(false);
    const detalle = ref(null);

    const filterOptions = [
      { title: 'Todos', value: 'all' },
      { title: 'Éxito', value: 'success' },
      { title: 'Error', value: 'error' },
      { title: 'Advertencia', value: 'warning' }
    ];

    const headers = [
      { title: 'Fecha', key: 'fecha', width: 150 },
      { title: 'Documento', key: 'invoiceId', width: 170, sortable: false },
      { title: 'Tipo', key: 'tipoOperacion', width: 180, sortable: false },
      { title: 'Descripción', key: 'descripcion', sortable: false },
      { title: '', key: 'estado', width: 50, sortable: false, align: 'center' },
      { title: '', key: 'detalle', width: 60, sortable: false }
    ];

    const getLogStatusColor = (tipo, estado) => {
      if (estado === 'error') return 'error';
      if (estado === 'warning') return 'warning';
      if (['envio_exitoso', 'inicio_proceso', 'consulta_estado'].includes(tipo)) return 'success';
      if (['error', 'error_consulta_estado', 'error_respuesta_set'].includes(tipo)) return 'error';
      if (['envio_sifen', 'respuesta_sifen', 'envio_lote', 'encolado_lote'].includes(tipo)) return 'primary';
      return 'info';
    };
    const getLogStateColor = (estado) => ({ success: 'success', error: 'error', warning: 'warning' }[estado] || 'info');

    const updateUrl = () => {
      const query = {};
      if (currentPage.value > 1) query.page = currentPage.value;
      if (itemsPerPage.value !== 25) query.limit = itemsPerPage.value;
      if (selectedFilter.value !== 'all') query.estado = selectedFilter.value;
      if (search.value) query.search = search.value;
      router.replace({ query }).catch(() => {});
    };

    let peticion = 0;
    const loadLogs = async () => {
      const mia = ++peticion;
      loading.value = true;
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.value);
        params.append('limit', itemsPerPage.value);
        if (selectedFilter.value !== 'all') params.append('estado', selectedFilter.value);
        if (search.value) params.append('search', search.value);
        const response = await axios.get(`/api/logs?${params.toString()}`);
        if (mia !== peticion) return;
        logs.value = response.data.logs || [];
        total.value = response.data.total || 0;
      } catch (error) {
        // Nunca inventar datos: si falla, se avisa y la tabla queda vacía
        logs.value = [];
        total.value = 0;
        notificar.error(`No se pudieron cargar los registros: ${mensajeDeError(error)}`);
      } finally {
        if (mia === peticion) loading.value = false;
      }
    };

    const onOptions = () => { updateUrl(); loadLogs(); };

    let debounce = null;
    watch(search, () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => { currentPage.value = 1; updateUrl(); loadLogs(); }, 350);
    });
    watch(selectedFilter, () => { currentPage.value = 1; updateUrl(); loadLogs(); });

    const verDetalle = (log) => { detalle.value = log.detalle; dialogoDetalle.value = true; };

    onMounted(() => { /* la tabla server-side dispara update:options al montar */ });

    return { logs, total, loading, search, currentPage, itemsPerPage, selectedFilter, filterOptions, headers, getLogStatusColor, getLogStateColor, formatFechaHora, onOptions, loadLogs, dialogoDetalle, detalle, verDetalle };
  }
};
</script>

<style scoped>
.text-mono { font-family: 'Courier New', Courier, monospace; }
.bloque { white-space: pre-wrap; word-break: break-all; max-height: 520px; overflow: auto; background: rgba(0,0,0,.04); padding: 12px; border-radius: 6px; font-size: 12px; }
</style>
