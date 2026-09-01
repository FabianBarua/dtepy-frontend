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

        <!-- Actualización automática -->
        <v-card variant="outlined" class="mb-6">
          <v-card-title class="d-flex align-center py-3">
            <v-icon start color="primary">mdi-cloud-sync</v-icon>
            <span class="text-subtitle-1 font-weight-bold">Actualización automática</span>
            <v-spacer></v-spacer>
            <v-chip
              v-if="auto.ultimaSincronizacion"
              :color="colorEstadoSync(auto.ultimaSincronizacion.estado)"
              size="small"
              variant="tonal"
            >
              {{ etiquetaEstadoSync(auto.ultimaSincronizacion.estado) }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div class="text-caption text-medium-emphasis mb-4">
              En Paraguay la cotización que rige hoy es la que la SET/DNIT publicó ayer.
              El sistema la busca apenas cambia el día y, si la fuente todavía no la publicó,
              reintenta cada 5 minutos. Hoy corresponde la del <strong>{{ auto.fechaObjetivo || '—' }}</strong>.
            </div>

            <v-row dense>
              <v-col v-if="empresas.length > 1" cols="12" md="4">
                <v-select
                  v-model="auto.empresaId"
                  :items="empresas"
                  item-title="nombreFantasia"
                  item-value="_id"
                  label="Empresa"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  @update:model-value="cargarAuto"
                ></v-select>
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="auto.proveedor"
                  :items="proveedores"
                  item-title="nombre"
                  item-value="id"
                  label="Proveedor"
                  variant="outlined"
                  density="comfortable"
                  :hint="proveedorActual?.descripcion"
                  persistent-hint
                  @update:model-value="auto.monedas = []"
                ></v-select>
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="auto.monedas"
                  :items="proveedorActual?.monedas || []"
                  label="Monedas a actualizar"
                  variant="outlined"
                  density="comfortable"
                  multiple
                  chips
                  hint="Solo estas se declaran solas; el resto sigue manual"
                  persistent-hint
                ></v-select>
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="auto.tipoValor"
                  :items="[
                    { title: 'Venta', value: 'venta' },
                    { title: 'Compra', value: 'compra' },
                    { title: 'Promedio compra/venta', value: 'promedio' }
                  ]"
                  label="Valor a usar"
                  variant="outlined"
                  density="comfortable"
                  hint="Cuál de los dos valores del par se declara"
                  persistent-hint
                ></v-select>
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model.number="auto.variacionMaximaPct"
                  label="Variación máxima (%)"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hint="Un salto mayor no se aplica solo: queda para revisión"
                  persistent-hint
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="4" class="d-flex align-center">
                <v-switch
                  v-model="auto.activo"
                  color="primary"
                  label="Activar actualización automática"
                  hide-details
                ></v-switch>
              </v-col>
            </v-row>

            <v-alert
              v-if="auto.ultimaSincronizacion"
              :type="tipoAlertaSync(auto.ultimaSincronizacion.estado)"
              variant="tonal"
              density="compact"
              class="mt-4"
            >
              <div class="text-body-2">
                <strong>Última verificación:</strong> {{ formatoFecha(auto.ultimaSincronizacion.en) }}
                <span v-if="auto.ultimaSincronizacion.fechaCotizacion">
                  — cotización del {{ auto.ultimaSincronizacion.fechaCotizacion }}
                </span>
              </div>
              <div class="text-caption">{{ auto.ultimaSincronizacion.mensaje }}</div>
            </v-alert>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn variant="tonal" :loading="sincronizando" @click="sincronizarAhora">
              <v-icon start>mdi-refresh</v-icon>
              Sincronizar ahora
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" :loading="guardandoAuto" @click="guardarAuto">
              <v-icon start>mdi-content-save</v-icon>
              Guardar configuración
            </v-btn>
          </v-card-actions>
        </v-card>

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
            <v-chip v-else-if="item.declaradaPor?.tipo === 'automatica'" size="x-small" class="ml-1" color="primary" variant="tonal">
              <v-icon start size="x-small">mdi-cloud-sync</v-icon>AUTO
            </v-chip>
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
            <v-chip v-else-if="item.declaradaPor?.tipo === 'automatica'" size="x-small" class="ml-1" color="primary" variant="tonal">AUTO</v-chip>
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

    // Actualización automática
    const proveedores = ref([]);
    const guardandoAuto = ref(false);
    const sincronizando = ref(false);
    const auto = ref({
      empresaId: null,
      activo: false,
      proveedor: 'sistemaaguila',
      monedas: [],
      tipoValor: 'venta',
      variacionMaximaPct: 10,
      ultimaSincronizacion: null,
      fechaObjetivo: null
    });

    const proveedorActual = computed(
      () => proveedores.value.find((p) => p.id === auto.value.proveedor) || null
    );

    const ETIQUETAS_SYNC = {
      ok: 'Actualizada',
      sin_cambios: 'Al día',
      pendiente_fuente: 'Esperando a la fuente',
      bloqueada: 'Requiere revisión',
      error: 'Error'
    };
    const COLORES_SYNC = {
      ok: 'success',
      sin_cambios: 'success',
      pendiente_fuente: 'info',
      bloqueada: 'warning',
      error: 'error'
    };
    const etiquetaEstadoSync = (estado) => ETIQUETAS_SYNC[estado] || estado || '-';
    const colorEstadoSync = (estado) => COLORES_SYNC[estado] || 'grey';
    const tipoAlertaSync = (estado) => {
      if (estado === 'error') return 'error';
      if (estado === 'bloqueada') return 'warning';
      if (estado === 'pendiente_fuente') return 'info';
      return 'success';
    };

    const cargarProveedores = async () => {
      try {
        const { data } = await axios.get('/api/cotizaciones/proveedores');
        proveedores.value = data.data || [];
      } catch (error) {
        proveedores.value = [];
      }
    };

    const cargarAuto = async () => {
      try {
        const params = {};
        if (auto.value.empresaId) params.empresaId = auto.value.empresaId;
        const { data } = await axios.get('/api/cotizaciones/automatica', { params });
        auto.value = { ...auto.value, ...data.data };
      } catch (error) {
        // sin empresa resuelta todavía: se deja la configuración por defecto
      }
    };

    const guardarAuto = async () => {
      guardandoAuto.value = true;
      try {
        const body = {
          activo: auto.value.activo,
          proveedor: auto.value.proveedor,
          monedas: auto.value.monedas,
          tipoValor: auto.value.tipoValor,
          variacionMaximaPct: Number(auto.value.variacionMaximaPct)
        };
        if (auto.value.empresaId) body.empresaId = auto.value.empresaId;
        const { data } = await axios.put('/api/cotizaciones/automatica', body);
        mostrar(data.message || 'Configuración guardada', 'success');
        await cargarAuto();
      } catch (error) {
        mostrar(error.response?.data?.message || 'No se pudo guardar la configuración', 'error');
      } finally {
        guardandoAuto.value = false;
      }
    };

    const sincronizarAhora = async () => {
      sincronizando.value = true;
      try {
        const body = {};
        if (auto.value.empresaId) body.empresaId = auto.value.empresaId;
        const { data } = await axios.post('/api/cotizaciones/sincronizar', body);
        const resumen = data.data || {};
        mostrar(resumen.mensaje || 'Sincronización ejecutada', tipoAlertaSync(resumen.estado));
        await Promise.all([cargarAuto(), cargarVigentes(), cargarHistorial()]);
      } catch (error) {
        const resumen = error.response?.data?.data;
        mostrar(resumen?.mensaje || error.response?.data?.message || 'No se pudo sincronizar', 'error');
        await cargarAuto();
      } finally {
        sincronizando.value = false;
      }
    };

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
        if (empresas.value.length >= 1) {
          if (empresas.value.length === 1) form.value.empresaId = empresas.value[0]._id;
          auto.value.empresaId = empresas.value[0]._id;
        }
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
      await Promise.all([cargarVigentes(), cargarHistorial(), cargarProveedores(), cargarAuto()]);
    });

    return {
      vigentes, historial, empresas, loadingVigentes, loadingHistorial,
      guardando, dialogo, errorForm, filtroMoneda, snackbar, snackbarTexto,
      snackbarColor, monedasSugeridas, form, headersVigentes, headersHistorial,
      monedasDelHistorial, pistaValor, nombreEmpresa, formatoGs, formatoFecha,
      cargarHistorial, abrirDialogo, declarar,
      // actualización automática
      proveedores, proveedorActual, auto, guardandoAuto, sincronizando,
      cargarAuto, guardarAuto, sincronizarAhora,
      etiquetaEstadoSync, colorEstadoSync, tipoAlertaSync
    };
  }
};
</script>
