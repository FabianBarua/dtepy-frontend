import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import axios from 'axios'
import App from './App.vue'

// Importar Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Importar autenticación
import { cargarSesion, cerrarSesion, rolActual, refrescarSesion } from './auth'

// Importar configuración (URL del backend)
import { aplicarApiBaseUrl, describirApiBaseUrl } from './config'

// Configurar axios: la URL del backend sale de config.js
// (navegador > public/config.js > VITE_API_BASE_URL > mismo origen)
aplicarApiBaseUrl();
console.log(`🔌 Backend: ${describirApiBaseUrl()}`);

// Interceptor para agregar token a todas las peticiones
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  response => response,
  error => {
    // Solo redirigir a login si el error es en una ruta protegida
    // y no estamos ya en la página de login
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      cerrarSesion();
    }
    return Promise.reject(error);
  }
);

// Rutas con carga diferida: cada vista es su propio chunk, así el primer
// render no baja el bundle entero (antes: un solo archivo de 1 MB).
const routes = [
  { path: '/login', component: () => import('./components/LoginView.vue'), meta: { requiereAuth: false } },
  { path: '/', component: () => import('./components/DashboardView.vue'), meta: { requiereAuth: true } },
  { path: '/invoices', component: () => import('./components/InvoiceListView.vue'), meta: { requiereAuth: true } },
  { path: '/invoices/:id', component: () => import('./components/InvoiceDetailView.vue'), props: true, meta: { requiereAuth: true } },
  { path: '/empresas', component: () => import('./components/EmpresasView.vue'), meta: { requiereAuth: true } },
  { path: '/logs', component: () => import('./components/LogsView.vue'), meta: { requiereAuth: true } },
  { path: '/api-keys', component: () => import('./components/ApiKeysView.vue'), meta: { requiereAuth: true } },
  { path: '/queue-status', component: () => import('./components/QueueStatusView.vue'), meta: { requiereAuth: true } },
  { path: '/lotes', component: () => import('./components/LotesView.vue'), meta: { requiereAuth: true } },
  { path: '/lotes/:id', component: () => import('./components/LoteDetailView.vue'), meta: { requiereAuth: true } },
  { path: '/mantenimiento', component: () => import('./components/MantenimientoView.vue'), meta: { requiereAuth: true, soloAdmin: true } },
  { path: '/usuarios', component: () => import('./components/UsuariosView.vue'), meta: { requiereAuth: true, soloAdmin: true } },
  { path: '/cotizaciones', component: () => import('./components/CotizacionesView.vue'), meta: { requiereAuth: true } },
  { path: '/smtp-providers', component: () => import('./components/SmtpProvidersView.vue'), meta: { requiereAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

// Crear router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Sesión guardada + una consulta al backend por carga: el rol pudo cambiar
// desde el último inicio de sesión (lo administra un admin en Usuarios). La
// primera navegación espera esa respuesta para decidir con el rol real.
cargarSesion();
const sesionAlDia = refrescarSesion();

// Proteger rutas
router.beforeEach(async (to) => {
  await sesionAlDia;
  const requiereAuth = to.meta.requiereAuth === true;
  const token = localStorage.getItem('token');

  if (to.path === '/login') {
    // Si ya está logueado, redirigir al dashboard
    return token ? '/' : true;
  }
  if (requiereAuth && !token) {
    return { path: '/login', query: to.fullPath !== '/' ? { volver: to.fullPath } : {} };
  }
  if (to.meta.soloAdmin && rolActual() !== 'admin') {
    return '/';
  }
  return true;
});

// Configurar Vuetify
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107'
        }
      }
    }
  }
})

// Crear aplicación
const app = createApp(App)

app.use(router)
app.use(vuetify)
app.mount('#app')
