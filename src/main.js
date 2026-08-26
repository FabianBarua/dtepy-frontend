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

// Importar componentes
import DashboardView from './components/DashboardView.vue'
import InvoiceListView from './components/InvoiceListView.vue'
import InvoiceDetailView from './components/InvoiceDetailView.vue'
import LogsView from './components/LogsView.vue'
import LoginView from './components/LoginView.vue'
import ApiKeysView from './components/ApiKeysView.vue'
import EmpresasView from './components/EmpresasView.vue'
import QueueStatusView from './components/QueueStatusView.vue'
import LotesView from './components/LotesView.vue'
import LoteDetailView from './components/LoteDetailView.vue'
import MantenimientoView from './components/MantenimientoView.vue'

// Importar autenticación
import { cargarSesion, cerrarSesion } from './auth'

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
  error => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  response => response,
  error => {
    // Solo redirigir a login si el error es en una ruta protegida
    // y no estamos ya en la página de login
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      cerrarSesion();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Definir rutas
const routes = [
  { path: '/login', component: LoginView, meta: { requiereAuth: false } },
  { path: '/', component: DashboardView, meta: { requiereAuth: true } },
  { path: '/invoices', component: InvoiceListView, meta: { requiereAuth: true } },
  { path: '/invoices/:id', component: InvoiceDetailView, props: true, meta: { requiereAuth: true } },
  { path: '/empresas', component: EmpresasView, meta: { requiereAuth: true } },
  { path: '/logs', component: LogsView, meta: { requiereAuth: true } },
  { path: '/api-keys', component: ApiKeysView, meta: { requiereAuth: true } },
  { path: '/queue-status', component: QueueStatusView, meta: { requiereAuth: true } },
  { path: '/lotes', component: LotesView, meta: { requiereAuth: true } },
  { path: '/lotes/:id', component: LoteDetailView, meta: { requiereAuth: true } },
  { path: '/mantenimiento', component: MantenimientoView, meta: { requiereAuth: true } }
]

// Crear router
const router = createRouter({
  history: createWebHistory(),
  routes
})

// Proteger rutas
router.beforeEach((to, from, next) => {
  const requiereAuth = to.meta.requiereAuth === true;
  const token = localStorage.getItem('token');

  if (to.path === '/login') {
    // Si ya está logueado, redirigir al dashboard
    if (token) {
      next('/');
    } else {
      next();
    }
  } else if (requiereAuth && !token) {
    // Ruta protegida sin token
    next('/login');
  } else {
    next();
  }
});

// Cargar sesión al iniciar
cargarSesion();

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