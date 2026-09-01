<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-app-bar flat color="transparent" class="px-0">
          <v-app-bar-title class="text-h4 font-weight-bold">
            <v-icon start color="primary">mdi-email-fast</v-icon>
            Proveedores SMTP
          </v-app-bar-title>

          <v-spacer></v-spacer>

          <v-btn color="primary" @click="nuevoProvider">
            <v-icon start>mdi-plus</v-icon>
            Nuevo Proveedor
          </v-btn>
        </v-app-bar>
      </v-col>
    </v-row>

    <!-- Tabla de proveedores -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-4" density="compact">
              Estos proveedores se usan para el envío automático del KUDE por email.
              Asigná uno a cada empresa desde <strong>Empresas → Editar → Notificaciones</strong>.
              Una empresa sin proveedor usa el SMTP del servidor (variables de entorno).
            </v-alert>

            <v-data-table
              :headers="headers"
              :items="providers"
              :loading="cargando"
              hide-default-footer
              :items-per-page="-1"
              item-key="_id"
              class="elevation-0"
            >
              <!-- Servidor -->
              <template #item.host="{ item }">
                <v-chip variant="outlined" size="small">
                  <v-icon start size="x-small">mdi-server</v-icon>
                  {{ item.host }}:{{ item.puerto }}
                </v-chip>
              </template>

              <!-- Seguridad -->
              <template #item.seguro="{ item }">
                <v-chip size="small" variant="tonal" :color="item.seguro ? 'success' : 'info'">
                  {{ item.seguro ? 'TLS (465)' : 'STARTTLS' }}
                </v-chip>
              </template>

              <!-- Estado -->
              <template #item.activo="{ item }">
                <v-chip :color="item.activo ? 'success' : 'error'" size="small" variant="tonal">
                  {{ item.activo ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <!-- Acciones -->
              <template #item.acciones="{ item }">
                <v-btn
                  color="info"
                  size="small"
                  variant="tonal"
                  class="mr-2"
                  :loading="probandoId === item._id"
                  @click="probarProvider(item)"
                  title="Probar conexión SMTP"
                >
                  <v-icon>mdi-connection</v-icon>
                </v-btn>
                <v-btn
                  color="primary"
                  size="small"
                  variant="tonal"
                  class="mr-2"
                  @click="editarProvider(item)"
                  title="Editar"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  color="error"
                  size="small"
                  variant="tonal"
                  @click="confirmarEliminar(item)"
                  title="Eliminar"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>

              <!-- Mensaje cuando no hay datos -->
              <template #no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-2">mdi-email-off-outline</v-icon>
                  <p class="text-grey mt-2">No hay proveedores SMTP registrados</p>
                  <v-btn color="primary" class="mt-2" @click="nuevoProvider">
                    <v-icon start>mdi-plus</v-icon>
                    Crear primer proveedor
                  </v-btn>
                </div>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo: Formulario de proveedor -->
    <v-dialog v-model="mostrarDialogoFormulario" max-width="700px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-email-fast</v-icon>
          {{ providerEnEdicion ? 'Editar Proveedor SMTP' : 'Nuevo Proveedor SMTP' }}
        </v-card-title>

        <v-card-text class="mt-4">
          <v-form ref="formRef" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.nombre"
                  label="Nombre *"
                  placeholder="Gmail Facturación"
                  :rules="[v => !!v || 'Nombre requerido']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.remitente"
                  label="Remitente (From)"
                  placeholder="facturas@miempresa.com"
                  hint="Si queda vacío se usa el usuario SMTP"
                  persistent-hint
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.host"
                  label="Host SMTP *"
                  placeholder="smtp.gmail.com"
                  :rules="[v => !!v || 'Host requerido']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="6" md="3">
                <v-text-field
                  v-model.number="formulario.puerto"
                  label="Puerto *"
                  type="number"
                  placeholder="587"
                  :rules="[v => (Number.isInteger(Number(v)) && v >= 1 && v <= 65535) || 'Puerto inválido']"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="6" md="3" class="d-flex align-center">
                <v-switch
                  v-model="formulario.seguro"
                  color="primary"
                  label="TLS directo (465)"
                  hide-details
                ></v-switch>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.usuario"
                  label="Usuario SMTP *"
                  placeholder="facturas@miempresa.com"
                  :rules="[v => !!v || 'Usuario requerido']"
                  autocomplete="off"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.contrasena"
                  :label="providerEnEdicion ? 'Contraseña (vacío = mantener actual)' : 'Contraseña *'"
                  :rules="providerEnEdicion ? [] : [v => !!v || 'Contraseña requerida']"
                  :type="mostrarContrasena ? 'text' : 'password'"
                  :append-inner-icon="mostrarContrasena ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="mostrarContrasena = !mostrarContrasena"
                  autocomplete="new-password"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-switch
                  v-model="formulario.validarCertificado"
                  color="primary"
                  label="Validar certificado TLS"
                  hint="Desactivar para servidores con certificado autofirmado (ej. poste.io propio)"
                  persistent-hint
                ></v-switch>
              </v-col>

              <v-col cols="12" md="6">
                <v-switch
                  v-model="formulario.activo"
                  color="primary"
                  label="Activo"
                  hint="Un proveedor inactivo no envía emails: las empresas que lo usan caen al SMTP del servidor"
                  persistent-hint
                ></v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="cerrarFormulario">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardarProvider">
            <v-icon start>{{ providerEnEdicion ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ providerEnEdicion ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Probar con email -->
    <v-dialog v-model="mostrarDialogoPrueba" max-width="500" persistent>
      <v-card>
        <v-card-title class="bg-info text-white">
          <v-icon start>mdi-connection</v-icon>
          Probar Proveedor SMTP
        </v-card-title>
        <v-card-text class="mt-4">
          <p class="text-body-2 mb-3">
            Se verifica la conexión y autenticación contra
            <strong>{{ providerSeleccionado?.host }}:{{ providerSeleccionado?.puerto }}</strong>.
            Opcionalmente podés enviar un email de prueba.
          </p>
          <v-text-field
            v-model="emailPrueba"
            label="Enviar email de prueba a (opcional)"
            placeholder="yo@miempresa.com"
            type="email"
            clearable
            outlined
          ></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="mostrarDialogoPrueba = false" :disabled="!!probandoId">Cancelar</v-btn>
          <v-btn color="info" :loading="!!probandoId" @click="ejecutarPrueba">
            <v-icon start>mdi-send-check</v-icon>
            Probar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Confirmar eliminación -->
    <v-dialog v-model="mostrarDialogoEliminar" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-error text-white">
          <v-icon start>mdi-delete-forever</v-icon>
          Eliminar Proveedor
        </v-card-title>
        <v-card-text class="mt-4">
          <v-alert v-if="empresasUsando > 0" type="error" variant="tonal" icon="mdi-block-helper" class="mb-3">
            <strong>No se puede eliminar</strong> — {{ empresasUsando }} empresa(s) usan este proveedor.
            Cambiá el proveedor de esas empresas primero.
          </v-alert>
          <p v-else class="text-body-1 mb-2">
            ¿Eliminar el proveedor <strong>{{ providerSeleccionado?.nombre }}</strong>
            ({{ providerSeleccionado?.host }})? Esta acción no se puede deshacer.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="mostrarDialogoEliminar = false; empresasUsando = 0"
            :disabled="eliminando"
          >
            {{ empresasUsando > 0 ? 'Cerrar' : 'Cancelar' }}
          </v-btn>
          <v-btn
            v-if="empresasUsando === 0"
            color="error"
            variant="tonal"
            @click="eliminarProvider"
            :loading="eliminando"
          >
            <v-icon start>mdi-delete-forever</v-icon>
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar para notificaciones -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="6000"
      location="top"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Cerrar</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'SmtpProvidersView',
  setup() {
    // Estado
    const providers = ref([]);
    const cargando = ref(false);
    const guardando = ref(false);
    const eliminando = ref(false);
    const probandoId = ref(null);

    // Diálogos
    const mostrarDialogoFormulario = ref(false);
    const mostrarDialogoEliminar = ref(false);
    const mostrarDialogoPrueba = ref(false);

    // Formulario
    const formRef = ref(null);
    const formularioValido = ref(false);
    const providerEnEdicion = ref(null);
    const mostrarContrasena = ref(false);
    const formulario = ref({
      nombre: '',
      host: '',
      puerto: 587,
      seguro: false,
      usuario: '',
      contrasena: '',
      remitente: '',
      validarCertificado: true,
      activo: true
    });

    // Selección / prueba / eliminación
    const providerSeleccionado = ref(null);
    const emailPrueba = ref('');
    const empresasUsando = ref(0);

    // Snackbar
    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('success');

    const headers = [
      { title: 'Nombre', key: 'nombre', sortable: true },
      { title: 'Servidor', key: 'host', sortable: true },
      { title: 'Seguridad', key: 'seguro', sortable: false },
      { title: 'Usuario', key: 'usuario', sortable: false },
      { title: 'Remitente', key: 'remitente', sortable: false },
      { title: 'Estado', key: 'activo', sortable: true },
      { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
    ];

    const mostrarSnackbar = (texto, color = 'success') => {
      snackbarText.value = texto;
      snackbarColor.value = color;
      snackbar.value = true;
    };

    const cargarProviders = async () => {
      cargando.value = true;
      try {
        const response = await axios.get('/api/smtp-providers', { params: { _t: Date.now() } });
        providers.value = response.data.data || [];
      } catch (error) {
        console.error('❌ Error cargando proveedores SMTP:', error);
        mostrarSnackbar('Error cargando proveedores SMTP: ' + error.message, 'error');
      } finally {
        cargando.value = false;
      }
    };

    const nuevoProvider = () => {
      providerEnEdicion.value = null;
      formulario.value = {
        nombre: '',
        host: '',
        puerto: 587,
        seguro: false,
        usuario: '',
        contrasena: '',
        remitente: '',
        validarCertificado: true,
        activo: true
      };
      mostrarDialogoFormulario.value = true;
    };

    const editarProvider = (provider) => {
      providerEnEdicion.value = provider;
      formulario.value = {
        nombre: provider.nombre,
        host: provider.host,
        puerto: provider.puerto,
        seguro: provider.seguro,
        usuario: provider.usuario,
        contrasena: '',   // vacío = mantener la actual
        remitente: provider.remitente || '',
        validarCertificado: provider.validarCertificado !== false,
        activo: provider.activo
      };
      mostrarDialogoFormulario.value = true;
    };

    const cerrarFormulario = () => {
      mostrarDialogoFormulario.value = false;
      providerEnEdicion.value = null;
      if (formRef.value) {
        formRef.value.resetValidation();
      }
    };

    const guardarProvider = async () => {
      if (!formRef.value || !formularioValido.value) {
        formRef.value?.validate();
        return;
      }

      guardando.value = true;
      try {
        const payload = { ...formulario.value };
        if (providerEnEdicion.value && !payload.contrasena) {
          delete payload.contrasena;   // no cambiar la contraseña
        }
        if (providerEnEdicion.value) {
          await axios.put(`/api/smtp-providers/${providerEnEdicion.value._id}`, payload);
          mostrarSnackbar('Proveedor SMTP actualizado exitosamente');
        } else {
          await axios.post('/api/smtp-providers', payload);
          mostrarSnackbar('Proveedor SMTP creado exitosamente');
        }
        cerrarFormulario();
        cargarProviders();
      } catch (error) {
        mostrarSnackbar(error.response?.data?.error || 'Error guardando proveedor SMTP', 'error');
      } finally {
        guardando.value = false;
      }
    };

    const probarProvider = (provider) => {
      providerSeleccionado.value = provider;
      emailPrueba.value = '';
      mostrarDialogoPrueba.value = true;
    };

    const ejecutarPrueba = async () => {
      if (!providerSeleccionado.value) return;
      probandoId.value = providerSeleccionado.value._id;
      try {
        const body = emailPrueba.value ? { destinatario: emailPrueba.value } : {};
        const response = await axios.post(
          `/api/smtp-providers/${providerSeleccionado.value._id}/probar`,
          body
        );
        mostrarSnackbar(response.data.message || 'Conexión SMTP verificada');
        mostrarDialogoPrueba.value = false;
      } catch (error) {
        mostrarSnackbar(error.response?.data?.error || 'Fallo la prueba SMTP', 'error');
      } finally {
        probandoId.value = null;
      }
    };

    const confirmarEliminar = (provider) => {
      providerSeleccionado.value = provider;
      empresasUsando.value = 0;
      mostrarDialogoEliminar.value = true;
    };

    const eliminarProvider = async () => {
      if (!providerSeleccionado.value) return;
      eliminando.value = true;
      try {
        await axios.delete(`/api/smtp-providers/${providerSeleccionado.value._id}`);
        mostrarSnackbar('Proveedor SMTP eliminado exitosamente');
        mostrarDialogoEliminar.value = false;
        cargarProviders();
      } catch (error) {
        const dep = error.response?.data?.dependencias;
        if (dep?.empresas > 0) {
          empresasUsando.value = dep.empresas;
        } else {
          mostrarSnackbar(error.response?.data?.error || 'Error eliminando proveedor SMTP', 'error');
        }
      } finally {
        eliminando.value = false;
      }
    };

    onMounted(cargarProviders);

    return {
      providers,
      cargando,
      guardando,
      eliminando,
      probandoId,
      mostrarDialogoFormulario,
      mostrarDialogoEliminar,
      mostrarDialogoPrueba,
      formRef,
      formularioValido,
      providerEnEdicion,
      formulario,
      mostrarContrasena,
      providerSeleccionado,
      emailPrueba,
      empresasUsando,
      snackbar,
      snackbarText,
      snackbarColor,
      headers,
      cargarProviders,
      nuevoProvider,
      editarProvider,
      cerrarFormulario,
      guardarProvider,
      probarProvider,
      ejecutarPrueba,
      confirmarEliminar,
      eliminarProvider
    };
  }
};
</script>
