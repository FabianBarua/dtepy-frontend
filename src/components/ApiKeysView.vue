<template>
  <v-container fluid>
    <v-card>
      <v-card-title>
        <h2>API Keys</h2>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="abrirDialogoNuevaKey">
          <v-icon start>mdi-plus</v-icon>
          Nueva API Key
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4" icon="mdi-information">
          <p class="text-body-2">
            Las API Keys permiten que aplicaciones externas se autentiquen con el sistema SIFEN.
            Cada key puede tener permisos específicos y fecha de expiración.
          </p>
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="apiKeysDisplayadas"
          :loading="loading"
          hide-default-footer
          class="elevation-1"
        >
          <template v-slot:item.nombre="{ item }">
            <div class="text-weight-bold">{{ item.nombre }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.descripcion }}</div>
          </template>

          <template v-slot:item.permisos="{ item }">
            <v-chip
              v-for="permiso in item.permisos"
              :key="permiso"
              size="small"
              class="mr-1 mb-1"
              color="primary"
              variant="outlined"
            >
              {{ permiso }}
            </v-chip>
          </template>

          <template v-slot:item.activa="{ item }">
            <v-chip :color="item.activa ? 'success' : 'error'" size="small">
              {{ item.activa ? 'Activa' : 'Revocada' }}
            </v-chip>
          </template>

          <template v-slot:item.expiracion="{ item }">
            {{ item.expiracion ? formatDate(item.expiracion) : 'Nunca' }}
          </template>

          <template v-slot:item.ultimoUso="{ item }">
            {{ item.ultimoUso ? formatDateTime(item.ultimoUso) : 'Nunca' }}
          </template>

          <template v-slot:item.actions="{ item }">
            <v-menu v-model="item.menuOpen" :close-on-content-click="false" location="start">
              <template v-slot:activator="{ props }">
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  v-bind="props"
                  title="Acciones"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" min-width="200">
                <v-list-item
                  @click="renovarApiKey(item); item.menuOpen = false"
                  :disabled="!item.activa"
                >
                  <template v-slot:prepend>
                    <v-icon color="primary" size="small">mdi-refresh</v-icon>
                  </template>
                  <v-list-item-title>Renovar</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item
                  @click="confirmarRevocar(item); item.menuOpen = false"
                  :disabled="!item.activa"
                >
                  <template v-slot:prepend>
                    <v-icon color="error" size="small">mdi-cancel</v-icon>
                  </template>
                  <v-list-item-title class="text-error">Revocar</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-data-table>

        <div class="d-flex align-center justify-center pt-4" style="gap: 16px;">
          <div class="d-flex align-center" style="gap: 8px;">
            <span class="text-body-2">Items por página:</span>
            <v-select
              v-model="itemsPerPage"
              :items="[10, 15, 25, 50, 100]"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 80px;"
            ></v-select>
          </div>
          <v-pagination
            v-model="currentPage"
            :length="totalPages"
          ></v-pagination>
        </div>
      </v-card-text>
    </v-card>

    <!-- Diálogo para crear nueva API Key -->
    <v-dialog v-model="showNewKeyDialog" max-width="600">
      <v-card>
        <v-card-title>
          <span class="text-h5">Crear Nueva API Key</span>
        </v-card-title>

        <v-card-text>
          <v-form ref="apiKeyForm">
            <v-text-field
              v-model="nuevaKey.nombre"
              label="Nombre"
              prepend-inner-icon="mdi-label"
              variant="outlined"
              :rules="[v => !!v || 'El nombre es requerido']"
              required
            ></v-text-field>

            <v-text-field
              v-model="nuevaKey.descripcion"
              label="Descripción"
              prepend-inner-icon="mdi-text-box"
              variant="outlined"
              hint="Opcional: propósito de esta API Key"
            ></v-text-field>

            <v-select
              v-model="nuevaKey.permisos"
              :items="permisosDisponibles"
              label="Permisos"
              prepend-inner-icon="mdi-key"
              variant="outlined"
              multiple
              chips
              :rules="[v => v.length > 0 || 'Seleccione al menos un permiso']"
              required
            >
              <template v-slot:selection="{ item, index }">
                <v-chip size="small" class="mr-1">
                  {{ item.title }}
                </v-chip>
              </template>
            </v-select>

            <v-text-field
              v-model="nuevaKey.expiracion"
              label="Fecha de expiración (opcional)"
              prepend-inner-icon="mdi-calendar"
              type="date"
              variant="outlined"
              hint="Dejar vacío para sin expiración"
            ></v-text-field>

            <v-alert type="warning" variant="tonal" class="mt-4" icon="mdi-alert">
              <p class="text-body-2">
                <strong>Importante:</strong> La API Key solo se mostrará una vez después de crearla.
                Asegúrate de guardarla en un lugar seguro.
              </p>
            </v-alert>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="grey" variant="text" @click="showNewKeyDialog = false">Cancelar</v-btn>
              <v-btn color="primary" @click="crearApiKey" :loading="loadingCrear">Crear API Key</v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Diálogo para mostrar API Key creada -->
    <v-dialog v-model="showKeyResult" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
          API Key Creada Exitosamente
        </v-card-title>

        <v-card-text>
          <v-alert type="success" variant="tonal" class="mb-4">
            <p class="text-body-2 font-weight-bold">
              ⚠️ Guarda esta API Key ahora. No podrás verla nuevamente después de cerrar este diálogo.
            </p>
          </v-alert>

          <v-text-field
            :model-value="keyCreada.key"
            label="API Key"
            readonly
            variant="outlined"
            append-inner-icon="mdi-content-copy"
            @click:append-inner="copiarKey"
          ></v-text-field>

          <v-table density="compact" class="mt-4">
            <tbody>
              <tr>
                <td class="font-weight-bold">Nombre:</td>
                <td>{{ keyCreada.nombre }}</td>
              </tr>
              <tr>
                <td class="font-weight-bold">Permisos:</td>
                <td>{{ keyCreada.permisos?.join(', ') }}</td>
              </tr>
              <tr v-if="keyCreada.expiracion">
                <td class="font-weight-bold">Expiración:</td>
                <td>{{ formatDate(keyCreada.expiracion) }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="info" variant="tonal" class="mt-4">
            <p class="text-caption">
              <strong>Uso en curl:</strong><br>
              <code>curl -H "Authorization: Bearer TU_API_KEY" ...</code>
            </p>
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="showKeyResult = false; listarApiKeys()">Entendido</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

export default {
  name: 'ApiKeysView',
  setup() {
    const apiKeys = ref([]);
    const loading = ref(false);
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const loadingCrear = ref(false);
    const showNewKeyDialog = ref(false);
    const showKeyResult = ref(false);
    const keyCreada = ref({});

    const permisosDisponibles = [
      { title: 'Crear facturas', value: 'facturas:crear' },
      { title: 'Leer facturas', value: 'facturas:leer' },
      { title: 'Eliminar facturas', value: 'facturas:eliminar' },
      { title: 'Ver estadísticas', value: 'stats:leer' },
      { title: 'Declarar cotizaciones', value: 'cotizaciones:editar' },
      { title: 'Administrador', value: 'admin' }
    ];

    const headers = [
      { title: 'Nombre', key: 'nombre' },
      { title: 'Permisos', key: 'permisos', sortable: false },
      { title: 'Estado', key: 'activa' },
      { title: 'Expiración', key: 'expiracion' },
      { title: 'Último Uso', key: 'ultimoUso' },
      { title: 'Acciones', key: 'actions', sortable: false }
    ];

    // Paginación client-side
    const totalPages = computed(() => Math.max(1, Math.ceil(apiKeys.value.length / itemsPerPage.value)));

    const apiKeysDisplayadas = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return apiKeys.value.slice(start, end);
    });

    watch(itemsPerPage, () => {
      currentPage.value = 1;
    });

    watch(apiKeys, () => {
      currentPage.value = 1;
    });

    const nuevaKey = ref({
      nombre: '',
      descripcion: '',
      permisos: ['facturas:crear', 'facturas:leer', 'stats:leer'],
      expiracion: ''
    });

    const abrirDialogoNuevaKey = () => {
      console.log('🔑 Abriendo diálogo para nueva API Key');
      // Resetear formulario
      nuevaKey.value = {
        nombre: '',
        descripcion: '',
        permisos: ['facturas:crear', 'facturas:leer', 'stats:leer'],
        expiracion: ''
      };
      showNewKeyDialog.value = true;
      console.log('✅ Diálogo abierto:', showNewKeyDialog.value);
    };

    const listarApiKeys = async () => {
      loading.value = true;
      try {
        const response = await axios.get('/api/api-keys');
        apiKeys.value = response.data.data || [];
      } catch (error) {
        console.error('Error listando API Keys:', error);
        alert('Error al cargar API Keys');
      } finally {
        loading.value = false;
      }
    };

    const crearApiKey = async () => {
      console.log('🔑 Creando API Key...', nuevaKey.value);
      
      // Validar que haya nombre
      if (!nuevaKey.value.nombre) {
        alert('El nombre es requerido');
        return;
      }

      // Validar que haya permisos
      if (!nuevaKey.value.permisos || nuevaKey.value.permisos.length === 0) {
        alert('Seleccione al menos un permiso');
        return;
      }

      loadingCrear.value = true;
      try {
        const body = {
          nombre: nuevaKey.value.nombre,
          descripcion: nuevaKey.value.descripcion || '',
          permisos: nuevaKey.value.permisos,
          expiracion: nuevaKey.value.expiracion || null
        };

        console.log('📤 Enviando petición al backend...', body);
        const response = await axios.post('/api/api-keys', body);
        console.log('✅ Respuesta del backend:', response.data);

        keyCreada.value = response.data.data;
        showKeyResult.value = true;
        showNewKeyDialog.value = false;

        // Resetear formulario
        nuevaKey.value = {
          nombre: '',
          descripcion: '',
          permisos: ['facturas:crear', 'facturas:leer', 'stats:leer'],
          expiracion: ''
        };
      } catch (error) {
        console.error('❌ Error creando API Key:', error);
        console.error('Detalles:', error.response?.data);
        alert('Error al crear API Key: ' + (error.response?.data?.error || error.message));
      } finally {
        loadingCrear.value = false;
      }
    };

    const renovarApiKey = async (key) => {
      if (!confirm(`¿Renovar la API Key "${key.nombre}"?\n\nLa key actual será invalidada.`)) {
        return;
      }

      try {
        const response = await axios.put(`/api/api-keys/${key.id}/renew`);
        keyCreada.value = response.data.data;
        showKeyResult.value = true;
      } catch (error) {
        console.error('Error renovando API Key:', error);
        alert('Error al renovar API Key');
      }
    };

    const confirmarRevocar = async (key) => {
      if (!confirm(`¿Revocar la API Key "${key.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
      }

      try {
        await axios.delete(`/api/api-keys/${key.id}`);
        alert('API Key revocada exitosamente');
        listarApiKeys();
      } catch (error) {
        console.error('Error revocando API Key:', error);
        alert('Error al revocar API Key');
      }
    };

    const copiarKey = () => {
      navigator.clipboard.writeText(keyCreada.value.key);
      alert('API Key copiada al portapapeles');
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('es-PY');
    };

    const formatDateTime = (dateString) => {
      return new Date(dateString).toLocaleString('es-PY');
    };

    onMounted(() => {
      listarApiKeys();
    });

    return {
      apiKeys,
      loading,
      loadingCrear,
      showNewKeyDialog,
      showKeyResult,
      keyCreada,
      nuevaKey,
      permisosDisponibles,
      headers,
      currentPage,
      itemsPerPage,
      totalPages,
      apiKeysDisplayadas,
      listarApiKeys,
      crearApiKey,
      renovarApiKey,
      confirmarRevocar,
      copiarKey,
      formatDate,
      formatDateTime,
      abrirDialogoNuevaKey
    };
  }
};
</script>
