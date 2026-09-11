<template>
  <v-select
    v-model="seleccionId"
    :items="empresas"
    :item-title="tituloEmpresa"
    item-value="_id"
    label="Empresa"
    prepend-inner-icon="mdi-office-building"
    variant="outlined"
    density="compact"
    hide-details
    clearable
    :loading="cargando"
    :placeholder="cargando ? 'Cargando...' : 'Todas las empresas'"
    @update:model-value="cambiarEmpresa"
  >
    <template #prepend-item>
      <v-list-item @click="cambiarEmpresa(null)" :active="seleccionId === null">
        <template #prepend>
          <v-icon size="small">mdi-check-all</v-icon>
        </template>
        <v-list-item-title>Todas las empresas</v-list-item-title>
      </v-list-item>
      <v-divider class="my-1"></v-divider>
    </template>

    <template #selection="{ item }">
      <span class="text-truncate">{{ item.title }}</span>
    </template>

    <template #item="{ props, item }">
      <v-list-item v-bind="props">
        <template #prepend>
          <v-icon>mdi-office-building</v-icon>
        </template>
        <template #subtitle>RUC {{ item.raw.ruc }}</template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';
import { useEmpresaActiva } from '../composables/useEmpresaActiva';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';

export default {
  name: 'EmpresaSelector',
  emits: ['cambio-empresa'],
  setup(props, { emit }) {
    const empresas = ref([]);
    const seleccionId = ref(null);
    const cargando = ref(false);
    const { empresaActiva, establecerEmpresaActiva } = useEmpresaActiva();

    const tituloEmpresa = (e) => e?.nombreFantasia || e?.razonSocial || e?.ruc || '';

    const reflejarDesdeRuc = (ruc) => {
      const empresa = ruc ? empresas.value.find(e => e.ruc === ruc) : null;
      seleccionId.value = empresa ? empresa._id : null;
      return empresa;
    };

    const cargarEmpresas = async () => {
      cargando.value = true;
      try {
        const response = await axios.get('/api/empresas');
        empresas.value = response.data.data || [];

        // Restaurar el filtro guardado. Si el RUC ya no existe (empresa
        // borrada u otro usuario), se limpia para no filtrar por algo invisible.
        if (empresaActiva.value) {
          const empresa = reflejarDesdeRuc(empresaActiva.value);
          if (!empresa) establecerEmpresaActiva(null);
        }
      } catch (error) {
        notificar.error(`No se pudieron cargar las empresas: ${mensajeDeError(error)}`);
      } finally {
        cargando.value = false;
      }
    };

    const cambiarEmpresa = (id) => {
      const empresa = id ? empresas.value.find(e => e._id === id) : null;
      seleccionId.value = empresa ? empresa._id : null;
      const ruc = empresa ? empresa.ruc : null;
      establecerEmpresaActiva(ruc);
      emit('cambio-empresa', ruc);
    };

    // Si otra pestaña (o una vista) cambia la empresa activa, el selector la sigue
    watch(empresaActiva, (ruc) => { if (empresas.value.length) reflejarDesdeRuc(ruc); });

    onMounted(cargarEmpresas);

    return { empresas, seleccionId, cargando, cambiarEmpresa, tituloEmpresa };
  }
};
</script>

<style scoped>
:deep(.v-field__input) {
  min-height: 40px !important;
}
</style>
