<template>
  <v-container fluid class="fill-height d-flex align-center justify-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <v-card class="elevation-12" max-width="400" width="100%">
      <v-card-title class="text-center">
        <h2 class="text-h4 font-weight-bold">
          <v-icon color="primary" size="large" class="mr-2">mdi-file-document-outline</v-icon>
          DTE-PY
        </h2>
        <p class="text-subtitle-1 mt-2">Facturación Electrónica Paraguay</p>
      </v-card-title>

      <v-card-text>
        <v-form ref="loginForm" @submit.prevent="handleLogin">
          <v-text-field
            v-model="username"
            label="Usuario o Email"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            autocomplete="username"
            :rules="[v => !!v || 'El usuario es requerido']"
          ></v-text-field>

          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Contraseña"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            variant="outlined"
            autocomplete="current-password"
            :rules="[v => !!v || 'La contraseña es requerida']"
            class="mt-3"
          ></v-text-field>

          <v-alert v-if="error" type="error" variant="tonal" class="mt-4" icon="mdi-alert-circle">
            {{ error }}
          </v-alert>

          <v-btn type="submit" color="primary" block class="mt-6" size="large" :loading="loading">
            <v-icon start>mdi-login</v-icon>
            Iniciar Sesión
          </v-btn>
        </v-form>

        <v-alert type="info" variant="tonal" class="mt-6" icon="mdi-information">
          <p class="text-caption mb-0">
            <strong>Nota:</strong> Solo los usuarios autorizados pueden acceder al sistema.
            Si necesitás una cuenta, pedísela al administrador.
          </p>
        </v-alert>

        <v-divider class="mt-6"></v-divider>

        <div class="d-flex justify-center mt-2">
          <v-btn variant="text" size="small" class="text-none" @click="mostrarConfigServidor = true">
            <v-icon start size="small">mdi-server-network</v-icon>
            <span class="d-inline-block text-truncate" style="max-width: 240px;">
              Servidor: {{ backendActual }}
            </span>
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <ServerConfigDialog v-model="mostrarConfigServidor" />
  </v-container>
</template>

<script>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import ServerConfigDialog from './ServerConfigDialog.vue';
import { describirApiBaseUrl } from '../config';
import { guardarSesion } from '../auth';

export default {
  name: 'LoginView',
  components: { ServerConfigDialog },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loginForm = ref(null);
    const username = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);
    const showPassword = ref(false);
    const mostrarConfigServidor = ref(false);
    const backendActual = ref(describirApiBaseUrl());

    const handleLogin = async () => {
      error.value = '';
      // Validar antes de pegarle al backend: cada intento fallido cuenta para
      // el límite de 10 por 15 minutos, no vale la pena gastarlos en un
      // formulario vacío.
      const { valid } = await loginForm.value.validate();
      if (!valid) return;

      loading.value = true;
      try {
        const response = await axios.post('/api/auth/login', {
          username: username.value.trim(),
          password: password.value
        });

        if (response.data.success && response.data.data?.token) {
          guardarSesion(response.data.data.token, response.data.data.usuario);
          // Volver adonde el usuario quería ir (solo rutas internas)
          const volver = typeof route.query.volver === 'string' && route.query.volver.startsWith('/') ? route.query.volver : '/';
          await router.replace(volver);
          // Recargar para que App.vue arranque con la sesión nueva
          window.location.reload();
        } else {
          error.value = response.data.error || response.data.message || 'No se pudo iniciar sesión';
        }
      } catch (err) {
        if (err.response) {
          error.value = err.response.data?.error || err.response.data?.message || 'Error al iniciar sesión';
        } else {
          error.value = `No se pudo conectar con el backend (${backendActual.value}). Revisá la configuración del servidor.`;
        }
      } finally {
        loading.value = false;
      }
    };

    return { loginForm, username, password, error, loading, showPassword, handleLogin, mostrarConfigServidor, backendActual };
  }
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
