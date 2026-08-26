<template>
  <v-dialog :model-value="modelValue" @update:model-value="cerrar" max-width="560" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-server-network</v-icon>
        Servidor backend
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">
          URL del backend DTE-PY al que se conecta esta pantalla.
          Dejalo vacío para usar el mismo dominio del frontend
          (útil cuando hay un proxy de nginx delante).
        </p>

        <v-text-field
          v-model="url"
          label="URL del backend"
          placeholder="https://api.midominio.com"
          prepend-inner-icon="mdi-link-variant"
          variant="outlined"
          clearable
          :error-messages="errorValidacion ? [errorValidacion] : []"
          hint="Ejemplos: http://192.168.1.50:8081 · https://api.midominio.com"
          persistent-hint
          @keyup.enter="probar"
        ></v-text-field>

        <div class="d-flex align-center flex-wrap ga-2 mt-4">
          <v-chip size="small" variant="tonal" color="primary">
            <v-icon start size="small">mdi-information-outline</v-icon>
            Actual: {{ descripcionActual }}
          </v-chip>
          <v-chip size="small" variant="tonal">
            {{ origenActual }}
          </v-chip>
        </div>

        <v-alert
          v-if="resultado"
          :type="resultado.ok ? 'success' : 'error'"
          variant="tonal"
          density="comfortable"
          class="mt-4"
        >
          {{ resultado.mensaje }}
        </v-alert>

        <v-alert
          v-if="urlNormalizada && esOtroOrigen"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mt-4"
        >
          <p class="text-caption mb-0">
            El backend está en otro origen, así que tiene que permitirlo por CORS.
            En el backend, en <code>.env</code>:
            <br />
            <code>CORS_ORIGINS={{ origenFrontend }}</code>
          </p>
        </v-alert>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-btn
          variant="text"
          :disabled="!hayOverride"
          @click="restablecer"
        >
          <v-icon start>mdi-backup-restore</v-icon>
          Restablecer
        </v-btn>

        <v-spacer></v-spacer>

        <v-btn variant="text" @click="cerrar(false)">Cancelar</v-btn>

        <v-btn
          variant="tonal"
          :loading="probando"
          :disabled="Boolean(errorValidacion)"
          @click="probar"
        >
          <v-icon start>mdi-lan-connect</v-icon>
          Probar
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :disabled="Boolean(errorValidacion)"
          @click="guardar"
        >
          <v-icon start>mdi-content-save</v-icon>
          Guardar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { ref, computed, watch } from 'vue';
import {
  ORIGENES,
  obtenerConfigApi,
  describirApiBaseUrl,
  guardarApiBaseUrl,
  restablecerApiBaseUrl,
  normalizarUrl,
  validarUrl,
  probarConexion,
  tieneOverrideLocal
} from '../config';

export default {
  name: 'ServerConfigDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'guardado'],
  setup(props, { emit }) {
    const url = ref('');
    const resultado = ref(null);
    const probando = ref(false);
    const descripcionActual = ref('');
    const origenActual = ref('');
    const hayOverride = ref(false);

    const refrescarEstado = () => {
      const config = obtenerConfigApi();
      descripcionActual.value = describirApiBaseUrl();
      origenActual.value = ORIGENES[config.origen];
      hayOverride.value = tieneOverrideLocal();
      url.value = config.url;
    };

    // Al abrir, recargar el valor vigente y limpiar el resultado anterior
    watch(
      () => props.modelValue,
      (abierto) => {
        if (abierto) {
          resultado.value = null;
          refrescarEstado();
        }
      },
      { immediate: true }
    );

    const urlNormalizada = computed(() => normalizarUrl(url.value));
    const errorValidacion = computed(() => validarUrl(url.value));
    const origenFrontend = computed(() => window.location.origin);
    const esOtroOrigen = computed(
      () => Boolean(urlNormalizada.value) && urlNormalizada.value !== window.location.origin
    );

    const cerrar = (valor = false) => {
      emit('update:modelValue', Boolean(valor));
    };

    const probar = async () => {
      if (errorValidacion.value) return;
      probando.value = true;
      resultado.value = null;
      try {
        resultado.value = await probarConexion(urlNormalizada.value);
      } finally {
        probando.value = false;
      }
    };

    // Guardar recarga la página: es la forma más simple de que todas las
    // vistas abiertas vuelvan a pedir los datos al backend nuevo.
    const aplicarYRecargar = () => {
      emit('guardado');
      cerrar(false);
      window.location.reload();
    };

    const guardar = () => {
      if (errorValidacion.value) return;
      guardarApiBaseUrl(url.value);
      aplicarYRecargar();
    };

    const restablecer = () => {
      restablecerApiBaseUrl();
      aplicarYRecargar();
    };

    return {
      url,
      urlNormalizada,
      errorValidacion,
      resultado,
      probando,
      descripcionActual,
      origenActual,
      hayOverride,
      origenFrontend,
      esOtroOrigen,
      cerrar,
      probar,
      guardar,
      restablecer
    };
  }
};
</script>
