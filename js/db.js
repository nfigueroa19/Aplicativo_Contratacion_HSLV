// ════════════════════════════════════════════════════
//  js/db.js
//  Todas las operaciones con Supabase en un solo lugar
// ════════════════════════════════════════════════════


// ════════════════════════════════════════════════════
//  VERIFICAR ROL DEL USUARIO ACTUAL
// ════════════════════════════════════════════════════
async function db_obtenerPerfil() {
    try {
        var { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return null;

        var { data: perfil } = await supabaseClient
            .from('profiles')
            .select('id, nombre, email, area, rol, estado')
            .eq('id', session.user.id)
            .single();

        return perfil;
    } catch (err) {
        console.error('Error obteniendo perfil:', err);
        return null;
    }
}

// Cache del perfil para no consultar en cada operación
var _perfilCache = null;
async function db_perfil() {
    if (!_perfilCache) _perfilCache = await db_obtenerPerfil();
    return _perfilCache;
}

// Limpiar cache al cerrar sesión
function db_limpiarCache() {
    _perfilCache = null;
}


// ════════════════════════════════════════════════════
//  GENERAR CÓDIGO DE PROCESO
//  Usa la función SQL que creamos en Supabase
//  Formato: TIPO-AÑO-NUMERO-PALABRAS-OBJETO
// ════════════════════════════════════════════════════
async function db_generarCodigo(tipo, objeto) {
    try {
        var { data, error } = await supabaseClient
            .rpc('generar_codigo_proceso', {
                p_tipo:   tipo,
                p_objeto: objeto || 'SIN OBJETO'
            });

        if (error) {
            // Fallback si la función falla
            var anio  = new Date().getFullYear();
            var ts    = Date.now().toString().slice(-4);
            return tipo + '-' + anio + '-' + ts;
        }

        return data;
    } catch (err) {
        var anio = new Date().getFullYear();
        return tipo + '-' + anio + '-' + Date.now().toString().slice(-4);
    }
}


// ════════════════════════════════════════════════════
//  GUARDAR PROCESO COMPLETO
// ════════════════════════════════════════════════════
async function db_guardarProceso(datos) {

    try {
        // 1. Verificar sesión y perfil
        var perfil = await db_perfil();
        if (!perfil) {
            alert('⚠️ Sesión expirada. Por favor inicia sesión nuevamente.');
            window.location.href = '/login';
            return null;
        }

        // 2. Verificar que el usuario puede crear procesos
        if (perfil.area !== 'biomedica' && perfil.rol !== 'admin') {
            alert('⚠️ Solo el área Biomédica puede crear procesos.');
            return null;
        }

        // 3. Generar código descriptivo
        var codigo = await db_generarCodigo(datos.tipo, datos.objeto);

        // 4. Guardar proceso en Supabase
        var { data: proceso, error: errorProceso } = await supabaseClient
            .from('procesos')
            .insert({
                codigo:           codigo,
                tipo:             datos.tipo,
                objeto:           datos.objeto        || '',
                area_solicitante: datos.area          || '',
                valor:            datos.valor         || '',
                responsable:      datos.responsable   || '',
                creado_por:       perfil.id,
                estado:           'borrador'
            })
            .select()
            .single();

        if (errorProceso) {
            console.error('Error guardando proceso:', errorProceso);
            alert('❌ Error al guardar el proceso. Intente de nuevo.');
            return null;
        }

        var procesoId = proceso.id;

        // 5. Subir archivos del checklist
        var erroresArchivos = [];

        if (datos.checklist && datos.checklist.length > 0) {
            for (var i = 0; i < datos.checklist.length; i++) {
                var item = datos.checklist[i];
                if (!item.archivo) continue;

                try {
                    // Biomédica NO puede subir documentos restringidos
                    if (item.esRestringido && perfil.area === 'biomedica') {
                        continue;
                    }

                    var bucket = item.esRestringido
                        ? 'documentos-restringidos'
                        : 'documentos-procesos';

                    // Ruta organizada: proceso/item/version_archivo
                    var rutaArchivo = procesoId + '/' +
                                      'item-' + item.num + '/' +
                                      'v1_' + item.archivo.name;

                    var { error: errorSubida } = await supabaseClient
                        .storage
                        .from(bucket)
                        .upload(rutaArchivo, item.archivo, { upsert: false });

                    if (errorSubida) {
                        console.error('Error subiendo ítem ' + item.num, errorSubida);
                        erroresArchivos.push('Ítem ' + item.num + ': ' + item.archivo.name);
                        continue;
                    }

                    // Registrar documento en tabla
                    await supabaseClient
                        .from('documentos')
                        .insert({
                            proceso_id:     procesoId,
                            item_num:       item.num,
                            item_label:     item.label        || '',
                            nombre_archivo: item.archivo.name,
                            url_archivo:    bucket + '/' + rutaArchivo,
                            subido_por:     perfil.id,
                            es_restringido: item.esRestringido || false,
                            version:        1,
                            activo:         true,
                            tamano_bytes:   item.archivo.size
                        });

                } catch (errItem) {
                    console.error('Error en ítem ' + item.num, errItem);
                    erroresArchivos.push('Ítem ' + item.num);
                }
            }

            // Guardar los comentarios escritos durante la creación (uno por ítem)
            for (var j = 0; j < datos.checklist.length; j++) {
                var itemCom = datos.checklist[j];
                if (!itemCom.comentario) continue;

                try {
                    await supabaseClient
                        .from('comentarios')
                        .insert({
                            proceso_id: procesoId,
                            item_num:   itemCom.num,
                            autor_id:   perfil.id,
                            texto:      itemCom.comentario
                        });
                } catch (errCom) {
                    console.error('Error guardando comentario del ítem ' + itemCom.num, errCom);
                }
            }
        }

        // 6. Sincronizar con HIST_BD local para el dashboard
        if (typeof HIST_BD !== 'undefined') {
            var checksOk = datos.checklist
                ? datos.checklist.filter(function(c){ return c.ok; }).length
                : 0;
            var checksTotal = datos.checklist ? datos.checklist.length : 0;

            HIST_BD.unshift({
                id:          codigo,
                tipo:        datos.tipo,
                objeto:      datos.objeto      || '',
                area:        datos.area        || '',
                valor:       datos.valor       || '',
                responsable: datos.responsable || '',
                fecha:       new Date().toLocaleDateString('es-CO',
                                 {day:'2-digit',month:'2-digit',year:'numeric'}),
                hora:        new Date().toLocaleTimeString('es-CO',
                                 {hour:'2-digit',minute:'2-digit'}),
                timestamp:   Date.now(),
                checksOk:    checksOk,
                checksTotal: checksTotal,
                checklist:   datos.checklist   || [],
                supabase_id: procesoId
            });
        }

        // 7. Jurídica NO se notifica al crear el proceso — solo se le
        //    notifica al jurídico específico cuando el Admin lo asigne
        //    (ver db_asignarResponsable), ya que hasta ese momento
        //    Jurídica no debe tener visibilidad del proceso.

        // 8. Resultado
        if (erroresArchivos.length > 0) {
            alert('✅ Proceso ' + codigo + ' guardado.\n\n' +
                  '⚠️ Algunos archivos no pudieron subirse:\n' +
                  erroresArchivos.join('\n') + '\n\nPuede intentar cargarlos nuevamente.');
        }

        return { codigo: codigo, id: procesoId };

    } catch (err) {
        console.error('Error general en db_guardarProceso:', err);
        alert('❌ Error inesperado: ' + err.message);
        return null;
    }
}


// ════════════════════════════════════════════════════
//  SUBIR DOCUMENTO A PROCESO EXISTENTE
//  Cuando se sube un archivo después de crear el proceso
//  o cuando se reemplaza una versión anterior
// ════════════════════════════════════════════════════
async function db_subirDocumento(procesoId, itemNum, itemLabel, archivo, esRestringido) {
    try {
        var perfil = await db_perfil();
        if (!perfil) return null;

        // Biomédica no puede subir documentos restringidos
        if (esRestringido && perfil.area === 'biomedica') {
            alert('⚠️ No tienes permisos para subir este tipo de documento.');
            return null;
        }

        var bucket = esRestringido
            ? 'documentos-restringidos'
            : 'documentos-procesos';

        // Buscar versión anterior activa del mismo ítem
        var { data: versionAnterior } = await supabaseClient
            .from('documentos')
            .select('id, version')
            .eq('proceso_id', procesoId)
            .eq('item_num',   itemNum)
            .eq('activo',     true)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        var nuevaVersion = 1;

        if (versionAnterior) {
            nuevaVersion = versionAnterior.version + 1;

            // Marcar versión anterior como inactiva (queda en historial)
            await supabaseClient
                .from('documentos')
                .update({ activo: false })
                .eq('id', versionAnterior.id);
        }

        // Subir archivo con número de versión en la ruta
        var rutaArchivo = procesoId + '/' +
                          'item-' + itemNum + '/' +
                          'v' + nuevaVersion + '_' + archivo.name;

        var { error: errorSubida } = await supabaseClient
            .storage
            .from(bucket)
            .upload(rutaArchivo, archivo, { upsert: false });

        if (errorSubida) {
            console.error('Error subiendo archivo:', errorSubida);
            alert('❌ Error al subir el archivo: ' + errorSubida.message);
            return null;
        }

        // Registrar nueva versión en tabla documentos
        var { data: doc } = await supabaseClient
            .from('documentos')
            .insert({
                proceso_id:     procesoId,
                item_num:       itemNum,
                item_label:     itemLabel      || '',
                nombre_archivo: archivo.name,
                url_archivo:    bucket + '/' + rutaArchivo,
                subido_por:     perfil.id,
                es_restringido: esRestringido  || false,
                version:        nuevaVersion,
                activo:         true,
                tamano_bytes:   archivo.size
            })
            .select()
            .single();

        return doc;

    } catch (err) {
        console.error('Error en db_subirDocumento:', err);
        return null;
    }
}


// ════════════════════════════════════════════════════
//  DESCARGAR DOCUMENTO
//  Genera URL temporal firmada para descargar el archivo
// ════════════════════════════════════════════════════
async function db_descargarDocumento(urlArchivo) {
    try {
        // La url_archivo tiene formato: "bucket/ruta/del/archivo"
        var partes  = urlArchivo.split('/');
        var bucket  = partes[0];
        var ruta    = partes.slice(1).join('/');

        var { data, error } = await supabaseClient
            .storage
            .from(bucket)
            .createSignedUrl(ruta, 60); // URL válida por 60 segundos

        if (error) {
            console.error('Error generando URL:', error);
            return null;
        }

        return data.signedUrl;

    } catch (err) {
        console.error('Error en db_descargarDocumento:', err);
        return null;
    }
}


// ════════════════════════════════════════════════════
//  GUARDAR COMENTARIO
//  En un proceso (documentoId = null)
//  O en un documento específico (documentoId = uuid)
// ════════════════════════════════════════════════════
async function db_guardarComentario(procesoId, texto, documentoId, itemNum) {
    try {
        var perfil = await db_perfil();
        if (!perfil) return null;

        if (!texto || !texto.trim()) {
            alert('⚠️ El comentario no puede estar vacío.');
            return null;
        }

        var { data: comentario, error } = await supabaseClient
            .from('comentarios')
            .insert({
                proceso_id:   procesoId,
                documento_id: documentoId || null,
                item_num:     (itemNum || itemNum === 0) ? itemNum : null,
                autor_id:     perfil.id,
                texto:        texto.trim()
            })
            .select('*, autor:profiles(nombre, area, rol)')
            .single();

        if (error) {
            console.error('Error guardando comentario:', error);
            return null;
        }

        // Notificar a los involucrados en el proceso
        await db_notificarComentario(procesoId, comentario.id, texto, perfil);

        return comentario;

    } catch (err) {
        console.error('Error en db_guardarComentario:', err);
        return null;
    }
}

// Notificar cuando hay un comentario nuevo
async function db_notificarComentario(procesoId, comentarioId, texto, autorPerfil) {
    try {
        // Obtener el proceso para saber quién notificar
        var { data: proceso } = await supabaseClient
            .from('procesos')
            .select('creado_por, asignado_a, responsable_asignado, codigo')
            .eq('id', procesoId)
            .single();

        if (!proceso) return;

        // Notificar a todos los involucrados excepto al autor del comentario
        var aNotificar = new Set();
        if (proceso.creado_por          && proceso.creado_por          !== autorPerfil.id)
            aNotificar.add(proceso.creado_por);
        if (proceso.asignado_a          && proceso.asignado_a          !== autorPerfil.id)
            aNotificar.add(proceso.asignado_a);
        if (proceso.responsable_asignado && proceso.responsable_asignado !== autorPerfil.id)
            aNotificar.add(proceso.responsable_asignado);

        if (aNotificar.size === 0) return;

        var mensajeCorto = texto.length > 60
            ? texto.slice(0, 60) + '...'
            : texto;

        var notificaciones = Array.from(aNotificar).map(function(uid) {
            return {
                usuario_id: uid,
                tipo:       'comentario_nuevo',
                mensaje:    (autorPerfil.nombre || 'Un usuario') +
                            ' comentó en ' + proceso.codigo +
                            ': "' + mensajeCorto + '"',
                proceso_id: procesoId,
                leida:      false
            };
        });

        await supabaseClient
            .from('notificaciones')
            .insert(notificaciones);

    } catch (err) {
        console.error('Error notificando comentario:', err);
    }
}


// ════════════════════════════════════════════════════
//  CARGAR COMENTARIOS DE UN PROCESO
// ════════════════════════════════════════════════════
async function db_cargarComentarios(procesoId) {
    try {
        var { data: comentarios, error } = await supabaseClient
            .from('comentarios')
            .select('*, autor:profiles(nombre, area, rol)')
            .eq('proceso_id', procesoId)
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error cargando comentarios:', error);
            return [];
        }

        return comentarios || [];

    } catch (err) {
        console.error('Error en db_cargarComentarios:', err);
        return [];
    }
}


// ════════════════════════════════════════════════════
//  ASIGNAR RESPONSABLE A UN PROCESO
//  Solo el Admin puede hacer esto
// ════════════════════════════════════════════════════
async function db_asignarResponsable(procesoId, usuarioId) {
    try {
        var perfil = await db_perfil();
        if (!perfil || perfil.rol !== 'admin') {
            alert('⚠️ Solo el administrador puede asignar responsables.');
            return false;
        }

        var { error } = await supabaseClient
            .from('procesos')
            .update({
                responsable_asignado:       usuarioId,
                responsable_asignado_por:   perfil.id,
                responsable_asignado_fecha: new Date().toISOString()
            })
            .eq('id', procesoId);

        if (error) {
            console.error('Error asignando responsable:', error);
            return false;
        }

        // Notificar al responsable asignado
        var { data: proceso } = await supabaseClient
            .from('procesos')
            .select('codigo')
            .eq('id', procesoId)
            .single();

        await supabaseClient
            .from('notificaciones')
            .insert({
                usuario_id: usuarioId,
                tipo:       'asignacion',
                mensaje:    'Se te asignó como responsable del proceso ' +
                            (proceso ? proceso.codigo : procesoId),
                proceso_id: procesoId,
                leida:      false
            });

        return true;

    } catch (err) {
        console.error('Error en db_asignarResponsable:', err);
        return false;
    }
}


// ════════════════════════════════════════════════════
//  CARGAR PROCESOS DESDE SUPABASE
//  Para reconstruir HIST_BD al entrar al sistema
// ════════════════════════════════════════════════════
async function db_cargarProcesos() {
    try {
        var { data: procesos, error } = await supabaseClient
            .from('procesos')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            console.error('Error cargando procesos:', error);
            return [];
        }

        // Adjuntar el nombre del responsable asignado y de quién lo asignó
        // (no viajan en la tabla `procesos`, solo los ids) para que no se
        // pierdan al recargar
        if (procesos && procesos.length > 0) {
            var juridicos = await db_cargarUsuariosJuridicos();
            var admins     = await db_cargarUsuariosAdmin();

            var mapaPerfiles = {};
            (juridicos || []).forEach(function(u) {
                mapaPerfiles[u.id] = u.nombre || u.email;
            });
            (admins || []).forEach(function(u) {
                mapaPerfiles[u.id] = u.nombre || u.email;
            });

            procesos.forEach(function(p) {
                if (p.responsable_asignado) {
                    p.responsable_asignado_nombre = mapaPerfiles[p.responsable_asignado] || '';
                }
                if (p.responsable_asignado_por) {
                    p.responsable_asignado_por_nombre = mapaPerfiles[p.responsable_asignado_por] || '';
                }
            });
        }

        return procesos || [];

    } catch (err) {
        console.error('Error en db_cargarProcesos:', err);
        return [];
    }
}


// ════════════════════════════════════════════════════
//  CARGAR UN PROCESO POR SU CÓDIGO
//  Para la página de detalle (/proceso/CODIGO)
// ════════════════════════════════════════════════════
async function db_obtenerProcesoPorCodigo(codigo) {
    try {
        var { data: proceso, error } = await supabaseClient
            .from('procesos')
            .select('*')
            .eq('codigo', codigo)
            .single();

        if (error || !proceso) {
            console.error('Error cargando proceso por código:', error);
            return null;
        }

        // Adjuntar nombres de responsable asignado y de quién lo asignó
        var juridicos = await db_cargarUsuariosJuridicos();
        var admins     = await db_cargarUsuariosAdmin();
        var mapaPerfiles = {};
        (juridicos || []).forEach(function(u) { mapaPerfiles[u.id] = u.nombre || u.email; });
        (admins     || []).forEach(function(u) { mapaPerfiles[u.id] = u.nombre || u.email; });

        if (proceso.responsable_asignado) {
            proceso.responsable_asignado_nombre = mapaPerfiles[proceso.responsable_asignado] || '';
        }
        if (proceso.responsable_asignado_por) {
            proceso.responsable_asignado_por_nombre = mapaPerfiles[proceso.responsable_asignado_por] || '';
        }

        return proceso;

    } catch (err) {
        console.error('Error en db_obtenerProcesoPorCodigo:', err);
        return null;
    }
}


// ════════════════════════════════════════════════════
//  CARGAR DOCUMENTOS REALES DE UN PROCESO
//  Incluye versiones anteriores (activo=false) para el historial
// ════════════════════════════════════════════════════
async function db_cargarDocumentos(procesoId) {
    try {
        var { data, error } = await supabaseClient
            .from('documentos')
            .select('*')
            .eq('proceso_id', procesoId)
            .order('item_num', { ascending: true })
            .order('version',  { ascending: false });

        if (error) {
            console.error('Error cargando documentos:', error);
            return [];
        }
        return data || [];

    } catch (err) {
        console.error('Error en db_cargarDocumentos:', err);
        return [];
    }
}


// ════════════════════════════════════════════════════
//  FINALIZAR PROCESO
//  Solo puede hacerse una vez; después de esto, solo un
//  Admin puede revertirlo (cambiar el estado manualmente)
// ════════════════════════════════════════════════════
async function db_finalizarProceso(procesoId) {
    try {
        var perfil = await db_perfil();
        if (!perfil) return false;

        var { data: actual } = await supabaseClient
            .from('procesos')
            .select('estado')
            .eq('id', procesoId)
            .single();

        if (actual && actual.estado === 'cerrado') {
            alert('⚠️ Este proceso ya fue finalizado anteriormente.');
            return false;
        }

        var { error } = await supabaseClient
            .from('procesos')
            .update({ estado: 'cerrado' })
            .eq('id', procesoId);

        if (error) {
            console.error('Error finalizando proceso:', error);
            alert('❌ No se pudo finalizar el proceso.');
            return false;
        }

        return true;

    } catch (err) {
        console.error('Error en db_finalizarProceso:', err);
        return false;
    }
}


// ════════════════════════════════════════════════════
//  NOTIFICACIONES
// ════════════════════════════════════════════════════

// Contar notificaciones no leídas
async function db_contarNotificaciones() {
    try {
        var { count } = await supabaseClient
            .from('notificaciones')
            .select('*', { count: 'exact', head: true })
            .eq('leida', false);
        return count || 0;
    } catch (err) {
        return 0;
    }
}

// Cargar todas las notificaciones del usuario
async function db_cargarNotificaciones() {
    try {
        var { data, error } = await supabaseClient
            .from('notificaciones')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(20);

        if (error) return [];
        return data || [];

    } catch (err) {
        return [];
    }
}

// Marcar una notificación como leída
async function db_marcarLeida(notificacionId) {
    await supabaseClient
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificacionId);
}

// Marcar todas como leídas
async function db_marcarTodasLeidas() {
    await supabaseClient
        .from('notificaciones')
        .update({ leida: true })
        .eq('leida', false);
}


// ════════════════════════════════════════════════════
//  INICIALIZACIÓN AL CARGAR CUALQUIER PÁGINA
//  Carga procesos de Supabase → sincroniza con HIST_BD
// ════════════════════════════════════════════════════
async function db_inicializar() {
    try {
        // Cargar perfil y listado de jurídicos ANTES de renderizar cualquier
        // tabla, para que el selector de responsable del Admin funcione
        // apenas se abra el historial o el modal del dashboard.
        await db_perfil();
        window._usuariosJuridicos = await db_cargarUsuariosJuridicos();

        var procesosDB = await db_cargarProcesos();
        if (!procesosDB || procesosDB.length === 0) return;

        if (typeof HIST_BD === 'undefined') return;

        procesosDB.forEach(function(p) {
            // Evitar duplicados
            var yaExiste = HIST_BD.some(function(h) {
                return h.supabase_id === p.id || h.id === p.codigo;
            });
            if (yaExiste) return;

            HIST_BD.push({
                id:          p.codigo || p.id,
                tipo:        p.tipo,
                objeto:      p.objeto           || '',
                area:        p.area_solicitante || '',
                valor:       p.valor            || '',
                responsable: p.responsable      || '',
                responsable_asignado:           p.responsable_asignado           || '',
                responsable_asignado_nombre:    p.responsable_asignado_nombre    || '',
                responsable_asignado_por:       p.responsable_asignado_por       || '',
                responsable_asignado_por_nombre: p.responsable_asignado_por_nombre || '',
                responsable_asignado_fecha:     p.responsable_asignado_fecha     || '',
                fecha:       new Date(p.fecha_creacion).toLocaleDateString('es-CO',
                                 {day:'2-digit',month:'2-digit',year:'numeric'}),
                hora:        new Date(p.fecha_creacion).toLocaleTimeString('es-CO',
                                 {hour:'2-digit',minute:'2-digit'}),
                timestamp:   new Date(p.fecha_creacion).getTime(),
                checksOk:    0,
                checksTotal: 0,
                checklist:   [],
                supabase_id: p.id,
                estado:      p.estado
            });
        });

        // Ordenar por más reciente primero
        HIST_BD.sort(function(a, b) { return b.timestamp - a.timestamp; });

        // Actualizar dashboard
        if (typeof dash_actualizar === 'function') dash_actualizar();

    } catch (err) {
        console.error('Error inicializando db:', err);
    }
}

// Limpiar cache al cerrar sesión (llamado desde auth-guard.js)
async function cerrarSesionConLimpieza() {
    db_limpiarCache();
    sessionStorage.removeItem('splash_visto');
    await supabaseClient.auth.signOut();
    window.location.href = '/login';
}

// ════════════════════════════════════════════════════
//  CARGAR USUARIOS JURÍDICOS
//  Para el selector de responsable del admin
// ════════════════════════════════════════════════════
async function db_cargarUsuariosJuridicos() {
    try {
        var { data, error } = await supabaseClient
            .from('profiles')
            .select('id, nombre, email')
            .eq('area', 'juridica')
            .eq('estado', 'aprobado')
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error cargando jurídicos:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error en db_cargarUsuariosJuridicos:', err);
        return [];
    }
}

// ════════════════════════════════════════════════════
//  CARGAR USUARIOS ADMIN
//  Para mostrar quién asignó al responsable ("Asignado por...")
// ════════════════════════════════════════════════════
async function db_cargarUsuariosAdmin() {
    try {
        var { data, error } = await supabaseClient
            .from('profiles')
            .select('id, nombre, email')
            .eq('rol', 'admin')
            .eq('estado', 'aprobado');

        if (error) {
            console.error('Error cargando admins:', error);
            return [];
        }
        return data || [];
    } catch (err) {
        console.error('Error en db_cargarUsuariosAdmin:', err);
        return [];
    }
}