<template>
  <v-snackbar
    :model-value="estado.visible"
    :color="estado.color"
    :timeout="estado.timeout"
    location="top"
    @update:model-value="(v) => { if (!v) cerrar(); }"
  >
    <div class="d-flex align-center">
      <v-icon start>{{ estado.icono }}</v-icon>
      <span>{{ estado.texto }}</span>
    </div>
    <template #actions>
      <v-btn variant="text" @click="cerrar">Cerrar</v-btn>
    </template>
  </v-snackbar>
</template>

<script>
import { useNotificaciones } from '../composables/useNotificaciones';

export default {
  name: 'AppSnackbar',
  setup() {
    const { estado, cerrar } = useNotificaciones();
    return { estado, cerrar };
  }
};
</script>
