<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center flex-wrap ga-2">
        <v-icon start>mdi-account-group</v-icon>
        <span class="text-h6">Usuarios</span>
        <v-chip class="ml-2" size="small" variant="tonal" color="primary">{{ usuarios.length }}</v-chip>
        <v-spacer></v-spacer>
        <v-btn variant="text" prepend-icon="mdi-refresh" :loading="cargando" @click="cargar">Actualizar</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-account-plus" @click="abrirNuevo">Nuevo usuario</v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <strong>Administrador</strong> ve y administra todo el sistema. <strong>Usuario</strong> y <strong>Contador</strong> solo ven las empresas que ellos mismos crearon.
          Las cuentas no se borran: se desactivan, para conservar quién hizo cada cosa.
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="usuarios"
          :loading="cargando"
          items-per-page="-1"
          hide-default-footer
          density="comfortable"
          class="elevation-1"
        >
          <template #item.nombre="{ item }">
            <div class="font-weight-medium">{{ item.nombre }} {{ item.apellido }}</div>
            <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
          </template>
          <template #item.rol="{ item }">
            <v-chip size="small" :color="ROLES[item.rol]?.color || 'grey'" variant="tonal" label :prepend-icon="ROLES[item.rol]?.icono">
              {{ ROLES[item.rol]?.etiqueta || item.rol }}
            </v-chip>
          </template>
          <template #item.activo="{ item }">
            <v-switch
              :model-value="item.activo"
              color="success"
              hide-details density="compact" inset
              :disabled="esYo(item) || guardandoId === item._id"
              @update:model-value="(v) => cambiarActivo(item, v)"
            ></v-switch>
          </template>
          <template #item.ultimoAcceso="{ item }">
            <span v-if="item.ultimoAcceso">{{ formatFechaHora(item.ultimoAcceso) }}<div class="text-caption text-medium-emphasis">{{ hace(item.ultimoAcceso) }}</div></span>
            <span v-else class="text-medium-emphasis">Nunca</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="abrirEditar(item)"><v-tooltip activator="parent">Editar</v-tooltip></v-btn>
            <v-btn icon="mdi-key-variant" size="small" variant="text" @click="abrirPassword(item)"><v-tooltip activator="parent">Restablecer contraseña</v-tooltip></v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Crear / editar -->
    <v-dialog v-model="dialogo" max-width="560" persistent>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon start>{{ editando ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          {{ editando ? 'Editar usuario' : 'Nuevo usuario' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-form ref="formRef" @submit.prevent="guardar">
            <v-row dense>
              <v-col cols="6"><v-text-field v-model="form.nombre" label="Nombre *" variant="outlined" density="compact" :rules="[requerido]"></v-text-field></v-col>
              <v-col cols="6"><v-text-field v-model="form.apellido" label="Apellido *" variant="outlined" density="compact" :rules="[requerido]"></v-text-field></v-col>
              <v-col cols="12"><v-text-field v-model="form.email" label="Email *" type="email" variant="outlined" density="compact" :rules="[requerido, emailValido]"></v-text-field></v-col>
              <v-col cols="12" v-if="!editando"><v-text-field v-model="form.username" label="Nombre de usuario *" variant="outlined" density="compact" :rules="[requerido, minimo3]" hint="Con esto inicia sesión" persistent-hint></v-text-field></v-col>
              <v-col cols="12" v-if="!editando">
                <v-text-field v-model="form.password" label="Contraseña *" :type="verPassword ? 'text' : 'password'" variant="outlined" density="compact" :rules="[requerido, minimo6]"
                  :append-inner-icon="verPassword ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="verPassword = !verPassword"></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-select v-model="form.rol" :items="opcionesRol" label="Rol *" variant="outlined" density="compact" :disabled="editando && esYo(form)"
                  :hint="editando && esYo(form) ? 'No podés cambiar tu propio rol' : ''" persistent-hint></v-select>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="guardando" @click="dialogo = false">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" :loading="guardando" @click="guardar">{{ editando ? 'Guardar' : 'Crear' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Contraseña -->
    <v-dialog v-model="dialogoPassword" max-width="460" persistent>
      <v-card>
        <v-card-title class="bg-warning">
          <v-icon start>mdi-key-variant</v-icon>
          Restablecer contraseña
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">Nueva contraseña para <strong>{{ usuarioPassword?.username }}</strong>. El usuario tendrá que usarla en su próximo inicio de sesión.</p>
          <v-text-field v-model="nuevaPassword" label="Nueva contraseña" :type="verPassword ? 'text' : 'password'" variant="outlined" density="compact" :rules="[requerido, minimo6]"
            :append-inner-icon="verPassword ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="verPassword = !verPassword"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="guardando" @click="dialogoPassword = false">Cancelar</v-btn>
          <v-btn color="warning" variant="flat" :loading="guardando" :disabled="nuevaPassword.length < 6" @click="guardarPassword">Restablecer</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import axios from 'axios';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { formatFechaHora, hace } from '../utils/formato';
import { usuarioActual } from '../auth';

const ROLES = {
  admin: { etiqueta: 'Administrador', color: 'error', icono: 'mdi-shield-crown' },
  contador: { etiqueta: 'Contador', color: 'info', icono: 'mdi-calculator' },
  usuario: { etiqueta: 'Usuario', color: 'primary', icono: 'mdi-account' }
};

export default {
  name: 'UsuariosView',
  setup() {
    const usuarios = ref([]);
    const cargando = ref(false);
    const guardando = ref(false);
    const guardandoId = ref(null);
    const dialogo = ref(false);
    const dialogoPassword = ref(false);
    const editando = ref(false);
    const verPassword = ref(false);
    const formRef = ref(null);
    const usuarioPassword = ref(null);
    const nuevaPassword = ref('');
    const form = reactive({ _id: null, nombre: '', apellido: '', email: '', username: '', password: '', rol: 'usuario' });

    const yo = usuarioActual();
    const esYo = (u) => u && yo && (String(u._id) === String(yo.id || yo._id) || u.username === yo.username);

    const headers = [
      { title: 'Nombre', key: 'nombre' },
      { title: 'Usuario', key: 'username' },
      { title: 'Rol', key: 'rol', width: 160 },
      { title: 'Activo', key: 'activo', width: 90, sortable: false },
      { title: 'Último acceso', key: 'ultimoAcceso', width: 170 },
      { title: '', key: 'actions', sortable: false, width: 100, align: 'end' }
    ];

    const requerido = (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Obligatorio';
    const minimo3 = (v) => String(v || '').length >= 3 || 'Mínimo 3 caracteres';
    const minimo6 = (v) => String(v || '').length >= 6 || 'Mínimo 6 caracteres';
    const emailValido = (v) => /.+@.+\..+/.test(String(v || '')) || 'Email inválido';

    const cargar = async () => {
      cargando.value = true;
      try {
        const { data } = await axios.get('/api/usuarios');
        usuarios.value = data.data || [];
      } catch (error) {
        notificar.error(`No se pudieron cargar los usuarios: ${mensajeDeError(error)}`);
      } finally {
        cargando.value = false;
      }
    };

    const abrirNuevo = () => {
      editando.value = false;
      Object.assign(form, { _id: null, nombre: '', apellido: '', email: '', username: '', password: '', rol: 'usuario' });
      verPassword.value = false;
      dialogo.value = true;
      formRef.value?.resetValidation();
    };

    const abrirEditar = (u) => {
      editando.value = true;
      Object.assign(form, { _id: u._id, nombre: u.nombre, apellido: u.apellido, email: u.email, username: u.username, password: '', rol: u.rol });
      dialogo.value = true;
      formRef.value?.resetValidation();
    };

    const guardar = async () => {
      const { valid } = await formRef.value.validate();
      if (!valid) return;
      guardando.value = true;
      try {
        if (editando.value) {
          const { data } = await axios.put(`/api/usuarios/${form._id}`, { nombre: form.nombre, apellido: form.apellido, email: form.email, rol: form.rol });
          notificar.exito(data.message || 'Usuario actualizado');
        } else {
          const { data } = await axios.post('/api/usuarios', { nombre: form.nombre, apellido: form.apellido, email: form.email, username: form.username, password: form.password, rol: form.rol });
          notificar.exito(data.message || 'Usuario creado');
        }
        dialogo.value = false;
        await cargar();
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        guardando.value = false;
      }
    };

    const cambiarActivo = async (u, activo) => {
      guardandoId.value = u._id;
      try {
        const { data } = await axios.put(`/api/usuarios/${u._id}`, { activo });
        u.activo = data.data?.activo ?? activo;
        notificar.exito(activo ? `${u.username} activado` : `${u.username} desactivado`);
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        guardandoId.value = null;
      }
    };

    const abrirPassword = (u) => {
      usuarioPassword.value = u;
      nuevaPassword.value = '';
      verPassword.value = false;
      dialogoPassword.value = true;
    };

    const guardarPassword = async () => {
      guardando.value = true;
      try {
        const { data } = await axios.post(`/api/usuarios/${usuarioPassword.value._id}/password`, { password: nuevaPassword.value });
        notificar.exito(data.message || 'Contraseña restablecida');
        dialogoPassword.value = false;
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        guardando.value = false;
      }
    };

    onMounted(cargar);

    return {
      ROLES, usuarios, cargando, guardando, guardandoId, headers,
      dialogo, dialogoPassword, editando, verPassword, formRef, form, usuarioPassword, nuevaPassword,
      opcionesRol: Object.entries(ROLES).map(([value, r]) => ({ value, title: r.etiqueta })),
      requerido, minimo3, minimo6, emailValido, esYo,
      cargar, abrirNuevo, abrirEditar, guardar, cambiarActivo, abrirPassword, guardarPassword,
      formatFechaHora, hace
    };
  }
};
</script>
