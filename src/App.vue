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

      <v-btn icon @click="checkApiConnection" :loading="loadingApi">
        <v-icon>mdi-refresh</v-icon>
        <v-tooltip activator="parent" location="bottom">Verificar conexión</v-tooltip>
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

        <v-card min-width="260">
          <v-list-item>
            <template v-slot:prepend>
              <v-avatar color="primary" size="40">
                <v-icon color="white">mdi-account</v-icon>
              </v-avatar>
            </template>
            <v-list-item-title v-if="usuario">{{ usuario.nombre }} {{ usuario.apellido }}</v-list-item-title>
            <v-list-item-subtitle v-if="usuario">{{ usuario.email }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="usuario">
            <v-chip size="small" :color="rolColor" variant="tonal" label>
              <v-icon start size="small">{{ rolIcono }}</v-icon>
              {{ rolEtiqueta }}
            </v-chip>
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
      <v-list nav density="comfortable">
        <v-list-item link to="/">
          <v-list-item-title class="text-h6 font-weight-bold">
            DTE-PY
          </v-list-item-title>
          <v-list-item-subtitle>Panel de facturación</v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-2"></v-divider>

        <template v-for="item in menu_items" :key="item.to">
          <v-list-subheader v-if="item.seccion">{{ item.seccion }}</v-list-subheader>
          <v-list-item
            v-else
            link
            :to="item.to"
            :active="item.exacto ? route.path === item.to : route.path.startsWith(item.to)"
            :prepend-icon="item.icono"
          >
            <v-list-item-title>{{ item.titulo }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>

    <v-footer app>
      <span>&copy; {{ new Date().getFullYear() }} DTE-PY - <a class="text-primary" style="text-decoration: none; cursor: pointer;" href="https://jaranetwork.com" target="_blank">Jara Network</a></span>
    </v-footer>

    <AppSnackbar />

    <v-snackbar v-model="snackbarConexion" color="error" :timeout="8000">
      {{ snackbarConexionTexto }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbarConexion = false; mostrarConfigServidor = true">Configurar</v-btn>
        <v-btn variant="text" @click="snackbarConexion = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <ServerConfigDialog v-model="mostrarConfigServidor" />
  </v-app>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { cerrarSesion, useAuth, cargarSesion } from './auth';
import EmpresaSelector from './components/EmpresaSelector.vue';
import ServerConfigDialog from './components/ServerConfigDialog.vue';
import AppSnackbar from './components/AppSnackbar.vue';
import { describirApiBaseUrl, obtenerApiBaseUrl, probarConexion } from './config';
import { establecerEmpresaActiva } from './composables/useEmpresaActiva';

const ROLES = {
  admin: { etiqueta: 'Administrador', color: 'error', icono: 'mdi-shield-crown' },
  contador: { etiqueta: 'Contador', color: 'info', icono: 'mdi-calculator' },
  usuario: { etiqueta: 'Usuario', color: 'primary', icono: 'mdi-account' }
};

export default {
  name: 'App',
  components: {
    EmpresaSelector,
    ServerConfigDialog,
    AppSnackbar
  },
  setup() {
    const drawer = ref(null);
    const route = useRoute();
    const router = useRouter();
    const menu = ref(false);
    const loadingApi = ref(false);
    const apiConnected = ref(false);
    const snackbarConexion = ref(false);
    const snackbarConexionTexto = ref('');

    const apiStatusColor = ref('grey');
    const apiStatusIcon = ref('mdi-help-circle');
    const apiStatusText = ref('Verificando...');

    // Configuración del backend
    const mostrarConfigServidor = ref(false);
    const backendActual = ref(describirApiBaseUrl());

    // Estado de autenticación (reactivo, desde auth.js)
    cargarSesion();
    const { usuario, autenticado, esAdmin, rol } = useAuth();

    const rolEtiqueta = computed(() => ROLES[rol.value]?.etiqueta || rol.value || '');
    const rolColor = computed(() => ROLES[rol.value]?.color || 'grey');
    const rolIcono = computed(() => ROLES[rol.value]?.icono || 'mdi-account');

    // Menú lateral: lo administrativo solo para admin
    const menu_items = computed(() => {
      const items = [
        { to: '/', titulo: 'Dashboard', icono: 'mdi-view-dashboard', exacto: true },
        { to: '/invoices', titulo: 'Documentos', icono: 'mdi-file-document-multiple' },
        { to: '/lotes', titulo: 'Lotes', icono: 'mdi-package-variant-closed' },
        { seccion: 'Configuración' },
        { to: '/empresas', titulo: 'Empresas', icono: 'mdi-office-building' },
        ...(esAdmin.value ? [{ to: '/usuarios', titulo: 'Usuarios y accesos', icono: 'mdi-account-group' }] : []),
        { to: '/cotizaciones', titulo: 'Cotizaciones', icono: 'mdi-currency-usd' },
        { to: '/smtp-providers', titulo: 'Proveedores SMTP', icono: 'mdi-email-fast' },
        { to: '/api-keys', titulo: 'API Keys', icono: 'mdi-key' },
        { seccion: 'Sistema' },
        { to: '/queue-status', titulo: 'Cola de Procesos', icono: 'mdi-clipboard-list-outline' },
        { to: '/logs', titulo: 'Registros', icono: 'mdi-clipboard-text-clock' }
      ];
      if (esAdmin.value) {
        items.push({ to: '/mantenimiento', titulo: 'Mantenimiento', icono: 'mdi-wrench' });
      }
      return items;
    });

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

    // Cambiar empresa: una sola fuente de verdad + reflejo en la URL
    const cambiarEmpresa = (empresaRuc) => {
      const valor = empresaRuc && empresaRuc !== 'all' ? empresaRuc : null;
      establecerEmpresaActiva(valor);
      const query = { ...route.query };
      if (valor) query.empresa = valor; else delete query.empresa;
      delete query.page;
      router.replace({ path: route.path, query }).catch(() => {});
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
      } else {
        apiConnected.value = false;
        apiStatusColor.value = 'error';
        apiStatusIcon.value = 'mdi-close-circle';
        apiStatusText.value = 'Sin conexión';
        snackbarConexionTexto.value = `${backendActual.value}: ${mensaje}`;
        snackbarConexion.value = true;
      }

      loadingApi.value = false;
    };

    onMounted(() => {
      checkApiConnection();
    });

    return {
      drawer,
      route,
      menu,
      menu_items,
      usuario,
      autenticado,
      rolEtiqueta,
      rolColor,
      rolIcono,
      isLoginPage,
      apiConnected,
      loadingApi,
      apiStatusColor,
      apiStatusIcon,
      apiStatusText,
      snackbarConexion,
      snackbarConexionTexto,
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
.text-mono {
  font-family: 'Courier New', Courier, monospace;
}
</style>
