<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon start>mdi-package-variant-closed</v-icon>
        <span class="text-h6">Lotes de envío</span>
        <v-chip class="ml-2" size="small" variant="tonal" color="primary">{{ total }}</v-chip>
        <v-spacer></v-spacer>
        <v-select
          v-model="filtroEstado" :items="estadosFiltro" label="Estado"
          variant="outlined" density="compact" hide-details clearable style="max-width: 170px;"
        ></v-select>
        <v-btn color="warning" variant="tonal" prepend-icon="mdi-send-multiple" @click="enviarPendientes" :loading="enviandoPendientes">Enviar pendientes</v-btn>
        <v-btn color="info" variant="tonal" prepend-icon="mdi-refresh" @click="consultarPendientes" :loading="consultandoPendientes">Consultar pendientes</v-btn>
      </v-card-title>

      <v-card-text>
        <div class="text-caption text-medium-emphasis mb-2">
          <template v-if="empresaActiva">Empresa RUC {{ empresaActiva }}</template>
          <template v-else>Todas las empresas</template>
        </div>

        <v-data-table-server
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="lotes"
          :items-length="total"
          :loading="cargando"
          :items-per-page-options="[15, 25, 50, 100]"
          items-per-page-text="Por página"
          item-value="_id"
          density="comfortable"
          no-data-text="No hay lotes"
          @update:options="onOptions"
        >
          <template #item.empresaId="{ item }">
            <span>{{ item.empresaId?.nombreFantasia || item.empresaId?.razonSocial || '-' }}</span>
          </template>
          <template #item.estado="{ item }">
            <v-chip :color="colorEstado(item.estado)" variant="flat" size="small">{{ textoEstado(item.estado) }}</v-chip>
          </template>
          <template #item.tipoDocumento="{ item }">
            <v-chip variant="outlined" size="small" color="primary" label>{{ item.descripcion || `Tipo ${item.tipoDocumento}` }}</v-chip>
          </template>
          <template #item.ambiente="{ item }">
            <v-chip :color="item.ambiente === 'produccion' ? 'error' : 'warning'" size="small" variant="outlined">{{ item.ambiente?.toUpperCase() }}</v-chip>
          </template>
          <template #item.count="{ item }">
            <span class="font-weight-medium">{{ item.facturas?.length ?? item.count }}</span><span class="text-medium-emphasis">/50</span>
          </template>
          <template #item.dProtConsLote="{ item }">
            <span class="text-mono text-caption">{{ item.dProtConsLote || '-' }}</span>
          </template>
          <template #item.createdAt="{ item }">{{ formatFechaHora(item.createdAt) }}</template>
          <template #item.actions="{ item }">
            <v-menu>
              <template #activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" size="small" variant="text"></v-btn>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item prepend-icon="mdi-eye" title="Ver detalle" @click="router.push(`/lotes/${item._id}`)"></v-list-item>
                <v-list-item v-if="item.estado === 'en_espera'" prepend-icon="mdi-send" title="Enviar" @click="enviarLote(item)"></v-list-item>
                <v-list-item v-if="item.estado === 'procesando' || item.estado === 'enviado'" prepend-icon="mdi-refresh" title="Consultar" @click="consultarLote(item)"></v-list-item>
                <template v-if="item.estado === 'en_espera' || item.estado === 'error'">
                  <v-divider></v-divider>
                  <v-list-item prepend-icon="mdi-delete" title="Eliminar" class="text-error" @click="confirmarEliminar(item)"></v-list-item>
                </template>
              </v-list>
            </v-menu>
          </template>
        </v-data-table-server>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialogoEliminar" max-width="450" persistent>
      <v-card>
        <v-card-title class="bg-error"><v-icon start>mdi-delete-forever</v-icon>Eliminar lote</v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            Se elimina el lote y se desvinculan sus {{ loteSeleccionado?.count || 0 }} documento(s). No se puede deshacer.
          </v-alert>
          <div class="text-subtitle-1 font-weight-bold">{{ loteSeleccionado?.descripcion || `Lote #${loteSeleccionado?._id?.slice(-6)}` }}</div>
          <div class="text-caption text-medium-emphasis">{{ loteSeleccionado?.empresaId?.nombreFantasia || '-' }}</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="eliminando" @click="dialogoEliminar = false; loteSeleccionado = null">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="eliminando" @click="eliminarLote">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useEmpresaActiva } from '../composables/useEmpresaActiva';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { formatFechaHora } from '../utils/formato';

export default {
  name: 'LotesView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { empresaActiva, sincronizarDesdeQuery } = useEmpresaActiva();
    sincronizarDesdeQuery(route.query);

    const lotes = ref([]);
    const total = ref(0);
    const cargando = ref(false);
    const filtroEstado = ref(route.query.estado || null);
    const currentPage = ref(parseInt(route.query.page) || 1);
    const itemsPerPage = ref(parseInt(route.query.limit) || 15);
    const enviandoPendientes = ref(false);
    const consultandoPendientes = ref(false);
    const dialogoEliminar = ref(false);
    const eliminando = ref(false);
    const loteSeleccionado = ref(null);

    const estadosFiltro = [
      { title: 'En espera', value: 'en_espera' },
      { title: 'Enviado', value: 'enviado' },
      { title: 'Procesando', value: 'procesando' },
      { title: 'Completado', value: 'completado' },
      { title: 'Error', value: 'error' }
    ];

    const headers = [
      { title: 'Creado', key: 'createdAt', width: 150 },
      { title: 'Empresa', key: 'empresaId', sortable: false },
      { title: 'Tipo', key: 'tipoDocumento', sortable: false },
      { title: 'Ambiente', key: 'ambiente', sortable: false, width: 120 },
      { title: 'Docs', key: 'count', sortable: false, width: 80 },
      { title: 'Estado', key: 'estado', sortable: false, width: 130 },
      { title: 'Protocolo de lote', key: 'dProtConsLote', sortable: false },
      { title: '', key: 'actions', sortable: false, width: 56, align: 'end' }
    ];

    const colorEstado = (e) => ({ en_espera: 'warning', enviado: 'info', procesando: 'primary', completado: 'success', error: 'error' }[e] || 'grey');
    const textoEstado = (e) => ({ en_espera: 'En espera', enviado: 'Enviado', procesando: 'Procesando', completado: 'Completado', error: 'Error' }[e] || e);

    const updateUrl = () => {
      const query = {};
      if (currentPage.value > 1) query.page = currentPage.value;
      if (itemsPerPage.value !== 15) query.limit = itemsPerPage.value;
      if (filtroEstado.value) query.estado = filtroEstado.value;
      if (empresaActiva.value) query.empresa = empresaActiva.value;
      router.replace({ query }).catch(() => {});
    };

    let peticion = 0;
    const cargarLotes = async () => {
      const mia = ++peticion;
      cargando.value = true;
      try {
        const params = new URLSearchParams();
        params.append('page', currentPage.value);
        params.append('limit', itemsPerPage.value);
        if (filtroEstado.value) params.append('estado', filtroEstado.value);
        if (empresaActiva.value) params.append('rucEmpresa', empresaActiva.value);
        const res = await axios.get(`/api/lotes/list?${params.toString()}`);
        if (mia !== peticion) return;
        lotes.value = res.data.data || [];
        total.value = res.data.total || 0;
      } catch (err) {
        notificar.error(`No se pudieron cargar los lotes: ${mensajeDeError(err)}`);
      } finally {
        if (mia === peticion) cargando.value = false;
      }
    };

    const onOptions = () => { updateUrl(); cargarLotes(); };
    watch(filtroEstado, () => { currentPage.value = 1; updateUrl(); cargarLotes(); });
    watch(empresaActiva, () => { currentPage.value = 1; updateUrl(); cargarLotes(); });

    const enviarLote = async (lote) => {
      try {
        const res = await axios.post(`/api/lotes/enviar/${lote._id}`);
        notificar.exito(`Lote enviado. Protocolo: ${res.data.data?.dProtConsLote || 'N/A'}`);
        await cargarLotes();
      } catch (err) {
        notificar.error(mensajeDeError(err));
      }
    };

    const consultarLote = async (lote) => {
      try {
        const res = await axios.post(`/api/lotes/consultar/${lote._id}`);
        if (res.data.data?.completado) notificar.exito('Lote completado');
        else notificar.info(res.data.data?.mensaje || 'Aún en proceso');
        await cargarLotes();
      } catch (err) {
        notificar.error(mensajeDeError(err));
      }
    };

    const enviarPendientes = async () => {
      enviandoPendientes.value = true;
      try {
        const res = await axios.post('/api/lotes/enviar-pendientes');
        const ok = res.data.data?.filter(r => r.success).length || 0;
        notificar.exito(`${ok} lote(s) enviado(s)`);
        await cargarLotes();
      } catch (err) {
        notificar.error(mensajeDeError(err));
      } finally {
        enviandoPendientes.value = false;
      }
    };

    const consultarPendientes = async () => {
      consultandoPendientes.value = true;
      try {
        await cargarLotes();
        const pendientes = lotes.value.filter(l => l.estado === 'procesando' || l.estado === 'enviado');
        if (pendientes.length === 0) { notificar.info('No hay lotes pendientes de consulta'); return; }
        let completados = 0;
        for (const l of pendientes) {
          try {
            const res = await axios.post(`/api/lotes/consultar/${l._id}`);
            if (res.data.data?.completado) completados++;
          } catch (e) { /* se informa el total al final */ }
        }
        notificar.exito(`${completados}/${pendientes.length} lote(s) completados`);
        await cargarLotes();
      } catch (err) {
        notificar.error(mensajeDeError(err));
      } finally {
        consultandoPendientes.value = false;
      }
    };

    const confirmarEliminar = (lote) => { loteSeleccionado.value = lote; dialogoEliminar.value = true; };

    const eliminarLote = async () => {
      if (!loteSeleccionado.value) return;
      eliminando.value = true;
      try {
        const res = await axios.delete(`/api/lotes/${loteSeleccionado.value._id}`);
        notificar.exito(res.data.message || 'Lote eliminado');
        dialogoEliminar.value = false;
        loteSeleccionado.value = null;
        await cargarLotes();
      } catch (err) {
        notificar.error(mensajeDeError(err));
      } finally {
        eliminando.value = false;
      }
    };

    return {
      router, empresaActiva, lotes, total, cargando, filtroEstado, estadosFiltro, headers, currentPage, itemsPerPage,
      colorEstado, textoEstado, formatFechaHora, onOptions,
      enviarLote, consultarLote, enviarPendientes, consultarPendientes, enviandoPendientes, consultandoPendientes,
      dialogoEliminar, eliminando, loteSeleccionado, confirmarEliminar, eliminarLote
    };
  }
};
</script>

<style scoped>
.text-mono { font-family: 'Courier New', Courier, monospace; }
</style>
