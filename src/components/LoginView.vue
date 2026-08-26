<template>
  <v-container fluid class="fill-height d-flex align-center justify-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <v-card class="elevation-12" max-width="400">
      <v-card-title class="text-center">
        <h2 class="text-h4 font-weight-bold">
          <v-icon color="primary" size="large" class="mr-2">mdi-file-document-outline</v-icon>
          DTE-PY
        </h2>
        <p class="text-subtitle-1 mt-2">Facturación Electrónica Paraguay</p>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleLogin" ref="loginForm">
          <v-text-field
            v-model="username"
            label="Usuario o Email"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            :rules="[v => !!v || 'El usuario es requerido']"
            required
          ></v-text-field>

          <v-text-field
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            label="Contraseña"
            prepend-inner-icon="mdi-lock"
            :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showPassword = !showPassword"
            variant="outlined"
            :rules="[v => !!v || 'La contraseña es requerida']"
            required
            class="mt-3"
          ></v-text-field>

          <v-alert
            v-if="error"
            type="error"
            variant="tonal"
            class="mt-4"
            icon="mdi-alert-circle"
          >
            {{ error }}
          </v-alert>

          <v-btn
            type="submit"
            color="primary"
            block
            class="mt-6"
            size="large"
            :loading="loading"
          >
            <v-icon start>mdi-login</v-icon>
            Iniciar Sesión
          </v-btn>
        </v-form>

        <v-alert
          type="info"
          variant="tonal"
          class="mt-6"
          icon="mdi-information"
        >
          <p class="text-caption">
            <strong>Nota:</strong> Solo los usuarios autorizados pueden acceder al sistema. 
            Si necesitas una cuenta, contacta al administrador.
          </p>
        </v-alert>

        <v-divider class="mt-6"></v-divider>

        <div class="d-flex justify-center mt-2">
          <v-btn
            variant="text"
            size="small"
            class="text-none"
            @click="mostrarConfigServidor = true"
          >
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
import axios from 'axios';
import ServerConfigDialog from './ServerConfigDialog.vue';
import { describirApiBaseUrl } from '../config';

export default {
  name: 'LoginView',
  components: {
    ServerConfigDialog
  },
  setup() {
    const username = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);
    const showPassword = ref(false);
    const mostrarConfigServidor = ref(false);
    const backendActual = ref(describirApiBaseUrl());

    const handleLogin = async () => {
      error.value = '';
      loading.value = true;

      try {
        const response = await axios.post('/api/auth/login', {
          username: username.value,
          password: password.value
        });

        if (response.data.success) {
          // Guardar token y usuario en localStorage
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('usuario', JSON.stringify(response.data.data.usuario));
          
          // Redirigir al dashboard
          window.location.href = '/';
        }
      } catch (err) {
        if (err.response) {
          error.value = err.response.data?.error || 'Error al iniciar sesión';
        } else {
          // Sin respuesta: backend caído, URL equivocada o CORS bloqueado
          error.value = `No se pudo conectar con el backend (${backendActual.value}). ` +
            'Revisá la configuración del servidor.';
        }
      } finally {
        loading.value = false;
      }
    };

    return {
      username,
      password,
      error,
      loading,
      showPassword,
      handleLogin,
      mostrarConfigServidor,
      backendActual
    };
  }
};
</script>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
