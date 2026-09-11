<template>
  <v-container fluid>
    <div class="d-flex align-center mb-2">
      <span class="text-caption text-medium-emphasis">
        <template v-if="empresaActiva">Empresa RUC {{ empresaActiva }}</template>
        <template v-else>Todas las empresas</template>
        · actualizado {{ hace(ultimaCarga) || 'recién' }}
      </span>
      <v-spacer></v-spacer>
      <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="cargando" @click="loadStats">Actualizar</v-btn>
    </div>

    <v-row>
      <v-col v-for="t in tarjetas" :key="t.titulo" cols="12" sm="6" md="3">
        <v-card :color="t.color" theme="dark" class="tarjeta" @click="irFiltrado(t.filtro)">
          <v-card-title class="text-subtitle-1 d-flex align-center">
            <v-icon start>{{ t.icono }}</v-icon>{{ t.titulo }}
          </v-card-title>
          <v-card-text class="text-h4">{{ t.valor }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="text-subtitle-1">Actividad reciente</v-card-title>
          <v-card-text>
            <v-data-table :headers="recentActivityHeaders" :items="recentInvoices" :loading="cargando" items-per-page="-1" hide-default-footer density="compact">
              <template #item.correlativo="{ item }">
                <router-link :to="`/invoices/${item._id}`" class="text-decoration-none text-mono">{{ item.correlativo }}</router-link>
                <v-chip size="x-small" variant="outlined" color="primary" label class="ml-1">{{ tipoCorto(item.de) }}</v-chip>
              </template>
              <template #item.cliente="{ item }">
                <div class="text-truncate" style="max-width: 220px">{{ item.cliente?.nombre || '-' }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.cliente?.ruc }}</div>
              </template>
              <template #item.total="{ item }">{{ formatMonto(item.total, item.moneda) }}</template>
              <template #item.estado="{ item }">
                <v-chip :color="estadoInfo(item.estado).color" size="small" variant="flat">{{ estadoInfo(item.estado).etiqueta }}</v-chip>
              </template>
              <template #item.fechaCreacion="{ item }">{{ formatFechaHora(item.fechaCreacion) }}</template>
            </v-data-table>
            <div class="text-end mt-2">
              <v-btn variant="text" size="small" append-icon="mdi-arrow-right" @click="router.push('/invoices')">Ver todos los documentos</v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="text-subtitle-1">Por estado</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="e in porEstado" :key="e._id" link @click="irFiltrado({ estado: e._id })">
                <template #prepend>
                  <v-chip :color="estadoInfo(e._id).color" size="small" variant="flat" label class="mr-3" style="min-width: 44px; justify-content: center">{{ e.count }}</v-chip>
                </template>
                <v-list-item-title>{{ estadoInfo(e._id).etiqueta }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="!porEstado.length"><v-list-item-title class="text-medium-emphasis">Sin documentos</v-list-item-title></v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12">
        <v-card>
          <v-card-title class="text-subtitle-1">Últimos 7 días</v-card-title>
          <v-card-text>
            <div style="height: 300px;"><canvas ref="tendenciasChart"></canvas></div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import { useEmpresaActiva } from '../composables/useEmpresaActiva';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { formatMonto, formatFechaHora, hace, estadoInfo, tipoCorto } from '../utils/formato';

Chart.register(...registerables);

export default {
  name: 'DashboardView',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { empresaActiva, sincronizarDesdeQuery } = useEmpresaActiva();
    const stats = ref({});
    const recentInvoices = ref([]);
    const cargando = ref(false);
    const ultimaCarga = ref(null);
    const tendenciasChart = ref(null);
    let chartInstance = null;

    const recentActivityHeaders = [
      { title: 'Fecha', key: 'fechaCreacion', width: 150 },
      { title: 'Número', key: 'correlativo' },
      { title: 'Cliente', key: 'cliente' },
      { title: 'Total', key: 'total', align: 'end' },
      { title: 'Estado', key: 'estado', width: 130 }
    ];

    const cuenta = (estado) => stats.value.facturasPorEstado?.find(s => s._id === estado)?.count || 0;
    const porEstado = computed(() => [...(stats.value.facturasPorEstado || [])].sort((a, b) => b.count - a.count));
    const tarjetas = computed(() => [
      { titulo: 'Documentos', valor: stats.value.totalFacturas || 0, color: 'primary', icono: 'mdi-file-document', filtro: {} },
      { titulo: 'Aprobados', valor: cuenta('aceptado') + cuenta('observado'), color: 'success', icono: 'mdi-check-circle', filtro: { estado: 'aceptado,observado' } },
      { titulo: 'En curso', valor: cuenta('encolado') + cuenta('procesando') + cuenta('enviado'), color: 'warning', icono: 'mdi-timer-sand', filtro: { estado: 'encolado,procesando,enviado' } },
      { titulo: 'Rechazados / error', valor: cuenta('rechazado') + cuenta('error'), color: 'error', icono: 'mdi-alert-circle', filtro: { estado: 'rechazado,error' } }
    ]);

    const irFiltrado = (filtro) => {
      const query = { ...filtro };
      if (empresaActiva.value) query.empresa = empresaActiva.value;
      router.push({ path: '/invoices', query });
    };

    const loadStats = async () => {
      cargando.value = true;
      try {
        const params = empresaActiva.value ? { rucEmpresa: empresaActiva.value } : {};
        const [statsResponse, invoicesResponse] = await Promise.all([
          axios.get('/api/stats', { params }),
          axios.get('/api/invoices', { params: { page: 1, limit: 8, ...params } })
        ]);
        stats.value = statsResponse.data.data || statsResponse.data;
        recentInvoices.value = invoicesResponse.data.invoices || [];
        ultimaCarga.value = new Date();
        crearGraficoTendencias(stats.value.tendenciasPorDia || []);
      } catch (error) {
        notificar.error(`No se pudieron cargar las estadísticas: ${mensajeDeError(error)}`);
      } finally {
        cargando.value = false;
      }
    };

    const crearGraficoTendencias = (tendencias) => {
      const ctx = tendenciasChart.value;
      if (!ctx) return;
      if (chartInstance) chartInstance.destroy();

      const labels = tendencias.map(t => new Date(`${t._id}T12:00:00`).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }));
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Documentos', data: tendencias.map(t => t.count), backgroundColor: 'rgba(25, 118, 210, 0.7)', borderColor: 'rgba(25, 118, 210, 1)', borderWidth: 1, yAxisID: 'y' },
            { label: 'Total (según moneda de cada documento)', data: tendencias.map(t => t.total || 0), type: 'line', borderColor: 'rgba(76, 175, 80, 1)', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderWidth: 2, pointBackgroundColor: 'rgba(76, 175, 80, 1)', yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: true, position: 'top' } },
          scales: {
            y: { type: 'linear', position: 'left', title: { display: true, text: 'Documentos' }, ticks: { stepSize: 1 } },
            y1: { type: 'linear', position: 'right', title: { display: true, text: 'Total' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    };

    watch(empresaActiva, loadStats);
    onMounted(() => { sincronizarDesdeQuery(route.query); loadStats(); });
    onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy(); });

    return { router, empresaActiva, stats, recentInvoices, cargando, ultimaCarga, tendenciasChart, recentActivityHeaders, tarjetas, porEstado, irFiltrado, loadStats, formatMonto, formatFechaHora, hace, estadoInfo, tipoCorto };
  }
};
</script>

<style scoped>
.tarjeta { cursor: pointer; transition: transform .12s ease; }
.tarjeta:hover { transform: translateY(-2px); }
.text-mono { font-family: 'Courier New', Courier, monospace; }
</style>
