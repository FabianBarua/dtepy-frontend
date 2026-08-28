<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <h2>Cotizaciones</h2>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="abrirDialogo()">
          <v-icon start>mdi-currency-usd</v-icon>
          Declarar cotización
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4" icon="mdi-information">
          <p class="text-body-2 mb-0">
            La cotización (guaraníes por unidad) la declarás vos y queda vigente hasta que declares otra.
            Al emitir en moneda extranjera sin <code>data.cambio</code>, se usa la vigente declarada;
            si no hay ninguna, la emisión se rechaza. Cada cambio queda en el historial con quién y cuándo.
          </p>
        </v-alert>

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Vigentes</h3>
        <v-data-table
          :headers="headersVigentes"
          :items="vigentes"
          :loading="loadingVigentes"
          hide-default-footer
          items-per-page="-1"
          class="elevation-1 mb-6"
          no-data-text="Sin cotizaciones declaradas todavía"
        >
          <template v-slot:item.moneda="{ item }">
            <v-chip color="primary" size="small" variant="tonal">{{ item.moneda }}</v-chip>
          </template>
          <template v-slot:item.valor="{ item }">
            <span class="font-weight-bold">{{ formatoGs(item.valor) }} Gs</span>
          </template>
          <template v-slot:item.empresa="{ item }">
            {{ nombreEmpresa(item.empresaId) }}
          </template>
          <template v-slot:item.declaradaPor="{ item }">
            {{ item.declaradaPor?.nombre || (item.declaradaPor?.tipo === 'api_key' ? 'API' : '-') }}
            <v-chip v-if="item.declaradaPor?.tipo === 'api_key'" size="x-small" class="ml-1" variant="outlined">API</v-chip>
          </template>
          <template v-slot:item.declaradaEn="{ item }">
            {{ formatoFecha(item.declaradaEn) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn color="primary" size="small" variant="tonal" @click="abrirDialogo(item)">
              <v-icon start size="small">mdi-pencil</v-icon>
              Ajustar
            </v-btn>
          </template>
        </v-data-table>

        <div class="d-flex align-center mb-2" style="gap: 12px;">
          <h3 class="text-subtitle-1 font-weight-bold mb-0">Historial</h3>
          <v-select
            v-model="filtroMoneda"
            :items="monedasDelHistorial"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            placeholder="Todas"
            style="max-width: 140px;"
            @update:model-value="cargarHistorial"
          ></v-select>
        </div>
        <v-data-table
          :headers="headersHistorial"
          :items="historial"
          :loading="loadingHistorial"
          items-per-page="15"
          class="elevation-1"
          no-data-text="Sin declaraciones"
        >
          <template v-slot:item.moneda="{ item }">
            <v-chip size="small" variant="outlined">{{ item.moneda }}</v-chip>
          </template>
          <template v-slot:item.valor="{ item }">
            {{ formatoGs(item.valor) }} Gs
          </template>
          <template v-slot:item.empresaId="{ item }">
            {{ item.empresaId?.nombreFantasia || item.empresaId?.ruc || '-' }}
          </template>
          <template v-slot:item.declaradaPor="{ item }">
            {{ item.declaradaPor?.nombre || '-' }}
            <v-chip v-if="item.declaradaPor?.tipo === 'api_key'" size="x-small" class="ml-1" variant="outlined">API</v-chip>
          </template>
          <template v-slot:item.createdAt="{ item }">
            {{ formatoFecha(item.createdAt) }}
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Declarar / ajustar -->
    <v-dialog v-model="dialogo" max-width="480">
      <v-card>
        <v-card-title>Declarar cotización</v-card-title>
        <v-card-text>
          <v-select
            v-if="empresas.length > 1"
            v-model="form.empresaId"
            :items="empresas"
            item-title="nombreFantasia"
            item-value="_id"
            label="Empresa"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          ></v-select>

          <v-combobox
            v-model="form.moneda"
            :items="monedasSugeridas"
            label="Moneda"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hint="USD, BRL u otro código ISO del catálogo SIFEN"
            persistent-hint
          ></v-combobox>

          <v-text-field
            v-model="form.valor"
            label="Guaraníes por unidad"
            type="number"
            variant="outlined"
            density="comfortable"
            :hint="pistaValor"
            persistent-hint
          ></v-text-field>

          <v-alert v-if="errorForm" type="error" variant="tonal" class="mt-3" density="compact">
            {{ errorForm }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="dialogo = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="declarar">Declarar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
      {{ snackbarTexto }}
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'CotizacionesView',
  setup() {
    const vigentes = ref([]);
    const historial = ref([]);
    const empresas = ref([]);
    const loadingVigentes = ref(false);
    const loadingHistorial = ref(false);
    const guardando = ref(false);
    const dialogo = ref(false);
    const errorForm = ref('');
    const filtroMoneda = ref(null);
    const snackbar = ref(false);
    const snackbarTexto = ref('');
    const snackbarColor = ref('success');
    const monedasSugeridas = ['USD', 'BRL', 'EUR', 'ARS'];

    const form = ref({ empresaId: null, moneda: 'USD', valor: '' });

    const headersVigentes = [
      { title: 'Moneda', key: 'moneda' },
      { title: 'Cotización', key: 'valor' },
      { title: 'Empresa', key: 'empresa', sortable: false },
      { title: 'Declarada por', key: 'declaradaPor', sortable: false },
      { title: 'Vigente desde', key: 'declaradaEn' },
      { title: '', key: 'actions', sortable: false, align: 'end' }
    ];

    const headersHistorial = [
      { title: 'Moneda', key: 'moneda' },
      { title: 'Valor', key: 'valor' },
      { title: 'Empresa', key: 'empresaId', sortable: false },
      { title: 'Declarada por', key: 'declaradaPor', sortable: false },
      { title: 'Fecha', key: 'createdAt' }
    ];

    const monedasDelHistorial = computed(() => {
      const set = new Set(vigentes.value.map((v) => v.moneda));
      historial.value.forEach((h) => set.add(h.moneda));
      return Array.from(set).sort();
    });

    const pistaValor = computed(() => {
      const numero = Number(form.value.valor);
      const moneda = String(form.value.moneda || '').toUpperCase();
      if (!Number.isFinite(numero) || numero <= 0 || !moneda) return 'Ej.: 7300 = 7.300 Gs por unidad';
      return `1 ${moneda} = ${formatoGs(numero)} Gs`;
    });

    const nombreEmpresa = (empresaId) => {
      const empresa = empresas.value.find((e) => e._id === String(empresaId));
      return empresa ? empresa.nombreFantasia : '-';
    };

    const formatoGs = (valor) => new Intl.NumberFormat('es-PY').format(valor);
    const formatoFecha = (fecha) => (fecha ? new Date(fecha).toLocaleString('es-PY') : '-');

    const cargarVigentes = async () => {
      loadingVigentes.value = true;
      try {
        const { data } = await axios.get('/api/cotizaciones');
        vigentes.value = data.data || [];
      } catch (error) {
        mostrar('No se pudieron cargar las cotizaciones', 'error');
      } finally {
        loadingVigentes.value = false;
      }
    };

    const cargarHistorial = async () => {
      loadingHistorial.value = true;
      try {
        const params = {};
        if (filtroMoneda.value) params.moneda = filtroMoneda.value;
        const { data } = await axios.get('/api/cotizaciones/historial', { params });
        historial.value = data.data || [];
      } catch (error) {
        mostrar('No se pudo cargar el historial', 'error');
      } finally {
        loadingHistorial.value = false;
      }
    };

    const cargarEmpresas = async () => {
      try {
        const { data } = await axios.get('/api/empresas');
        empresas.value = data.data || [];
        if (empresas.value.length === 1) form.value.empresaId = empresas.value[0]._id;
      } catch (error) {
        empresas.value = [];
      }
    };

    const abrirDialogo = (vigente = null) => {
      errorForm.value = '';
      if (vigente) {
        form.value = {
          empresaId: String(vigente.empresaId),
          moneda: vigente.moneda,
          valor: String(vigente.valor)
        };
      } else {
        form.value = {
          empresaId: empresas.value.length === 1 ? empresas.value[0]._id : form.value.empresaId,
          moneda: 'USD',
          valor: ''
        };
      }
      dialogo.value = true;
    };

    const declarar = async () => {
      errorForm.value = '';
      const numero = Number(form.value.valor);
      if (!form.value.moneda) { errorForm.value = 'Indicá la moneda'; return; }
      if (!Number.isFinite(numero) || numero <= 0) { errorForm.value = 'El valor debe ser mayor a 0'; return; }
      if (empresas.value.length > 1 && !form.value.empresaId) { errorForm.value = 'Elegí la empresa'; return; }

      guardando.value = true;
      try {
        const body = { moneda: String(form.value.moneda).toUpperCase(), valor: numero };
        if (form.value.empresaId) body.empresaId = form.value.empresaId;
        const { data } = await axios.post('/api/cotizaciones', body);
        mostrar(data.message || 'Cotización declarada', 'success');
        dialogo.value = false;
        await Promise.all([cargarVigentes(), cargarHistorial()]);
      } catch (error) {
        errorForm.value = error.response?.data?.message || 'No se pudo declarar la cotización';
      } finally {
        guardando.value = false;
      }
    };

    const mostrar = (texto, color) => {
      snackbarTexto.value = texto;
      snackbarColor.value = color;
      snackbar.value = true;
    };

    onMounted(async () => {
      await cargarEmpresas();
      await Promise.all([cargarVigentes(), cargarHistorial()]);
    });

    return {
      vigentes, historial, empresas, loadingVigentes, loadingHistorial,
      guardando, dialogo, errorForm, filtroMoneda, snackbar, snackbarTexto,
      snackbarColor, monedasSugeridas, form, headersVigentes, headersHistorial,
      monedasDelHistorial, pistaValor, nombreEmpresa, formatoGs, formatoFecha,
      cargarHistorial, abrirDialogo, declarar
    };
  }
};
</script>
