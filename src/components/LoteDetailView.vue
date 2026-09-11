<template>
  <v-container fluid>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="top">
      <v-icon start size="large">{{ snackbarIcon }}</v-icon>
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-btn variant="text" class="mb-2" @click="volver">
      <v-icon start>mdi-arrow-left</v-icon>
      Volver a Lotes
    </v-btn>

    <v-card v-if="lote" class="mb-4">
      <v-card-title class="d-flex align-center flex-wrap">
        <h2>Lote de Envío</h2>
        <v-spacer></v-spacer>
        <v-chip :color="colorEstado(lote.estado)" variant="flat" size="small" class="mr-2">
          {{ textoEstado(lote.estado) }}
        </v-chip>
        <v-btn
          v-if="lote.estado === 'en_espera'"
          color="warning"
          variant="tonal"
          @click="enviarLote"
          :loading="enviando"
        >
          <v-icon start>mdi-send</v-icon>
          Enviar
        </v-btn>
        <v-btn
          v-if="lote.estado === 'procesando' || lote.estado === 'enviado'"
          color="info"
          variant="tonal"
          class="ml-2"
          @click="consultarLote"
          :loading="consultando"
        >
          <v-icon start>mdi-refresh</v-icon>
          Consultar
        </v-btn>
        <v-btn
          v-if="lote.estado === 'en_espera' || lote.estado === 'error'"
          color="error"
          variant="tonal"
          class="ml-2"
          @click="dialogoEliminar = true"
        >
          <v-icon start>mdi-delete</v-icon>
          Eliminar
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-list density="compact" lines="one">
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-domain</v-icon></template>
                <v-list-item-title>Empresa</v-list-item-title>
                <v-list-item-subtitle>{{ lote.empresaId?.nombreFantasia || lote.empresaId || '-' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-file-document</v-icon></template>
                <v-list-item-title>Tipo Documento</v-list-item-title>
                <v-list-item-subtitle>{{ lote.descripcion || `Tipo ${lote.tipoDocumento}` }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-cloud</v-icon></template>
                <v-list-item-title>Ambiente</v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip :color="lote.ambiente === 'produccion' ? 'error' : 'warning'" size="x-small" variant="outlined">
                    {{ lote.ambiente?.toUpperCase() }}
                  </v-chip>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="6">
            <v-list density="compact" lines="one">
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-counter</v-icon></template>
                <v-list-item-title>Cantidad de Facturas</v-list-item-title>
                <v-list-item-subtitle class="font-weight-medium">{{ lote.count }}/50</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-barcode</v-icon></template>
                <v-list-item-title>dProtConsLote</v-list-item-title>
                <v-list-item-subtitle class="text-mono text-caption">{{ lote.dProtConsLote || '-' }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item>
                <template v-slot:prepend><v-icon>mdi-calendar</v-icon></template>
                <v-list-item-title>Creado</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(lote.createdAt) }}</v-list-item-subtitle>
              </v-list-item>
              <v-list-item v-if="lote.updatedAt">
                <template v-slot:prepend><v-icon>mdi-calendar-clock</v-icon></template>
                <v-list-item-title>Actualizado</v-list-item-title>
                <v-list-item-subtitle>{{ formatDate(lote.updatedAt) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card>
      <v-card-title>
        <h3>Facturas del Lote</h3>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headersFacturas"
          :items="lote?.facturas || []"
          :loading="cargando"
          :items-per-page="10"
          :item-value="(item) => item.facturaId?._id || item.facturaId"
        >
          <template v-slot:item.facturaId="{ item }">
            <router-link
              :to="`/invoices/${item.facturaId?._id || item.facturaId}`"
              class="text-primary text-decoration-none"
            >
              {{ item.facturaId?.correlativo || item.facturaId }}
            </router-link>
          </template>
          <template v-slot:item.cdc="{ item }">
            <span class="text-mono text-caption">{{ item.cdc || '-' }}</span>
          </template>
          <template v-slot:item.estadoIndividual="{ item }">
            <v-chip
              :color="colorEstadoIndividual(item.estadoIndividual)"
              size="x-small"
              variant="flat"
            >
              {{ item.estadoIndividual }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <v-dialog v-model="dialogoEliminar" max-width="450" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-error text-white">
          <v-icon start>mdi-delete-forever</v-icon>
          Eliminar Lote
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="dialogoEliminar = false"
            :disabled="eliminando"
            color="white"
          ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-alert type="warning" variant="tonal" icon="mdi-alert" class="mb-3">
            <strong>⚠️ Advertencia:</strong> Esta acción eliminará el lote y desvinculará sus {{ lote?.count || 0 }} factura(s).
          </v-alert>
          <p class="text-body-1 mb-2">
            ¿Estás <strong>SEGURO</strong> de que deseas eliminar este lote?
          </p>
          <v-card variant="outlined" class="pa-3 mb-3">
            <div class="text-subtitle-1 font-weight-bold">{{ lote?.descripcion || `Lote #${lote?._id?.slice(-6)}` }}</div>
            <div class="text-caption text-medium-emphasis">
              <v-icon start size="x-small">mdi-counter</v-icon> {{ lote?.count || 0 }} factura(s)<br>
              <v-icon start size="x-small">mdi-domain</v-icon> {{ lote?.empresaId?.nombreFantasia || lote?.empresaId || '-' }}
            </div>
          </v-card>
          <p class="text-body-2 text-medium-emphasis">
            Esta acción <strong>no se puede deshacer</strong>.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="dialogoEliminar = false"
            :disabled="eliminando"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="eliminarLote"
            :loading="eliminando"
          >
            <v-icon start>mdi-delete-forever</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { notificar } from '../composables/useNotificaciones';

export default {
  name: 'LoteDetailView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const lote = ref(null);
    const cargando = ref(false);
    const enviando = ref(false);
    const consultando = ref(false);
    const dialogoEliminar = ref(false);
    const eliminando = ref(false);

    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('info');
    const snackbarIcon = ref('mdi-information');

    const headersFacturas = [
      { title: 'Correlativo', key: 'facturaId' },
      { title: 'CDC', key: 'cdc' },
      { title: 'Estado Individual', key: 'estadoIndividual' }
    ];

    const colorEstado = (estado) => {
      switch (estado) {
        case 'en_espera': return 'warning';
        case 'enviado': return 'info';
        case 'procesando': return 'primary';
        case 'completado': return 'success';
        case 'error': return 'error';
        default: return 'grey';
      }
    };

    const textoEstado = (estado) => {
      switch (estado) {
        case 'en_espera': return 'En espera';
        case 'enviado': return 'Enviado';
        case 'procesando': return 'Procesando';
        case 'completado': return 'Completado';
        case 'error': return 'Error';
        default: return estado;
      }
    };

    const colorEstadoIndividual = (estado) => {
      switch (estado) {
        case 'pendiente': return 'warning';
        case 'aceptado': return 'success';
        case 'rechazado': return 'error';
        case 'observado': return 'amber';
        case 'error': return 'error';
        default: return 'grey';
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '-';
      const d = new Date(dateString);
      return d.toLocaleString('es-PY');
    };

    const cargarLote = async () => {
      cargando.value = true;
      try {
        const res = await axios.get(`/api/lotes/${route.params.id}`);
        lote.value = res.data.data || null;
      } catch (err) {
        console.error('Error cargando lote:', err);
        snackbarText.value = err.response?.status === 404 ? '❌ El lote no existe o no pertenece a tus empresas' : `❌ Error cargando lote: ${err.response?.data?.message || err.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        cargando.value = false;
      }
    };

    const enviarLote = async () => {
      enviando.value = true;
      try {
        const res = await axios.post(`/api/lotes/enviar/${route.params.id}`);
        snackbarText.value = `✅ Lote enviado - dProtConsLote: ${res.data.data?.dProtConsLote || 'N/A'}`;
        snackbarColor.value = 'success';
        snackbarIcon.value = 'mdi-check-circle';
        snackbar.value = true;
        await cargarLote();
      } catch (err) {
        snackbarText.value = `❌ ${err.response?.data?.message || err.response?.data?.error || err.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        enviando.value = false;
      }
    };

    const consultarLote = async () => {
      consultando.value = true;
      try {
        const res = await axios.post(`/api/lotes/consultar/${route.params.id}`);
        if (res.data.data?.completado) {
          snackbarText.value = '✅ Lote completado';
          snackbarColor.value = 'success';
          snackbarIcon.value = 'mdi-check-circle';
        } else {
          snackbarText.value = `ℹ️ ${res.data.data?.mensaje || 'Aún en proceso'}`;
          snackbarColor.value = 'info';
          snackbarIcon.value = 'mdi-information';
        }
        snackbar.value = true;
        await cargarLote();
      } catch (err) {
        snackbarText.value = `❌ ${err.response?.data?.message || err.response?.data?.error || err.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        consultando.value = false;
      }
    };

    const volver = () => {
      router.push('/lotes');
    };

    const eliminarLote = async () => {
      eliminando.value = true;
      try {
        const res = await axios.delete(`/api/lotes/${route.params.id}`);
        notificar.exito(res.data.message || 'Lote eliminado');
        dialogoEliminar.value = false;
        router.push('/lotes');
      } catch (err) {
        snackbarText.value = `❌ ${err.response?.data?.message || err.response?.data?.error || err.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        eliminando.value = false;
      }
    };

    onMounted(cargarLote);

    return {
      lote, cargando, enviando, consultando,
      dialogoEliminar, eliminando,
      headersFacturas, colorEstado, textoEstado, colorEstadoIndividual, formatDate,
      enviarLote, consultarLote, volver, eliminarLote,
      snackbar, snackbarText, snackbarColor, snackbarIcon
    };
  }
};
</script>

<style scoped>
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
