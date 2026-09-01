<template>
  <v-container fluid>
    <v-row class="mb-4">
      <v-col cols="12">
        <v-app-bar flat color="transparent" class="px-0">
          <v-app-bar-title class="text-h4 font-weight-bold">
            <v-icon start color="primary">mdi-office-building</v-icon>
            Gestión de Empresas
          </v-app-bar-title>

          <v-spacer></v-spacer>

          <v-btn color="primary" @click="mostrarDialogoFormulario = true">
            <v-icon start>mdi-plus</v-icon>
            Nueva Empresa
          </v-btn>
        </v-app-bar>
      </v-col>
    </v-row>

    <!-- Tabla de empresas -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text>
            <v-data-table
              :headers="headers"
              :items="empresasDisplayadas"
              :loading="cargando"
              hide-default-footer
              item-key="_id"
              class="elevation-0"
            >
              <!-- RUC -->
              <template #item.ruc="{ item }">
                <v-chip variant="outlined" size="small">
                  <v-icon start size="x-small">mdi-numeric</v-icon>
                  {{ item.ruc }}
                </v-chip>
              </template>

              <!-- Certificado -->
              <template #item.certificado="{ item }">
                <v-chip
                  :color="item.certificado?.activo ? 'success' : 'grey'"
                  size="small"
                  variant="flat"
                >
                  <v-icon start size="x-small">
                    {{ item.certificado?.activo ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                  </v-icon>
                  {{ item.certificado?.activo ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <!-- Modo SIFEN -->
              <template #item.modo="{ item }">
                <v-chip
                  :color="item.configuracionSifen?.modo === 'produccion' ? 'error' : 'warning'"
                  size="small"
                  variant="outlined"
                >
                  <v-icon start size="x-small">
                    {{ item.configuracionSifen?.modo === 'produccion' ? 'mdi-lock' : 'mdi-wrench' }}
                  </v-icon>
                  {{ item.configuracionSifen?.modo?.toUpperCase() }}
                </v-chip>
              </template>

              <!-- Estado -->
              <template #item.activo="{ item }">
                <v-chip
                  :color="item.activo ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ item.activo ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <!-- Acciones -->
              <template #item.acciones="{ item }">
                <v-menu v-model="item.menuOpen" :close-on-content-click="false" location="start">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      color="primary"
                      size="small"
                      variant="tonal"
                      v-bind="props"
                      title="Acciones"
                    >
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list density="compact" min-width="200">
                    <v-list-item @click="editarEmpresa(item); item.menuOpen = false">
                      <template v-slot:prepend>
                        <v-icon color="primary" size="small">mdi-pencil</v-icon>
                      </template>
                      <v-list-item-title>Editar</v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="abrirDialogoCertificado(item); item.menuOpen = false">
                      <template v-slot:prepend>
                        <v-icon color="warning" size="small">mdi-certificate</v-icon>
                      </template>
                      <v-list-item-title>Certificado</v-list-item-title>
                    </v-list-item>
                    <v-divider></v-divider>
                    <v-list-item @click="confirmarEliminar(item); item.menuOpen = false">
                      <template v-slot:prepend>
                        <v-icon color="error" size="small">mdi-delete</v-icon>
                      </template>
                      <v-list-item-title class="text-error">Eliminar</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </template>

              <!-- Mensaje cuando no hay datos -->
              <template #no-data>
                <div class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-2">mdi-office-building-outline</v-icon>
                  <p class="text-grey mt-2">No hay empresas registradas</p>
                  <v-btn color="primary" class="mt-2" @click="mostrarDialogoFormulario = true">
                    <v-icon start>mdi-plus</v-icon>
                    Crear primera empresa
                  </v-btn>
                </div>
              </template>
            </v-data-table>

            <div class="d-flex align-center justify-center pt-4" style="gap: 16px;">
              <div class="d-flex align-center" style="gap: 8px;">
                <span class="text-body-2">Items por página:</span>
                <v-select
                  v-model="itemsPerPage"
                  :items="[10, 15, 25, 50, 100]"
                  density="compact"
                  variant="outlined"
                  hide-details
                  style="max-width: 80px;"
                ></v-select>
              </div>
              <v-pagination
                v-model="currentPage"
                :length="totalPages"
              ></v-pagination>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Diálogo: Formulario de empresa -->
    <v-dialog v-model="mostrarDialogoFormulario" max-width="800px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-office-building-plus</v-icon>
          {{ empresaEnEdicion ? 'Editar Empresa' : 'Nueva Empresa' }}
        </v-card-title>

        <v-card-text class="mt-4">
          <v-form ref="formRef" v-model="formularioValido">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.ruc"
                  label="RUC *"
                  :rules="[
                    v => !!v || 'RUC requerido',
                    v => {
                      const sinGuiones = v.replace(/[^0-9]/g, '');
                      return sinGuiones.length >= 6 && sinGuiones.length <= 12 || 'RUC inválido (6-12 dígitos)';
                    }
                  ]"
                  maxlength="13"
                  counter="13"
                  placeholder="8001234-5"
                  type="text"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.nombreFantasia"
                  label="Nombre de Fantasía *"
                  :rules="[v => !!v || 'Nombre requerido']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formulario.razonSocial"
                  label="Razón Social *"
                  :rules="[v => !!v || 'Razón social requerida']"
                  outlined
                  required
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.direccion"
                  label="Dirección"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formulario.telefono"
                  label="Teléfono"
                  type="tel"
                  outlined
                ></v-text-field>
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="formulario.email"
                  label="Email"
                  type="email"
                  :rules="[v => !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'Email inválido']"
                  outlined
                ></v-text-field>
              </v-col>

              <v-divider class="my-4"></v-divider>

              <v-col cols="12" class="bg-grey-lighten-4 pa-4 rounded">
                <div class="text-subtitle-1 font-weight-bold mb-3">
                  <v-icon start color="primary">mdi-cog</v-icon>
                  Configuración SIFEN
                </div>

                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formulario.configuracionSifen.timbrado"
                      label="Número de Timbrado *"
                      :rules="[v => !!v || 'Requerido', v => /^\d{8}$/.test(v) || '8 dígitos']"
                      maxlength="8"
                      counter="8"
                      placeholder="12345678"
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="formulario.configuracionSifen.idCSC"
                      label="ID CSC *"
                      :rules="[v => !!v || 'Requerido', v => /^\d{1,4}$/.test(v) || '1-4 dígitos']"
                      maxlength="4"
                      counter="4"
                      placeholder="0001"
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.configuracionSifen.modo"
                      label="Modo de Operación *"
                      :items="[
                        { title: 'Test (SIFEN)', value: 'test' },
                        { title: 'Producción (SET Real)', value: 'produccion' }
                      ]"
                      :rules="[v => !!v || 'Modo requerido']"
                      outlined
                    ></v-select>
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="formulario.configuracionSifen.urlLogo"
                      label="URL del Logo"
                      placeholder="https://miempresa.com/logo.png"
                      hint="URL de la imagen del logo de la empresa para el KUDE"
                      persistent-hint
                      outlined
                    ></v-text-field>
                    <div class="text-caption text-grey mt-1">
                      ℹ️ Esta imagen se mostrará en el PDF del KUDE (Documento Electrónico).
                    </div>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.configuracionSifen.envioFacturas"
                      label="Envío de Facturas"
                      :items="[
                        { title: 'Normal (individual)', value: 'normal' },
                        { title: 'Por Lotes (agrupado por tipo)', value: 'lotes' }
                      ]"
                      hint="Define cómo se envían las facturas a SIFEN"
                      persistent-hint
                      outlined
                    ></v-select>
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="formulario.configuracionSifen.csc"
                      label="CSC (Código Secreto del Contribuyente) *"
                      :rules="[v => !!v || 'Requerido', v => /^[0-9A-F]{32}$/i.test(v) || '32 caracteres hexadecimales']"
                      maxlength="32"
                      counter="32"
                      placeholder="ABCD0000000000000000000000000000"
                      :type="mostrarCSC ? 'text' : 'password'"
                      :append-inner-icon="mostrarCSC ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="mostrarCSC = !mostrarCSC"
                      outlined
                    ></v-text-field>
                    <div class="text-caption text-grey mt-1">
                      ℹ️ El CSC es proporcionado por la SET al habilitar la facturación electrónica. Son 32 caracteres hexadecimales.
                    </div>
                  </v-col>

                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="formulario.configuracionSifen.timbradoFecha"
                      label="Inicio vigencia timbrado"
                      type="date"
                      hint="Fecha dFeIniT de la constancia del timbrado"
                      persistent-hint
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="6" md="4">
                    <v-text-field
                      v-model="formulario.configuracionSifen.establecimiento"
                      label="Establecimiento por defecto"
                      :rules="[v => !v || /^\d{1,3}$/.test(v) || '1-3 dígitos']"
                      maxlength="3"
                      placeholder="001"
                      hint="Se usa si la factura no trae data.establecimiento"
                      persistent-hint
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="6" md="4">
                    <v-text-field
                      v-model="formulario.configuracionSifen.puntoExpedicion"
                      label="Punto de expedición por defecto"
                      :rules="[v => !v || /^\d{1,3}$/.test(v) || '1-3 dígitos']"
                      maxlength="3"
                      placeholder="001"
                      hint="Cada punto lleva su numeración correlativa propia"
                      persistent-hint
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.configuracionSifen.monedasPermitidas"
                      label="Monedas permitidas"
                      :items="[
                        { title: 'Guaraní (PYG)', value: 'PYG' },
                        { title: 'Dólar (USD)', value: 'USD' },
                        { title: 'Real (BRL)', value: 'BRL' },
                        { title: 'Euro (EUR)', value: 'EUR' },
                        { title: 'Peso argentino (ARS)', value: 'ARS' }
                      ]"
                      multiple
                      chips
                      :rules="[v => (v && v.length > 0) || 'Al menos una moneda']"
                      hint="Política contable: facturas en otra moneda se rechazan"
                      persistent-hint
                      outlined
                    ></v-select>
                  </v-col>
                </v-row>
              </v-col>

              <v-col cols="12" class="bg-grey-lighten-4 pa-4 rounded mt-2">
                <div class="text-subtitle-1 font-weight-bold mb-1">
                  <v-icon start color="primary">mdi-store</v-icon>
                  Datos del Emisor
                </div>
                <div class="text-caption text-grey mb-3">
                  Con estos datos cargados, las integraciones pueden emitir mandando solo cliente + items:
                  el sistema completa emisor, sucursal, actividades y numeración automáticamente.
                </div>

                <v-row>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.tipoContribuyente"
                      label="Tipo de contribuyente"
                      :items="[
                        { title: 'Persona Física', value: 1 },
                        { title: 'Persona Jurídica', value: 2 }
                      ]"
                      clearable
                      outlined
                    ></v-select>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.tipoRegimen"
                      label="Tipo de régimen"
                      :items="[
                        { title: '1 - Régimen de Turismo', value: 1 },
                        { title: '2 - Importador', value: 2 },
                        { title: '3 - Exportador', value: 3 },
                        { title: '4 - Maquila', value: 4 },
                        { title: '5 - Ley 60/90', value: 5 },
                        { title: '6 - Régimen del Pequeño Productor', value: 6 },
                        { title: '7 - Régimen del Mediano Productor', value: 7 },
                        { title: '8 - Régimen Contable', value: 8 }
                      ]"
                      clearable
                      outlined
                    ></v-select>
                  </v-col>

                  <v-col cols="12">
                    <div class="text-subtitle-2 font-weight-bold mb-2">Actividades económicas</div>
                    <v-row v-for="(act, i) in formulario.actividadesEconomicas" :key="'act-' + i" dense>
                      <v-col cols="4" md="3">
                        <v-text-field v-model="act.codigo" label="Código" placeholder="46520" density="compact" outlined></v-text-field>
                      </v-col>
                      <v-col cols="7" md="8">
                        <v-text-field v-model="act.descripcion" label="Descripción" density="compact" outlined></v-text-field>
                      </v-col>
                      <v-col cols="1" class="d-flex align-center">
                        <v-btn icon size="small" color="error" variant="text" @click="quitarActividad(i)">
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </v-col>
                    </v-row>
                    <v-btn size="small" variant="tonal" color="primary" @click="agregarActividad">
                      <v-icon start>mdi-plus</v-icon> Agregar actividad
                    </v-btn>
                  </v-col>

                  <v-col cols="12">
                    <div class="text-subtitle-2 font-weight-bold mb-2">Establecimientos (sucursales)</div>
                    <v-card
                      v-for="(est, i) in formulario.establecimientos"
                      :key="'est-' + i"
                      variant="outlined"
                      class="pa-3 mb-3"
                    >
                      <v-row dense>
                        <v-col cols="4" md="2">
                          <v-text-field v-model="est.codigo" label="Código *" placeholder="001" maxlength="3" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="8" md="5">
                          <v-text-field v-model="est.denominacion" label="Denominación *" placeholder="Casa Matriz" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="8" md="4">
                          <v-text-field v-model="est.direccion" label="Dirección" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="4" md="1">
                          <v-text-field v-model="est.numeroCasa" label="N° casa" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="4" md="2">
                          <v-text-field v-model.number="est.departamento" label="Depto (cód)" type="number" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="8" md="4">
                          <v-text-field v-model="est.departamentoDescripcion" label="Departamento" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="4" md="2">
                          <v-text-field v-model.number="est.distrito" label="Distrito (cód)" type="number" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="8" md="4">
                          <v-text-field v-model="est.distritoDescripcion" label="Distrito" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="4" md="2">
                          <v-text-field v-model.number="est.ciudad" label="Ciudad (cód)" type="number" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="8" md="4">
                          <v-text-field v-model="est.ciudadDescripcion" label="Ciudad" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="6" md="3">
                          <v-text-field v-model="est.telefono" label="Teléfono" density="compact" outlined></v-text-field>
                        </v-col>
                        <v-col cols="6" md="3">
                          <v-text-field v-model="est.email" label="Email" density="compact" outlined></v-text-field>
                        </v-col>
                      </v-row>
                      <v-btn size="small" color="error" variant="text" @click="quitarEstablecimiento(i)">
                        <v-icon start>mdi-delete</v-icon> Quitar establecimiento
                      </v-btn>
                    </v-card>
                    <v-btn size="small" variant="tonal" color="primary" @click="agregarEstablecimiento">
                      <v-icon start>mdi-plus</v-icon> Agregar establecimiento
                    </v-btn>
                    <div class="text-caption text-grey mt-2">
                      ℹ️ Los códigos deben coincidir con los habilitados en el timbrado ante la DNIT.
                    </div>
                  </v-col>
                </v-row>
              </v-col>

              <v-col cols="12" class="bg-grey-lighten-4 pa-4 rounded mt-2">
                <div class="text-subtitle-1 font-weight-bold mb-1">
                  <v-icon start color="primary">mdi-bell-ring</v-icon>
                  Notificaciones
                </div>
                <div class="text-caption text-grey mb-3">
                  Avisos automáticos cuando una factura llega a estado final (aprobada/rechazada).
                </div>

                <v-row>
                  <v-col cols="12" md="7">
                    <v-text-field
                      v-model="formulario.notificaciones.webhookUrl"
                      label="Webhook URL"
                      placeholder="https://miweb.com/api/webhook-facturas"
                      hint="POST firmado (HMAC) con el resultado y links de PDF/XML. Vacío = desactivado"
                      persistent-hint
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="5">
                    <v-text-field
                      v-model="formulario.notificaciones.webhookSecret"
                      label="Webhook Secret"
                      hint="Para verificar la firma X-DTE-Firma. Se genera solo si queda vacío"
                      persistent-hint
                      :type="mostrarSecret ? 'text' : 'password'"
                      :append-inner-icon="mostrarSecret ? 'mdi-eye-off' : 'mdi-eye'"
                      @click:append-inner="mostrarSecret = !mostrarSecret"
                      outlined
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-switch
                      v-model="formulario.notificaciones.emailAutomatico"
                      color="primary"
                      label="Enviar KUDE por email al cliente automáticamente al aprobarse"
                      hint="Usa el proveedor SMTP seleccionado; sin proveedor, el SMTP del servidor"
                      persistent-hint
                    ></v-switch>
                  </v-col>

                  <v-col cols="12" md="6">
                    <v-select
                      v-model="formulario.notificaciones.smtpProviderId"
                      label="Proveedor SMTP"
                      :items="opcionesSmtp"
                      item-title="title"
                      item-value="value"
                      clearable
                      hint="Se gestionan en la sección Proveedores SMTP. Vacío = SMTP del servidor"
                      persistent-hint
                      outlined
                    ></v-select>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="cerrarFormulario">Cancelar</v-btn>
          <v-btn color="primary" :loading="guardando" @click="guardarEmpresa">
            <v-icon start>{{ empresaEnEdicion ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
            {{ empresaEnEdicion ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Subir certificado -->
    <v-dialog v-model="mostrarDialogoCertificado" max-width="600px" persistent>
      <v-card>
        <v-card-title class="bg-primary text-white">
          <v-icon start>mdi-certificate</v-icon>
          Certificado Digital
        </v-card-title>

        <v-card-text class="mt-4">
          <v-alert
            v-if="empresaSeleccionada?.certificado?.activo"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            <strong>Certificado activo cargado</strong>
            <div class="text-caption mt-1">
              Archivo: {{ empresaSeleccionada.certificado.nombreArchivo }}<br>
              Cargado: {{ new Date(empresaSeleccionada.certificado.fechaCarga).toLocaleDateString() }}
            </div>
          </v-alert>

          <v-form ref="formCertificado">
            <v-file-input
              v-model="archivoCertificado"
              label="Archivo .p12 *"
              accept=".p12"
              :rules="[v => !!v || 'Archivo requerido']"
              prepend-icon="mdi-file-upload"
              outlined
            ></v-file-input>

            <v-text-field
              v-model="contrasenaCertificado"
              label="Contraseña del certificado *"
              :rules="[v => !!v || 'Contraseña requerida']"
              :type="mostrarContrasena ? 'text' : 'password'"
              :append-inner-icon="mostrarContrasena ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="mostrarContrasena = !mostrarContrasena"
              outlined
            ></v-text-field>

            <v-alert
              type="info"
              variant="tonal"
              class="mt-4"
            >
              <v-icon start>mdi-information</v-icon>
              El certificado digital (.p12) es proporcionado por la SET y es requerido para firmar
              electrónicamente las facturas.
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="mostrarDialogoCertificado = false">Cancelar</v-btn>
          <v-btn color="primary" :loading="subiendoCertificado" @click="subirCertificado">
            <v-icon start>mdi-upload</v-icon>
            Subir Certificado
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Diálogo: Confirmar eliminación -->
    <v-dialog v-model="mostrarDialogoEliminar" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 d-flex align-center bg-error text-white">
          <v-icon start>mdi-delete-forever</v-icon>
          Eliminar Empresa
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            @click="mostrarDialogoEliminar = false; dependencias = null"
            :disabled="eliminando"
            color="white"
          ></v-btn>
        </v-card-title>
        <v-card-text class="mt-4">
          <v-alert
            v-if="tieneDependencias"
            type="error"
            variant="tonal"
            icon="mdi-block-helper"
            class="mb-3"
          >
            <strong>No se puede eliminar</strong> — la empresa tiene registros dependientes:
            <ul class="mt-1 mb-0">
              <li v-if="dependencias.facturas > 0">{{ dependencias.facturas }} factura(s) asociada(s)</li>
              <li v-if="dependencias.lotes > 0">{{ dependencias.lotes }} lote(s) de envío</li>
              <li v-if="dependencias.eventos > 0">{{ dependencias.eventos }} evento(s)</li>
              <li v-if="dependencias.apiKeys > 0">{{ dependencias.apiKeys }} clave(s) de API</li>
            </ul>
          </v-alert>
          <v-alert v-else type="warning" variant="tonal" icon="mdi-alert" class="mb-3">
            <strong>⚠️ Advertencia:</strong> Esta acción eliminará permanentemente la empresa.
          </v-alert>
          <p class="text-body-1 mb-2">
            <template v-if="tieneDependencias">
              Elimine o reasigne los registros dependientes antes de eliminar la empresa.
            </template>
            <template v-else>
              ¿Estás <strong>SEGURO</strong> de que deseas eliminar la empresa?
            </template>
          </p>
          <v-card variant="outlined" class="pa-3 mb-3">
            <div class="text-subtitle-1 font-weight-bold">{{ empresaSeleccionada?.nombreFantasia }}</div>
            <div class="text-caption text-medium-emphasis">
              <v-icon start size="x-small">mdi-numeric</v-icon> RUC: {{ empresaSeleccionada?.ruc }}<br>
              <v-icon start size="x-small">mdi-account</v-icon> {{ empresaSeleccionada?.razonSocial }}
            </div>
          </v-card>
          <template v-if="!tieneDependencias">
            <p class="text-body-2 text-medium-emphasis">
              Esta acción <strong>no se puede deshacer</strong>. Se eliminarán:
            </p>
            <ul class="text-body-2 text-medium-emphasis">
              <li>La empresa y su configuración</li>
              <li>El certificado digital asociado</li>
              <li>Las referencias a configuraciones SIFEN</li>
            </ul>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="mostrarDialogoEliminar = false; dependencias = null"
            :disabled="eliminando"
          >
            {{ tieneDependencias ? 'Cerrar' : 'Cancelar' }}
          </v-btn>
          <v-btn
            v-if="!tieneDependencias"
            color="error"
            variant="tonal"
            @click="eliminarEmpresa"
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
      :timeout="4000"
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
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';

export default {
  name: 'EmpresasView',
  setup() {
    // Estado
    const empresas = ref([]);
    const cargando = ref(false);
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const guardando = ref(false);
    const subiendoCertificado = ref(false);
    const eliminando = ref(false);
    
    // Diálogos
    const mostrarDialogoFormulario = ref(false);
    const mostrarDialogoCertificado = ref(false);
    const mostrarDialogoEliminar = ref(false);
    
    // Formulario
    const formRef = ref(null);
    const formularioValido = ref(false);
    const empresaEnEdicion = ref(null);
    const formulario = ref({
      ruc: '',
      nombreFantasia: '',
      razonSocial: '',
      direccion: '',
      telefono: '',
      email: '',
      configuracionSifen: {
        timbrado: '12345678',
        idCSC: '0001',
        csc: '',
        modo: 'test',
        urlLogo: '',
        envioFacturas: 'normal'
      }
    });
    
    // Certificado
    const archivoCertificado = ref(null);
    const contrasenaCertificado = ref('');
    const mostrarContrasena = ref(false);
    const mostrarCSC = ref(false);
    const mostrarSecret = ref(false);
    
    // Empresa seleccionada
    const empresaSeleccionada = ref(null);

    // Proveedores SMTP disponibles (para el selector de notificaciones)
    const smtpProviders = ref([]);
    const opcionesSmtp = computed(() =>
      smtpProviders.value.map((p) => ({
        title: `${p.nombre} (${p.host})${p.activo ? '' : ' — inactivo'}`,
        value: p._id
      }))
    );
    const cargarSmtpProviders = async () => {
      try {
        const response = await axios.get('/api/smtp-providers', { params: { _t: Date.now() } });
        smtpProviders.value = response.data.data || [];
      } catch (error) {
        console.error('❌ Error cargando proveedores SMTP:', error);
      }
    };
    
    // Snackbar
    const snackbar = ref(false);
    const snackbarText = ref('');
    const snackbarColor = ref('success');
    
    // Headers de la tabla
    const headers = [
      { title: 'Nombre Fantasía', key: 'nombreFantasia', sortable: true },
      { title: 'RUC', key: 'ruc', sortable: true },
      { title: 'Razón Social', key: 'razonSocial', sortable: false },
      { title: 'Certificado', key: 'certificado', sortable: false },
      { title: 'Modo', key: 'modo', sortable: false },
      { title: 'Estado', key: 'activo', sortable: true },
      { title: 'Acciones', key: 'acciones', sortable: false, align: 'end' }
    ];
    
    // Paginación client-side
    const totalPages = computed(() => Math.max(1, Math.ceil(empresas.value.length / itemsPerPage.value)));

    const empresasDisplayadas = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return empresas.value.slice(start, end);
    });

    watch(itemsPerPage, () => {
      currentPage.value = 1;
    });

    watch(empresas, () => {
      currentPage.value = 1;
    });

    // Cargar empresas
    const cargarEmpresas = async () => {
      cargando.value = true;
      try {
        // Agregar timestamp para evitar cache
        const response = await axios.get('/api/empresas', {
          params: { _t: Date.now() }
        });
        empresas.value = response.data.data || [];
        console.log('✅ Empresas cargadas:', empresas.value.length);
      } catch (error) {
        console.error('❌ Error cargando empresas:', error);
        mostrarSnackbar('Error cargando empresas: ' + error.message, 'error');
      } finally {
        cargando.value = false;
      }
    };
    
    // Mostrar snackbar
    const mostrarSnackbar = (texto, color = 'success') => {
      snackbarText.value = texto;
      snackbarColor.value = color;
      snackbar.value = true;
    };
    
    // Abrir formulario para nueva empresa
    const nuevaEmpresa = () => {
      empresaEnEdicion.value = null;
      formulario.value = {
        ruc: '',
        nombreFantasia: '',
        razonSocial: '',
        direccion: '',
        telefono: '',
        email: '',
        tipoContribuyente: 2,
        tipoRegimen: null,
        actividadesEconomicas: [],
        establecimientos: [],
        notificaciones: { webhookUrl: '', webhookSecret: '', emailAutomatico: false, smtpProviderId: null },
        configuracionSifen: {
          timbrado: '12345678',
          idCSC: '0001',
          csc: '',
          modo: 'test',
          urlLogo: '',
          envioFacturas: 'normal',
          timbradoFecha: '',
          establecimiento: '001',
          puntoExpedicion: '001',
          monedasPermitidas: ['PYG', 'USD']
        }
      };
      mostrarDialogoFormulario.value = true;
    };

    // Editar empresa
    const editarEmpresa = (empresa) => {
      empresaEnEdicion.value = empresa;
      formulario.value = {
        ruc: empresa.ruc,
        nombreFantasia: empresa.nombreFantasia,
        razonSocial: empresa.razonSocial,
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email || '',
        tipoContribuyente: empresa.tipoContribuyente ?? 2,
        tipoRegimen: empresa.tipoRegimen ?? null,
        actividadesEconomicas: JSON.parse(JSON.stringify(empresa.actividadesEconomicas || [])),
        establecimientos: JSON.parse(JSON.stringify(empresa.establecimientos || [])),
        notificaciones: {
          webhookUrl: empresa.notificaciones?.webhookUrl || '',
          webhookSecret: empresa.notificaciones?.webhookSecret || '',
          emailAutomatico: empresa.notificaciones?.emailAutomatico || false,
          smtpProviderId: empresa.notificaciones?.smtpProviderId || null
        },
        configuracionSifen: {
          timbrado: empresa.configuracionSifen?.timbrado || '12345678',
          idCSC: empresa.configuracionSifen?.idCSC || '0001',
          csc: empresa.configuracionSifen?.csc || '',
          modo: empresa.configuracionSifen?.modo || 'test',
          urlLogo: empresa.configuracionSifen?.urlLogo || '',
          envioFacturas: empresa.configuracionSifen?.envioFacturas || 'normal',
          timbradoFecha: empresa.configuracionSifen?.timbradoFecha || '',
          establecimiento: empresa.configuracionSifen?.establecimiento || '001',
          puntoExpedicion: empresa.configuracionSifen?.puntoExpedicion || '001',
          monedasPermitidas: [...(empresa.configuracionSifen?.monedasPermitidas || ['PYG', 'USD'])]
        }
      };
      mostrarDialogoFormulario.value = true;
    };

    // Filas dinámicas: actividades económicas y establecimientos
    const agregarActividad = () => {
      formulario.value.actividadesEconomicas.push({ codigo: '', descripcion: '' });
    };
    const quitarActividad = (i) => {
      formulario.value.actividadesEconomicas.splice(i, 1);
    };
    const agregarEstablecimiento = () => {
      formulario.value.establecimientos.push({
        codigo: '', denominacion: '', direccion: '', numeroCasa: '',
        departamento: null, departamentoDescripcion: '',
        distrito: null, distritoDescripcion: '',
        ciudad: null, ciudadDescripcion: '',
        telefono: '', email: ''
      });
    };
    const quitarEstablecimiento = (i) => {
      formulario.value.establecimientos.splice(i, 1);
    };
    
    // Cerrar formulario
    const cerrarFormulario = () => {
      mostrarDialogoFormulario.value = false;
      empresaEnEdicion.value = null;
      if (formRef.value) {
        formRef.value.reset();
      }
    };
    
    // Guardar empresa
    const guardarEmpresa = async () => {
      if (!formRef.value || !formularioValido.value) {
        formRef.value?.validate();
        return;
      }
      
      guardando.value = true;
      try {
        if (empresaEnEdicion.value) {
          // Actualizar
          await axios.put(`/api/empresas/${empresaEnEdicion.value._id}`, formulario.value);
          mostrarSnackbar('Empresa actualizada exitosamente');
        } else {
          // Crear nueva
          await axios.post('/api/empresas', formulario.value);
          mostrarSnackbar('Empresa creada exitosamente');
        }
        
        cerrarFormulario();
        cargarEmpresas();
      } catch (error) {
        mostrarSnackbar(
          error.response?.data?.error || 'Error guardando empresa',
          'error'
        );
      } finally {
        guardando.value = false;
      }
    };
    
    // Mostrar diálogo de certificado
    const abrirDialogoCertificado = (empresa) => {
      empresaSeleccionada.value = empresa;
      archivoCertificado.value = null;
      contrasenaCertificado.value = '';
      mostrarDialogoCertificado.value = true;
    };
    
    // Subir certificado
    const subirCertificado = async () => {
      if (!archivoCertificado.value || !contrasenaCertificado.value) {
        mostrarSnackbar('Archivo y contraseña son requeridos', 'warning');
        return;
      }
      
      subiendoCertificado.value = true;
      try {
        const formData = new FormData();
        formData.append('certificado', archivoCertificado.value);
        formData.append('contrasena', contrasenaCertificado.value);
        
        await axios.post(
          `/api/empresas/${empresaSeleccionada.value._id}/certificado`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        mostrarSnackbar('Certificado cargado exitosamente');
        mostrarDialogoCertificado.value = false;
        cargarEmpresas();
      } catch (error) {
        mostrarSnackbar(
          error.response?.data?.error || 'Error subiendo certificado',
          'error'
        );
      } finally {
        subiendoCertificado.value = false;
      }
    };
    
    const dependencias = ref(null);
    const tieneDependencias = computed(() => {
      if (!dependencias.value) return false;
      const d = dependencias.value;
      return d.facturas > 0 || d.lotes > 0 || d.eventos > 0 || d.apiKeys > 0;
    });

    // Confirmar eliminación
    const confirmarEliminar = (empresa) => {
      empresaSeleccionada.value = empresa;
      dependencias.value = null;
      mostrarDialogoEliminar.value = true;
    };
    
    // Eliminar empresa
    const eliminarEmpresa = async () => {
      if (!empresaSeleccionada.value) return;
      
      eliminando.value = true;
      try {
        await axios.delete(`/api/empresas/${empresaSeleccionada.value._id}`);
        mostrarSnackbar('Empresa eliminada exitosamente');
        mostrarDialogoEliminar.value = false;
        cargarEmpresas();
      } catch (error) {
        const dep = error.response?.data?.dependencias;
        if (dep) {
          dependencias.value = dep;
        } else {
          mostrarSnackbar(
            error.response?.data?.error || error.response?.data?.mensaje || 'Error eliminando empresa',
            'error'
          );
        }
      } finally {
        eliminando.value = false;
      }
    };
    
    // Cargar empresas y proveedores SMTP al montar
    onMounted(() => {
      cargarEmpresas();
      cargarSmtpProviders();
    });
    
    return {
      // Estado
      empresas,
      cargando,
      guardando,
      subiendoCertificado,
      eliminando,
      
      // Diálogos
      mostrarDialogoFormulario,
      mostrarDialogoCertificado,
      mostrarDialogoEliminar,
      
      // Formulario
      formRef,
      formularioValido,
      empresaEnEdicion,
      formulario,
      
      // Certificado
      archivoCertificado,
      contrasenaCertificado,
      mostrarContrasena,
      mostrarCSC,
      mostrarSecret,

      // Empresa seleccionada
      empresaSeleccionada,

      // Proveedores SMTP
      opcionesSmtp,
      
      // Dependencias
      dependencias,
      tieneDependencias,
      
      // Snackbar
      snackbar,
      snackbarText,
      snackbarColor,
      
      // Headers
      headers,

      // Paginación
      currentPage,
      itemsPerPage,
      totalPages,
      empresasDisplayadas,

      // Métodos
      cargarEmpresas,
      mostrarSnackbar,
      nuevaEmpresa,
      editarEmpresa,
      cerrarFormulario,
      guardarEmpresa,
      abrirDialogoCertificado,
      subirCertificado,
      confirmarEliminar,
      eliminarEmpresa
    };
  }
};
</script>
