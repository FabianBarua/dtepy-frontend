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
          <div><strong>Administrador</strong>: {{ ROLES.admin.descripcion }}</div>
          <div><strong>Usuario</strong>: {{ ROLES.usuario.descripcion }}</div>
          <div><strong>Contador</strong>: {{ ROLES.contador.descripcion }}</div>
          <div class="mt-1">
            Para que alguien vea una empresa que no creó, agregala en <strong>Empresas con acceso</strong> (botón
            <v-icon size="small">mdi-office-building-cog</v-icon>).
          </div>
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
            <div class="font-weight-medium">
              {{ item.nombre }} {{ item.apellido }}
              <v-chip v-if="esYo(item)" size="x-small" color="primary" variant="flat" class="ml-1">Vos</v-chip>
            </div>
            <div class="text-caption text-medium-emphasis">{{ item.email }} · {{ item.username }}</div>
          </template>

          <template #item.rol="{ item }">
            <v-menu :disabled="esYo(item)">
              <template #activator="{ props }">
                <v-chip
                  v-bind="props"
                  size="small" label variant="tonal"
                  :color="ROLES[item.rol]?.color || 'grey'"
                  :prepend-icon="ROLES[item.rol]?.icono"
                  :append-icon="esYo(item) ? undefined : 'mdi-menu-down'"
                  :disabled="guardandoId === item._id"
                >
                  {{ ROLES[item.rol]?.etiqueta || item.rol }}
                  <v-tooltip activator="parent">{{ esYo(item) ? 'No podés cambiar tu propio rol' : 'Cambiar rol' }}</v-tooltip>
                </v-chip>
              </template>
              <v-list density="compact" max-width="380">
                <v-list-subheader>Rol de {{ item.username }}</v-list-subheader>
                <v-list-item
                  v-for="(r, clave) in ROLES"
                  :key="clave"
                  :active="item.rol === clave"
                  :prepend-icon="r.icono"
                  :title="r.etiqueta"
                  :subtitle="r.descripcion"
                  lines="three"
                  @click="cambiarRol(item, clave)"
                ></v-list-item>
              </v-list>
            </v-menu>
          </template>

          <template #item.empresas="{ item }">
            <v-chip v-if="item.rol === 'admin'" size="small" variant="tonal" color="error" prepend-icon="mdi-earth">Todas las empresas</v-chip>
            <template v-else-if="item.empresas?.length">
              <v-chip
                v-for="e in item.empresas"
                :key="e._id"
                size="small"
                class="mr-1 mb-1"
                :variant="e.acceso === 'propietario' ? 'flat' : 'tonal'"
                :color="e.acceso === 'propietario' ? 'primary' : 'teal'"
                :prepend-icon="e.acceso === 'propietario' ? 'mdi-crown' : 'mdi-share-variant'"
              >
                {{ e.nombre }}
                <v-tooltip activator="parent">{{ e.acceso === 'propietario' ? 'Dueño de la empresa' : 'Acceso compartido' }} · RUC {{ e.ruc }}</v-tooltip>
              </v-chip>
            </template>
            <v-chip v-else size="small" variant="tonal" color="warning" prepend-icon="mdi-alert" @click="abrirEditar(item)">
              Sin empresas
              <v-tooltip activator="parent">No ve ninguna empresa ni documento. Hacé clic para darle acceso.</v-tooltip>
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
            <div class="d-flex flex-nowrap justify-end">
            <v-btn icon size="small" variant="text" @click="abrirEditar(item)"><v-icon>mdi-office-building-cog</v-icon><v-tooltip activator="parent">Editar datos y empresas con acceso</v-tooltip></v-btn>
            <v-btn icon size="small" variant="text" @click="abrirPassword(item)"><v-icon>mdi-key-variant</v-icon><v-tooltip activator="parent">Restablecer contraseña</v-tooltip></v-btn>
            <v-btn icon size="small" variant="text" color="error" :disabled="esYo(item)" @click="abrirEliminar(item)"><v-icon>mdi-delete</v-icon><v-tooltip activator="parent">{{ esYo(item) ? 'No podés eliminar tu propia cuenta' : 'Eliminar usuario' }}</v-tooltip></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Crear / editar -->
    <v-dialog v-model="dialogo" max-width="620" persistent scrollable>
      <v-card>
        <v-card-title class="bg-primary">
          <v-icon start>{{ editando ? 'mdi-account-edit' : 'mdi-account-plus' }}</v-icon>
          {{ editando ? `Editar ${form.usernameOriginal}` : 'Nuevo usuario' }}
        </v-card-title>
        <v-card-text class="pt-4">
          <v-form ref="formRef" @submit.prevent="guardar">
            <v-row dense>
              <v-col cols="12" sm="6"><v-text-field v-model="form.nombre" label="Nombre *" variant="outlined" density="compact" :rules="[requerido]"></v-text-field></v-col>
              <v-col cols="12" sm="6"><v-text-field v-model="form.apellido" label="Apellido *" variant="outlined" density="compact" :rules="[requerido]"></v-text-field></v-col>
              <v-col cols="12"><v-text-field v-model="form.email" label="Email *" type="email" variant="outlined" density="compact" :rules="[requerido, emailValido]"></v-text-field></v-col>
              <v-col cols="12"><v-text-field v-model="form.username" label="Nombre de usuario *" variant="outlined" density="compact" :rules="[requerido, minimo3]" hint="Con esto (o con el email) inicia sesión" persistent-hint></v-text-field></v-col>
              <v-col cols="12" v-if="!editando">
                <v-text-field v-model="form.password" label="Contraseña *" :type="verPassword ? 'text' : 'password'" variant="outlined" density="compact" :rules="[requerido, minimo6]"
                  :append-inner-icon="verPassword ? 'mdi-eye-off' : 'mdi-eye'" @click:append-inner="verPassword = !verPassword"></v-text-field>
              </v-col>

              <v-col cols="12" class="mt-2">
                <v-select v-model="form.rol" :items="opcionesRol" label="Rol *" variant="outlined" density="compact" :disabled="editando && esYo(form)"
                  :hint="editando && esYo(form) ? 'No podés cambiar tu propio rol' : ROLES[form.rol]?.descripcion" persistent-hint></v-select>
              </v-col>

              <v-col cols="12" class="mt-2">
                <div class="text-subtitle-2 mb-1"><v-icon size="small" start>mdi-office-building</v-icon>Empresas con acceso</div>
                <v-alert v-if="form.rol === 'admin'" type="info" variant="tonal" density="compact">
                  Un administrador ve y opera todas las empresas; no hace falta compartirle ninguna.
                </v-alert>
                <template v-else>
                  <div v-if="empresasPropias.length" class="mb-2">
                    <v-chip v-for="e in empresasPropias" :key="e._id" size="small" color="primary" variant="flat" prepend-icon="mdi-crown" class="mr-1 mb-1">{{ e.nombre }}</v-chip>
                    <div class="text-caption text-medium-emphasis">Empresas que creó: las ve siempre.</div>
                  </div>
                  <v-select
                    v-model="form.empresasCompartidas"
                    :items="empresasCompartibles"
                    item-title="titulo"
                    item-value="_id"
                    label="Compartir empresas"
                    multiple chips closable-chips clearable
                    variant="outlined" density="compact"
                    :no-data-text="catalogoEmpresas.length ? 'No hay otras empresas para compartir' : 'Todavía no hay empresas cargadas'"
                    hint="Verá la empresa y sus documentos y podrá emitir y cancelar. No puede cambiar la configuración ni el certificado."
                    persistent-hint
                  ></v-select>
                </template>
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

    <!-- Eliminar -->
    <v-dialog v-model="dialogoEliminar" max-width="520" persistent>
      <v-card>
        <v-card-title class="bg-error">
          <v-icon start>mdi-delete-alert</v-icon>
          Eliminar usuario
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-3">
            Vas a eliminar la cuenta de <strong>{{ usuarioEliminar?.nombre }} {{ usuarioEliminar?.apellido }}</strong>
            ({{ usuarioEliminar?.email }}). No se puede deshacer.
          </p>
          <ul class="ml-5 mb-3 text-body-2">
            <li>Pierde el acceso al panel de inmediato.</li>
            <li v-if="usuarioEliminar?.apiKeysActivas">
              Se eliminan sus <strong>{{ usuarioEliminar.apiKeysActivas }}</strong> API Key(s) activas: las integraciones que las usen dejan de funcionar.
            </li>
            <li>Los documentos y eventos que generó se conservan.</li>
          </ul>
          <v-alert v-if="errorEliminar" type="error" variant="tonal" density="compact" class="mb-2">{{ errorEliminar }}</v-alert>
          <v-alert v-else type="info" variant="tonal" density="compact">
            Si solo querés cortarle el acceso y conservar la cuenta, usá el interruptor <strong>Activo</strong> de la tabla.
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn v-if="errorEliminar && usuarioEliminar?.activo" variant="tonal" color="warning" :loading="guardando" @click="desactivarEnLugar">Desactivar en su lugar</v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" :disabled="guardando" @click="dialogoEliminar = false">Cancelar</v-btn>
          <v-btn color="error" variant="flat" :loading="guardando" :disabled="!!errorEliminar" @click="eliminar">Eliminar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import axios from 'axios';
import { notificar } from '../composables/useNotificaciones';
import { mensajeDeError } from '../utils/errores';
import { formatFechaHora, hace } from '../utils/formato';
import { usuarioActual } from '../auth';

const ROLES = {
  admin: {
    etiqueta: 'Administrador', color: 'error', icono: 'mdi-shield-crown',
    descripcion: 'Ve y opera todas las empresas, administra usuarios y mantenimiento.'
  },
  usuario: {
    etiqueta: 'Usuario', color: 'primary', icono: 'mdi-account',
    descripcion: 'Ve y opera (emite, cancela, descarga) las empresas que creó y las que se le comparten.'
  },
  contador: {
    etiqueta: 'Contador', color: 'info', icono: 'mdi-calculator',
    descripcion: 'Mismo alcance que Usuario; identifica la cuenta del estudio contable.'
  }
};

const formVacio = () => ({
  _id: null, nombre: '', apellido: '', email: '', username: '', usernameOriginal: '',
  password: '', rol: 'usuario', empresasCompartidas: []
});

export default {
  name: 'UsuariosView',
  setup() {
    const usuarios = ref([]);
    const catalogoEmpresas = ref([]);
    const cargando = ref(false);
    const guardando = ref(false);
    const guardandoId = ref(null);
    const dialogo = ref(false);
    const dialogoPassword = ref(false);
    const dialogoEliminar = ref(false);
    const editando = ref(false);
    const verPassword = ref(false);
    const formRef = ref(null);
    const usuarioPassword = ref(null);
    const usuarioEliminar = ref(null);
    const errorEliminar = ref('');
    const nuevaPassword = ref('');
    const form = reactive(formVacio());

    const yo = usuarioActual();
    const esYo = (u) => u && yo && (String(u._id) === String(yo.id || yo._id) || (u.usernameOriginal || u.username) === yo.username);

    const headers = [
      { title: 'Usuario', key: 'nombre' },
      { title: 'Rol', key: 'rol', width: 170 },
      { title: 'Empresas', key: 'empresas', sortable: false },
      { title: 'Activo', key: 'activo', width: 90, sortable: false },
      { title: 'Último acceso', key: 'ultimoAcceso', width: 170 },
      { title: '', key: 'actions', sortable: false, width: 150, align: 'end' }
    ];

    const requerido = (v) => (v !== null && v !== undefined && String(v).trim() !== '') || 'Obligatorio';
    const minimo3 = (v) => String(v || '').trim().length >= 3 || 'Mínimo 3 caracteres';
    const minimo6 = (v) => String(v || '').length >= 6 || 'Mínimo 6 caracteres';
    const emailValido = (v) => /.+@.+\..+/.test(String(v || '')) || 'Email inválido';

    // Empresas de las que el usuario en edición es dueño (siempre las ve) y
    // las que se le pueden compartir (todas las demás).
    const empresasPropias = computed(() =>
      form._id ? catalogoEmpresas.value.filter((e) => String(e.propietarioId) === String(form._id)) : []
    );
    const empresasCompartibles = computed(() =>
      catalogoEmpresas.value
        .filter((e) => !form._id || String(e.propietarioId) !== String(form._id))
        .map((e) => ({ _id: e._id, titulo: `${e.nombre} · RUC ${e.ruc}${e.activo ? '' : ' (inactiva)'}` }))
    );

    const cargar = async () => {
      cargando.value = true;
      try {
        const { data } = await axios.get('/api/usuarios');
        usuarios.value = data.data || [];
        catalogoEmpresas.value = data.empresas || [];
      } catch (error) {
        notificar.error(`No se pudieron cargar los usuarios: ${mensajeDeError(error)}`);
      } finally {
        cargando.value = false;
      }
    };

    const abrirNuevo = () => {
      editando.value = false;
      Object.assign(form, formVacio());
      verPassword.value = false;
      dialogo.value = true;
      formRef.value?.resetValidation();
    };

    const abrirEditar = (u) => {
      editando.value = true;
      Object.assign(form, formVacio(), {
        _id: u._id, nombre: u.nombre, apellido: u.apellido, email: u.email,
        username: u.username, usernameOriginal: u.username, rol: u.rol,
        empresasCompartidas: (u.empresas || []).filter((e) => e.acceso === 'compartida').map((e) => e._id)
      });
      dialogo.value = true;
      formRef.value?.resetValidation();
    };

    const guardar = async () => {
      const { valid } = await formRef.value.validate();
      if (!valid) return;
      guardando.value = true;
      // A un admin no se le comparte nada (ya ve todo): el campo no se envía y
      // el backend deja sus accesos como estaban, por si vuelve a ser usuario.
      const empresasCompartidas = form.rol === 'admin' ? undefined : form.empresasCompartidas;
      try {
        if (editando.value) {
          const { data } = await axios.put(`/api/usuarios/${form._id}`, {
            nombre: form.nombre, apellido: form.apellido, email: form.email,
            username: form.username.trim(), rol: form.rol, empresasCompartidas
          });
          notificar.exito(data.message || 'Usuario actualizado');
        } else {
          const { data } = await axios.post('/api/usuarios', {
            nombre: form.nombre, apellido: form.apellido, email: form.email,
            username: form.username.trim(), password: form.password, rol: form.rol, empresasCompartidas
          });
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

    const cambiarRol = async (u, rol) => {
      if (u.rol === rol) return;
      guardandoId.value = u._id;
      try {
        const { data } = await axios.put(`/api/usuarios/${u._id}`, { rol });
        Object.assign(u, data.data || { rol });
        notificar.exito(`${u.username} ahora es ${ROLES[rol].etiqueta}`);
      } catch (error) {
        notificar.error(mensajeDeError(error));
      } finally {
        guardandoId.value = null;
      }
    };

    const cambiarActivo = async (u, activo) => {
      guardandoId.value = u._id;
      try {
        const { data } = await axios.put(`/api/usuarios/${u._id}`, { activo });
        u.activo = data.data?.activo ?? activo;
        notificar.exito(activo ? `${u.username} activado` : `${u.username} desactivado: ya no puede entrar`);
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

    const abrirEliminar = (u) => {
      usuarioEliminar.value = u;
      errorEliminar.value = '';
      dialogoEliminar.value = true;
    };

    const eliminar = async () => {
      guardando.value = true;
      try {
        const { data } = await axios.delete(`/api/usuarios/${usuarioEliminar.value._id}`);
        notificar.exito(data.message || 'Usuario eliminado');
        dialogoEliminar.value = false;
        await cargar();
      } catch (error) {
        // El motivo (p. ej. es dueño de una empresa) queda a la vista en el
        // diálogo, con la salida de desactivarlo.
        errorEliminar.value = mensajeDeError(error);
      } finally {
        guardando.value = false;
      }
    };

    const desactivarEnLugar = async () => {
      guardando.value = true;
      try {
        await cambiarActivo(usuarioEliminar.value, false);
        dialogoEliminar.value = false;
      } finally {
        guardando.value = false;
      }
    };

    onMounted(cargar);

    return {
      ROLES, usuarios, catalogoEmpresas, cargando, guardando, guardandoId, headers,
      dialogo, dialogoPassword, dialogoEliminar, editando, verPassword, formRef, form,
      usuarioPassword, usuarioEliminar, errorEliminar, nuevaPassword,
      empresasPropias, empresasCompartibles,
      opcionesRol: Object.entries(ROLES).map(([value, r]) => ({ value, title: r.etiqueta })),
      requerido, minimo3, minimo6, emailValido, esYo,
      cargar, abrirNuevo, abrirEditar, guardar, cambiarRol, cambiarActivo,
      abrirPassword, guardarPassword, abrirEliminar, eliminar, desactivarEnLugar,
      formatFechaHora, hace
    };
  }
};
</script>
