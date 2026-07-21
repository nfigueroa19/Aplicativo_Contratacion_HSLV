// ════════════════════════════════════════════════════
//  js/proceso-detalle.js
//  Lógica de la página de detalle de un proceso (/proceso/CODIGO)
// ════════════════════════════════════════════════════

// D3P tiene su propio checklist reducido de 7 ítems (no comparte el de 23
// ítems de CD1P). Convocatoria y Subasta usan uno propio y más corto
// (15 ítems) — no se pueden compartir las mismas etiquetas entre los 4
// módulos.
var CHECKLISTS_POR_TIPO = {
    CD1P: [
        'CERTIFICADO PAA',
        'SOLICITUD DE CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'SOLICITUD PARA CONTRATAR',
        'ESTUDIOS PREVIOS',
        'MATRIZ DE RIESGO',
        'ANEXO IO PRESENTACIÓN DE LA PROPUESTA',
        'PROPUESTA',
        'ESTUDIO DE MERCADO',
        'EXPERIENCIA',
        'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN',
        'CÉDULA DE CIUDADANÍA',
        'LIBRETA MILITAR (si aplica)',
        'REGISTRO ÚNICO TRIBUTARIO',
        'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
        'CERTIFICADO ANTECEDENTES DE DELITOS SEXUALES',
        'CERTIFICADO INEXISTENCIA DE INHABILIDADES E INCOMPATIBILIDADES',
        'CERTIFICADO DE MEDIDAS CORRECTIVAS',
        'CERTIFICADO REDAM',
        'REVISOR FISCAL (CÉDULA, ANTECEDENTES, TARJETA PROFESIONAL)',
        'CERTIFICACIÓN Y PLANILLAS DE SEGURIDAD SOCIAL',
        'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT',
        'ACTA DE EVALUACIÓN'
    ],
    CONV: [
        'CERTIFICADO PAA',
        'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'SOLICITUD PARA CONTRATAR',
        'ESTUDIOS PREVIOS',
        'MATRIZ DE RIESGO',
        'AVISO DE CONVOCATORIA',
        'PLIEGO DE CONDICIONES',
        'PROPUESTAS RECIBIDAS',
        'ACTA DE EVALUACIÓN DE PROPUESTAS',
        'ACTA DE ADJUDICACIÓN',
        'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN',
        'REGISTRO ÚNICO TRIBUTARIO (RUT)',
        'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
        'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT',
        'MINUTA DE CONTRATO'
    ],
    SUB: [
        'CERTIFICADO PAA',
        'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'SOLICITUD PARA CONTRATAR',
        'ESTUDIOS PREVIOS',
        'MATRIZ DE RIESGO',
        'AVISO DE CONVOCATORIA / INVITACIÓN SUBASTA',
        'REGLAS DE LA SUBASTA (PLIEGO)',
        'ACTA DE HABILITACIÓN DE PROPONENTES',
        'CONFIGURACIÓN DEL EVENTO DE SUBASTA (SECOP II)',
        'ACTA DE CIERRE Y RESULTADO DE SUBASTA',
        'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN',
        'REGISTRO ÚNICO TRIBUTARIO (RUT)',
        'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
        'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT',
        'MINUTA DE CONTRATO'
    ]
};
CHECKLISTS_POR_TIPO.D3P = [
    'CERTIFICADO PAA',
    'SOLICITUD DE CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
    'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
    'ESTUDIOS PREVIOS',
    'MATRIZ DE RIESGO',
    'PROPUESTA',
    'ESTUDIO DE MERCADO'
]; // checklist propio y reducido de D3P (7 ítems)

// D3P reutiliza los números de ítem de CD1P (1,2,3,5,6,8,9 — sin huecos
// contiguos) para que el análisis JURISKILLS aplique los criterios
// correctos a cada documento — ver ITEMS_POR_TIPO_NO_CONTIGUOS en
// js/script.js (esta página no lo carga, por eso mantiene su propia copia).
// Misma posición → mismo ítem que CHECKLISTS_POR_TIPO.D3P.
var ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE = {
    D3P: [1, 2, 3, 5, 6, 8, 9]
};

// Nota: la lista de ítems restringidos (solo Jurídica/Admin) sigue pendiente
// de confirmar cuáles aplican en Convocatoria/Subasta — se deja igual que
// antes por ahora, a la espera de esa confirmación.
// (única fuente de verdad: ITEMS_RESTRINGIDOS_GLOBAL en js/db.js, que esta
// página carga antes que este archivo)
var ITEMS_RESTRINGIDOS_DETALLE = ITEMS_RESTRINGIDOS_GLOBAL;

var HIST_TIPOS_DETALLE = {
    'CD1P': { label: 'Directa 1 Propuesta',    badge: 'hist-badge-cd1p' },
    'D3P':  { label: 'Directa 3 Invitaciones', badge: 'hist-badge-d3p'  },
    'CONV': { label: 'Convocatoria Pública',    badge: 'hist-badge-conv' },
    'SUB':  { label: 'Subasta Inversa',         badge: 'hist-badge-sub'  }
};

var _procesoActual       = null;
var _perfilActual        = null;
var _documentosActuales  = [];
var _comentariosActuales = [];
var _archivosPendientes  = {}; // { itemNum: File }
var _comentariosPendientes = {}; // { itemNum: texto sin guardar todavía }
var _usuariosJuridicosActuales = []; // solo se llena si el usuario actual es Admin

function escapeHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto == null ? '' : String(texto);
    return div.innerHTML;
}

function etiquetaRolAutor(autor) {
    if (!autor) return '';
    if (autor.rol === 'admin')       return 'Admin';
    if (autor.area === 'biomedica')  return 'Biomédica';
    if (autor.area === 'juridica')   return 'Jurídica';
    return '';
}

// ── Menú lateral (☰): misma lógica que usan las demás páginas ──
document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('sidebar-toggle');
    if (!btn) return;

    var overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);

    var sidebar = document.querySelector('.sidebar');

    function cerrarSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        document.body.classList.remove('sidebar-abierto');
        btn.innerHTML = '☰';
    }

    btn.addEventListener('click', function() {
        var abierto = sidebar.classList.toggle('sidebar-open');
        document.body.classList.toggle('sidebar-abierto', abierto);
        btn.innerHTML = abierto ? '✕' : '☰';
    });

    overlay.addEventListener('click', cerrarSidebar);

    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 992) cerrarSidebar();
        });
    });
});

document.addEventListener('DOMContentLoaded', async function() {
    var codigo = obtenerCodigoDeURL();
    if (!codigo) {
        mostrarError('No se especificó ningún proceso en la dirección.');
        return;
    }

    _perfilActual = await db_perfil();

    var proceso = await db_obtenerProcesoPorCodigo(codigo);
    if (!proceso) {
        mostrarError('No se encontró el proceso "' + codigo + '", o no tienes permiso para verlo.');
        return;
    }
    _procesoActual = proceso;

    // Solo el Admin puede asignar/reasignar responsable jurídico —
    // cargar la lista de jurídicos únicamente en ese caso.
    if (_perfilActual && _perfilActual.rol === 'admin') {
        _usuariosJuridicosActuales = await db_cargarUsuariosJuridicos();
    }

    _documentosActuales = await db_cargarDocumentos(proceso.id);
    _comentariosActuales = await db_cargarComentarios(proceso.id);

    renderizarInfo(_procesoActual);
    renderizarChecklist();
});

function obtenerCodigoDeURL() {
    var partes = window.location.pathname.split('/').filter(Boolean);
    if (partes.length >= 2 && partes[0] === 'proceso') {
        return decodeURIComponent(partes[1]);
    }
    return null;
}

function mostrarError(msg) {
    // No se deja al usuario "atascado" viendo un mensaje fijo: se le explica
    // brevemente el motivo y se le redirige solo al dashboard. Como este
    // mismo mensaje se usa tanto para "el código no existe" como para "no
    // tienes permiso para verlo" (ver db_obtenerProcesoPorCodigo), no se
    // revela cuál de los dos casos ocurrió.
    var cont = document.getElementById('pd-contenido');
    if (cont) {
        cont.innerHTML =
            '<div style="padding:60px 20px;text-align:center;color:#DC2626;font-weight:700;">' +
                '⚠️ ' + msg +
                '<div style="margin-top:16px;color:#6B7280;font-weight:400;font-size:13px;">Redirigiendo al dashboard…</div>' +
            '</div>';
    }
    setTimeout(function() {
        window.location.href = '/dashboard';
    }, 2500);
}

function puedeEditarProceso(proceso, perfil) {
    if (!perfil) return false;
    if (proceso.estado === 'cerrado') return false;
    if (perfil.rol === 'admin') return true;
    if (perfil.area === 'biomedica' && proceso.creado_por === perfil.id) return true;
    if (perfil.area === 'juridica'  && proceso.responsable_asignado === perfil.id) return true;
    return false;
}

// Igual que puedeEditarProceso, pero sin bloquear cuando el proceso ya
// está finalizado — la conversación se puede seguir incluso después.
function puedeComentarProceso(proceso, perfil) {
    if (!perfil) return false;
    if (perfil.rol === 'admin') return true;
    if (perfil.area === 'biomedica' && proceso.creado_por === perfil.id) return true;
    if (perfil.area === 'juridica'  && proceso.responsable_asignado === perfil.id) return true;
    return false;
}

function formatMoney(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return v || '—';
    return '$' + n.toLocaleString('es-CO');
}

function formatearTamanoArchivo(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function campoSoloLectura(label, valor) {
    return '<div>' +
        '<div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:3px;">' +
            label +
        '</div>' +
        '<div style="background:#F3F4F6;border:1px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;color:#1F2937;">' +
            (valor || '—') +
        '</div>' +
    '</div>';
}

var ESTADOS_TEXTO = {
    borrador:     'En edición',
    en_revision:  'En revisión',
    observado:    'Observado',
    aprobado:     'Aprobado',
    cerrado:      'Finalizado'
};

function renderizarInfo(p) {
    var t = HIST_TIPOS_DETALLE[p.tipo] || { label: p.tipo, badge: '' };

    var estadoTexto = ESTADOS_TEXTO[p.estado] || ESTADOS_TEXTO.borrador;
    var estadoHTML = p.estado === 'cerrado'
        ? '<span style="background:#FEE2E2;color:#DC2626;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">🔒 ' + estadoTexto + '</span>'
        : '<span style="background:#DBEAFE;color:#123C7B;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">' +
            estadoTexto + '</span>';

    var responsableAsignadoHTML = p.responsable_asignado_nombre
        ? '<span style="color:#0B7A43;font-weight:700;">✅ ' + p.responsable_asignado_nombre + '</span>' +
          (p.responsable_asignado_por_nombre
              ? ' <span style="color:#6B7280;font-weight:400;font-size:12px;">(asignado por ' +
                p.responsable_asignado_por_nombre + ')</span>'
              : '')
        : '<span style="color:#9CA3AF;font-style:italic;">Sin asignar</span>';

    // Solo el Admin ve el selector para asignar/reasignar; los demás roles
    // solo ven el texto de solo lectura (igual que en /historial).
    var bloqueResponsable;
    if (_perfilActual && _perfilActual.rol === 'admin') {
        var opcionesHTML = '<option value="">— Seleccione —</option>';
        (_usuariosJuridicosActuales || []).forEach(function(u) {
            var seleccionado = (p.responsable_asignado === u.id) ? 'selected' : '';
            opcionesHTML += '<option value="' + u.id + '" ' + seleccionado + '>' +
                            (u.nombre || u.email) + '</option>';
        });

        bloqueResponsable =
            '<div style="font-size:14px;margin-bottom:8px;">' + responsableAsignadoHTML + '</div>' +
            '<div style="display:flex;gap:8px;align-items:center;max-width:380px;">' +
                '<select id="pd-resp-select" style="flex:1;padding:7px 10px;border-radius:8px;' +
                    'border:1.5px solid #BFDBFE;font-size:12px;color:#123C7B;outline:none;background:#F8FAFF;">' +
                    opcionesHTML +
                '</select>' +
                '<button id="pd-resp-btn" onclick="pd_asignarResponsable()" ' +
                    'style="background:#123C7B;color:white;border:none;border-radius:8px;' +
                    'padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">' +
                    (p.responsable_asignado ? '🔄 Reasignar' : '✔ Asignar') +
                '</button>' +
            '</div>';
    } else {
        bloqueResponsable = '<div style="font-size:14px;">' + responsableAsignadoHTML + '</div>';
    }

    document.getElementById('pd-info').innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px;">' +
            '<div>' +
                '<span class="hist-badge ' + t.badge + '">' + t.label + '</span>' +
                '<span style="margin-left:10px;font-weight:800;color:#123C7B;font-size:19px;">' + p.codigo + '</span>' +
            '</div>' +
            estadoHTML +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">' +
            campoSoloLectura('Objeto contractual', p.objeto) +
            campoSoloLectura('Área solicitante', p.area_solicitante) +
            campoSoloLectura('Valor', p.valor ? formatMoney(p.valor) : '—') +
            campoSoloLectura('Responsable (área solicitante)', p.responsable) +
        '</div>' +
        '<div style="margin-top:16px;">' +
            '<div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:4px;">' +
                'Responsable jurídico asignado' +
            '</div>' +
            bloqueResponsable +
        '</div>';
}

async function pd_asignarResponsable() {
    var selectEl = document.getElementById('pd-resp-select');
    if (!selectEl) return;

    var usuarioId = selectEl.value;
    if (!usuarioId) {
        alert('Por favor seleccione un responsable de la lista.');
        return;
    }
    var nombreSeleccionado = selectEl.options[selectEl.selectedIndex].text;

    var btnEl = document.getElementById('pd-resp-btn');
    if (btnEl) {
        btnEl.disabled    = true;
        btnEl.textContent = '⏳';
    }

    var ok = await db_asignarResponsable(_procesoActual.id, usuarioId);

    if (!ok) {
        if (btnEl) {
            btnEl.disabled    = false;
            btnEl.textContent = _procesoActual.responsable_asignado ? '🔄 Reasignar' : '✔ Asignar';
        }
        alert('❌ No se pudo asignar el responsable. Intente de nuevo.');
        return;
    }

    _procesoActual.responsable_asignado          = usuarioId;
    _procesoActual.responsable_asignado_nombre   = nombreSeleccionado;
    _procesoActual.responsable_asignado_por_nombre = (_perfilActual || {}).nombre || 'Admin';

    renderizarInfo(_procesoActual);
    renderizarChecklist();

    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99998;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.textContent = '✅ Responsable asignado correctamente';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
}

function renderizarChecklist() {
    var proceso       = _procesoActual;
    var puedeEditar   = puedeEditarProceso(proceso, _perfilActual);
    var puedeComentar = puedeComentarProceso(proceso, _perfilActual);
    var esBiomedica   = _perfilActual && _perfilActual.area === 'biomedica';
    var labelsProceso = CHECKLISTS_POR_TIPO[proceso.tipo] || CHECKLISTS_POR_TIPO.CD1P;
    var itemsNoContiguos = ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE[proceso.tipo] || null;

    var filas = '';
    labelsProceso.forEach(function(label, i) {
        var num = itemsNoContiguos ? itemsNoContiguos[i] : (i + 1);
        var esRestringido = ITEMS_RESTRINGIDOS_DETALLE.indexOf(num) !== -1;

        // Biomédica no ve ítems restringidos, igual que en el formulario de creación
        if (esRestringido && esBiomedica) return;

        var docsItem = _documentosActuales
            .filter(function(d) { return d.item_num === num; })
            .sort(function(a, b) { return b.version - a.version; });

        var vigente = docsItem.find(function(d) { return d.activo; });

        var encabezadoVigente = vigente
            ? '<div style="font-size:12px;font-weight:700;color:#0B7A43;">✅ ' + escapeHTML(vigente.nombre_archivo || '') + '</div>'
            : '<div style="color:#9CA3AF;font-style:italic;font-size:12px;">Sin documento cargado</div>';

        var toggleHistorialHTML = docsItem.length > 0
            ? '<button onclick="pd_toggleHistorial(' + num + ')" ' +
                'style="background:none;border:none;color:#123C7B;font-size:11px;cursor:pointer;' +
                'padding:0;margin-top:3px;text-decoration:underline;">' +
                '🕓 Ver historial (' + docsItem.length + ')' +
              '</button>'
            : '';

        var entradasHistorial = docsItem.map(function(d) {
            var esPrimera = d.version === 1;
            var fechaObj  = d.subido_en ? new Date(d.subido_en) : null;
            var fecha = fechaObj
                ? fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '';
            var hora = fechaObj
                ? fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '';
            var tamano = (d.tamano_bytes || d.tamano_bytes === 0)
                ? formatearTamanoArchivo(d.tamano_bytes)
                : '—';

            return '<div class="hist-entrada">' +
                '<div class="hist-num ' + (esPrimera ? 'hist-num-v1' : 'hist-num-vN') + '">' + d.version + '</div>' +
                '<div class="hist-info">' +
                    '<div class="hist-nombre">' +
                        '<button onclick="pd_descargar(\'' + d.id + '\')" ' +
                            'style="background:none;border:none;color:#123C7B;text-decoration:underline;' +
                            'cursor:pointer;font-size:11.5px;font-weight:700;padding:0;text-align:left;">' +
                            '📄 ' + escapeHTML(d.nombre_archivo || '') +
                        '</button>' +
                        (esPrimera
                            ? '<span class="hist-tag-v1">v1 · Inicial</span>'
                            : '<span class="hist-tag-vN">v' + d.version + '</span>') +
                        (d.activo ? '<span class="hist-tag-last">⬆ Actual</span>' : '') +
                    '</div>' +
                    '<div class="hist-meta">📅 ' + fecha + ' &nbsp;·&nbsp; 🕐 ' + hora +
                        ' &nbsp;·&nbsp; 💾 ' + tamano + '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        var versionesHTML =
            encabezadoVigente +
            toggleHistorialHTML +
            '<div id="pd-historial-' + num + '" style="display:none;margin-top:6px;">' +
                entradasHistorial +
            '</div>';

        var pendiente = _archivosPendientes[num];
        var pendienteHTML = '';
        if (pendiente) {
            var maxVersion = docsItem.reduce(function(max, d) { return Math.max(max, d.version); }, 0);
            var ahora = new Date();
            var fechaHoy = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            var horaHoy  = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            pendienteHTML =
                '<div class="hist-entrada" style="margin-top:6px;">' +
                    '<div class="hist-num hist-num-vN">' + (maxVersion + 1) + '</div>' +
                    '<div class="hist-info">' +
                        '<div class="hist-nombre">' +
                            '⏳ ' + escapeHTML(pendiente.name) +
                            '<span class="hist-tag-vN">v' + (maxVersion + 1) + '</span>' +
                            '<button onclick="pd_quitarPendiente(' + num + ')" title="Quitar este archivo" ' +
                                'style="margin-left:8px;background:none;border:1px solid #DC2626;color:#DC2626;' +
                                'border-radius:6px;padding:1px 7px;font-size:10.5px;cursor:pointer;font-weight:600;">' +
                                '🗑️ Quitar' +
                            '</button>' +
                        '</div>' +
                        '<div class="hist-meta">' +
                            '📅 ' + fechaHoy + ' &nbsp;·&nbsp; 🕐 ' + horaHoy +
                            ' &nbsp;·&nbsp; 💾 ' + formatearTamanoArchivo(pendiente.size) +
                        '</div>' +
                    '</div>' +
                '</div>';
        }

        var controlSubida = puedeEditar
            ? '<div style="margin-top:6px;">' +
                '<button onclick="pd_elegirArchivo(' + num + ')" ' +
                    'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
                    'padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">' +
                    '📎 Agregar nueva versión' +
                '</button>' +
                '<input type="file" id="pd-file-' + num + '" style="display:none;" ' +
                    'accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" ' +
                    'onchange="pd_archivoElegido(' + num + ',this)">' +
                pendienteHTML +
              '</div>'
            : '';

        // ── Comentarios de este ítem ──
        var comentariosItem = _comentariosActuales.filter(function(c) { return c.item_num === num; });

        var comentariosHTML = comentariosItem.length > 0
            ? comentariosItem.map(function(c) {
                var autor  = c.autor || {};
                var rolTxt = etiquetaRolAutor(autor);
                var fecha  = c.fecha
                    ? new Date(c.fecha).toLocaleString('es-CO',
                        { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '';
                return '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;' +
                        'padding:6px 9px;margin-bottom:6px;font-size:11px;">' +
                    '<div style="display:flex;justify-content:space-between;gap:6px;">' +
                        '<span style="font-weight:700;color:#123C7B;">' + escapeHTML(autor.nombre || 'Usuario') +
                        (rolTxt ? ' <span style="font-weight:400;color:#6B7280;">(' + rolTxt + ')</span>' : '') +
                        '</span>' +
                        '<span style="color:#9CA3AF;font-size:10px;white-space:nowrap;">' + fecha + '</span>' +
                    '</div>' +
                    '<div style="color:#1F2937;margin-top:2px;">' + escapeHTML(c.texto) + '</div>' +
                '</div>';
              }).join('')
            : '';

        var borradorComentario = _comentariosPendientes[num] || '';
        var formularioComentario = puedeComentar
            ? '<textarea id="pd-com-input-' + num + '" rows="2" ' +
                'placeholder="Escribir un comentario…" ' +
                'oninput="_comentariosPendientes[' + num + ']=this.value" ' +
                'style="width:100%;font-size:11px;padding:5px 8px;border:1px solid #CBD5E1;' +
                'border-radius:7px;resize:vertical;box-sizing:border-box;">' +
                    escapeHTML(borradorComentario) +
              '</textarea>'
            : '';

        filas +=
            '<tr style="border-bottom:1px solid #E5E7EB;">' +
                '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#6B7280;font-size:12px;width:36px;">' +
                    num + (esRestringido ? ' <span title="Solo Jurídica/Admin">🔒</span>' : '') +
                '</td>' +
                '<td style="padding:8px 10px;font-size:12px;color:#1F2937;">' + label + '</td>' +
                '<td style="padding:8px 10px;min-width:220px;">' + versionesHTML + controlSubida + '</td>' +
                '<td style="padding:8px 10px;min-width:220px;max-width:280px;">' + comentariosHTML + formularioComentario + '</td>' +
            '</tr>';
    });

    document.getElementById('pd-checklist-body').innerHTML = filas;

    // Revisión ortográfica en los recuadros de comentarios recién creados
    document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(function(campo) {
        if (campo.getAttribute('spellcheck') !== 'false') {
            campo.setAttribute('spellcheck', 'true');
        }
    });

    var accionesEl = document.getElementById('pd-acciones');
    if (!accionesEl) return;

    var botonInicio =
        '<a href="/dashboard" ' +
            'style="background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;' +
            'padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;' +
            'cursor:pointer;margin-right:10px;text-decoration:none;display:inline-block;">' +
            '🏠 Volver al inicio' +
        '</a>';

    if (proceso.estado === 'cerrado') {
        accionesEl.innerHTML =
            botonInicio +
            (puedeComentar
                ? '<button id="pd-btn-guardar" onclick="pd_guardar()" ' +
                    'style="background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;border:none;' +
                    'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px;">' +
                    '💾 Guardar comentarios' +
                  '</button>'
                : '') +
            '<span style="color:#6B7280;font-size:13px;font-style:italic;">' +
                '🔒 Este proceso fue finalizado y ya no admite cambios en documentos.' +
            '</span>';
    } else if (puedeEditar) {
        accionesEl.innerHTML =
            botonInicio +
            '<button id="pd-btn-guardar" onclick="pd_guardar()" ' +
                'style="background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;border:none;' +
                'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px;">' +
                '💾 Guardar' +
            '</button>' +
            '<button onclick="pd_finalizar()" ' +
                'style="background:#DC2626;color:white;border:none;' +
                'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;">' +
                '🔒 Finalizar Proceso' +
            '</button>';
    } else {
        accionesEl.innerHTML = botonInicio;
    }
}

function pd_elegirArchivo(num) {
    var inp = document.getElementById('pd-file-' + num);
    if (inp) inp.click();
}

function pd_toggleHistorial(num) {
    var c = document.getElementById('pd-historial-' + num);
    if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function pd_archivoElegido(num, inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    _archivosPendientes[num] = inputEl.files[0];
    renderizarChecklist();
}

// Quitar un archivo elegido por error, mientras siga pendiente (todavía no
// se ha presionado "Guardar" y por lo tanto no se ha subido a Supabase).
function pd_quitarPendiente(num) {
    if (!confirm('¿Quitar este archivo? Deberá volver a seleccionarlo si lo necesita.')) return;
    delete _archivosPendientes[num];

    var inp = document.getElementById('pd-file-' + num);
    if (inp) inp.value = '';

    renderizarChecklist();
}

async function pd_descargar(documentoId) {
    var doc = _documentosActuales.find(function(d) { return d.id === documentoId; });
    if (!doc) return;
    var url = await db_descargarDocumento(doc.url_archivo);
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('❌ No se pudo generar el enlace de descarga.');
    }
}

async function pd_guardar() {
    var itemsPendientes = Object.keys(_archivosPendientes);
    var itemsConComentario = Object.keys(_comentariosPendientes).filter(function(num) {
        return (_comentariosPendientes[num] || '').trim() !== '';
    });

    if (itemsPendientes.length === 0 && itemsConComentario.length === 0) {
        alert('No hay documentos ni comentarios nuevos para guardar.');
        return;
    }

    var btnGuardar = document.getElementById('pd-btn-guardar');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '⏳ Guardando…';
    }

    var labelsProceso    = CHECKLISTS_POR_TIPO[_procesoActual.tipo] || CHECKLISTS_POR_TIPO.CD1P;
    var itemsNoContiguos2 = ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE[_procesoActual.tipo] || null;

    for (var i = 0; i < itemsPendientes.length; i++) {
        var num         = parseInt(itemsPendientes[i]);
        var archivo     = _archivosPendientes[num];
        var idxLabel    = itemsNoContiguos2 ? itemsNoContiguos2.indexOf(num) : (num - 1);
        var label       = (idxLabel !== -1 ? labelsProceso[idxLabel] : null) || ('Ítem ' + num);
        var restringido = ITEMS_RESTRINGIDOS_DETALLE.indexOf(num) !== -1;
        await db_subirDocumento(_procesoActual.id, num, label, archivo, restringido);
    }

    for (var j = 0; j < itemsConComentario.length; j++) {
        var numC  = parseInt(itemsConComentario[j]);
        var texto = _comentariosPendientes[numC].trim();
        var comentario = await db_guardarComentario(_procesoActual.id, texto, null, numC);
        if (comentario) _comentariosActuales.push(comentario);
    }

    _archivosPendientes    = {};
    _comentariosPendientes = {};
    _documentosActuales    = await db_cargarDocumentos(_procesoActual.id);
    renderizarChecklist();

    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99998;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.textContent = '✅ Guardado correctamente';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
}

async function pd_finalizar() {
    var confirmado = confirm(
        'Finalizar proceso solo puede hacerse una vez.\n' +
        'Esto solo se puede revertir por un administrador.\n\n' +
        'Asegúrese de haber revisado todos los apartados y documentos ' +
        'antes de continuar, ya que después de finalizar no podrá ' +
        'realizar más cambios.\n\n' +
        'Si solo está haciendo revisiones y aún no quiere finalizar, ' +
        'presione en su lugar el botón "Guardar" una vez termine, para que ' +
        'el responsable del área pueda ver los documentos y avances cargados.\n\n' +
        '¿Está seguro de finalizar este proceso?'
    );
    if (!confirmado) return;

    var ok = await db_finalizarProceso(_procesoActual.id);
    if (!ok) return;

    _procesoActual.estado = 'cerrado';
    renderizarInfo(_procesoActual);
    renderizarChecklist();
}

// Recuadro de referencia JURISKILLS: el motor de análisis todavía no está
// entrenado ni conectado a un modelo real (ver CONTEXTO_PROYECTO_HSLV.md).
// Este botón solo informa el estado actual, no ejecuta ningún análisis.
function reAnalizarTodo() {
    alert('ℹ️ JURISKILLS todavía no está conectado a un modelo de IA real. ' +
          'Este panel se deja como referencia para la siguiente fase del proyecto.');
}

