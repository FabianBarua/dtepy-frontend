<template>
  <v-container fluid>
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="4000" location="top">
      <v-icon start size="large">{{ snackbarIcon }}</v-icon>
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-card>
      <v-card-title>
        <h2>Mantenimiento</h2>
      </v-card-title>
      <v-card-text>
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon start color="error">mdi-database</v-icon>
            Base de Datos
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Elimina las facturas de prueba y sus registros de operaciones (rechazadas, con error, encoladas). Los documentos que existen en SET (aprobados, observados o cancelados, con CDC) se conservan siempre: son comprobantes fiscales.
              Esta acción no se puede deshacer.
            </p>
            <v-btn
              color="error"
              variant="tonal"
              @click="confirmClearDatabase"
            >
              <v-icon start>mdi-delete-empty</v-icon>
              Limpiar Base de Datos
            </v-btn>
          </v-card-text>
        </v-card>

        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon start color="warning">mdi-clipboard-text-remove</v-icon>
            Registros de Operación
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Elimina los registros de operación de la base de datos según su tipo.
            </p>
            <v-menu v-model="logsMenuOpen" :close-on-content-click="false" location="end">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  color="warning"
                  variant="tonal"
                >
                  <v-icon start>mdi-delete-sweep</v-icon>
                  Limpiar Registros
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="confirmClearLogs('all')">
                  <v-list-item-title>Todos los registros</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item @click="confirmClearLogs('error')">
                  <v-list-item-title>Solo errores</v-list-item-title>
                </v-list-item>
                <v-list-item @click="confirmClearLogs('success')">
                  <v-list-item-title>Solo éxitos</v-list-item-title>
                </v-list-item>
                <v-list-item @click="confirmClearLogs('warning')">
                  <v-list-item-title>Solo advertencias</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon start color="error">mdi-receipt-text-remove</v-icon>
            Jobs en Cola
          </v-card-title>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Elimina los jobs de las colas de facturación y PDF (KUDE) según su estado.
            </p>
            <v-menu v-model="queueMenuOpen" :close-on-content-click="false" location="end">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  color="error"
                  variant="tonal"
                >
                  <v-icon start>mdi-delete-forever</v-icon>
                  Limpiar Jobs
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="confirmClearQueue('completed')">
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle</v-icon>
                  </template>
                  <v-list-item-title>Completados</v-list-item-title>
                </v-list-item>
                <v-list-item @click="confirmClearQueue('failed')">
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-alert-circle</v-icon>
                  </template>
                  <v-list-item-title>Fallidos</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item @click="confirmClearQueue('all')">
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-delete-forever</v-icon>
                  </template>
                  <v-list-item-title>Todos</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-card-text>
        </v-card>
      </v-card-text>
    </v-card>

    <v-dialog v-model="clearDialog" max-width="450" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-error text-white">
          <v-icon start>mdi-database-remove</v-icon>
          Eliminar TODAS las Facturas
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="clearDialog = false"
            :disabled="clearing"
            color="white"
          ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-alert type="warning" variant="tonal" icon="mdi-alert" class="mb-3">
            <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente las facturas que nunca llegaron a SET, <strong>de todas las empresas</strong>. Los documentos aprobados, observados o cancelados en SET se conservan.
          </v-alert>
          <p class="text-body-1">
            ¿Estás <strong>SEGURO</strong> de que deseas continuar?
          </p>
          <p class="text-body-2 text-medium-emphasis">
            Esta acción <strong>no se puede deshacer</strong>. Se eliminarán:
          </p>
          <ul class="text-body-2 text-medium-emphasis">
            <li>Todas las facturas registradas</li>
            <li>Los logs de operaciones asociados</li>
            <li>Las referencias a archivos XML y PDF</li>
          </ul>
          <v-text-field
            v-model="passwordConfirm"
            type="password"
            label="Ingrese su contraseña para confirmar"
            prepend-inner-icon="mdi-lock"
            variant="outlined"
            density="compact"
            class="mt-3"
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="clearDialog = false; passwordConfirm = ''"
            :disabled="clearing"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="tonal"
            @click="executeClearDatabase"
            :loading="clearing"
          >
            <v-icon start>mdi-delete-forever</v-icon>
            Eliminar Todo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="logsDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-white" :class="logsDialogType === 'error' ? 'bg-error' : 'bg-warning'">
          <v-icon start>mdi-alert</v-icon>
          {{ logsDialogTitle }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert
            v-if="logsDialogType === 'all'"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Esta acción eliminará todos los registros de operaciones.
          </v-alert>
          <v-alert
            v-else
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Esta acción eliminará solo los registros con estado <strong>{{ logsDialogType }}</strong>.
          </v-alert>
          <p>¿Está seguro de continuar?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="outlined"
            @click="logsDialog = false"
            :disabled="clearingLogs"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="executeClearLogs"
            :loading="clearingLogs"
          >
            <v-icon start>mdi-delete</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="queueDialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-white" :class="queueDialogType === 'all' ? 'bg-error' : 'bg-warning'">
          <v-icon start>mdi-alert</v-icon>
          {{ queueDialogTitle }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-alert
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            Esta acción eliminará los jobs
            <template v-if="queueDialogType === 'completed'"> completados</template>
            <template v-else-if="queueDialogType === 'failed'"> fallidos</template>
            <template v-else>TODOS los jobs (completados, fallidos, en espera y activos)</template>.
          </v-alert>
          <p>¿Está seguro de continuar?</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="outlined"
            @click="queueDialog = false"
            :disabled="clearingQueue"
          >
            Cancelar
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="executeClearQueue"
            :loading="clearingQueue"
          >
            <v-icon start>mdi-delete</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, computed } from 'vue';
import axios from 'axios';

export default {
  name: 'MantenimientoView',
  setup() {
    const clearDialog = ref(false);
    const clearing = ref(false);
    const passwordConfirm = ref('');

    const logsMenuOpen = ref(false);
    const logsDialog = ref(false);
    const logsDialogType = ref('all');
    const clearingLogs = ref(false);

    const logsDialogTitle = computed(() => {
      const titulos = {
        all: 'Eliminar Todos los Registros',
        error: 'Eliminar Registros de Error',
        success: 'Eliminar Registros de Éxito',
        warning: 'Eliminar Registros de Advertencia'
      };
      return titulos[logsDialogType.value] || 'Eliminar Registros';
    });

    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('info');
    const snackbarIcon = ref('mdi-information');

    const confirmClearDatabase = () => {
      clearDialog.value = true;
    };

    const executeClearDatabase = async () => {
      if (!passwordConfirm.value) {
        snackbarText.value = '❌ Debe ingresar su contraseña';
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
        return;
      }
      clearing.value = true;
      try {
        const response = await axios.delete('/api/invoices/clear', {
          data: { password: passwordConfirm.value }
        });

        snackbarText.value = `✅ ${response.data.message}`;
        snackbarColor.value = 'success';
        snackbarIcon.value = 'mdi-check-circle';
        snackbar.value = true;

        clearDialog.value = false;
        passwordConfirm.value = '';
      } catch (error) {
        console.error('Error limpiando base de datos:', error);
        snackbarText.value = `❌ ${error.response?.data?.message || error.response?.data?.error || error.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
        passwordConfirm.value = '';
      } finally {
        clearing.value = false;
      }
    };

    const queueMenuOpen = ref(false);
    const queueDialog = ref(false);
    const queueDialogType = ref('all');
    const clearingQueue = ref(false);

    const queueDialogTitle = computed(() => {
      const titulos = {
        completed: 'Limpiar Jobs Completados',
        failed: 'Limpiar Jobs Fallidos',
        all: 'Limpiar TODOS los Jobs'
      };
      return titulos[queueDialogType.value] || 'Limpiar Jobs';
    });

    const confirmClearQueue = (tipo) => {
      queueDialogType.value = tipo;
      queueDialog.value = true;
      queueMenuOpen.value = false;
    };

    const executeClearQueue = async () => {
      clearingQueue.value = true;
      try {
        const endpoint = {
          completed: '/api/queue/clear-completed',
          failed: '/api/queue/clear-failed',
          all: '/api/queue/clear-all'
        }[queueDialogType.value];

        const resultados = await Promise.allSettled([
          axios.post(endpoint, { queue: 'facturacion' }),
          axios.post(endpoint, { queue: 'kude' })
        ]);
        const texto = (r, nombre) => r.status === 'fulfilled'
          ? `${nombre}: ${r.value.data.message}`
          : `${nombre}: ERROR ${r.reason?.response?.data?.message || r.reason?.response?.data?.error || r.reason?.message}`;
        const huboError = resultados.some(r => r.status === 'rejected');
        snackbarText.value = `${huboError ? '⚠️' : '✅'} ${texto(resultados[0], 'Facturación')} · ${texto(resultados[1], 'KUDE')}`;
        snackbarColor.value = huboError ? 'warning' : 'success';
        snackbarIcon.value = huboError ? 'mdi-alert' : 'mdi-check-circle';
        snackbar.value = true;
        queueDialog.value = false;
      } catch (error) {
        console.error('Error al limpiar jobs:', error);
        snackbarText.value = `❌ ${error.response?.data?.message || error.response?.data?.error || error.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        clearingQueue.value = false;
      }
    };

    const confirmClearLogs = (tipo) => {
      logsDialogType.value = tipo;
      logsDialog.value = true;
      logsMenuOpen.value = false;
    };

    const executeClearLogs = async () => {
      clearingLogs.value = true;
      try {
        const response = await axios.delete(`/api/logs/clear?tipo=${logsDialogType.value}`);

        snackbarText.value = `✅ ${response.data.message}`;
        snackbarColor.value = 'success';
        snackbarIcon.value = 'mdi-check-circle';
        snackbar.value = true;
        logsDialog.value = false;
      } catch (error) {
        console.error('Error al limpiar logs:', error);
        snackbarText.value = `❌ ${error.response?.data?.message || error.response?.data?.error || error.message}`;
        snackbarColor.value = 'error';
        snackbarIcon.value = 'mdi-alert-circle';
        snackbar.value = true;
      } finally {
        clearingLogs.value = false;
      }
    };

    return {
      clearDialog,
      clearing,
      passwordConfirm,
      snackbar,
      snackbarText,
      snackbarColor,
      snackbarIcon,
      confirmClearDatabase,
      executeClearDatabase,
      logsMenuOpen,
      logsDialog,
      logsDialogType,
      logsDialogTitle,
      clearingLogs,
      confirmClearLogs,
      executeClearLogs,
      queueMenuOpen,
      queueDialog,
      queueDialogType,
      queueDialogTitle,
      clearingQueue,
      confirmClearQueue,
      executeClearQueue
    };
  }
};
</script>
