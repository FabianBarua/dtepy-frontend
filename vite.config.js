import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // Carga el .env (todas las variables, no solo las VITE_*)
  const env = loadEnv(mode, process.cwd(), '')

  // Backend al que apunta el proxy de desarrollo.
  // Solo se usa cuando la app llama en modo "mismo origen", es decir, cuando
  // NO hay una URL de backend configurada. Si configurás VITE_API_BASE_URL o
  // la URL desde la UI, axios va directo al backend y el proxy no interviene.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:8081'

  return {
    plugins: [
      vue()
    ],
    server: {
      host: env.HOST || '0.0.0.0', // Permitir acceso desde otros equipos
      port: Number(env.PORT) || 3000,
      // Configurar proxy solo para /api/
      proxy: {
        '/api/': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: env.HOST || '0.0.0.0',
      port: Number(env.PREVIEW_PORT || env.PORT) || 3000,
      proxy: {
        '/api/': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    optimizeDeps: {
      include: ['vue', 'vue-router', 'axios', 'vuetify']
    },
    appType: 'spa',
    base: env.VITE_BASE_PATH || '/',
    // Fallback para Vue Router
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  }
})
