<template>
  <v-app>
    <v-app-bar v-if="!isLoginPage" app color="primary" dark>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Facturación Electrónica Paraguay</v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- Selector de empresa -->
      <div v-if="autenticado" class="mr-4" style="max-width: 300px; min-width: 250px;">
        <EmpresaSelector @cambio-empresa="cambiarEmpresa" />
      </div>

      <v-chip :color="apiStatusColor" class="mr-2" variant="flat" size="small">
        <v-icon start size="small">{{ apiStatusIcon }}</v-icon>
        {{ apiStatusText }}
        <v-tooltip activator="parent" location="bottom">{{ backendActual }}</v-tooltip>
      </v-chip>

      <v-btn icon @click="checkApiConnection">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <v-btn icon @click="mostrarConfigServidor = true">
        <v-icon>mdi-server-network</v-icon>
        <v-tooltip activator="parent" location="bottom">
          Servidor: {{ backendActual }}
        </v-tooltip>
      </v-btn>

      <!-- Menú de usuario -->
      <v-menu v-model="menu" :close-on-content-click="false" location="end">
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-account</v-icon>
          </v-btn>
        </template>

        <v-card min-width="250">
          <v-list-item>
            <template v-slot:prepend>
              <v-avatar color="primary" size="40">
                <v-icon color="white">mdi-account</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title v-if="usuario">{{ usuario.nombre }} {{ usuario.apellido }}</v-list-item-title>
            <v-list-item-subtitle v-if="usuario">{{ usuario.email }}</v-list-item-subtitle>
          </v-list-item>

          <v-divider></v-divider>

          <v-list-item link @click="cerrarSesion">
            <template v-slot:prepend>
              <v-icon color="error">mdi-logout</v-icon>
            </template>
            <v-list-item-title class="text-error">Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-card>
      </v-menu>
    </v-app-bar>

    <v-navigation-drawer v-if="!isLoginPage" v-model="drawer" app>
      <v-list>
        <v-list-item link to="/">
          <v-list-item-title class="text-h6 font-weight-bold">
            DTE-PY Dashboard
          </v-list-item-title>
        </v-list-item>

        <v-divider class="my-4"></v-divider>

        <v-list-item link to="/" :active="route.path === '/'">
          <template v-slot:prepend>
            <v-icon>mdi-view-dashboard</v-icon>
          </template>
          <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/invoices" :active="route.path === '/invoices'">
          <template v-slot:prepend>
            <v-icon>mdi-file-document-multiple</v-icon>
          </template>
          <v-list-item-title>Facturas</v-list-item-title>
        </v-list-item>
        
        <v-list-item link to="/lotes" :active="route.path.startsWith('/lotes')">
          <template v-slot:prepend>
            <v-icon>mdi-package-variant-closed</v-icon>
          </template>
          <v-list-item-title>Lotes</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/empresas" :active="route.path === '/empresas'">
          <template v-slot:prepend>
            <v-icon>mdi-office-building</v-icon>
          </template>
          <v-list-item-title>Empresas</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/api-keys" :active="route.path === '/api-keys'">
          <template v-slot:prepend>
            <v-icon>mdi-key</v-icon>
          </template>
          <v-list-item-title>API Keys</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/cotizaciones" :active="route.path === '/cotizaciones'">
          <template v-slot:prepend>
            <v-icon>mdi-currency-usd</v-icon>
          </template>
          <v-list-item-title>Cotizaciones</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/queue-status" :active="route.path === '/queue-status'">
          <template v-slot:prepend>
            <v-icon>mdi-clipboard-list-outline</v-icon>
          </template>
          <v-list-item-title>Cola de Procesos</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/logs" :active="route.path === '/logs'">
          <template v-slot:prepend>
            <v-icon>mdi-clipboard-text-clock</v-icon>
          </template>
          <v-list-item-title>Registros</v-list-item-title>
        </v-list-item>

        <v-list-item link to="/mantenimiento" :active="route.path === '/mantenimiento'">
          <template v-slot:prepend>
            <v-icon>mdi-wrench</v-icon>
          </template>
          <v-list-item-title>Mantenimiento</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} DTE-PY - <a class="text-primary" style="text-decoration: none; cursor: pointer;" href="https://jaranetwork.com" target="_blank">Jara Network</a></span>
    </v-footer>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="5000">
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn
          v-if="!apiConnected"
          variant="text"
          @click="snackbar = false; mostrarConfigServidor = true"
        >
          Configurar
        </v-btn>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <ServerConfigDialog v-model="mostrarConfigServidor" />
  </v-app>
</template>

<script>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cerrarSesion } from './auth';
import EmpresaSelector from './components/EmpresaSelector.vue';
import ServerConfigDialog from './components/ServerConfigDialog.vue';
import { describirApiBaseUrl, obtenerApiBaseUrl, probarConexion } from './config';

export default {
  name: 'App',
  components: {
    EmpresaSelector,
    ServerConfigDialog
  },
  setup() {
    const drawer = ref(null);
    const route = useRoute();
    const router = useRouter();
    const menu = ref(false);
    const usuario = ref(null);
    const apiConnected = ref(false);
    const loadingApi = ref(false);
    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('info');

    const apiStatusColor = ref('grey');
    const apiStatusIcon = ref('mdi-help-circle');
    const apiStatusText = ref('Verificando...');

    // Configuración del backend
    const mostrarConfigServidor = ref(false);
    const backendActual = ref(describirApiBaseUrl());

    // Estado de autenticación
    const autenticado = ref(false);

    // Cargar estado del drawer desde localStorage
    const drawerSaved = localStorage.getItem('sidebar-drawer');
    if (drawerSaved !== null) {
      drawer.value = drawerSaved === 'true';
    }

    // Guardar estado del drawer en localStorage cuando cambie
    watch(drawer, (newValue) => {
      localStorage.setItem('sidebar-drawer', String(newValue));
    });

    // Computed para verificar si es página de login
    const isLoginPage = computed(() => route.path === '/login');

    // Cargar información del usuario
    const cargarUsuario = () => {
      const usuarioStr = localStorage.getItem('usuario');
      const token = localStorage.getItem('token');
      if (usuarioStr && token) {
        usuario.value = JSON.parse(usuarioStr);
        autenticado.value = true;
      } else {
        autenticado.value = false;
      }
    };

    // Cambiar empresa - guardar en localStorage y actualizar URL
    const cambiarEmpresa = (empresaRuc) => {
      console.log('Empresa cambiada (RUC):', empresaRuc);
      localStorage.setItem('filtro-empresa', empresaRuc);
      // Actualizar query param para que las vistas reaccionen
      router.replace({ 
        path: route.path, 
        query: { ...route.query, empresa: empresaRuc } 
      }).catch(() => {});
    };

    const checkApiConnection = async () => {
      loadingApi.value = true;
      apiStatusColor.value = 'grey';
      apiStatusIcon.value = 'mdi-loading';
      apiStatusText.value = 'Verificando...';

      const { ok, mensaje } = await probarConexion(obtenerApiBaseUrl(), 5000);

      if (ok) {
        apiConnected.value = true;
        apiStatusColor.value = 'success';
        apiStatusIcon.value = 'mdi-check-circle';
        apiStatusText.value = 'Conectado';
        // No mostrar mensaje cuando hay conexión exitosa
      } else {
        apiConnected.value = false;
        apiStatusColor.value = 'error';
        apiStatusIcon.value = 'mdi-close-circle';
        apiStatusText.value = 'Sin conexión';
        snackbarText.value = `${backendActual.value}: ${mensaje}`;
        snackbarColor.value = 'error';
        snackbar.value = true;
      }

      loadingApi.value = false;
    };

    onMounted(() => {
      cargarUsuario();
      checkApiConnection();
    });

    return {
      drawer,
      route,
      menu,
      usuario,
      autenticado,
      isLoginPage,
      apiConnected,
      loadingApi,
      apiStatusColor,
      apiStatusIcon,
      apiStatusText,
      snackbar,
      snackbarText,
      snackbarColor,
      mostrarConfigServidor,
      backendActual,
      checkApiConnection,
      cerrarSesion,
      cambiarEmpresa
    };
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
