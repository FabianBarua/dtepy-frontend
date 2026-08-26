# DTE-PY Frontend - Sistema de Facturación Electrónica SIFEN

Proyecto frontend del sistema de facturación electrónica para Paraguay (SIFEN) construido con Vue.js 3 y Vuetify 3.

## 📋 Descripción

Interfaz de usuario moderna y responsiva para gestionar facturas electrónicas, empresas, y monitorear el procesamiento en tiempo real.
![fepy-1](https://github.com/user-attachments/assets/0540442a-be7e-4b38-b00e-877b1106c685)

**Características principales:**
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión multi-empresa
- ✅ Monitoreo de cola de procesos
- ✅ Historial de facturas con filtros
- ✅ Generación y gestión de API Keys
- ✅ Diseño Material Design con Vuetify 3

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│           Frontend (Vue.js 3)           │
│  ┌───────────┐  ┌──────────────────┐   │
│  │ Dashboard │  │ Gestión Empresas │   │
│  ├───────────┤  ├──────────────────┤   │
│  │ Facturas  │  │ Cola de Procesos │   │
│  ├───────────┤  ├──────────────────┤   │
│  │ API Keys  │  │ Logs/Auditoría   │   │
│  └───────────┘  └──────────────────┘   │
└─────────────────────────────────────────┘
                    │
                    │ HTTP/REST
                    ▼
         ┌─────────────────────┐
         │   Backend (API)     │
         │   Puerto: 8081      │
         └─────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 14+
- Backend DTE-PY corriendo (por defecto se espera en el puerto 8081;
  ver [URL del Backend](#-url-del-backend))

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/jaranetwork/dtepy-frontend.git
cd dtepy-frontend

# Instalar dependencias
npm install
```

### Ejecución

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción (build)
npm run build
npm run preview
```

## 📁 Estructura del Proyecto

```
dtepy-frontend/
├── src/
│   ├── components/
│   │   ├── DashboardView.vue       # Panel principal
│   │   ├── InvoiceListView.vue     # Lista de facturas
│   │   ├── InvoiceDetailView.vue   # Detalle de factura
│   │   ├── EmpresasView.vue        # Gestión de empresas
│   │   ├── EmpresaSelector.vue     # Selector de empresa
│   │   ├── QueueStatusView.vue     # Monitor de cola
│   │   ├── ApiKeysView.vue         # API Keys
│   │   ├── LogsView.vue            # Logs de operaciones
│   │   ├── LoginView.vue           # Login
│   │   └── ServerConfigDialog.vue  # Configurar la URL del backend
│   ├── App.vue                     # Componente principal
│   ├── main.js                     # Punto de entrada
│   ├── auth.js                     # Autenticación
│   └── config.js                   # Resolución de la URL del backend
├── public/
│   └── config.js                   # Configuración de runtime (no pasa por el build)
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

## 🎯 Componentes Principales

### DashboardView

Panel principal con:
- Estadísticas generales
- Gráficos de facturas por estado
- Últimas facturas procesadas
- Accesos rápidos

### QueueStatusView

Monitor de cola en tiempo real:
- Jobs en espera
- Jobs procesando
- Jobs completados
- Jobs fallidos
- Actualización cada 5 segundos

### EmpresasView

Gestión multi-empresa:
- Alta, baja y modificación de empresas
- Carga de certificados .p12
- Configuración de CSC, ID CSC, Timbrado
- Activación/desactivación de empresas

### InvoiceListView

Lista de facturas con:
- Filtros por estado, fecha, empresa
- Búsqueda por CDC, correlativo
- Exportación a CSV
- Paginación

## 🔐 Autenticación

El sistema usa **JWT Tokens**:

```javascript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

// Respuesta
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {...}
}

// Uso en peticiones
Authorization: Bearer <TOKEN>
```

## 🎨 Personalización

### Tema (Vuetify)

Editar `src/main.js`:

```javascript
const vuetify = createVuetify({
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1976D2',    // Azul
          secondary: '#424242',  // Gris
          accent: '#82B1FF',     // Celeste
          error: '#FF5252',      // Rojo
          success: '#4CAF50',    // Verde
          warning: '#FFC107'     // Amarillo
        }
      }
    }
  }
})
```

### Logo y Branding

Reemplazar en `src/App.vue`:
```vue
<v-toolbar-title>Sistema de Facturación Electrónica SIFEN</v-toolbar-title>
```

## 🔌 URL del Backend

Todas las llamadas de la app son relativas (`/api/...`), así que la URL del
backend se resuelve en un solo lugar: [`src/config.js`](src/config.js).

Se toma **el primero que tenga valor**:

| # | Origen | Dónde se define | Para qué sirve |
|---|--------|-----------------|----------------|
| 1 | Navegador | Botón **Servidor** en la app | Que cada usuario apunte a otro backend sin tocar el deploy |
| 2 | Deploy | `config.js` (queda en `dist/config.js`) | Cambiar de backend **sin recompilar** |
| 3 | Compilación | `VITE_API_BASE_URL` en `.env` | Fijar el backend al hacer el build |
| 4 | Mismo origen | (por defecto) | Cuando hay un proxy delante (Vite o nginx) |

### Desde la app

Hay un botón **Servidor** en dos lugares:

- En la pantalla de **login**, abajo de todo (importante: si la URL está mal,
  no se puede ni iniciar sesión).
- En la **barra superior**, al lado del indicador de conexión.

El diálogo permite escribir la URL, **probar la conexión** contra
`GET /api/health` antes de guardar, y **restablecer** para volver a la
configuración del deploy. Se guarda en el navegador (`localStorage`).

### En el deploy, sin recompilar

`config.js` no pasa por el build: se copia tal cual a `dist/config.js`.

```javascript
// dist/config.js
window.__APP_CONFIG__ = {
  apiBaseUrl: "https://api.midominio.com"
};
```

Se puede editar directamente en el servidor o montarlo como volumen en Docker:

```yaml
volumes:
  - ./config.js:/usr/share/nginx/html/config.js:ro
```

### Al compilar

```bash
# .env
VITE_API_BASE_URL=https://api.midominio.com
```

### CORS

Si el backend está en **otro origen** (otro dominio o puerto), tiene que
permitirlo. En el `.env` del backend:

```bash
CORS_ORIGINS=https://app.midominio.com
```

Si en cambio se usa un proxy (`location /api/` en nginx), no hace falta tocar
nada: para el navegador es el mismo origen.

## 📡 Comunicación con el Backend

El frontend usa **Axios** con interceptores:

```javascript
// src/main.js
import { aplicarApiBaseUrl } from './config'

// Resuelve la URL del backend y la aplica a axios
aplicarApiBaseUrl();

// Interceptor para agregar token
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para errores
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

## 🔧 Build para Producción

```bash
# Generar build optimizado
npm run build

# El output va a dist/
# Los archivos están listos para servir con nginx, Apache, etc.

# Vista previa local
npm run preview
```

### Ejemplo con Nginx

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/dtepy-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # La configuración de runtime no se cachea: así un cambio de backend
    # se ve enseguida, sin esperar a que expire el caché del navegador.
    location = /config.js {
        add_header Cache-Control "no-store";
    }

    # Proxy para API (opción "mismo origen": no hace falta configurar CORS)
    location /api/ {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> Con este `location /api/`, dejá `apiBaseUrl` vacío: para el navegador el
> backend está en el mismo origen. La URL del backend solo hace falta cuando
> **no** hay proxy delante.

## 🧪 Testing

```bash
# No hay tests configurados actualmente
# Para agregar Vitest:
npm install -D vitest @vue/test-utils

# Ejecutar tests
npm run test
```

## 📦 Dependencias Principales

| Dependencia | Versión | Propósito |
|-------------|---------|-----------|
| vue | 3.2.13 | Framework principal |
| vuetify | 3.3.0 | UI Framework |
| vue-router | 4.0.3 | Enrutamiento |
| axios | 1.4.0 | HTTP Client |
| chart.js | 4.3.0 | Gráficos |
| vue-chartjs | 5.x | Gráficos para Vue |

## 🌐 Rutas Disponibles

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | DashboardView | Panel principal |
| `/login` | LoginView | Login de usuario |
| `/invoices` | InvoiceListView | Lista de facturas |
| `/invoices/:id` | InvoiceDetailView | Detalle de factura |
| `/empresas` | EmpresasView | Gestión de empresas |
| `/queue-status` | QueueStatusView | Monitor de cola |
| `/api-keys` | ApiKeysView | API Keys |
| `/logs` | LogsView | Logs de operaciones |

## Proyectos

- [DTE-PY backend](https://github.com/jaranetwork/dtepy-backend) sistema de generación y envío de factura electrónica al sistema SIFEN Paraguay
- [Módulo ERPNext](https://github.com/jaranetwork/einvoice) para el envío de facturas a DTE-PY

## 📚 Recursos

- [Vue.js Documentation](https://vuejs.org/)
- [Vuetify Documentation](https://vuetifyjs.com/)
- [Chart.js Documentation](https://www.chartjs.org/)

## 📄 Licencia

MIT

## 👥 Autores

Jara Network
