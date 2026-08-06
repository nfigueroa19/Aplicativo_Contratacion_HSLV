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
// { itemNum: [File, File, ...] } — arreglo, no un solo File, para que elegir
// un segundo archivo del mismo ítem ANTES de guardar agregue una versión
// nueva en vez de reemplazar/perder la anterior (igual que _histU_datos en
// contratacion.html/js/script.js — ver pd_archivoElegido()/pd_quitarPendiente()).
var _archivosPendientes  = {};
var _comentariosPendientes = {}; // { itemNum: texto sin guardar todavía }
// Ítems cuyo comentario pendiente ya fue "confirmado" con el botón de envío
// (se muestra como si fuera un comentario real, con opción de editar/borrar,
// pero sigue sin tocar la base de datos hasta que se presiona pd_guardar()).
var _comentariosConfirmados = {};
// Qué cajas de "Ver historial" quedan abiertas entre un re-render y otro
// (renderizarChecklist() reconstruye todo el <tbody>, así que sin esto el
// estado abierto/cerrado se perdería en cada cambio). Se abre solo cuando
// el usuario lo pide (pd_toggleHistorial) o al cargar un archivo nuevo
// (mismo comportamiento que histU_render() en contratacion.html, que
// termina con contenedor.style.display = 'block').
var _historialAbierto = {}; // { itemNum: true/false }
var _usuariosJuridicosActuales = []; // solo se llena si el usuario actual es Admin

// Historial de análisis JURISKILLS ya guardados en Supabase (tabla
// analisis_juriskills — ver sql/2026-08-06_historial_analisis_juriskills.sql),
// agrupado por ítem: { itemNum: [fila, fila, ...] }, más reciente primero.
// Se llena una sola vez al cargar la página (ver DOMContentLoaded) — no
// cambia salvo que se recargue, igual que _documentosActuales.
var _historialAnalisisPorItem = {};
// Igual que _historialAbierto, pero para la caja de historial de análisis
// de cada ítem (independiente de la de versiones de documento).
var _historialAnalisisAbierto = {};

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

    var _pdMenuIconSVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    var _pdCloseIconSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var sidebar = document.querySelector('.sidebar');

    function cerrarSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        document.body.classList.remove('sidebar-abierto');
        btn.innerHTML = _pdMenuIconSVG;
    }

    btn.addEventListener('click', function() {
        var abierto = sidebar.classList.toggle('sidebar-open');
        document.body.classList.toggle('sidebar-abierto', abierto);
        btn.innerHTML = abierto ? _pdCloseIconSVG : _pdMenuIconSVG;
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

    // Historial de análisis JURISKILLS ya guardados (solo tiene datos para
    // CD1P/D3P — ver pd_tipoConAnalisisJuriskills), agrupado por ítem para
    // que pd_celdaAnalisis() lo muestre junto a cada fila del checklist.
    if (pd_tipoConAnalisisJuriskills(proceso.tipo)) {
        var filasAnalisis = await db_cargarHistorialAnalisis(proceso.id);
        filasAnalisis.forEach(function(fila) {
            if (!_historialAnalisisPorItem[fila.item_num]) _historialAnalisisPorItem[fila.item_num] = [];
            _historialAnalisisPorItem[fila.item_num].push(fila);
        });
    }

    // Marca de "conocimiento": si quien abre es el jurídico asignado y
    // todavía no existe una primera visita registrada, se guarda ahora.
    // Es la base del panel de seguimiento del Admin (ver
    // db_cargarSeguimientoConocimiento en js/db.js) — por eso solo se marca
    // la PRIMERA vez (db_marcarProcesoVisto no pisa una fecha ya existente).
    if (_perfilActual && proceso.responsable_asignado === _perfilActual.id &&
        !proceso.responsable_asignado_visto_fecha) {
        db_marcarProcesoVisto(proceso.id);
    }

    // Marca de "última actividad": a diferencia de la de arriba, esta se
    // actualiza en CADA visita del jurídico asignado (no solo la primera),
    // como una fecha de "última conexión" al proceso. Ver
    // db_marcarActividadProceso en js/db.js.
    if (_perfilActual && proceso.responsable_asignado === _perfilActual.id) {
        db_marcarActividadProceso(proceso.id);
    }

    renderizarInfo(_procesoActual);
    renderizarChecklist();

    // Recién ahora hay datos reales que mostrar — antes de esto el bloque
    // permanece oculto (ver display:none inline en proceso-detalle.html)
    // para no exponer la tabla/barra de avance vacías mientras carga.
    var checklistCard = document.getElementById('pd-checklist-card');
    if (checklistCard) checklistCard.style.display = '';
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
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:4px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' + msg +
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

// ════════════════════════════════════════════════════
//  FORMATO EN VIVO DEL CAMPO "VALOR" (pd-valor-input)
//  Mismas funciones que en js/script.js (_fmt_formatearValorInput /
//  _fmt_valorARaw) — se duplican acá porque esta página no carga script.js
//  (mismo criterio que ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE, más arriba).
// ════════════════════════════════════════════════════
function _fmt_formatearValorInput(input) {
    var valorPrevio = input.value;
    var posCursor   = input.selectionStart;

    var antesDelCursor = valorPrevio.slice(0, posCursor).replace(/[^\d,]/g, '').length;

    var partes  = valorPrevio.split(',');
    var entero  = partes[0].replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
    var decimal = partes.length > 1 ? partes[1].replace(/[^\d]/g, '') : null;

    var enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var nuevoValor = entero
        ? '$ ' + enteroFormateado + (decimal !== null ? ',' + decimal : '')
        : '';

    input.value = nuevoValor;

    var contados = 0, nuevaPos = nuevoValor.length;
    for (var i = 0; i < nuevoValor.length; i++) {
        if (/[\d,]/.test(nuevoValor[i])) contados++;
        if (contados >= antesDelCursor) { nuevaPos = i + 1; break; }
    }
    input.setSelectionRange(nuevaPos, nuevaPos);
}

function _fmt_valorARaw(valorFormateado) {
    if (!valorFormateado) return '';
    var limpio = valorFormateado.replace(/\$/g, '').replace(/\s/g, '');
    limpio = limpio.replace(/\./g, '');
    limpio = limpio.replace(',', '.');
    return limpio;
}

// Convierte el valor crudo guardado en Supabase ("15000000" o
// "15000000.5") al mismo formato visual que produce _fmt_formatearValorInput
// ("$ 15.000.000" o "$ 15.000.000,5"), para precargar el input al abrir la
// página o después de guardar.
function _fmt_rawAValorInput(raw) {
    if (raw === null || raw === undefined || raw === '') return '';
    var partes  = String(raw).split('.');
    var entero  = partes[0].replace(/[^\d]/g, '');
    if (!entero) return '';
    var decimal = partes.length > 1 ? partes[1].replace(/[^\d]/g, '') : null;
    var enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return '$ ' + enteroFormateado + (decimal ? ',' + decimal : '');
}

// El campo "Valor" es el único editable desde el detalle del proceso (todo
// lo demás — objeto, área, responsable — se define una sola vez al crear el
// proceso). Mismo criterio de permiso que puedeEditarProceso().
function campoValorProceso(p) {
    if (!puedeEditarProceso(p, _perfilActual)) {
        return campoSoloLectura('Valor', p.valor ? formatMoney(p.valor) : '—');
    }
    return '<div>' +
        '<div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:3px;">' +
            'Valor' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
            '<input id="pd-valor-input" type="text" inputmode="decimal" autocomplete="off" value="' + escapeHTML(_fmt_rawAValorInput(p.valor)) + '" ' +
                'data-guardado="' + escapeHTML(p.valor || '') + '" ' +
                'placeholder="Valor estimado del proceso ($)" ' +
                'oninput="_fmt_formatearValorInput(this);_pd_marcarCambioValor()" ' +
                'style="flex:1;min-width:0;padding:7px 10px;border-radius:8px;border:1.5px solid #BFDBFE;' +
                'font-size:13px;color:#1F2937;outline:none;background:#F8FAFF;">' +
            '<button id="pd-valor-btn" onclick="pd_actualizarValor()" ' +
                'style="background:#123C7B;color:white;border:none;border-radius:8px;' +
                'padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar' +
            '</button>' +
        '</div>' +
    '</div>';
}

// Enciende/apaga el parpadeo del botón "Guardar" del valor según si lo
// escrito en el input difiere de lo que ya está guardado — mismo criterio
// que _pd_marcarCambioResponsable / _hist_marcarCambioResponsable.
function _pd_marcarCambioValor() {
    var inputEl = document.getElementById('pd-valor-input');
    var btnEl   = document.getElementById('pd-valor-btn');
    if (!inputEl || !btnEl) return;

    var haycambio = _fmt_valorARaw(inputEl.value) !== (inputEl.dataset.guardado || '');
    btnEl.classList.toggle('btn-resp-pendiente', haycambio);
}

async function pd_actualizarValor() {
    var inputEl = document.getElementById('pd-valor-input');
    if (!inputEl) return;

    var nuevoValor = _fmt_valorARaw(inputEl.value);

    var btnEl = document.getElementById('pd-valor-btn');
    if (btnEl) {
        btnEl.disabled    = true;
        btnEl.textContent = 'Guardando…';
    }

    var ok = await db_actualizarValorProceso(_procesoActual.id, nuevoValor);

    if (!ok) {
        if (btnEl) {
            btnEl.disabled    = false;
            btnEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar';
        }
        alert('❌ No se pudo actualizar el valor del proceso. Intente de nuevo.');
        return;
    }

    _procesoActual.valor = nuevoValor;
    renderizarInfo(_procesoActual);

    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Valor del proceso actualizado';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
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
        ? '<span style="background:#FEE2E2;color:#DC2626;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' + estadoTexto + '</span>'
        : '<span style="background:#DBEAFE;color:#123C7B;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;">' +
            estadoTexto + '</span>';

    var responsableAsignadoHTML = p.responsable_asignado_nombre
        ? '<span style="color:#0B7A43;font-weight:700;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' + p.responsable_asignado_nombre + '</span>' +
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
                '<select id="pd-resp-select" data-guardado="' + (p.responsable_asignado || '') + '" ' +
                    'onchange="_pd_marcarCambioResponsable()" ' +
                    'style="flex:1;padding:7px 10px;border-radius:8px;' +
                    'border:1.5px solid #BFDBFE;font-size:12px;color:#123C7B;outline:none;background:#F8FAFF;">' +
                    opcionesHTML +
                '</select>' +
                '<button id="pd-resp-btn" onclick="pd_asignarResponsable()" ' +
                    'style="background:#123C7B;color:white;border:none;border-radius:8px;' +
                    'padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">' +
                    (p.responsable_asignado
                        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Reasignar'
                        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Asignar') +
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
            campoValorProceso(p) +
            campoSoloLectura('Responsable (área solicitante)', p.responsable) +
        '</div>' +
        '<div style="margin-top:16px;">' +
            '<div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:4px;">' +
                'Responsable jurídico asignado' +
            '</div>' +
            bloqueResponsable +
        '</div>';
}

// Enciende/apaga el parpadeo del botón asignar/reasignar responsable según
// si la selección del combo difiere de lo que ya está guardado — mismo
// comportamiento que _hist_marcarCambioResponsable en js/script.js.
function _pd_marcarCambioResponsable() {
    var selectEl = document.getElementById('pd-resp-select');
    var btnEl    = document.getElementById('pd-resp-btn');
    if (!selectEl || !btnEl) return;

    var haycambio = selectEl.value !== '' &&
                    selectEl.value !== (selectEl.dataset.guardado || '');
    btnEl.classList.toggle('btn-resp-pendiente', haycambio);
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
        btnEl.textContent = 'Guardando…';
    }

    var ok = await db_asignarResponsable(_procesoActual.id, usuarioId);

    if (!ok) {
        if (btnEl) {
            btnEl.disabled    = false;
            btnEl.innerHTML = _procesoActual.responsable_asignado
                ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Reasignar'
                : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Asignar';
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
        'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Responsable asignado correctamente';
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 4000);
}

function renderizarChecklist() {
    var proceso       = _procesoActual;
    var puedeEditar   = puedeEditarProceso(proceso, _perfilActual);
    var puedeComentar = puedeComentarProceso(proceso, _perfilActual);
    var labelsProceso = CHECKLISTS_POR_TIPO[proceso.tipo] || CHECKLISTS_POR_TIPO.CD1P;
    var itemsNoContiguos = ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE[proceso.tipo] || null;

    var totalItems = 0;
    var itemsVerificados = 0;

    var filas = '';
    labelsProceso.forEach(function(label, i) {
        var num = itemsNoContiguos ? itemsNoContiguos[i] : (i + 1);
        var esRestringido = ITEMS_RESTRINGIDOS_DETALLE.indexOf(num) !== -1;

        var docsItem = _documentosActuales
            .filter(function(d) { return d.item_num === num; })
            .sort(function(a, b) { return b.version - a.version; });

        var vigente      = docsItem.find(function(d) { return d.activo; });
        var pendientesArr = _archivosPendientes[num] || [];
        // La más reciente de las elegidas-sin-guardar es la que manda para el
        // encabezado y el análisis JURISKILLS — las anteriores del mismo
        // ítem quedan como versiones dentro del historial (ver pendienteHTML).
        var pendiente = pendientesArr.length ? pendientesArr[pendientesArr.length - 1] : null;

        totalItems++;
        if (vigente || pendiente) itemsVerificados++;

        // Igual que mostrarArchivo() en contratacion.html: en cuanto se elige
        // un archivo se ve su nombre en verde de inmediato, sin esperar a
        // guardar — antes acá seguía diciendo "Sin documento cargado" hasta
        // que el proceso se guardaba.
        var encabezadoVigente = pendiente
            ? '<div style="font-size:12px;font-weight:600;color:#0B7A43;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>' + escapeHTML(pendiente.name) + '</strong></div>'
            : vigente
                ? '<div style="font-size:12px;font-weight:700;color:#0B7A43;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' + escapeHTML(vigente.nombre_archivo || '') + '</div>'
                : '<div style="color:#9CA3AF;font-style:italic;font-size:12px;">Sin documento cargado</div>';

        // Conteo del badge "Ver historial": igual que hist.length en
        // histU_registrar()/histU_render() (js/script.js) — ahí TODO lo
        // elegido cuenta de inmediato, esté guardado o no, porque en
        // contratacion.html no hay una distinción "guardado vs. pendiente"
        // (todo vive en memoria hasta el botón final "Guardar Proceso").
        var totalVersiones = docsItem.length + pendientesArr.length;

        // Mismo botón-pastilla + badge que "🕓 Ver historial" en contratacion.html
        // — ahí se agrega desde el inicio (mostrando "0") a TODOS los ítems,
        // no solo a los que ya tienen archivo (ver bloque "COMENTARIOS EN EL
        // CHECKLIST" en js/script.js, que inyecta el botón con badge en 0
        // para los 4 módulos). Antes acá solo aparecía si ya había versiones.
        var toggleHistorialHTML =
            '<button onclick="pd_toggleHistorial(' + num + ')" ' +
                'style="margin-top:8px;background:none;border:1px solid #CBD5E1;border-radius:8px;' +
                'padding:5px 10px;font-size:11px;color:#123C7B;cursor:pointer;font-weight:600;' +
                'display:flex;align-items:center;gap:5px;">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Ver historial <span style="background:#123C7B;color:white;' +
                'border-radius:10px;padding:1px 7px;font-size:10px;">' + totalVersiones + '</span>' +
              '</button>';

        // Mientras haya un archivo pendiente (recién elegido, sin guardar),
        // ES el que representa la versión más reciente — así que la versión
        // ya guardada (d.activo) deja de llevar la etiqueta "⬆ Actual" para
        // no mostrar dos "actuales" a la vez. Mismo criterio que
        // histU_render() en js/script.js, donde solo la entrada más nueva
        // (idx === 0 del arreglo) la lleva.
        var entradasHistorial = docsItem.map(function(d) {
            var esPrimera = d.version === 1;
            var esLaMasReciente = pendientesArr.length === 0 && d.activo;
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
            var subidoPorNombre = (d.subidoPor && d.subidoPor.nombre) || '';

            return '<div class="hist-entrada">' +
                '<div class="hist-num ' + (esPrimera ? 'hist-num-v1' : 'hist-num-vN') + '">' + d.version + '</div>' +
                '<div class="hist-info">' +
                    '<div class="hist-nombre">' +
                        '<button onclick="pd_descargar(\'' + d.id + '\')" ' +
                            'style="background:none;border:none;color:#123C7B;text-decoration:underline;' +
                            'cursor:pointer;font-size:11.5px;font-weight:700;padding:0;text-align:left;">' +
                            '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escapeHTML(d.nombre_archivo || '') +
                        '</button>' +
                        (esPrimera
                            ? '<span class="hist-tag-v1">v1 · Inicial</span>'
                            : '<span class="hist-tag-vN">v' + d.version + '</span>') +
                        (esLaMasReciente ? '<span class="hist-tag-last"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:1px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Actual</span>' : '') +
                    '</div>' +
                    '<div class="hist-meta"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fecha + ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + hora +
                        ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' + tamano +
                        (subidoPorNombre ? ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Subido por: ' + escapeHTML(subidoPorNombre) : '') + '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        // Tarjeta del archivo pendiente (elegido, aún sin guardar): MISMO
        // markup que histU_render() genera para cada versión en
        // contratacion.html (📄, tag de versión, "⬆ Actual" en la más nueva,
        // botón "Quitar" en línea junto al nombre) — antes esta tarjeta vivía
        // fuera de la caja gris del historial (fondo blanco, ícono ⏳,
        // "Quitar" aparte) y por eso se veía distinta a contratacion.html.
        var pendienteHTML = '';
        if (pendientesArr.length) {
            var maxVersion = docsItem.reduce(function(max, d) { return Math.max(max, d.version); }, 0);
            var ahora = new Date();
            var fechaHoy = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
            var horaHoy  = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Cada archivo elegido (sin guardar todavía) es su propia tarjeta,
            // más reciente arriba — igual que histU_render() en contratacion.html.
            // Solo la última lleva "⬆ Actual"; las demás quedan como versiones
            // intermedias del historial local, en vez de perderse al elegir
            // un archivo nuevo para el mismo ítem.
            pendienteHTML = pendientesArr.map(function(f, idx) {
                return { archivo: f, idx: idx, version: maxVersion + idx + 1 };
            }).reverse().map(function(entry) {
                var esActual = entry.idx === pendientesArr.length - 1;
                return '<div class="hist-entrada">' +
                    '<div class="hist-num hist-num-vN">' + entry.version + '</div>' +
                    '<div class="hist-info">' +
                        '<div class="hist-nombre"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escapeHTML(entry.archivo.name) +
                            '<span class="hist-tag-vN">v' + entry.version + '</span>' +
                            (esActual ? '<span class="hist-tag-last"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:1px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Actual</span>' : '') +
                            ' <button onclick="pd_quitarPendiente(' + num + ',' + entry.idx + ')" title="Quitar este archivo" ' +
                                'style="background:none;border:1px solid #DC2626;color:#DC2626;' +
                                'border-radius:6px;padding:1px 7px;font-size:10.5px;cursor:pointer;font-weight:600;margin-left:6px;">' +
                                '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>Quitar' +
                            '</button>' +
                        '</div>' +
                        '<div class="hist-meta">' +
                            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + fechaHoy + ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + horaHoy +
                            ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' + formatearTamanoArchivo(entry.archivo.size) +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        // Misma caja de historial (bordeada, con scroll, fondo gris #F8FAFC)
        // que historial_N en contratacion.html — el pendiente entra AQUÍ
        // como la entrada más reciente (arriba de las ya guardadas), en vez
        // de vivir aparte en fondo blanco.
        var historialEstaAbierto = _historialAbierto[num] ? 'block' : 'none';
        var versionesHTML =
            encabezadoVigente +
            toggleHistorialHTML +
            '<div id="pd-historial-' + num + '" style="display:' + historialEstaAbierto + ';margin-top:8px;max-height:160px;' +
                'overflow-y:auto;border:1px solid #E5E7EB;border-radius:10px;font-size:11px;background:#F8FAFC;">' +
                (pendienteHTML + entradasHistorial ||
                    '<div style="padding:8px 10px;color:#6B7280;font-style:italic;">Sin cargas registradas aún.</div>') +
            '</div>';

        var controlSubida = puedeEditar
            ? '<div style="margin-top:6px;">' +
                '<button class="btn" onclick="pd_elegirArchivo(' + num + ')" ' +
                    'style="padding:10px 14px;font-size:13px;">' +
                    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Agregar nueva versión' +
                '</button>' +
                '<input type="file" id="pd-file-' + num + '" style="display:none;" ' +
                    'accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" ' +
                    'onchange="pd_archivoElegido(' + num + ',this)">' +
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

        // Mismo textarea (tamaño, placeholder, auto-crecimiento con la altura
        // del texto) que el bloque "COMENTARIOS EN EL CHECKLIST" que
        // js/script.js inyecta en contratacion.html/directa-3p.html/etc. —
        // ahí es un solo campo de una línea que crece solo; acá se le suma
        // guardar el valor en _comentariosPendientes (esta página sí guarda
        // comentarios de verdad, contratacion.html solo lo arma para
        // mandarlo junto con el resto del proceso al crearlo).
        var borradorComentario = _comentariosPendientes[num] || '';

        // Mientras el borrador no se "confirme" con el botón de envío se ve
        // el textarea normal; al confirmarlo se muestra como una vista previa
        // (mismo look que un comentario ya guardado) con botones para editar
        // o borrar. En ningún caso esto escribe en la base de datos — eso
        // solo pasa cuando se presiona el botón grande "Guardar" (pd_guardar,
        // ver más abajo), que sigue leyendo el texto desde _comentariosPendientes.
        var formularioComentario = '';
        if (puedeComentar && _comentariosConfirmados[num] && borradorComentario.trim() !== '') {
            // Mismo estilo visual que un comentario ya guardado (comentariosHTML
            // arriba), con el nombre real de quien está conectado.
            var nombreAutorPendiente = (_perfilActual && _perfilActual.nombre) || 'Usuario';
            formularioComentario =
                '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;' +
                    'padding:6px 9px;margin-bottom:6px;font-size:11px;">' +
                    '<div style="font-weight:700;color:#123C7B;">' + escapeHTML(nombreAutorPendiente) + '</div>' +
                    '<div style="color:#1F2937;margin-top:2px;">' + escapeHTML(borradorComentario) + '</div>' +
                    '<div style="margin-top:4px;">' +
                        '<a onclick="pd_editarComentarioPendiente(' + num + ')" ' +
                            'style="color:#123C7B;font-size:10px;cursor:pointer;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Editar</a>' +
                        '<a onclick="pd_borrarComentarioPendiente(' + num + ')" ' +
                            'style="color:#B91C1C;font-size:10px;cursor:pointer;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>Borrar</a>' +
                    '</div>' +
                '</div>';
        } else if (puedeComentar) {
            // El botón de envío va dentro del propio recuadro de texto (como
            // en apps de mensajería), no al lado. El contenedor usa
            // width:fit-content para que su ancho sea EXACTAMENTE el del
            // textarea de adentro — si en cambio se le pusiera "44ch" al
            // contenedor, ese "ch" se calcularía con el tamaño de letra que
            // hereda (más grande que los 12px del textarea) y el contenedor
            // quedaría más ancho que el textarea, dejando el botón "right:5px"
            // pegado a un borde invisible más allá del recuadro visible.
            formularioComentario =
                '<div style="position:relative;width:fit-content;max-width:100%;">' +
                    '<textarea id="pd-com-input-' + num + '" rows="1" ' +
                        'placeholder="Escribir un comentario para este documento…" autocomplete="off" ' +
                        'oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';' +
                            '_comentariosPendientes[' + num + ']=this.value;" ' +
                        'style="width:44ch;max-width:100%;font-size:12px;padding:6px 30px 6px 8px;' +
                        'border:1px solid #CBD5E1;border-radius:8px;resize:none;overflow:hidden;' +
                        'box-sizing:border-box;display:block;">' +
                            escapeHTML(borradorComentario) +
                    '</textarea>' +
                    '<button type="button" ' +
                        'onclick="pd_confirmarComentario(' + num + ')" ' +
                        'style="position:absolute;right:5px;bottom:5px;background:#123C7B;color:white;' +
                        'border:none;border-radius:50%;width:22px;height:22px;padding:0;font-size:11px;' +
                        'line-height:22px;text-align:center;cursor:pointer;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg></button>' +
                '</div>';
        }

        // Mismo contenedor (clase, separador punteado, etiqueta en mayúsculas
        // gris) que .checklist-comentario en contratacion.html. Lo único que
        // agrega esta página frente a contratacion.html es el historial de
        // comentarios entre usuarios (comentariosHTML) antes del campo nuevo.
        var bloqueComentarios =
            '<div class="checklist-comentario" style="margin-top:10px;border-top:1px dashed #E5E7EB;padding-top:8px;">' +
                '<div style="font-size:10px;color:#6B7280;font-weight:700;text-transform:uppercase;margin-bottom:4px;">' +
                    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Comentarios' +
                '</div>' +
                comentariosHTML +
                formularioComentario +
            '</div>';

        filas +=
            '<tr>' +
                '<td style="text-align:center;font-weight:700;color:#6B7280;width:36px;">' +
                    (i + 1) +
                '</td>' +
                '<td style="color:#1F2937;">' + label + '</td>' +
                '<td>' +
                    '<div class="pd-carga-caja">' +
                        versionesHTML + controlSubida +
                    '</div>' +
                    bloqueComentarios +
                '</td>' +
                '<td style="min-width:260px;max-width:340px;vertical-align:top;">' + pd_celdaAnalisis(num) + '</td>' +
            '</tr>';
    });

    document.getElementById('pd-checklist-body').innerHTML = filas;

    // Revisión ortográfica en los recuadros de comentarios recién creados
    document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(function(campo) {
        if (campo.getAttribute('spellcheck') !== 'false') {
            campo.setAttribute('spellcheck', 'true');
        }
    });

    pd_actualizarAvance(itemsVerificados, totalItems);
    pd_actualizarPanelJuriskills();

    var accionesEl = document.getElementById('pd-acciones');
    if (!accionesEl) return;

    var botonInicio =
        '<a href="/dashboard" ' +
            'style="background:#F3F4F6;color:#374151;border:1px solid #E5E7EB;' +
            'padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;' +
            'cursor:pointer;margin-right:10px;text-decoration:none;display:inline-block;">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Volver al inicio' +
        '</a>';

    if (proceso.estado === 'cerrado') {
        accionesEl.innerHTML =
            botonInicio +
            (puedeComentar
                ? '<button id="pd-btn-guardar" onclick="pd_guardar()" ' +
                    'style="background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;border:none;' +
                    'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px;">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar comentarios' +
                  '</button>'
                : '') +
            '<span style="color:#6B7280;font-size:13px;font-style:italic;">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Este proceso fue finalizado y ya no admite cambios en documentos.' +
            '</span>';
    } else if (puedeEditar) {
        accionesEl.innerHTML =
            botonInicio +
            '<button id="pd-btn-guardar" onclick="pd_guardar()" ' +
                'style="background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;border:none;' +
                'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px;">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar' +
            '</button>' +
            '<button onclick="pd_finalizar()" ' +
                'style="background:#DC2626;color:white;border:none;' +
                'padding:12px 26px;border-radius:12px;font-weight:700;font-size:14px;cursor:pointer;">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Finalizar Proceso' +
            '</button>';
    } else {
        accionesEl.innerHTML = botonInicio;
    }
}

// Misma mecánica que cd1p_actualizarAvance()/d3p_actualizarAvance() en
// js/script.js, adaptada a datos ya cargados (esta página no vive dentro
// de un formulario de creación, sino que lee _documentosActuales/
// _archivosPendientes directamente en vez del DOM).
function pd_actualizarAvance(ok, total) {
    var fill  = document.getElementById('pd-avance-fill');
    var pctEl = document.getElementById('pd-avance-pct');
    var txt   = document.getElementById('pd-avance-texto');
    if (!fill) return;

    var pct = total > 0 ? Math.round((ok / total) * 100) : 0;

    fill.style.width  = pct + '%';
    pctEl.textContent = pct + '%';
    txt.textContent   = ok + ' de ' + total + ' documentos verificados';

    var color = pct === 100 ? 'linear-gradient(90deg,#0B7A43,#059669)'
              : pct >= 60   ? 'linear-gradient(90deg,#0B7A43,#123C7B)'
              : pct >= 30   ? 'linear-gradient(90deg,#D97706,#0B7A43)'
              :               'linear-gradient(90deg,#DC2626,#D97706)';
    fill.style.background = color;
}

function pd_elegirArchivo(num) {
    var inp = document.getElementById('pd-file-' + num);
    if (inp) inp.click();
}

function pd_toggleHistorial(num) {
    var c = document.getElementById('pd-historial-' + num);
    if (!c) return;
    var abrir = c.style.display === 'none';
    c.style.display = abrir ? 'block' : 'none';
    _historialAbierto[num] = abrir; // se recuerda entre renders (ver renderizarChecklist)
}

// Igual que pd_toggleHistorial(), pero para la caja de historial de
// análisis JURISKILLS de la columna "Análisis JURISKILLS" (ver
// pd_celdaAnalisis) — caja independiente de la de versiones de documento.
function pd_toggleHistorialAnalisis(num) {
    var c = document.getElementById('pd-historial-analisis-' + num);
    if (!c) return;
    var abrir = c.style.display === 'none';
    c.style.display = abrir ? 'block' : 'none';
    _historialAnalisisAbierto[num] = abrir;
}

function pd_archivoElegido(num, inputEl) {
    if (!inputEl.files || !inputEl.files[0]) return;
    // Cada archivo elegido se AGREGA al arreglo del ítem en vez de
    // reemplazar al anterior — igual que histU_registrar() en
    // contratacion.html/js/script.js. Antes se sobreescribía
    // _archivosPendientes[num] con el nuevo File, así que elegir un segundo
    // archivo para el mismo ítem borraba el primero sin dejar rastro.
    if (!_archivosPendientes[num]) _archivosPendientes[num] = [];
    _archivosPendientes[num].push(inputEl.files[0]);
    // Mismo comportamiento que histU_render() en contratacion.html: la caja
    // de historial se despliega sola en cuanto se elige un archivo, sin que
    // el usuario tenga que abrirla a mano.
    _historialAbierto[num] = true;
    renderizarChecklist();
}

// Quitar un archivo elegido por error, mientras siga pendiente (todavía no
// se ha presionado "Guardar" y por lo tanto no se ha subido a Supabase).
// idx identifica la posición dentro del arreglo de pendientes de ese ítem
// (puede haber más de uno — ver pd_archivoElegido).
function pd_quitarPendiente(num, idx) {
    if (!confirm('¿Quitar este archivo? Deberá volver a seleccionarlo si lo necesita.')) return;
    var arr = _archivosPendientes[num];
    if (!arr || !arr[idx]) return;

    var archivoQuitado = arr[idx];
    arr.splice(idx, 1);

    // Limpiar el análisis JURISKILLS ligado al archivo que se quitó (si no,
    // la columna seguía mostrando el análisis de un archivo que ya no está).
    if (typeof estadoDocumentos !== 'undefined') {
        delete estadoDocumentos[num + '__' + archivoQuitado.name];
    }

    if (arr.length === 0) {
        delete _archivosPendientes[num];
        var inp = document.getElementById('pd-file-' + num);
        if (inp) inp.value = '';
    }

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

// Botón "➤" dentro del recuadro de comentario: solo pasa el texto del
// textarea a _comentariosPendientes y lo marca como "confirmado" para
// mostrarlo en modo vista previa (editable/borrable). No toca la base de
// datos — eso sigue pasando únicamente en pd_guardar().
function pd_confirmarComentario(num) {
    var campo = document.getElementById('pd-com-input-' + num);
    var texto = campo ? campo.value.trim() : '';
    if (texto === '') {
        alert('⚠️ Escribe un comentario antes de confirmarlo.');
        return;
    }
    _comentariosPendientes[num]  = texto;
    _comentariosConfirmados[num] = true;
    renderizarChecklist();
}

function pd_editarComentarioPendiente(num) {
    _comentariosConfirmados[num] = false;
    renderizarChecklist();
}

function pd_borrarComentarioPendiente(num) {
    delete _comentariosPendientes[num];
    delete _comentariosConfirmados[num];
    renderizarChecklist();
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
        btnGuardar.textContent = 'Guardando…';
    }

    var labelsProceso    = CHECKLISTS_POR_TIPO[_procesoActual.tipo] || CHECKLISTS_POR_TIPO.CD1P;
    var itemsNoContiguos2 = ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE[_procesoActual.tipo] || null;

    for (var i = 0; i < itemsPendientes.length; i++) {
        var num         = parseInt(itemsPendientes[i]);
        var archivos    = _archivosPendientes[num];
        var idxLabel    = itemsNoContiguos2 ? itemsNoContiguos2.indexOf(num) : (num - 1);
        var label       = (idxLabel !== -1 ? labelsProceso[idxLabel] : null) || ('Ítem ' + num);
        var restringido = ITEMS_RESTRINGIDOS_DETALLE.indexOf(num) !== -1;
        // Se suben en el orden en que se eligieron, uno por uno (await en
        // serie) para que cada llamada a db_subirDocumento vea la versión
        // anterior ya marcada como inactiva y calcule bien la siguiente.
        for (var k = 0; k < archivos.length; k++) {
            await db_subirDocumento(_procesoActual.id, num, label, archivos[k], restringido);

            // Si este archivo ya se analizó con JURISKILLS (botón "Analizar",
            // ver pd_analizarDocumento) antes de guardar, registrar ese
            // análisis en el historial (tabla analisis_juriskills) y
            // reflejarlo de inmediato en la caja "Historial de análisis" del
            // ítem, sin esperar a recargar la página.
            var entryAnalisis = estadoDocumentos[num + '__' + archivos[k].name];
            if (entryAnalisis && entryAnalisis.analisis) {
                var filaAnalisis = await db_guardarAnalisisJuriskills(
                    _procesoActual.id, num, label, archivos[k].name, entryAnalisis.analisis
                );
                if (filaAnalisis) {
                    if (!_historialAnalisisPorItem[num]) _historialAnalisisPorItem[num] = [];
                    _historialAnalisisPorItem[num].unshift(filaAnalisis);
                }
            }
        }

        // Ítem 5 = Estudios Previos: si al analizar este documento se
        // detectó una fecha de vigencia de plazo (ver pd_analizarDocumento),
        // persistirla en el proceso ya existente.
        if (num === 5) {
            var claveEst5 = archivos.map(function(a) { return num + '__' + a.name; })
                .map(function(k) { return estadoDocumentos[k]; })
                .filter(function(v) { return v && v.analisis && v.analisis.plazoVigenciaDetectado; })
                .pop();
            if (claveEst5) {
                await db_actualizarPlazoProceso(_procesoActual.id, claveEst5.analisis.plazoVigenciaDetectado.fecha);
            }
        }
    }

    for (var j = 0; j < itemsConComentario.length; j++) {
        var numC  = parseInt(itemsConComentario[j]);
        var texto = _comentariosPendientes[numC].trim();
        var comentario = await db_guardarComentario(_procesoActual.id, texto, null, numC);
        if (comentario) _comentariosActuales.push(comentario);
    }

    _archivosPendientes     = {};
    _comentariosPendientes  = {};
    _comentariosConfirmados = {};
    _documentosActuales     = await db_cargarDocumentos(_procesoActual.id);
    renderizarChecklist();

    // Guardar cambios también cuenta como "actividad" del jurídico
    // asignado sobre el proceso (ver db_marcarActividadProceso en js/db.js).
    if (_perfilActual && _procesoActual.responsable_asignado === _perfilActual.id) {
        db_marcarActividadProceso(_procesoActual.id);
    }

    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Guardado correctamente';
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

// ════════════════════════════════════════════════════
//  Integración con el motor JURISKILLS (js/juriskills-engine.js)
//  Solo analiza documentos NUEVOS (aún pendientes de guardar, en
//  _archivosPendientes) — los ya guardados en el expediente no se
//  reanalizan aquí. Usa las mismas reglas/constantes que contratacion.html
//  y directa-3p.html (ITEMS_CHECKLIST, _MODO_ANALISIS_CD1P, leerArchivo,
//  analizarConIA, ejecutarAnalisisLocalReglas...), cargadas globalmente
//  antes que este archivo — ver _Segundo_Cerebro/Flujo_Analisis_IA_JURISKILLS.md.
// ════════════════════════════════════════════════════

// La numeración de ítem de JURISKILLS (ITEMS_CHECKLIST, _MODO_ANALISIS_CD1P)
// solo está confirmada/alineada para CD1P y D3P (ver ITEMS_POR_TIPO_NO_CONTIGUOS_DETALLE
// arriba). Convocatoria y Subasta reutilizan números 1..15 de su propio
// checklist reducido, que NO corresponden a los mismos ítems en la tabla de
// JURISKILLS — ni siquiera contratacion.html/directa-3p.html habilitan esa
// columna para esos dos tipos hoy. Se deja desactivado aquí también hasta
// que se confirme el mapeo real con Jurídica.
function pd_tipoConAnalisisJuriskills(tipo) {
    return tipo === 'CD1P' || tipo === 'D3P';
}

function pd_actualizarPanelJuriskills() {
    var resumenGlobal = document.getElementById('iaResumenGlobal');
    var contadorDocs  = document.getElementById('iaContadorDocs');
    var estadoBadge   = document.getElementById('iaEstadoBadge');
    if (!contadorDocs || typeof estadoDocumentos === 'undefined') return;

    var items = Object.keys(estadoDocumentos).map(function(k) { return estadoDocumentos[k]; });
    var total = items.length;

    contadorDocs.textContent = total === 0
        ? '0 documentos'
        : total + ' documento' + (total !== 1 ? 's' : '') + ' nuevo' + (total !== 1 ? 's' : '') +
          ' analizado' + (total !== 1 ? 's' : '');

    if (total === 0) {
        estadoBadge.style.display = 'none';
        resumenGlobal.textContent = 'Cargue una nueva versión de un documento para que JURISKILLS la analice.';
        return;
    }

    var nOk = 0, nAdv = 0, nErr = 0, nAnal = 0;
    items.forEach(function(v) {
        if (v.estado === 'ok') nOk++;
        else if (v.estado === 'advertencia') nAdv++;
        else if (v.estado === 'correccion' || v.estado === 'error') nErr++;
        else if (v.estado === 'analizando') nAnal++;
    });

    estadoBadge.style.display = 'inline-block';
    if (nAnal > 0) {
        estadoBadge.className = 'ia-badge badge-analizando';
        estadoBadge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Analizando…';
    } else if (nErr > 0) {
        estadoBadge.className = 'ia-badge badge-error';
        estadoBadge.textContent = nErr + (nErr !== 1 ? ' correcciones requeridas' : ' corrección requerida');
    } else if (nAdv > 0) {
        estadoBadge.className = 'ia-badge badge-warning';
        estadoBadge.textContent = nAdv + ' advertencia' + (nAdv !== 1 ? 's' : '');
    } else {
        estadoBadge.className = 'ia-badge badge-ok';
        estadoBadge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Todo en orden';
    }

    resumenGlobal.textContent =
        nOk + ' correcto' + (nOk !== 1 ? 's' : '') + ' · ' +
        nAdv + ' con advertencia' + (nAdv !== 1 ? 's' : '') + ' · ' +
        nErr + ' con corrección' + (nErr !== 1 ? 'es' : '');
}

// Construye la celda "🤖 Análisis JURISKILLS" de un ítem: botón "Analizar"
// si hay un archivo nuevo sin analizar, resultado compacto si ya se
// analizó, o un texto neutro si no hay archivo nuevo cargado.
function pd_celdaAnalisis(num) {
    if (!pd_tipoConAnalisisJuriskills(_procesoActual.tipo)) {
        return '<div style="color:#9CA3AF;font-style:italic;font-size:12px;">No disponible para este tipo de proceso.</div>';
    }

    var pendientesArrIA = _archivosPendientes[num] || [];

    // Cada archivo pendiente del ítem consigue su propia tarjeta — igual que
    // _renderTarjetasJuriskills() en contratacion.html/js/script.js, donde
    // TODOS los archivos elegidos (no solo el último) quedan disponibles
    // para analizar. Antes acá solo se leía el último del arreglo, así que
    // el análisis del primero desaparecía en cuanto se elegía un segundo.
    var tarjetasHTML = pendientesArrIA.length
        ? pendientesArrIA.map(function(pendiente, idxDoc) {
            var clave = num + '__' + pendiente.name;
            var entry = (typeof estadoDocumentos !== 'undefined') ? estadoDocumentos[clave] : null;

            if (!entry) {
                entry = { numItem: num, archivo: pendiente, analisis: null, estado: 'pendiente' };
            }

            var separador = idxDoc > 0 ? 'border-top:1px solid #F1F5F9;padding-top:8px;margin-top:8px;' : '';
            return '<div style="' + separador + '">' + pd_renderTarjetaAnalisis(entry, clave) + '</div>';
          }).join('')
        : '<div style="color:#9CA3AF;font-style:italic;font-size:12px;">Cargue un documento nuevo para analizarlo.</div>';

    // El historial de análisis ya guardados (ver _historialAnalisisPorItem,
    // cargado en DOMContentLoaded) se muestra SIEMPRE que exista, incluso
    // sin un archivo pendiente — es lo que permite consultar qué se analizó
    // en el pasado sobre este ítem, aunque hoy no se esté cargando nada nuevo.
    return tarjetasHTML + pd_historialAnalisisHTML(num);
}

// Caja colapsable "🕓 Historial de análisis" de un ítem del checklist —
// mismo patrón visual que el "Ver historial" de versiones de documento
// (toggleHistorialHTML/entradasHistorial más abajo en renderizarChecklist),
// pero listando filas de analisis_juriskills en vez de versiones de archivo.
// Cada entrada abre el mismo modal #juriskillsModal con el resultado
// guardado (ver pd_verAnalisisHistorial).
function pd_historialAnalisisHTML(num) {
    var filas = _historialAnalisisPorItem[num] || [];
    if (!filas.length) return '';

    var abierto = _historialAnalisisAbierto[num] ? 'block' : 'none';

    var entradasHTML = filas.map(function(f) {
        var fechaObj = f.created_at ? new Date(f.created_at) : null;
        var fecha = fechaObj
            ? fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '';
        var hora = fechaObj
            ? fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            : '';
        var puntaje = f.puntaje != null ? f.puntaje : 0;
        var pColor = puntaje >= 80 ? '#22C55E' : puntaje >= 50 ? '#F59E0B' : '#EF4444';
        var badgeClase = f.estado === 'ok' ? 'badge-ok' : f.estado === 'advertencia' ? 'badge-warning' : 'badge-error';
        var badgeTexto = f.estado === 'ok' ? 'Correcto' : f.estado === 'advertencia' ? 'Advertencia' : 'Corrección';
        var analistaNombre = (f.analizadoPor && f.analizadoPor.nombre) || '';

        return '<div class="hist-entrada">' +
            '<div class="hist-info">' +
                '<div class="hist-nombre">' +
                    '<span class="ia-badge ' + badgeClase + '" style="font-size:9px;">' + badgeTexto + '</span> ' +
                    '<span style="font-size:11px;font-weight:800;color:' + pColor + ';">' + puntaje + '%</span> ' +
                    '<button onclick="pd_verAnalisisHistorial(\'' + f.id + '\')" ' +
                        'style="background:none;border:none;color:#2563EB;text-decoration:underline;cursor:pointer;' +
                        'font-size:11px;font-weight:700;padding:0;margin-left:4px;">Ver detalle</button>' +
                '</div>' +
                '<div class="hist-meta">' + escapeHTML(f.nombre_archivo || '') +
                    ' &nbsp;·&nbsp; ' + fecha + ' &nbsp;·&nbsp; ' + hora +
                    (analistaNombre ? ' &nbsp;·&nbsp; Subido por: ' + escapeHTML(analistaNombre) : '') +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('');

    return '<button onclick="pd_toggleHistorialAnalisis(' + num + ')" ' +
            'style="margin-top:8px;background:none;border:1px solid #CBD5E1;border-radius:8px;' +
            'padding:5px 10px;font-size:11px;color:#123C7B;cursor:pointer;font-weight:600;' +
            'display:flex;align-items:center;gap:5px;">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Historial de análisis <span style="background:#123C7B;color:white;' +
            'border-radius:10px;padding:1px 7px;font-size:10px;">' + filas.length + '</span>' +
          '</button>' +
        '<div id="pd-historial-analisis-' + num + '" style="display:' + abierto + ';margin-top:6px;max-height:160px;' +
            'overflow-y:auto;border:1px solid #E5E7EB;border-radius:10px;font-size:11px;background:#F8FAFC;">' +
            entradasHTML +
        '</div>';
}

// Abre el modal de detalle (#juriskillsModal, mismo markup que
// pd_juriskillsAbrirModal) con el resultado de una fila del historial ya
// guardada en Supabase, en vez de un análisis en memoria.
function pd_verAnalisisHistorial(id) {
    var fila = null;
    Object.keys(_historialAnalisisPorItem).some(function(num) {
        fila = _historialAnalisisPorItem[num].filter(function(f) { return String(f.id) === String(id); })[0];
        return !!fila;
    });
    if (!fila) return;

    document.getElementById('juriskillsModalTituloTexto').textContent =
        'Análisis JURISKILLS — ' + (fila.nombre_archivo || '') + ' (histórico)';
    document.getElementById('juriskillsModalContenido').innerHTML =
        pd_renderContenidoCompletoAnalisis({ analisis: fila.resultado, archivo: { name: fila.nombre_archivo } });
    document.getElementById('juriskillsModal').style.display = 'flex';
}

// Tarjeta compacta de la celda "Análisis JURISKILLS": mismo markup que
// _renderTarjetasJuriskills() en js/script.js (contratacion.html /
// directa-3p.html) para que las dos páginas se vean idénticas — semáforo +
// barra de cumplimiento + resumen corto + enlace que abre el modal de
// detalle completo (pd_juriskillsAbrirModal).
function pd_renderTarjetaAnalisis(val, clave) {
    clave = clave || ((val.numItem != null ? val.numItem : '') + '__' + (val.archivo ? val.archivo.name : ''));

    if (val.estado === 'analizando') {
        return '<div style="display:flex;align-items:center;gap:6px;color:#6366F1;font-size:11px;">' +
                '<span class="ia-badge badge-analizando"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Analizando</span>' +
                '<span style="color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    escapeHTML(val.archivo ? val.archivo.name : '') + '</span>' +
            '</div>' +
            (val.progreso ? '<div style="margin-top:4px;font-size:10px;color:#6366F1;">' + escapeHTML(val.progreso) + '</div>' : '') +
            '<div class="ia-loader" style="margin-top:6px;"><div></div><div></div><div></div></div>';
    }

    // Archivo cargado pero aún no analizado: mismo botón "Analizar" que en
    // contratacion.html (no se dispara el análisis automático para no gastar
    // cuota de Groq si se subió el documento equivocado por error).
    if (val.estado === 'pendiente' || !val.analisis) {
        return '<div style="margin-bottom:8px;font-size:12px;color:#0B7A43;font-weight:600;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>' +
                escapeHTML(val.archivo ? val.archivo.name : '') + '</strong></div>' +
            '<button class="btn" style="padding:10px 14px;font-size:13px;" ' +
                'onclick="pd_analizarDocumento(\'' + clave.replace(/'/g, "\\'") + '\')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Analizar</button>';
    }

    var a = val.analisis;

    // Documentos de identificación (ítems sin análisis requerido): solo se
    // muestra el archivo cargado, sin badge ni barra de cumplimiento.
    if (val.estado === 'sin_analisis' || a.sinAnalisis) {
        return '<div style="font-size:12px;color:#0B7A43;font-weight:600;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>' +
                escapeHTML(val.archivo ? val.archivo.name : '') + '</strong></div>' +
            '<div style="font-size:10.5px;color:#9CA3AF;font-style:italic;margin-top:2px;">Documento de identificación — sin análisis.</div>';
    }

    var puntaje = a.puntaje != null ? a.puntaje : (a.estado === 'ok' ? 90 : a.estado === 'advertencia' ? 65 : 30);
    var pColor = puntaje >= 80 ? '#22C55E' : puntaje >= 50 ? '#F59E0B' : '#EF4444';
    var badgeClase = a.estado === 'ok' ? 'badge-ok' : a.estado === 'advertencia' ? 'badge-warning' : 'badge-error';
    var badgeTexto = a.estado === 'ok'
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Correcto'
        : a.estado === 'advertencia'
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencia'
        : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Corrección';

    return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">' +
            '<span class="ia-badge ' + badgeClase + '" style="flex-shrink:0;">' + badgeTexto + '</span>' +
            '<span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                escapeHTML(val.archivo ? val.archivo.name : '') + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap;">Cumplimiento</span>' +
            '<div style="flex:1;background:#E5E7EB;border-radius:10px;height:6px;overflow:hidden;">' +
                '<div style="width:' + puntaje + '%;height:6px;border-radius:10px;background:' + pColor + ';transition:width .5s;"></div>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:800;color:' + pColor + ';white-space:nowrap;">' + puntaje + '%</span>' +
        '</div>' +
        '<a href="javascript:void(0)" onclick="pd_juriskillsAbrirModal(\'' + clave.replace(/'/g, "\\'") + '\')" ' +
            'style="font-size:11px;font-weight:700;color:#2563EB;text-decoration:underline;">Ver análisis completo</a>';
}

// Modal de detalle completo — mismo markup que _renderContenidoCompletoAnalisis()
// + juriskillsAbrirModal()/juriskillsCerrarModal() en js/script.js, reutilizando
// el mismo modal #juriskillsModal (ver proceso-detalle.html).
function pd_juriskillsAbrirModal(clave) {
    var val = (typeof estadoDocumentos !== 'undefined') ? estadoDocumentos[clave] : null;
    if (!val || !val.analisis) return;
    document.getElementById('juriskillsModalTituloTexto').textContent =
        'Análisis JURISKILLS — ' + (val.archivo ? val.archivo.name : '');
    document.getElementById('juriskillsModalContenido').innerHTML = pd_renderContenidoCompletoAnalisis(val);
    document.getElementById('juriskillsModal').style.display = 'flex';
}

function pd_juriskillsCerrarModal() {
    document.getElementById('juriskillsModal').style.display = 'none';
}

function pd_renderContenidoCompletoAnalisis(val) {
    var a = val.analisis;
    if (!a) return '<p style="color:#9CA3AF;">Sin análisis disponible.</p>';

    var puntaje = a.puntaje != null ? a.puntaje : (a.estado === 'ok' ? 90 : a.estado === 'advertencia' ? 65 : 30);
    var pColor = puntaje >= 80 ? '#22C55E' : puntaje >= 50 ? '#F59E0B' : '#EF4444';
    var badgeClase = a.estado === 'ok' ? 'badge-ok' : a.estado === 'advertencia' ? 'badge-warning' : 'badge-error';
    var badgeTexto = a.estado === 'ok'
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Correcto'
        : a.estado === 'advertencia'
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencia'
        : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Corrección';

    var hallazgos = a.hallazgos || [];
    var hallNorm = hallazgos.filter(function(x) { return x.indexOf('⚠️ Concordancia') !== 0 && x.indexOf('🔴 Inconsistencia') !== 0; });
    var hallConc = hallazgos.filter(function(x) { return x.indexOf('⚠️ Concordancia') === 0 || x.indexOf('🔴 Inconsistencia') === 0; });

    var advertencias = a.advertencias || [];
    var advNorm  = advertencias.filter(function(x) { return x.indexOf('✏️') !== 0 && x.indexOf('⚠️ Concordancia') !== 0 && x.indexOf('🔴 Inconsistencia') !== 0; });
    var advRedac = advertencias.filter(function(x) { return x.indexOf('✏️') === 0; });
    var advConc  = advertencias.filter(function(x) { return x.indexOf('⚠️ Concordancia') === 0; });

    var hallNormHTML = hallNorm.map(function(x) { return '<li style="margin-bottom:4px;">' + escapeHTML(x) + '</li>'; }).join('');
    var hallConcHTML = hallConc.map(function(x) { return '<li style="margin-bottom:4px;">' + escapeHTML(x) + '</li>'; }).join('');
    var advNormHTML = advNorm.map(function(x, i) {
        return '<li style="margin-bottom:8px;">' +
            '<span style="display:inline-block;background:#F59E0B;color:white;border-radius:50%;width:16px;height:16px;' +
                'font-size:9px;font-weight:800;text-align:center;line-height:16px;margin-right:5px;flex-shrink:0;">' + (i + 1) + '</span>' +
            escapeHTML(x) +
        '</li>';
    }).join('');
    var advRedacHTML = advRedac.map(function(x) {
        return '<li style="margin-bottom:6px;">' + escapeHTML(x.replace('✏️ Redacción: ', '').replace('✏️ ', '')) + '</li>';
    }).join('');
    var advConcHTML = advConc.map(function(x) { return '<li style="margin-bottom:4px;">' + escapeHTML(x) + '</li>'; }).join('');

    var recomendaciones = a.recomendaciones || [];
    var recomHTML = recomendaciones.map(function(x, i) {
        var color = '#0B7A43';
        if (x.indexOf('🔗') === 0) color = '#C2410C';
        else if (x.indexOf('📄') === 0) color = '#1D4ED8';
        return '<li style="margin-bottom:10px;padding-left:6px;border-left:3px solid ' + color + '30;">' +
            '<span style="display:block;font-weight:700;color:' + color + ';font-size:11px;margin-bottom:2px;">Acción ' + (i + 1) + '</span>' +
            '<span style="font-size:12px;color:#374151;">' + escapeHTML(x) + '</span>' +
        '</li>';
    }).join('');

    return '<div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">' +
            '<span class="ia-badge ' + badgeClase + '" style="flex-shrink:0;">' + badgeTexto + '</span>' +
            '<span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                escapeHTML(val.archivo ? val.archivo.name : '') + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap;">Cumplimiento</span>' +
            '<div style="flex:1;background:#E5E7EB;border-radius:10px;height:6px;overflow:hidden;">' +
                '<div style="width:' + puntaje + '%;height:6px;border-radius:10px;background:' + pColor + ';transition:width .5s;"></div>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:800;color:' + pColor + ';white-space:nowrap;">' + puntaje + '%</span>' +
        '</div>' +
        (a.resumen ? '<p style="font-size:11.5px;color:#374151;font-style:italic;margin:0 0 6px;">' + escapeHTML(a.resumen) + '</p>' : '') +
        (hallNormHTML ? '<div style="margin-bottom:6px;background:#FEF2F2;border-radius:8px;padding:6px 8px;">' +
            '<div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Incumplimientos normativos:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">' + hallNormHTML + '</ul></div>' : '') +
        (hallConcHTML ? '<div style="margin-bottom:6px;background:#FFF1F2;border-radius:8px;padding:6px 8px;border:1px solid #FECDD3;">' +
            '<div style="font-size:11px;font-weight:700;color:#BE123C;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Inconsistencias entre documentos:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">' + hallConcHTML + '</ul></div>' : '') +
        (advNormHTML ? '<div style="margin-bottom:6px;background:#FFFBEB;border-radius:8px;padding:6px 8px;">' +
            '<div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencias normativas:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">' + advNormHTML + '</ul></div>' : '') +
        (advRedacHTML ? '<div style="margin-bottom:6px;background:#F0F9FF;border-radius:8px;padding:6px 8px;border:1px solid #BAE6FD;">' +
            '<div style="font-size:11px;font-weight:700;color:#0369A1;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Observaciones de redacción:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">' + advRedacHTML + '</ul></div>' : '') +
        (advConcHTML ? '<div style="margin-bottom:6px;background:#FFF7ED;border-radius:8px;padding:6px 8px;border:1px solid #FED7AA;">' +
            '<div style="font-size:11px;font-weight:700;color:#C2410C;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Concordancia entre documentos:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">' + advConcHTML + '</ul></div>' : '') +
        (recomHTML ? '<div style="margin-bottom:2px;background:#F0FDF4;border-radius:8px;padding:6px 8px;">' +
            '<div style="font-size:11px;font-weight:700;color:#0B7A43;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>Recomendaciones:</div>' +
            '<ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;">' + recomHTML + '</ul></div>' : '') +
        (a.normativa ? '<div style="font-size:10px;color:#9CA3AF;border-top:1px solid #F1F5F9;padding-top:4px;margin-top:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2"/></svg>' + escapeHTML(a.normativa) + '</div>' : '') +
        '<div style="margin-top:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 10px;font-size:10.5px;color:#1E3A8A;line-height:1.5;">' +
            'ⓘ El análisis es generado por IA/reglas automáticas con base en el contenido real de cada documento cargado y la normativa contractual vigente. No reemplaza el criterio jurídico del equipo de contratación. <strong>Independientemente del porcentaje o resultado obtenido — incluso al 100% — este documento siempre debe revisarse manualmente antes de continuar el proceso.</strong>' +
        '</div>' +
    '</div>';
}

// Analiza UN archivo pendiente específico con el motor JURISKILLS (mismo
// enrutamiento Groq/local que analizarDocumentoCD1P en js/script.js, pero
// actualizando la UI propia de esta página en vez de actualizarPanelAgente()).
// Recibe la clave "numItem__nombreArchivo" (igual que analizarDocumentoCD1P)
// en vez de solo el número de ítem, porque un mismo ítem puede tener varios
// archivos pendientes a la vez (ver pd_celdaAnalisis) y cada uno se analiza
// por separado.
async function pd_analizarDocumento(clave) {
    var separador = String(clave).indexOf('__');
    var num = parseInt(String(clave).slice(0, separador), 10);
    var nombreArchivo = String(clave).slice(separador + 2);

    var pendientesArrAnalisis = _archivosPendientes[num] || [];
    var archivo = pendientesArrAnalisis.filter(function(f) { return f.name === nombreArchivo; }).pop();
    if (!archivo) return;

    estadoDocumentos[clave] = { numItem: num, archivo: archivo, analisis: null, estado: 'analizando' };
    renderizarChecklist();

    try {
        var contenido = await leerArchivo(archivo, function(msg) {
            if (estadoDocumentos[clave]) {
                estadoDocumentos[clave].progreso = msg;
                pd_actualizarPanelJuriskills();
            }
        });
        var modo = _MODO_ANALISIS_CD1P[num] || 'local';
        var analisis = modo === 'ninguno'
            ? _analisisSinRequerir(num)
            : modo === 'ia'
                ? await analizarConIA(num, archivo.name, contenido)
                : ejecutarAnalisisLocalReglas(num, archivo.name, contenido);

        // Ítem 5 = Estudios Previos: intentar extraer localmente la fecha de
        // vigencia del PLAZO (ver _extraerPlazoVigencia en
        // juriskills-engine.js) — se persiste en pd_guardar() si el usuario
        // confirma el guardado de este documento.
        if (num === 5 && contenido.tipo === 'texto' && contenido.data) {
            analisis.plazoVigenciaDetectado = _extraerPlazoVigencia(contenido.data);
        }

        estadoDocumentos[clave] = { numItem: num, archivo: archivo, analisis: analisis, estado: analisis.estado };

        if (num === 7 || num === 8) _aplicarCruceFechas7y8();

    } catch (err) {
        console.error('Error analizando documento:', err);

        var mensajeError = 'No fue posible procesar el documento con JURISKILLS.';
        var msg = err.message || '';
        if (msg.indexOf('too large') !== -1 || msg.indexOf('large') !== -1 || msg.indexOf('413') !== -1) {
            mensajeError = 'El archivo es demasiado grande. Use archivos de texto o PDF ligero.';
        } else if (msg) {
            mensajeError = msg.slice(0, 180);
        }

        estadoDocumentos[clave] = {
            numItem: num, archivo: archivo,
            analisis: {
                estado: 'error',
                titulo: (ITEMS_CHECKLIST[num] || {}).nombre || ('Ítem ' + num),
                hallazgos: [mensajeError], advertencias: [], recomendaciones: [],
                resumen: 'Error al procesar el archivo.',
                camposPresentes: [], camposAusentes: []
            },
            estado: 'error'
        };
    }

    renderizarChecklist();
}

// Botón "⟳ Actualizar análisis" del panel: reanaliza todos los documentos
// nuevos (pendientes de guardar) que todavía no se hayan analizado.
async function reAnalizarTodo() {
    if (!pd_tipoConAnalisisJuriskills(_procesoActual.tipo)) {
        alert('ℹ️ El análisis JURISKILLS todavía no está habilitado para este tipo de proceso.');
        return;
    }
    // Una clave por CADA archivo pendiente, no una por ítem — un ítem puede
    // tener varios archivos elegidos sin guardar todavía (ver
    // pd_archivoElegido/pd_celdaAnalisis) y todos deben analizarse.
    var claves = [];
    Object.keys(_archivosPendientes).forEach(function(num) {
        (_archivosPendientes[num] || []).forEach(function(archivo) {
            claves.push(num + '__' + archivo.name);
        });
    });
    if (claves.length === 0) {
        alert('No hay documentos nuevos cargados para analizar. Use "📎 Agregar nueva versión" en el ítem que quiera analizar.');
        return;
    }
    for (var i = 0; i < claves.length; i++) {
        await pd_analizarDocumento(claves[i]);
    }
}

// ════════════════════════════════════════════════════
//  AVISO AL CERRAR/RECARGAR CON CAMBIOS SIN GUARDAR
//  Mismo mecanismo que _procesoFormSucio en js/script.js (páginas
//  de creación de proceso), pero aquí no hace falta una variable
//  aparte: cada tipo de cambio ya tiene su propia fuente de verdad
//  de "sin guardar todavía" —
//   - documentos/comentarios del checklist: _archivosPendientes y
//     _comentariosPendientes (pd_guardar() los vacía al subir todo
//     con éxito, ver líneas 1075-1077),
//   - campo "Valor": input#pd-valor-input vs. su data-guardado
//     (mismo criterio que _pd_marcarCambioValor, arriba),
//   - "Responsable jurídico asignado" (solo Admin): select#pd-resp-select
//     vs. su data-guardado (mismo criterio que _pd_marcarCambioResponsable).
//  El texto del aviso lo pone el propio navegador.
// ════════════════════════════════════════════════════
function _pd_hayCambiosSinGuardar() {
    if (Object.keys(_archivosPendientes).length > 0) return true;

    var hayComentarioPendiente = Object.keys(_comentariosPendientes).some(function(num) {
        return (_comentariosPendientes[num] || '').trim() !== '';
    });
    if (hayComentarioPendiente) return true;

    var valorInput = document.getElementById('pd-valor-input');
    if (valorInput && _fmt_valorARaw(valorInput.value) !== (valorInput.dataset.guardado || '')) {
        return true;
    }

    var respSelect = document.getElementById('pd-resp-select');
    if (respSelect && respSelect.value !== '' &&
        respSelect.value !== (respSelect.dataset.guardado || '')) {
        return true;
    }

    return false;
}

window.addEventListener('beforeunload', function(e) {
    if (!_pd_hayCambiosSinGuardar()) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
});

