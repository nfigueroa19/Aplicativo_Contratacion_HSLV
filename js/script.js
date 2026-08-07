// DESPUÉS — el botón ya existe en el HTML, solo buscarlo
document.addEventListener('DOMContentLoaded', function() {
    // Guardar la promesa de la carga real de datos para que cualquier
    // tabla (historial, modal del dashboard) pueda esperarla y
    // redibujarse sola cuando los datos reales terminen de llegar.
    window._dbListo = new Promise(function(resolve) {
        setTimeout(function() {
            if (typeof db_inicializar === 'function') {
                db_inicializar().then(resolve).catch(resolve);
            } else {
                resolve();
            }
        }, 500);
    });
    // Antes de que termine _dbListo, HIST_BD está vacío y dash_actualizar()
    // mostraba "0" en las tarjetas del dashboard (parecía que no había
    // procesos). window._dashDatosListos hace que dash_actualizar() muestre
    // "Cargando..." mientras tanto, y se pone en true recién cuando la
    // carga real terminó, para pintar los números definitivos una sola vez.
    window._dashDatosListos = false;
    window._dbListo.then(function() {
        window._dashDatosListos = true;
        if (typeof dash_actualizar === 'function') dash_actualizar();
    });
    var btn = document.getElementById('sidebar-toggle');

    var overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);

    var sidebar = document.querySelector('.sidebar');

    var ICONO_MENU = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    var ICONO_CERRAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function cerrarSidebar() {
        if (sidebar) sidebar.classList.remove('sidebar-open');
        document.body.classList.remove('sidebar-abierto');
        btn.innerHTML = ICONO_MENU;
    }

    btn.addEventListener('click', function() {
        var abierto = sidebar.classList.toggle('sidebar-open');
        document.body.classList.toggle('sidebar-abierto', abierto);
        btn.innerHTML = abierto ? ICONO_CERRAR : ICONO_MENU;
    });

    overlay.addEventListener('click', cerrarSidebar);

    document.querySelectorAll('.menu-item').forEach(function(item) {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 992) cerrarSidebar();
        });
    });
});

// ════════════════════════════════════════════════════
//  AVISO AL CERRAR/RECARGAR CON DATOS SIN GUARDAR
//  Solo en las 4 páginas de creación de proceso (Contratación
//  Directa, 3 Invitaciones, Convocatoria, Subasta). Se activa
//  apenas el usuario escribe algo o adjunta un archivo, y se
//  desactiva cuando el proceso se guarda con éxito — ver el
//  reset de _procesoFormSucio dentro de guardarProceso() y
//  guardarProcesoHistorial() más abajo. El texto del aviso lo
//  pone el propio navegador (los navegadores modernos ya no
//  permiten personalizarlo por seguridad).
// ════════════════════════════════════════════════════
var _procesoFormSucio = false;

(function() {
    var path = window.location.pathname;
    var esPaginaCreacionProceso =
        path.includes('contratacion-directa') ||
        path.includes('directa-3')            ||
        path.includes('convocatoria')         ||
        path.includes('subasta');

    if (!esPaginaCreacionProceso) return;

    document.addEventListener('input', function(e) {
        var t = e.target;
        if (t.matches && t.matches('input[type="text"], input:not([type]), textarea')) {
            _procesoFormSucio = true;
        }
    }, true);

    document.addEventListener('change', function(e) {
        var t = e.target;
        if (t.matches && t.matches('input[type="file"], input[type="checkbox"], select')) {
            _procesoFormSucio = true;
        }
    }, true);

    window.addEventListener('beforeunload', function(e) {
        if (!_procesoFormSucio) return;
        e.preventDefault();
        e.returnValue = '';
        return '';
    });
})();

// ════════════════════════════════════════════════════
//  COMENTARIOS EN EL CHECKLIST (al crear un proceso)
//  Se agregan con JS a cada fila para no editar los HTML
//  gigantes de cada módulo. Se guardan al presionar
//  Guardar/Crear Proceso, junto con el resto de los datos.
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    var path = window.location.pathname;
    var prefijoComentario =
        path.includes('contratacion-directa') ? '' :
        path.includes('directa-3')            ? 'i3_' :
        path.includes('convocatoria')         ? 'conv_' :
        path.includes('subasta')              ? 'sub_' :
        null;

    if (prefijoComentario === null) return; // no es una página de creación de proceso

    var tabla = document.querySelector('.checklist-wrapper table');
    if (!tabla) return;

    tabla.querySelectorAll('tbody > tr').forEach(function(fila) {
        var celdas = fila.children;
        if (!celdas || celdas.length < 4) return;

        // El número real del ítem se lee de data-item-num si existe (D3P
        // reutiliza los números reales de CD1P para ítems no consecutivos:
        // 1,2,3,5,6,8,9); si no, del número visible en la 1ª celda — igual
        // que hace el bloque de la columna JURISKILLS más arriba. Sin esto,
        // el número visible (1..7 en D3P) choca con historiales ya creados
        // con el número real (p.ej. el "5" visible de D3P == "5" real de
        // Estudios Previos), duplicando botones o mezclando historiales.
        var num = parseInt(fila.getAttribute('data-item-num'));
        if (!num) num = parseInt((celdas[0].textContent || '').trim());
        if (!num) return;

        var celdaCarga = celdas[celdas.length - 1];

        // "Ver historial" desde el inicio (mostrando 0), igual en los 4 módulos.
        // Los ítems que ya traían su propio contenedor en el HTML original
        // (4, 5, 9, 23 de Contratación Directa 1 / Directa 3 Invitaciones)
        // se dejan tal cual, no se duplican.
        if (!document.getElementById(prefijoComentario + 'historial_' + num)) {
            var inputArchivo = celdaCarga.querySelector('input[type="file"]');
            if (inputArchivo) {
                var bloqueHist = document.createElement('div');
                bloqueHist.className = 'checklist-historial';
                bloqueHist.style.cssText = 'margin-top:8px;';
                bloqueHist.innerHTML =
                    '<button onclick="histU_toggle(\'' + prefijoComentario + '\',' + num + ')" ' +
                        'style="background:none;border:1px solid #CBD5E1;border-radius:8px;' +
                        'padding:5px 10px;font-size:11px;color:#123C7B;cursor:pointer;font-weight:600;' +
                        'display:flex;align-items:center;gap:5px;">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                        'Ver historial <span id="' + prefijoComentario + 'badge_hist_' + num + '" ' +
                            'style="background:#123C7B;color:white;border-radius:10px;' +
                            'padding:1px 7px;font-size:10px;">0</span>' +
                    '</button>' +
                    '<div id="' + prefijoComentario + 'historial_' + num + '" ' +
                        'style="display:none;margin-top:8px;max-height:160px;overflow-y:auto;' +
                        'border:1px solid #E5E7EB;border-radius:10px;font-size:11px;background:#F8FAFC;">' +
                        '<div style="padding:8px 10px;color:#6B7280;font-style:italic;" ' +
                            'id="' + prefijoComentario + 'historial_empty_' + num + '">' +
                            'Sin cargas registradas aún.' +
                        '</div>' +
                    '</div>';
                celdaCarga.appendChild(bloqueHist);
            }
        }

        if (celdaCarga.querySelector('.checklist-comentario')) return; // ya se agregó

        // El textarea real (id 'coment_' + num, con o sin prefijo del módulo)
        // nunca se saca del DOM ni se limpia solo al presionar el botón de
        // envío: pd_guardarProceso (más abajo, en cada módulo) sigue leyendo
        // su .value tal cual al final. El botón ➤ y la vista previa (que
        // imita el look de un comentario ya guardado) son puramente visuales,
        // para que el usuario sepa que su texto "quedó listo" sin necesidad
        // de guardar/crear el proceso completo primero.
        var idTextarea = prefijoComentario + 'coment_' + num;
        var idPreview  = prefijoComentario + 'coment_prev_' + num;

        var bloque = document.createElement('div');
        bloque.className = 'checklist-comentario';
        bloque.style.cssText = 'margin-top:10px;border-top:1px dashed #E5E7EB;padding-top:8px;';
        bloque.innerHTML =
            '<div style="font-size:10px;color:#6B7280;font-weight:700;' +
                'text-transform:uppercase;margin-bottom:4px;">' +
                '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                'Comentarios</div>' +
            '<div id="' + idPreview + '" style="display:none;"></div>' +
            '<div id="' + idTextarea + '_wrap" style="position:relative;width:fit-content;max-width:100%;">' +
                '<textarea id="' + idTextarea + '" rows="1" ' +
                    'placeholder="Escribir un comentario para este documento…" autocomplete="off" ' +
                    'oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';" ' +
                    'style="width:44ch;max-width:100%;font-size:12px;padding:6px 30px 6px 8px;' +
                    'border:1px solid #CBD5E1;border-radius:8px;resize:none;overflow:hidden;' +
                    'box-sizing:border-box;display:block;"></textarea>' +
                '<button type="button" ' +
                    'onclick="checklistComentario_confirmar(\'' + idTextarea + '\')" ' +
                    'style="position:absolute;right:5px;bottom:5px;background:#123C7B;color:white;' +
                    'border:none;border-radius:50%;width:22px;height:22px;padding:0;font-size:11px;' +
                    'line-height:22px;text-align:center;cursor:pointer;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg></button>' +
            '</div>';
        celdaCarga.appendChild(bloque);
    });
});

// Botón ➤ dentro del recuadro de comentario en las páginas de creación de
// proceso (Contratación Directa, 3 Invitaciones, Convocatoria, Subasta).
// Solo cambia qué se ve (textarea vs. vista previa tipo comentario guardado);
// el texto real sigue viviendo en el mismo <textarea>, que nunca se destruye,
// para que el guardado final (checklist.push({..., comentario: ...})) lo siga
// leyendo igual que antes.
function _checklistComentarioEscapeHTML(texto) {
    var div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

async function checklistComentario_confirmar(idTextarea) {
    var campo = document.getElementById(idTextarea);
    var wrap  = document.getElementById(idTextarea + '_wrap');
    var prev  = document.getElementById(idTextarea.replace('coment_', 'coment_prev_'));
    if (!campo || !wrap || !prev) return;

    var texto = campo.value.trim();
    if (texto === '') {
        alert('⚠️ Escribe un comentario antes de marcarlo como listo.');
        return;
    }
    var textoEscapado = _checklistComentarioEscapeHTML(texto);
    var perfil = (typeof db_perfil === 'function') ? await db_perfil() : null;
    var nombreAutor = _checklistComentarioEscapeHTML((perfil && (perfil.nombre || perfil.email)) || 'Usuario');

    prev.innerHTML =
        '<div style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;' +
            'padding:6px 9px;margin-bottom:6px;font-size:11px;">' +
            '<div style="font-weight:700;color:#123C7B;">' + nombreAutor + '</div>' +
            '<div style="color:#1F2937;margin-top:2px;">' + textoEscapado + '</div>' +
            '<div style="margin-top:4px;">' +
                '<a onclick="checklistComentario_editar(\'' + idTextarea + '\')" ' +
                    'style="color:#123C7B;font-size:10px;cursor:pointer;margin-right:10px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Editar</a>' +
                '<a onclick="checklistComentario_borrar(\'' + idTextarea + '\')" ' +
                    'style="color:#B91C1C;font-size:10px;cursor:pointer;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>Borrar</a>' +
            '</div>' +
        '</div>';
    prev.style.display = '';
    wrap.style.display = 'none';
}

function checklistComentario_editar(idTextarea) {
    var wrap = document.getElementById(idTextarea + '_wrap');
    var prev = document.getElementById(idTextarea.replace('coment_', 'coment_prev_'));
    if (!wrap || !prev) return;
    prev.style.display = 'none';
    wrap.style.display  = '';
}

function checklistComentario_borrar(idTextarea) {
    var campo = document.getElementById(idTextarea);
    if (campo) campo.value = '';
    checklistComentario_editar(idTextarea);
}

// ════════════════════════════════════════════════════
//  REVISIÓN ORTOGRÁFICA — se activa en todos los recuadros
//  de texto de cualquier página, para no depender de si el
//  navegador lo activa solo por defecto o no.
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('textarea, input[type="text"], input:not([type])').forEach(function(campo) {
        if (campo.getAttribute('spellcheck') !== 'false') {
            campo.setAttribute('spellcheck', 'true');
        }
    });
});

// ════════════════════════════════════════════════════
//  SPLASH — barra sincronizada con carga real de datos
//  Se muestra en CADA carga de index.html (login→index y
//  también volver desde cualquier otra página), porque cada
//  navegación recarga la página entera y vuelve a pedir los
//  datos del dashboard — sin el splash tapando esa espera,
//  las tarjetas se ven un instante en "Cargando...".
//  Solo aplica a index.html, que es la única página con
//  #splashScreen.
//
//  Dos modos, según de dónde viene el usuario:
//  - Desde login (marca 'hslv_splash_desde_login' en
//    sessionStorage, puesta por login.js): secuencia larga —
//    imagen primero, barra después (por CSS), con mínimo
//    visual de 3s combinado con window._dbListo.
//  - Desde cualquier otra página: imagen y barra aparecen
//    juntas (clase .splash-simultaneo), sin mínimo de tiempo —
//    el splash dura exactamente lo que tarde window._dbListo,
//    sea cual sea ese tiempo.
// ════════════════════════════════════════════════════
(function() {
    var splash = document.getElementById('splashScreen');
    if (!splash) return;

    var desdeLogin = sessionStorage.getItem('hslv_splash_desde_login') === '1';
    sessionStorage.removeItem('hslv_splash_desde_login');

    document.body.classList.add('splash-activo');

    var percent = document.getElementById('splashPercent');
    var bar     = document.getElementById('splashBar');

    // window._dbListo se crea dentro de un listener de DOMContentLoaded
    // (arriba en este mismo archivo) — como este IIFE corre en cuanto se
    // parsea el <script>, ANTES de que DOMContentLoaded dispare, todavía
    // no existe en ese momento. Hay que esperar a ese evento (si ya pasó,
    // conectar de inmediato) para engancharse a la promesa real en vez de
    // caer siempre al fallback de window.load.
    function conectarDatos(callback) {
        function intentar() {
            if (window._dbListo && typeof window._dbListo.then === 'function') {
                window._dbListo.then(callback).catch(callback);
            } else {
                // Fallback si _dbListo no llegó a definirse de todos modos
                window.addEventListener('load', callback);
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', intentar);
        } else {
            intentar();
        }
    }

    function ocultarSplash() {
        if (percent) percent.textContent = '100%';
        if (bar)     bar.style.width     = '100%';
        document.body.style.overflow     = 'auto';

        setTimeout(function() {
            splash.classList.add('hide');
            setTimeout(function() {
                splash.remove();
                document.body.classList.remove('splash-activo');
            }, 800);
        }, 300);
    }

    if (desdeLogin) {
        // ── Secuencia larga: mínimo visual de 3s + carga real ──
        var MIN_MS        = 3000;
        var start         = Date.now();
        var datosListos   = false;
        var tiempoMinCumplido = false;
        var pctTiempo     = 0;
        var pctCarga      = 0;

        function tickTiempo() {
            var elapsed = Date.now() - start;
            pctTiempo = Math.min(100, Math.round((elapsed / MIN_MS) * 100));
            actualizarBarra();
            if (elapsed < MIN_MS) {
                requestAnimationFrame(tickTiempo);
            } else {
                pctTiempo         = 100;
                tiempoMinCumplido = true;
                actualizarBarra();
                intentarOcultar();
            }
        }
        requestAnimationFrame(tickTiempo);

        function marcarDatosListos() {
            pctCarga    = 100;
            datosListos = true;
            actualizarBarra();
            intentarOcultar();
        }

        conectarDatos(marcarDatosListos);

        function actualizarBarra() {
            var pctFinal = Math.round((pctTiempo + pctCarga) / 2);
            if (percent) percent.textContent = pctFinal + '%';
            if (bar)     bar.style.width     = pctFinal + '%';
        }

        function intentarOcultar() {
            if (!datosListos || !tiempoMinCumplido) return;
            ocultarSplash();
        }

    } else {
        // ── Transición corta: imagen + barra juntas, sin mínimo ──
        splash.classList.add('splash-simultaneo');

        // Avance visual mientras se espera _dbListo (nunca llega a 100%
        // por sí solo) — el porcentaje real de "listo" lo pone _dbListo,
        // sin importar cuánto tarde.
        var pct = 0;
        var avanceInterval = setInterval(function() {
            if (pct < 90) {
                pct += (90 - pct) * 0.15;
                actualizarBarraCorta();
            }
        }, 120);

        function actualizarBarraCorta() {
            var pctMostrado = Math.round(pct);
            if (percent) percent.textContent = pctMostrado + '%';
            if (bar)     bar.style.width     = pctMostrado + '%';
        }
        actualizarBarraCorta();

        function marcarDatosListosCorta() {
            clearInterval(avanceInterval);
            ocultarSplash();
        }

        conectarDatos(marcarDatosListosCorta);
    }
})();

/* ═══════════════════════════════════════════
   DASHBOARD — Indicadores dinámicos del Historial
   Se actualizan cada vez que se guarda un proceso
   ═══════════════════════════════════════════ */

function dash_actualizar() {
    if (typeof HIST_BD === 'undefined') return;

    // Las tarjetas del dashboard solo existen en index.html — en otras
    // páginas (historial, proceso-detalle, etc.) esta función no debe hacer nada.
    if (!document.getElementById('dash-total')) return;

    // Mientras no haya terminado la primera carga real de Supabase
    // (window._dashDatosListos, fijado por window._dbListo más arriba),
    // HIST_BD todavía está vacío — mostrar "Cargando..." en vez de "0"
    // para no dar la falsa impresión de que no hay procesos guardados.
    if (typeof window._dashDatosListos !== 'undefined' && !window._dashDatosListos) {
        ['dash-total', 'dash-cd1p', 'dash-d3p', 'dash-conv', 'dash-sub'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = '...';
        });
        ['dash-sub-total', 'dash-sub-cd1p', 'dash-sub-d3p', 'dash-sub-conv', 'dash-sub-sub'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = 'Cargando procesos...';
        });
        return;
    }

    var total = HIST_BD.length;
    var cd1p  = HIST_BD.filter(function(p){ return p.tipo === 'CD1P'; }).length;
    var d3p   = HIST_BD.filter(function(p){ return p.tipo === 'D3P';  }).length;
    var conv  = HIST_BD.filter(function(p){ return p.tipo === 'CONV'; }).length;
    var sub   = HIST_BD.filter(function(p){ return p.tipo === 'SUB';  }).length;
    var maxVal    = Math.max(total, 1);

    // Actualizar números en dashboard
    document.getElementById('dash-total').textContent = total;
    document.getElementById('dash-cd1p').textContent  = cd1p;
    document.getElementById('dash-d3p').textContent   = d3p;
    document.getElementById('dash-conv').textContent  = conv;
    document.getElementById('dash-sub').textContent   = sub;
    // dash-docs / dash-bar-docs / dash-sub-docs (tarjeta "Conocimiento
    // Jurídico") NO se tocan acá — su única fuente es panel_actualizarSeguimientoConocimiento()
    // en la sección "SEGUIMIENTO DE CONOCIMIENTO JURÍDICO" más abajo. Que
    // dos funciones escriban el mismo elemento fue justo el bug que infló
    // el contador de "Contratación Directa" (ver actualizarCardsIndicadores).

    // Barras decorativas: siempre llenas, funcionan como separador de color
    // bajo el número (antes eran proporcionales al total, pero se veían
    // vacías o parciales cuando un tipo tenía pocos procesos).
    document.getElementById('dash-bar-total').style.width = '100%';
    document.getElementById('dash-bar-cd1p').style.width  = '100%';
    document.getElementById('dash-bar-d3p').style.width   = '100%';
    document.getElementById('dash-bar-conv').style.width  = '100%';
    document.getElementById('dash-bar-sub').style.width   = '100%';

    // Sub-textos informativos
    document.getElementById('dash-sub-total').textContent = total === 0
        ? 'Sin procesos guardados aún'
        : total + ' proceso' + (total !== 1 ? 's' : '') + ' en historial';
    document.getElementById('dash-sub-cd1p').textContent  = cd1p  + ' proceso' + (cd1p  !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-d3p').textContent   = d3p   + ' proceso' + (d3p   !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-conv').textContent  = conv  + ' proceso' + (conv  !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-sub').textContent   = sub   + ' proceso' + (sub   !== 1 ? 's' : '') + ' · Ver historial';

    // Actualizar también los cards de indicadores si existen con atributos data-indicator
    actualizarCardsIndicadores(cd1p, d3p, conv, sub, total);
    
    // Actualizar contador de alertas jurídicas
    actualizarContadorAlertas();
}

function actualizarCardsIndicadores(cd1p, d3p, conv, sub, total) {
    // Actualizar card de Contratación Directa (CD1P) — dash_actualizar() ya
    // fija este valor correctamente vía getElementById('dash-cd1p'); antes
    // esta línea lo pisaba con cd1p + d3p, inflando el número de la tarjeta
    // por encima de lo que mostraba el historial filtrado por CD1P.
    var cardDirecta = document.querySelector('[data-indicator="directa"]');
    if (cardDirecta) {
        var numEl = cardDirecta.querySelector('.card-number');
        if (numEl) numEl.textContent = cd1p;
    }

    // Actualizar card de Convocatoria Pública
    var cardConvocatoria = document.querySelector('[data-indicator="convocatoria"]');
    if (cardConvocatoria) {
        var numEl = cardConvocatoria.querySelector('.card-number');
        if (numEl) numEl.textContent = conv;
    }

    // Actualizar card de Subasta Inversa
    var cardSubasta = document.querySelector('[data-indicator="subasta"]');
    if (cardSubasta) {
        var numEl = cardSubasta.querySelector('.card-number');
        if (numEl) numEl.textContent = sub;
    }

    // Actualizar card de Total
    var cardTotal = document.querySelector('[data-indicator="total"]');
    if (cardTotal) {
        var numEl = cardTotal.querySelector('.card-number');
        if (numEl) numEl.textContent = total;
    }
}

/* ── Función para sincronizar indicador de alertas jurídicas ── */
function actualizarContadorAlertas() {
    // Contar alertas críticas, moderadas e informativas
    var alertasCriticas = document.querySelectorAll('.alerta-critica').length;
    var alertasModerads = document.querySelectorAll('.alerta-moderada').length;
    var alertasInfo = document.querySelectorAll('.alerta-info').length;
    var totalAlertas = alertasCriticas + alertasModerads + alertasInfo;
    
    // Actualizar badge de alertas
    var badge = document.getElementById('badge_alertas_total');
    if (badge) {
        var plural = totalAlertas !== 1 ? 's' : '';
        badge.textContent = totalAlertas + ' alerta' + plural + ' activa' + plural;
        
        // Cambiar color según criticidad
        if (alertasCriticas > 0) {
            badge.style.background = '#DC2626'; // Rojo - Críticas
            badge.style.color = 'white';
        } else if (alertasModerads > 0) {
            badge.style.background = '#F59E0B'; // Naranja - Moderadas
            badge.style.color = 'white';
        } else if (alertasInfo > 0) {
            badge.style.background = '#3B82F6'; // Azul - Informativas
            badge.style.color = 'white';
        } else {
            badge.style.background = '#10B981'; // Verde - Sin alertas
            badge.style.color = 'white';
            badge.textContent = 'Sin alertas';
        }
    }
    
    // Actualizar card indicador si existe
    var cardAlertas = document.querySelector('[data-indicator="alertas"]');
    if (cardAlertas) {
        var numEl = cardAlertas.querySelector('.card-number');
        if (numEl) {
            numEl.textContent = totalAlertas;
            // Cambiar color del número según criticidad
            if (alertasCriticas > 0) {
                numEl.style.color = '#DC2626';
            } else if (alertasModerads > 0) {
                numEl.style.color = '#F59E0B';
            } else if (alertasInfo > 0) {
                numEl.style.color = '#3B82F6';
            } else {
                numEl.style.color = '#10B981';
            }
        }
    }
}

function dash_abrirHistorial(filtroTipo) {
    // Aplicar filtro antes de abrir
    var sel = document.getElementById('hist-filtro-modal');
    if (sel) sel.value = filtroTipo || '';
    openModal('modalHistorialProcesos');
}

// Parchar guardarProcesoHistorial para que también actualice el dashboard
(function() {
    var _orig = window.guardarProcesoHistorial;
    window.guardarProcesoHistorial = function(tipo) {
        if (typeof _orig === 'function') _orig(tipo);
        setTimeout(dash_actualizar, 200);
    };
})();

// Nota: la reconstrucción de HIST_BD desde Supabase ya la hace por completo
// db_inicializar() (en js/db.js), incluyendo los campos de responsable
// asignado. Antes había aquí una segunda copia de esa misma lógica (sin esos
// campos) que competía con db_inicializar() y a veces "ganaba" la carrera,
// dejando el responsable asignado sin mostrar. Se quitó esa copia duplicada.
document.addEventListener('DOMContentLoaded', function() {
    dash_actualizar();
    actualizarContadorAlertas();

    // Observar cambios en HIST_BD periódicamente (para CD1P que usa otro flujo)
    setInterval(function() {
        var totalEl = document.getElementById('dash-total');
        if (totalEl && typeof HIST_BD !== 'undefined') {
            var n = parseInt(totalEl.textContent) || 0;
            if (n !== HIST_BD.length) dash_actualizar();
        }
        // Actualizar alertas cada vez que se ejecuta el monitoreo
        actualizarContadorAlertas();
    }, 1000);

    // Agregar event listener para actualizar cuando se cierre el modal de historial
    var modalHistorial = document.getElementById('modalHistorialProcesos');
    if (modalHistorial) {
        modalHistorial.addEventListener('click', function(e) {
            if (e.target === this) {
                setTimeout(function() {
                    dash_actualizar();
                    actualizarContadorAlertas();
                }, 300);
            }
        });
    }
    
    // Agregar event listener para modal de alertas jurídicas
    var modalAlertas = document.getElementById('modalAlertasJuridicas');
    if (modalAlertas) {
        modalAlertas.addEventListener('click', function(e) {
            if (e.target === this) {
                setTimeout(actualizarContadorAlertas, 300);
            }
        });
    }
});

/* ═══════════════════════════════════════════════════════════════════
   SEGUIMIENTO DE CONOCIMIENTO JURÍDICO — solo Admin
   Reemplaza al antiguo panel "Docs Verificados". Compara cuándo el
   Admin asignó un responsable jurídico a un proceso vs. cuándo ese
   jurídico lo abrió por primera vez (ver db_marcarProcesoVisto /
   db_cargarSeguimientoConocimiento en js/db.js — la tarjeta y este
   modal son la única capa que lee/escribe dash-docs / dash-bar-docs /
   dash-sub-docs, ver nota en dash_actualizar()).
   ═══════════════════════════════════════════════════════════════════ */
(function () {

  // Lista completa (sin filtrar) de la última carga — los filtros del
  // modal re-renderizan desde acá sin volver a consultar Supabase.
  var _segLista = [];

  function _seg_formatearFecha(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('es-CO', {day:'2-digit',month:'2-digit',year:'numeric'}) +
           ' · ' + d.toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
  }

  function _seg_diasDesde(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  // Aplica los filtros del modal (estado, texto, responsable, fecha) sobre
  // _segLista. La fecha filtra por la fecha "relevante" de cada fila: la
  // de visto si ya fue visto, o la de asignación mientras esté pendiente
  // — así "filtrar por fecha" tiene sentido para ambos estados a la vez.
  function _seg_filtrar() {
    var filtroEstado = (document.getElementById('seg-filtro-estado') || {}).value || '';
    var filtroBuscar = ((document.getElementById('seg-filtro-buscar') || {}).value || '').toLowerCase().trim();
    var filtroResp   = ((document.getElementById('seg-filtro-responsable') || {}).value || '').toLowerCase().trim();
    var filtroFecha  = (document.getElementById('seg-filtro-fecha') || {}).value || '';

    return _segLista.filter(function (p) {
      var esVisto = !!p.visto_fecha;
      var matchEstado = !filtroEstado ||
        (filtroEstado === 'visto' ? esVisto : !esVisto);
      var matchBuscar = !filtroBuscar ||
        (p.codigo || '').toLowerCase().includes(filtroBuscar) ||
        (p.objeto || '').toLowerCase().includes(filtroBuscar) ||
        (p.area   || '').toLowerCase().includes(filtroBuscar);
      var matchResp = !filtroResp ||
        (p.biomedico_nombre    || '').toLowerCase().includes(filtroResp) ||
        (p.juridico_nombre     || '').toLowerCase().includes(filtroResp) ||
        (p.asignado_por_nombre || '').toLowerCase().includes(filtroResp);
      var fechaRelevante = p.visto_fecha || p.asignado_fecha;
      var matchFecha = !filtroFecha || !fechaRelevante ||
        new Date(fechaRelevante).toISOString().slice(0, 10) >= filtroFecha;
      return matchEstado && matchBuscar && matchResp && matchFecha;
    });
  }

  // Actualizar datalist de responsables con los valores únicos de _segLista
  // (biomédico, jurídico y quién asignó) — mismo patrón que
  // hist_actualizarDatalistResponsables() para el modal de Historial.
  function _seg_actualizarDatalistResponsables() {
    var dl = document.getElementById('seg-responsables-datalist');
    if (!dl) return;
    var nombres = new Set();
    _segLista.forEach(function (p) {
      if (p.biomedico_nombre)    nombres.add(p.biomedico_nombre);
      if (p.juridico_nombre)     nombres.add(p.juridico_nombre);
      if (p.asignado_por_nombre) nombres.add(p.asignado_por_nombre);
    });
    dl.innerHTML = Array.from(nombres).sort().map(function (n) {
      return '<option value="' + n.replace(/"/g, '&quot;') + '">';
    }).join('');
  }

  function _seg_render() {
    _seg_actualizarDatalistResponsables();

    var totalGeneral = _segLista.length;
    var vistosGeneral = _segLista.filter(function (p) { return p.visto_fecha; }).length;
    var pendientesGeneral = totalGeneral - vistosGeneral;

    // Tarjeta del dashboard: el número destacado son los PENDIENTES (lo
    // accionable). El sub-texto describe ESE MISMO número con otras
    // palabras (no el complementario "vistos") para que no parezca
    // contradecir al número grande cuando llega a 0.
    var cardNum = document.getElementById('dash-docs');
    var cardBar = document.getElementById('dash-bar-docs');
    var cardSub = document.getElementById('dash-sub-docs');
    if (cardNum) cardNum.textContent = pendientesGeneral;
    if (cardBar) cardBar.style.width = (totalGeneral > 0 ? Math.round((pendientesGeneral / totalGeneral) * 100) : 0) + '%';
    if (cardSub) cardSub.innerHTML = totalGeneral === 0
      ? 'Sin asignaciones aún'
      : pendientesGeneral === 0
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Todos los asignados (' + totalGeneral + ') fueron vistos'
        : pendientesGeneral + ' de ' + totalGeneral + ' procesos asignados sin revisar';

    var totalEl = document.getElementById('seg-total');
    var vistosEl = document.getElementById('seg-vistos');
    var pendEl = document.getElementById('seg-pendientes');
    if (totalEl) totalEl.textContent = totalGeneral;
    if (vistosEl) vistosEl.textContent = vistosGeneral;
    if (pendEl) pendEl.textContent = pendientesGeneral;

    var tbody = document.getElementById('seg-tabla-body');
    var contador = document.getElementById('seg-contador');
    if (!tbody) return;

    var filtrada = _seg_filtrar();
    var pendientes = filtrada.filter(function (p) { return !p.visto_fecha; })
      .sort(function (a, b) { return new Date(a.asignado_fecha) - new Date(b.asignado_fecha); });
    var vistos = filtrada.filter(function (p) { return p.visto_fecha; })
      .sort(function (a, b) { return new Date(b.asignado_fecha) - new Date(a.asignado_fecha); });
    var ordenada = pendientes.concat(vistos);

    if (contador) contador.textContent = ordenada.length + ' resultado' + (ordenada.length !== 1 ? 's' : '');

    if (ordenada.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="padding:32px;text-align:center;color:#9CA3AF;">' +
        '<div style="margin-bottom:8px;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>' +
        '<div style="font-size:13px;font-weight:600;">' +
          (totalGeneral === 0
            ? 'Aún no hay procesos asignados a un jurídico.'
            : 'Ningún proceso coincide con los filtros.') +
        '</div>' +
        '</td></tr>';
      return;
    }

    var html = '';
    ordenada.forEach(function (p, i) {
      var bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
      var estadoHTML;
      if (p.visto_fecha) {
        estadoHTML = '<span style="background:#DCFCE7;color:#166534;border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Visto</span>';
      } else {
        var dias = _seg_diasDesde(p.asignado_fecha);
        var critico = dias >= 2;
        estadoHTML = '<span style="background:' + (critico ? '#FEE2E2' : '#FEF3C7') + ';color:' + (critico ? '#991B1B' : '#92400E') + ';border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Pendiente' + (dias > 0 ? ' · ' + dias + 'd' : '') + '</span>';
      }
      html +=
        '<tr style="background:' + bg + ';border-bottom:1px solid #E5E7EB;">' +
          '<td style="padding:11px 14px;font-weight:700;font-size:12px;white-space:nowrap;">' +
            '<a href="/proceso/' + encodeURIComponent(p.codigo) + '" ' +
              'style="color:#123C7B;text-decoration:underline;" ' +
              'title="Ver detalle y documentos de este proceso">' + escaparHTML(p.codigo) + '</a>' +
          '</td>' +
          '<td style="padding:11px 14px;color:#374151;">' + escaparHTML(p.biomedico_nombre) + '</td>' +
          '<td style="padding:11px 14px;color:#374151;">' + escaparHTML(p.juridico_nombre) + '</td>' +
          '<td style="padding:11px 14px;color:#374151;">' + escaparHTML(p.asignado_por_nombre) + '</td>' +
          '<td style="padding:11px 14px;color:#6B7280;font-size:12px;white-space:nowrap;">' + _seg_formatearFecha(p.asignado_fecha) + '</td>' +
          '<td style="padding:11px 14px;color:#6B7280;font-size:12px;white-space:nowrap;">' + _seg_formatearFecha(p.visto_fecha) + '</td>' +
          '<td style="padding:11px 14px;color:#6B7280;font-size:12px;white-space:nowrap;">' + _seg_formatearFecha(p.ultima_actividad_fecha) + '</td>' +
          '<td style="padding:11px 14px;">' + estadoHTML + '</td>' +
        '</tr>';
    });
    tbody.innerHTML = html;
  }

  async function panel_actualizarSeguimientoConocimiento() {
    if (typeof db_cargarSeguimientoConocimiento !== 'function') return;
    _segLista = await db_cargarSeguimientoConocimiento();
    _seg_render();
  }

  // Los filtros del modal solo re-renderizan desde _segLista, sin volver
  // a consultar Supabase — igual de rápido que hist_renderTabla().
  window.seg_renderTabla = _seg_render;

  window.panel_abrirSeguimientoConocimiento = function () {
    openModal('modalSeguimientoConocimiento');
    panel_actualizarSeguimientoConocimiento();
  };

  // Al cargar: ocultar la tarjeta para cualquiera que no sea admin (el
  // acceso real también está protegido por RLS en `procesos`/`profiles`,
  // esto es solo para no mostrar información que no le corresponde ver
  // a Biomédica/Jurídica).
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window._dbListo === 'undefined' || !window._dbListo) return;
    window._dbListo.then(async function () {
      var card = document.querySelector('[data-indicator="documentos"]');
      if (!card) return;
      var perfil = (typeof db_perfil === 'function') ? await db_perfil() : null;
      // La tarjeta arranca oculta (display:none inline en el HTML) para
      // que no haya un parpadeo visible mientras se resuelve el perfil;
      // acá se decide si se muestra.
      if (!perfil || perfil.rol !== 'admin') {
        card.style.display = 'none';
        return;
      }
      card.style.display = '';
      panel_actualizarSeguimientoConocimiento();
    });
  });
})();

/* ═══════════════════════════════════════════════════════════════════
   REALTIME — mantiene el dashboard al día cuando OTRO usuario crea o
   modifica un proceso, sin que haga falta recargar la página.
   Requiere que `procesos` esté agregada a la publicación
   `supabase_realtime` en Supabase (ver
   sql/0002_habilitar_realtime_procesos.sql).

   Supabase Realtime aplica las mismas políticas RLS que ya protegen
   `procesos` (ver _Segundo_Cerebro/Modelo_De_Datos_Supabase.md,
   sección "Seguridad: anon key pública") — cada usuario solo recibe
   por este canal los procesos que su rol ya podía ver antes, no se
   agrega ninguna exposición nueva.

   HIST_BD es la única fuente de la que leen tanto el dashboard
   (dash_actualizar) como el historial (hist_renderTabla) — por eso
   basta con mantenerla sincronizada acá para que ambos se refresquen
   solos.
   ═══════════════════════════════════════════════════════════════════ */
(function () {

  function _rt_modalAbierto(id) {
    var el = document.getElementById(id);
    return !!(el && el.style.display && el.style.display !== 'none');
  }

  function _rt_refrescarUI() {
    if (typeof dash_actualizar === 'function') dash_actualizar();
    if (typeof hist_renderTabla === 'function') hist_renderTabla();
    if (_rt_modalAbierto('modalSeguimientoConocimiento') &&
        typeof panel_actualizarSeguimientoConocimiento === 'function') {
      panel_actualizarSeguimientoConocimiento();
    }
  }

  // Alta de un proceso nuevo (creado por otro usuario, o por Realtime
  // llegando antes de que termine el guardado optimista local).
  async function _rt_onInsert(fila) {
    if (HIST_BD.some(function (h) { return h.supabase_id === fila.id; })) return;
    var completo = await db_obtenerProcesoPorCodigo(fila.codigo);
    if (!completo) return;
    HIST_BD.unshift(db_construirEntradaHIST(completo, {}));
    HIST_BD.sort(function (a, b) { return b.timestamp - a.timestamp; });
    _rt_refrescarUI();
  }

  // Cambios sobre un proceso ya existente (estado, asignación de
  // responsable, edición de campos, etc.). Se preservan
  // checklist/checksOk/checksTotal: un UPDATE en `procesos` no toca
  // `documentos`, y recalcularlos exigiría otra consulta por cada
  // cambio en vivo.
  async function _rt_onUpdate(fila) {
    var idx = HIST_BD.findIndex(function (h) { return h.supabase_id === fila.id; });
    if (idx === -1) { await _rt_onInsert(fila); return; }

    var completo = await db_obtenerProcesoPorCodigo(fila.codigo);
    if (!completo) return;

    var actual = HIST_BD[idx];
    actual.objeto                          = completo.objeto           || '';
    actual.area                            = completo.area_solicitante || '';
    actual.valor                           = completo.valor            || '';
    actual.responsable                     = completo.responsable      || '';
    actual.responsable_asignado            = completo.responsable_asignado           || '';
    actual.responsable_asignado_nombre     = completo.responsable_asignado_nombre    || '';
    actual.responsable_asignado_por        = completo.responsable_asignado_por       || '';
    actual.responsable_asignado_por_nombre = completo.responsable_asignado_por_nombre || '';
    actual.responsable_asignado_fecha      = completo.responsable_asignado_fecha     || '';
    actual.estado                          = completo.estado;

    _rt_refrescarUI();
  }

  function _rt_onDelete(fila) {
    HIST_BD = HIST_BD.filter(function (h) { return h.supabase_id !== fila.id; });
    _rt_refrescarUI();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window._dbListo === 'undefined' || !window._dbListo) return;
    window._dbListo.then(function () {
      if (typeof supabaseClient === 'undefined' || !supabaseClient.channel) return;

      supabaseClient
        .channel('procesos-cambios')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'procesos' },
          function (payload) { _rt_onInsert(payload.new); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'procesos' },
          function (payload) { _rt_onUpdate(payload.new); })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'procesos' },
          function (payload) { _rt_onDelete(payload.old); })
        .subscribe();
    });
  });
})();

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD DINÁMICO — lee exclusivamente de HIST_BD
// ══════════════════════════════════════════════════════════════════════

function _val(id) { var e=document.getElementById(id); return e?parseFloat(e.value.replace(/[^0-9.]/g,'')):0; }

// ── Contar ítems del checklist en un proceso ──
function _countItems(proceso, nums) {
  if (!proceso.checklist || !Array.isArray(proceso.checklist)) return { ok:0, total:nums.length, pendientes:[] };
  var ok=0, pendientes=[];
  nums.forEach(function(n) {
    var item = proceso.checklist.find(function(c){ return c.num===n; });
    if (item && item.ok) ok++;
    else pendientes.push(n);
  });
  return { ok:ok, total:nums.length, pendientes:pendientes };
}

// ══════════════════════════════════════
//  ALERTAS DE PLAZO — vigencia de Estudios Previos
//  Reemplaza las alertas heurísticas anteriores (expedientes incompletos,
//  carga por área, etc.) por alertas de una sola cosa concreta: la fecha
//  hasta la cual es vigente el plazo declarado en el documento de Estudios
//  Previos (ítem 5), extraída automáticamente por
//  _extraerPlazoVigencia() en js/juriskills-engine.js y guardada en
//  procesos.plazo_estudios_previos_hasta (ver js/db.js). Si esa columna no
//  se pudo detectar/llenar para un proceso, simplemente no genera alerta —
//  no hay verificación manual en esta primera versión, así que la fecha
//  siempre debe confirmarse contra el documento real.
// ══════════════════════════════════════
var _PLAZO_ALERTA_DIAS = 15;

function _generarAlertasPlazos() {
  var vencidos=[], porVencer=[];
  if (typeof HIST_BD === 'undefined' || HIST_BD.length===0) return {vencidos:vencidos, porVencer:porVencer};

  var hoy = new Date();
  hoy.setHours(0,0,0,0);

  HIST_BD.forEach(function(p){
    if (!p.plazo_estudios_previos_hasta) return;
    var fechaLimite = new Date(p.plazo_estudios_previos_hasta + 'T00:00:00');
    if (isNaN(fechaLimite.getTime())) return;

    var dias = Math.round((fechaLimite - hoy) / 86400000);
    var fechaTexto = fechaLimite.toLocaleDateString('es-CO', {day:'2-digit', month:'long', year:'numeric'});
    var objetoCorto = (p.objeto || '').slice(0,70) + ((p.objeto||'').length>70 ? '…' : '');

    var item = {
      titulo: p.id + ' — Plazo ' + (dias<0 ? 'vencido' : 'por vencer'),
      detalle: objetoCorto + '. Vigente hasta el ' + fechaTexto + ' (' +
        (dias<0 ? 'venció hace '+Math.abs(dias)+' día'+(Math.abs(dias)!==1?'s':'') : 'vence en '+dias+' día'+(dias!==1?'s':'')) +
        '). Fecha detectada automáticamente del documento de Estudios Previos — verifique contra el documento real.',
      accion: function(){ dash_abrirHistorial(p.tipo); }
    };

    if (dias < 0) vencidos.push({ item:item, dias:dias });
    else if (dias <= _PLAZO_ALERTA_DIAS) porVencer.push({ item:item, dias:dias });
  });

  vencidos.sort(function(a,b){ return a.dias - b.dias; });
  porVencer.sort(function(a,b){ return a.dias - b.dias; });

  return {
    vencidos:  vencidos.map(function(v){ return v.item; }),
    porVencer: porVencer.map(function(v){ return v.item; })
  };
}

// ── Renderizar una tarjeta de alerta ──
function _alertaCard(item, tipo) {
  var estilos = {
    critica:   { bg:'#FEF2F2', brd:'#FECACA', left:'#DC2626', titulo:'#991B1B' },
    moderada:  { bg:'#FFFBEB', brd:'#FDE68A', left:'#D97706', titulo:'#92400E' },
    informativa:{ bg:'#EFF6FF', brd:'#BFDBFE', left:'#2563EB', titulo:'#1e40af' },
  };
  var s = estilos[tipo];
  return '<div style="background:'+s.bg+';border:1px solid '+s.brd+';border-left:4px solid '+s.left+';'+
    'border-radius:10px;padding:11px 13px;cursor:pointer;" '+
    'onclick="dash_abrirHistorial(\'\')" title="Ver en historial">'+
    '<div style="font-size:12px;font-weight:700;color:'+s.titulo+';">'+item.titulo+'</div>'+
    '<div style="font-size:11px;color:#6B7280;margin-top:3px;">'+item.detalle+'</div>'+
    '</div>';
}

// ══════════════════════════════════════
//  ACTUALIZAR TODO EL BLOQUE DINÁMICO
// ══════════════════════════════════════
function _actualizarBloquesDinamicos() {
  if (typeof HIST_BD === 'undefined') return;
  var hist = HIST_BD;
  var total = hist.length;

  // ── ALERTAS JURÍDICAS (plazos de Estudios Previos) ──
  var alertas = _generarAlertasPlazos();
  var grid    = document.getElementById('alertas-grid');
  var badge   = document.getElementById('badge_alertas_total');
  var totalAl = alertas.vencidos.length + alertas.porVencer.length;

  if (grid) {
    if (totalAl===0) {
      grid.innerHTML='<div style="text-align:center;color:#0B7A43;padding:30px;grid-column:1/-1;">'+
        '<div style="margin-bottom:8px;"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>'+
        '<p style="font-size:13px;font-weight:700;">Sin plazos por vencer ni vencidos entre los '+total+' proceso'+(total!==1?'s':'')+' guardados.</p>'+
        '</div>';
    } else {
      var htmlGrid='';
      if (alertas.vencidos.length>0) {
        htmlGrid+='<div><div style="font-size:11.5px;font-weight:800;color:#DC2626;margin-bottom:10px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>VENCIDOS</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+alertas.vencidos.map(function(a){return _alertaCard(a,'critica');}).join('')+'</div></div>';
      }
      if (alertas.porVencer.length>0) {
        htmlGrid+='<div><div style="font-size:11.5px;font-weight:800;color:#D97706;margin-bottom:10px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>PRÓXIMOS A VENCER (≤'+_PLAZO_ALERTA_DIAS+' días)</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+alertas.porVencer.map(function(a){return _alertaCard(a,'moderada');}).join('')+'</div></div>';
      }
      grid.innerHTML=htmlGrid;
    }
  }

  if (badge) {
    if (totalAl===0) {
      badge.textContent='Sin alertas'; badge.style.background='#10B981';
    } else if (alertas.vencidos.length>0) {
      badge.textContent=alertas.vencidos.length+' vencido'+(alertas.vencidos.length>1?'s':'');
      badge.style.background='#DC2626';
    } else {
      badge.textContent=alertas.porVencer.length+' por vencer';
      badge.style.background='#D97706';
    }
    badge.style.color='white';
  }
}

// ── Enganchar a dash_actualizar ──
(function(){
  var _prev = window.dash_actualizar;
  window.dash_actualizar = function(){
    if(typeof _prev==='function') _prev();
    _actualizarBloquesDinamicos();
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(_actualizarBloquesDinamicos, 500);
  });
})();

    // Sync arch_1 → modal label
    document.addEventListener('DOMContentLoaded', function() {
      var a1 = document.getElementById('d3p_arch_1');
      if (a1) a1.addEventListener('change', function() {
        var lbl = document.getElementById('d3p_arch_1_modal');
        if (lbl && this.files[0]) lbl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(this.files[0].name);
      });
      var a2 = document.getElementById('d3p_arch_2');
      if (a2) a2.addEventListener('change', function() {
        var lbl = document.getElementById('d3p_arch_2_modal');
        if (lbl && this.files[0]) lbl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(this.files[0].name);
      });
    });

    function d3p_guardarPAA() {
      var unspsc = document.getElementById('d3p_paa_unspsc').value.trim();
      var detalle = document.getElementById('d3p_paa_detalle').value.trim();
      if (!unspsc) { alert('Por favor ingrese al menos un código UNSPSC.'); return; }
      document.getElementById('d3p_paa_unspsc_lbl').textContent = unspsc;
      document.getElementById('d3p_paa_detalle_lbl').textContent = detalle || '—';
      document.getElementById('d3p_paa_preview').style.display = 'block';
      var arch = document.getElementById('d3p_arch_1');
      if (arch.files && arch.files.length > 0) d3p_mostrarArchivo(arch, 'd3p_nom_1');
      document.getElementById('d3p_modalPAA').style.display = 'none';
    }

    function d3p_guardarCDP() {
      var num    = document.getElementById('d3p_cdp_num').value.trim();
      var fecha  = document.getElementById('d3p_cdp_fecha').value;
      var objeto = document.getElementById('d3p_cdp_objeto').value.trim();
      if (!num || !fecha || !objeto) { alert('Por favor complete: Número de CDP, Fecha y Objeto.'); return; }
      document.getElementById('d3p_cdp_num_lbl').textContent = num;
      document.getElementById('d3p_cdp_fecha_lbl').textContent = fecha;
      document.getElementById('d3p_cdp_objeto_lbl').textContent = objeto.slice(0,70) + (objeto.length > 70 ? '…' : '');
      document.getElementById('d3p_cdp_preview').style.display = 'block';
      var arch = document.getElementById('d3p_arch_2');
      if (arch.files && arch.files.length > 0) d3p_mostrarArchivo(arch, 'd3p_nom_2');
      document.getElementById('d3p_modalCDP').style.display = 'none';
    }

/*══════════════════════════════════════════════════════════════
     SCRIPTS: TABS + CHECKLISTS + JURISKILLS IA + OBSERVACIONES
══════════════════════════════════════════════════════════════ */

// ── Checklists por modalidad ──
const CHECKLIST_DATA = {
  'cd1p': [
    'Estudios Previos y Análisis del Sector','Certificado de Disponibilidad Presupuestal (CDP)',
    'Plan Anual de Adquisiciones (PAA)','Invitación a Ofertar','Propuesta Económica del Contratista',
    'Hoja de Vida del Contratista','Cédula de Ciudadanía / NIT','Antecedentes Disciplinarios (Procuraduría)',
    'Antecedentes Fiscales (Contraloría)','Antecedentes Penales (Policía Nacional)',
    'RUT (DIAN)','Cámara de Comercio (vigente)','Certificado de Experiencia',
    'Formato de Verificación de Requisitos','Contrato / Minuta','Registro Presupuestal (RP)',
    'Pólizas de Garantía aprobadas','Acta de Inicio','Informe de Supervisión',
    'Acta de Liquidación','Certificación SARLAFT'
  ],
  'cd3p': [
    'Estudios Previos y Análisis del Sector','Certificado de Disponibilidad Presupuestal (CDP)',
    'Plan Anual de Adquisiciones (PAA)','Invitación a Ofertar (3 proponentes)',
    'Propuesta Económica — Proponente 1','Propuesta Económica — Proponente 2','Propuesta Económica — Proponente 3',
    'Cuadro Comparativo de Propuestas','Documentos Habilitantes — Proponente 1',
    'Documentos Habilitantes — Proponente 2','Documentos Habilitantes — Proponente 3',
    'Concepto de Evaluación y Selección','Contrato / Minuta con Oferente Seleccionado',
    'Registro Presupuestal (RP)','Pólizas de Garantía aprobadas',
    'Acta de Inicio','Informe de Supervisión','Acta de Liquidación','Certificación SARLAFT'
  ],
  'conv': [
    'Estudios Previos y Análisis del Sector','Certificado de Disponibilidad Presupuestal (CDP)',
    'Plan Anual de Adquisiciones (PAA)','Aviso de Convocatoria / Invitación Pública',
    'Resolución de Apertura del Proceso','Pliego de Condiciones Definitivo',
    'Adendas (si aplica)','Publicación SECOP II (dentro de 3 días)',
    'Propuestas Recibidas','Acta de Cierre del Proceso',
    'Informe de Evaluación Técnica','Informe de Evaluación Jurídica',
    'Informe de Evaluación Económica','Resolución de Adjudicación',
    'Contrato / Minuta','Registro Presupuestal (RP)',
    'Pólizas de Garantía aprobadas','Acta de Inicio',
    'Informes de Supervisión','Acta de Liquidación'
  ],
  'subasta': [
    'Estudios Previos y Análisis del Sector','Certificado de Disponibilidad Presupuestal (CDP)',
    'Plan Anual de Adquisiciones (PAA)','Ficha Técnica del Bien o Servicio (CTU)',
    'Aviso de Convocatoria en SECOP II','Pliego de Condiciones / Reglas de la Subasta',
    'Propuestas Habilitadas (documentos jurídicos y técnicos)',
    'Acta de Habilitación de Proponentes','Configuración del Evento de Subasta en SECOP II',
    'Acta de Cierre de Subasta / Historial de Pujas',
    'Resolución de Adjudicación','Contrato / Minuta',
    'Registro Presupuestal (RP)','Pólizas de Garantía aprobadas',
    'Acta de Inicio','Informes de Supervisión','Acta de Liquidación','Certificación SARLAFT'
  ]
};

// Observaciones almacenadas en memoria
const obsData = { cd1p: [], cd3p: [], conv: [], subasta: [] };

// ── Inicializar checklists al cargar ──
document.addEventListener('DOMContentLoaded', function() {
  Object.keys(CHECKLIST_DATA).forEach(mod => buildChecklist(mod));
});

function buildChecklist(mod) {
  const tbody = document.getElementById(mod + '-tbody');
  if (!tbody) return;
  const items = CHECKLIST_DATA[mod];
  tbody.innerHTML = '';
  items.forEach((doc, i) => {
    const num = i + 1;
    const fileId = mod + '_file_' + num;
    const checkId = mod + '_chk_' + num;
    const nameId = mod + '_fname_' + num;
    tbody.innerHTML += `
      <tr id="${mod}-row-${num}" style="transition:background .3s;">
        <td style="text-align:center;font-weight:700;color:#6B7280;">${num}</td>
        <td style="font-size:13px;">${doc}</td>
        <td style="text-align:center;">
          <input type="checkbox" id="${checkId}" onchange="tabUpdateProgress('${mod}')"
            style="width:18px;height:18px;accent-color:#0B7A43;cursor:pointer;">
        </td>
        <td>
          <button onclick="document.getElementById('${fileId}').click()"
            style="background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;border:none;
            padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Cargar
          </button>
          <input type="file" id="${fileId}" style="display:none;"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onchange="tabFileLoaded(this,'${checkId}','${nameId}','${mod}')">
          <div id="${nameId}" style="margin-top:6px;font-size:11px;color:#6B7280;">Sin archivo</div>
        </td>
      </tr>`;
  });
}

function tabFileLoaded(input, checkId, nameId, mod) {
  if (!input.files || !input.files[0]) return;
  const f = input.files[0];
  const size = f.size < 1048576 ? (f.size/1024).toFixed(1)+' KB' : (f.size/1048576).toFixed(2)+' MB';
  document.getElementById(nameId).innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><strong style="color:#1F2937;">' + f.name + '</strong> <span style="font-size:10px;color:#6B7280;">('+size+')</span>';
  const chk = document.getElementById(checkId);
  if (chk) { chk.checked = true; }
  const rowNum = checkId.split('_chk_')[1];
  const row = document.getElementById(mod + '-row-' + rowNum);
  if (row) { row.style.background = '#F0FDF4'; }
  tabUpdateProgress(mod);
}

function tabUpdateProgress(mod) {
  const items = CHECKLIST_DATA[mod];
  let checked = 0;
  items.forEach((_, i) => {
    const chk = document.getElementById(mod + '_chk_' + (i+1));
    if (chk && chk.checked) checked++;
  });
  const pct = items.length ? Math.round((checked / items.length) * 100) : 0;
  const bar = document.getElementById(mod + '-prog-bar');
  const txt = document.getElementById(mod + '-prog-txt');
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = pct + '%';
}

// ── Cambiar sub-pestaña ──
function switchSubTab(mod, panel) {
  const panels = ['checklist','lexcon','observaciones'];
  panels.forEach(p => {
    const el = document.getElementById(mod + '-panel-' + p);
    const btn = document.getElementById(mod + '-tab-' + p);
    if (el) el.style.display = p === panel ? 'block' : 'none';
    if (btn) {
      const colors = { cd1p: '#0B7A43', cd3p: '#123C7B', conv: '#1D4ED8', subasta: '#7C3AED' };
      const c = colors[mod] || '#0B7A43';
      btn.style.color = p === panel ? c : '#6B7280';
      btn.style.borderBottom = p === panel ? '3px solid ' + c : '3px solid transparent';
      btn.style.fontWeight = p === panel ? '700' : '600';
    }
  });
}

// ── JURISKILLS IA — análisis por modalidad ──
function lexconAnalizar(mod) {
  const resultado = document.getElementById(mod + '-lexcon-resultado');
  if (!resultado) return;

  const items = CHECKLIST_DATA[mod];
  let cargados = 0, faltantes = [];
  items.forEach((doc, i) => {
    const chk = document.getElementById(mod + '_chk_' + (i+1));
    if (chk && chk.checked) cargados++;
    else faltantes.push({ num: i+1, doc });
  });
  const pct = items.length ? Math.round((cargados / items.length) * 100) : 0;

  resultado.innerHTML = '<div style="text-align:center;padding:20px;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p style="color:#6B7280;font-size:14px;margin-top:8px;">Analizando expediente...</p></div>';

  setTimeout(() => {
    const criticos = faltantes.filter(f => f.num <= 5);
    const otros = faltantes.filter(f => f.num > 5);
    const estadoColor = pct >= 80 ? '#166534' : pct >= 50 ? '#92400E' : '#991B1B';
    const estadoBg = pct >= 80 ? '#DCFCE7' : pct >= 50 ? '#FEF3C7' : '#FEE2E2';
    const estadoIcon = pct >= 80
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      : pct >= 50
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

    let html = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
        <div style="background:${estadoBg};color:${estadoColor};border-radius:12px;padding:10px 18px;font-size:16px;font-weight:800;">
          ${estadoIcon} Expediente al ${pct}%
        </div>
        <span style="color:#6B7280;font-size:13px;">${cargados} de ${items.length} ítems verificados</span>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:800;color:#0B7A43;margin-bottom:10px;font-size:15px;display:flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>Análisis JURISKILLS IA — Contratación HSLV</div>
        <p style="color:#374151;font-size:13px;line-height:1.7;">
          ${pct >= 80
            ? 'El expediente contractual presenta un nivel de completitud <strong>ACEPTABLE</strong>. Se recomienda completar los ítems pendientes antes de la firma del contrato.'
            : pct >= 50
            ? 'El expediente está <strong>PARCIALMENTE COMPLETO</strong>. Existen documentos críticos pendientes que deben ser gestionados con urgencia para no incurrir en responsabilidad disciplinaria o fiscal.'
            : 'El expediente presenta <strong>DEFICIENCIAS CRÍTICAS</strong>. No se recomienda avanzar en el proceso contractual hasta completar los documentos mínimos habilitantes conforme al Acuerdo 015/2024 HSLV.'}
        </p>
      </div>`;

    if (criticos.length > 0) {
      html += `<div style="margin-bottom:14px;"><div style="font-weight:800;color:#DC2626;margin-bottom:8px;font-size:13px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Documentos Críticos Faltantes</div>`;
      criticos.forEach(f => {
        html += `<div style="background:#FEF2F2;border:1px solid #FECACA;border-left:4px solid #DC2626;border-radius:10px;padding:10px 13px;margin-bottom:8px;">
          <strong style="color:#991B1B;font-size:13px;">Ítem ${f.num}: ${f.doc}</strong>
          <p style="color:#6B7280;font-size:12px;margin-top:3px;">Documento obligatorio conforme al Manual de Contratación HSLV.</p></div>`;
      });
      html += '</div>';
    }

    if (otros.length > 0) {
      html += `<div style="margin-bottom:14px;"><div style="font-weight:800;color:#D97706;margin-bottom:8px;font-size:13px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Documentos Pendientes</div>`;
      otros.slice(0,5).forEach(f => {
        html += `<div style="background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #D97706;border-radius:10px;padding:10px 13px;margin-bottom:8px;">
          <strong style="color:#92400E;font-size:13px;">Ítem ${f.num}: ${f.doc}</strong>
          <p style="color:#6B7280;font-size:12px;margin-top:3px;">Pendiente de carga y verificación.</p></div>`;
      });
      if (otros.length > 5) html += `<p style="color:#6B7280;font-size:12px;margin-top:4px;">...y ${otros.length - 5} ítems más pendientes.</p>`;
      html += '</div>';
    }

    if (faltantes.length === 0) {
      html += `<div style="background:#DCFCE7;border:1px solid #86EFAC;border-radius:12px;padding:16px;text-align:center;">
        <div style="margin-bottom:6px;"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <strong style="color:#166534;font-size:15px;">¡Expediente Completo!</strong>
        <p style="color:#374151;font-size:13px;margin-top:6px;">Todos los documentos han sido cargados y verificados. El expediente está listo para continuar.</p>
      </div>`;
    }

    html += `<div style="margin-top:14px;color:#9CA3AF;font-size:11px;text-align:right;">JURISKILLS IA · Análisis generado: ${new Date().toLocaleString('es-CO')}</div>`;
    resultado.innerHTML = html;
  }, 1200);
}

// ── Guardar observación ──
function guardarObservacion(mod) {
  const id = document.getElementById(mod + '-obs-id')?.value || '';
  const resp = document.getElementById(mod + '-obs-resp')?.value || '';
  const fecha = document.getElementById(mod + '-obs-fecha')?.value || '';
  const estado = document.getElementById(mod + '-obs-estado')?.value || '';
  const general = document.getElementById(mod + '-obs-general')?.value || '';
  const alertas = document.getElementById(mod + '-obs-alertas')?.value || '';
  const acciones = document.getElementById(mod + '-obs-acciones')?.value || '';

  if (!general.trim()) { alert('Por favor ingrese al menos una observación general.'); return; }

  const entry = { id, resp, fecha, estado, general, alertas, acciones, ts: new Date().toLocaleString('es-CO') };
  obsData[mod].push(entry);

  // Render historial
  const hist = document.getElementById(mod + '-obs-historial');
  const lista = document.getElementById(mod + '-obs-lista');
  if (hist) hist.style.display = 'block';
  if (lista) {
    const colors = { cd1p: '#0B7A43', cd3p: '#123C7B', conv: '#1D4ED8', subasta: '#7C3AED' };
    const c = colors[mod] || '#0B7A43';
    lista.innerHTML = '';
    obsData[mod].slice().reverse().forEach((e, i) => {
      lista.innerHTML += `
        <div style="background:#FAFAFA;border:1px solid #E5E7EB;border-left:4px solid ${c};border-radius:12px;padding:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <strong style="color:${c};font-size:14px;">${e.id || 'Sin N°'} — ${e.estado}</strong>
            <span style="font-size:11px;color:#9CA3AF;">${e.ts}</span>
          </div>
          ${e.resp ? '<p style="font-size:12px;color:#6B7280;margin-bottom:6px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Responsable: '+e.resp+'</p>' : ''}
          ${e.general ? '<p style="font-size:13px;color:#374151;margin-bottom:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>'+e.general+'</p>' : ''}
          ${e.alertas ? '<p style="font-size:12px;color:#D97706;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Alerta: '+e.alertas+'</p>' : ''}
          ${e.acciones ? '<p style="font-size:12px;color:#0B7A43;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Acción: '+e.acciones+'</p>' : ''}
        </div>`;
    });
  }
  alert('✅ Observación guardada correctamente.');
}

// ── Exportar observación (impresión) ──
function exportarObservacion(mod) {
  const modNames = { cd1p: 'Contratación Directa 1 Propuesta', cd3p: 'Contratación Directa 3 Propuestas', conv: 'Convocatoria Pública', subasta: 'Subasta Inversa' };
  const id = document.getElementById(mod + '-obs-id')?.value || '';
  const resp = document.getElementById(mod + '-obs-resp')?.value || '';
  const fecha = document.getElementById(mod + '-obs-fecha')?.value || '';
  const estado = document.getElementById(mod + '-obs-estado')?.value || '';
  const general = document.getElementById(mod + '-obs-general')?.value || '';
  const alertas = document.getElementById(mod + '-obs-alertas')?.value || '';
  const acciones = document.getElementById(mod + '-obs-acciones')?.value || '';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>Observación - ${modNames[mod]}</title>
    <style>body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1F2937;max-width:800px;margin:auto;}
    h1{color:#046A38;border-bottom:3px solid #046A38;padding-bottom:10px;}
    .field{margin-bottom:14px;} .label{font-weight:700;color:#123C7B;font-size:12px;text-transform:uppercase;margin-bottom:4px;}
    .value{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:10px 13px;font-size:14px;}
    .footer{margin-top:40px;border-top:1px solid #E5E7EB;padding-top:14px;color:#9CA3AF;font-size:11px;}</style>
</head>
    <body><h1>Hospital Susana López de Valencia E.S.E.</h1>
    <h2 style="color:#123C7B;">${modNames[mod]} — Registro de Observación</h2>
    <div class="field"><div class="label">N° de Proceso</div><div class="value">${id||'—'}</div></div>
    <div class="field"><div class="label">Responsable</div><div class="value">${resp||'—'}</div></div>
    <div class="field"><div class="label">Fecha</div><div class="value">${fecha||'—'}</div></div>
    <div class="field"><div class="label">Estado</div><div class="value">${estado||'—'}</div></div>
    <div class="field"><div class="label">Observaciones Generales</div><div class="value">${general||'—'}</div></div>
    <div class="field"><div class="label">Alertas Jurídicas</div><div class="value">${alertas||'—'}</div></div>
    <div class="field"><div class="label">Acciones a Realizar</div><div class="value">${acciones||'—'}</div></div>
    <div class="footer">Generado por Aplicativo HSLV · ${new Date().toLocaleString('es-CO')} · JURISKILLS IA</div>
    <script>window.print();<\/script>
    </body></html>`);
}

window.onclick = function(event){
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        if(event.target === modal){
            modal.style.display='none';
            const modalAbierto = [...modals].some(
              m => m.style.display === 'flex'
            );
            if(!modalAbierto){
              document.getElementById('btnApiKeyFlotante').style.display = 'flex';
            }
        }
    });
};

// ── Ocultar el botón flotante "Skills Inteligentes Jurídicos" mientras haya
//    CUALQUIER modal del dashboard abierto (historial, SECOP, el suyo propio,
//    etc.), para que no se superponga y tape contenido del modal. Se vigilan
//    todos los modales con un solo observador en vez de tocar cada función
//    que abre/cierra uno — así cubre también los que se agreguen a futuro. ──
(function () {
    const btnFlotante = document.getElementById('btnApiKeyFlotante');
    if (!btnFlotante) return; // esta página no tiene el botón (solo existe en el dashboard)

    function hayModalAbierto() {
        return Array.prototype.some.call(
            document.querySelectorAll('.modal, #modalApiKey'),
            function (m) { return getComputedStyle(m).display !== 'none'; }
        );
    }

    function actualizarVisibilidadBoton() {
        btnFlotante.style.display = hayModalAbierto() ? 'none' : 'flex';
    }

    const observador = new MutationObserver(actualizarVisibilidadBoton);
    document.querySelectorAll('.modal, #modalApiKey').forEach(function (modal) {
        observador.observe(modal, { attributes: true, attributeFilter: ['style'] });
    });

    actualizarVisibilidadBoton();
})();

let registrosPAA = JSON.parse(localStorage.getItem('registrosPAA')) || [];

function guardarPAA(){

    const fecha = document.getElementById('fechaPAA').value;
    const archivo = document.getElementById('archivoPAA').files[0];
    const unspsc = document.getElementById('unspscPAA').value;

    if(fecha === '' || !archivo || unspsc === ''){
        alert('Debe diligenciar todos los campos y cargar el PDF');
        return;
    }

    const nuevoPAA = {
        id: Date.now(),
        
        fecha,
        archivo: archivo.name,
        unspsc,
        estado:'Almacenado'
    };

    registrosPAA.push(nuevoPAA);

    localStorage.setItem('registrosPAA', JSON.stringify(registrosPAA));

    renderTablaPAA();

    alert('PAA registrado correctamente');

    closeModal('modalPAA');
}

function renderTablaPAA(){

    registrosPAA = JSON.parse(localStorage.getItem('registrosPAA')) || [];

    const tbody = document.getElementById('tablaPAA');

    if(!tbody){
        return;
    }

    tbody.innerHTML='';

    if(registrosPAA.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    No existen registros PAA almacenados
                </td>
            </tr>
        `;

        return;
    }

    registrosPAA.forEach((item,index)=>{

        tbody.innerHTML += `
            <tr>
                <td>${index+1}</td>
                
                <td>${item.fecha}</td>
                <td>${item.archivo}</td>
                <td>${item.unspsc}</td>
                <td><span class="status success">${item.estado}</span></td>
            </tr>
        `;

    });
}

function visualizarPAA(){

    renderTablaPAA();

    const tabla = document.getElementById('tablaPAA');

    if(tabla){
        tabla.scrollIntoView({
            behavior:'smooth'
        });
    }
}

let archivosCDP = JSON.parse(localStorage.getItem('archivosCDP')) || [];

function guardarCDPArchivo(){

    const modal = document.getElementById('modalCDP');

    const numero = modal.querySelector('input[type="text"]').value;
    const fecha = modal.querySelector('input[type="date"]').value;
    const archivo = modal.querySelector('input[type="file"]').files[0];

    if(numero === '' || fecha === '' || !archivo){
        alert('Debe diligenciar todos los campos y cargar el PDF');
        return;
    }

    const nuevoCDP = {
        id: Date.now(),
        
        fecha,
        archivo: archivo.name,
        estado:'Almacenado'
    };

    archivosCDP.push(nuevoCDP);

    localStorage.setItem('archivosCDP', JSON.stringify(archivosCDP));

    renderTablaArchivosCDP();
    renderTablaPAA();

    alert('Certificado CDP cargado correctamente');

    closeModal('modalCDP');
}

function renderTablaArchivosCDP(){

    archivosCDP = JSON.parse(localStorage.getItem('archivosCDP')) || [];

    const tbody = document.getElementById('tablaArchivosCDP');

    if(!tbody){
        return;
    }

    tbody.innerHTML='';

    if(archivosCDP.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;">
                    No existen CDP almacenados
                </td>
            </tr>
        `;

        return;
    }

    archivosCDP.forEach((item,index)=>{

        tbody.innerHTML += `
            <tr>
                <td>${index+1}</td>
                
                <td>${item.fecha}</td>
                <td>${item.archivo}</td>
                <td><span class="status success">${item.estado}</span></td>
            </tr>
        `;

    });
}

function visualizarCDPAlmacenados(){

    renderTablaArchivosCDP();
    renderTablaPAA();

    showSection('solicitudescdp');

    const tabla = document.getElementById('tablaArchivosCDP');

    if(tabla){
        tabla.scrollIntoView({
            behavior:'smooth'
        });
    }
}

let registrosCDP = JSON.parse(localStorage.getItem('solicitudesCDP')) || [];

function guardarCDP(){

    const area = document.querySelector('#modalSolicitudCDP select').value;
    const fecha = document.querySelector('#modalSolicitudCDP input[type="date"]').value;
    const valor = document.querySelector('#modalSolicitudCDP input[type="number"]').value;
    const objeto = document.querySelector('#modalSolicitudCDP input[type="text"]').value;

    if(area === 'Seleccione' || fecha === '' || valor === '' || objeto === ''){
        alert('Debe diligenciar todos los campos obligatorios');
        return;
    }

    const nuevoRegistro = {
        id: Date.now(),
        area,
        fecha,
        valor,
        objeto,
        estado:'Almacenado'
    };

    registrosCDP.push(nuevoRegistro);

    localStorage.setItem('solicitudesCDP', JSON.stringify(registrosCDP));

    renderTablaCDP();

    document.querySelector('#modalSolicitudCDP select').value='Seleccione';
    document.querySelector('#modalSolicitudCDP input[type="date"]').value='';
    document.querySelector('#modalSolicitudCDP input[type="number"]').value='';
    document.querySelector('#modalSolicitudCDP input[type="text"]').value='';
    document.querySelector('#modalSolicitudCDP textarea').value='';

    alert('Solicitud CDP registrada y almacenada correctamente');

    closeModal('modalSolicitudCDP');

    showSection('solicitudescdp');
}

function renderTablaCDP(){

    registrosCDP = JSON.parse(localStorage.getItem('solicitudesCDP')) || [];

    const tbody = document.getElementById('tablaCDPBody');

    if(!tbody){
        return;
    }

    tbody.innerHTML = '';

    if(registrosCDP.length === 0){

        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;">
                    No existen solicitudes CDP almacenadas
                </td>
            </tr>
        `;

        return;
    }

    registrosCDP.forEach((registro,index)=>{

        tbody.innerHTML += `
            <tr>
                <td>${index+1}</td>
                <td>${registro.area}</td>
                <td>${registro.fecha}</td>
                <td>$ ${registro.valor}</td>
                <td>${registro.objeto}</td>
                <td><span class="status success">${registro.estado}</span></td>
            </tr>
        `;

    });
}

function mostrarNombreArchivo(input, elementoId){

    const nombre = input.files.length > 0
        ? 'Archivo cargado: ' + input.files[0].name
        : 'Sin archivo cargado';

    document.getElementById(elementoId).innerText = nombre;
}

// ═══════════════════════════════════════════════════════════
//  BASE DE DATOS EN MEMORIA — PROCESOS CONTRATACIÓN DIRECTA 1P
// ═══════════════════════════════════════════════════════════
const BD_PROCESOS = [];

// ── Verificación de objeto contractual duplicado (CD1P) ───────
// El usuario debe verificar que el objeto no se repita en el año antes
// de que aparezcan los campos de Área, Responsable y el checklist.
var _cd1pObjetoVerificado = false;

// Marcado solo cuando un admin decide forzar el guardado de un objeto que
// el sistema detectó como muy similar a uno ya registrado. Se envía a
// db_guardarProceso() → objeto_duplicado_forzado, pero la validación real
// del rol ocurre en el trigger de Supabase, no aquí.
var _cd1pForzarDuplicado = false;

// ════════════════════════════════════════════════════
//  FORMATO EN VIVO DEL CAMPO "VALOR DEL PROCESO" (mp_valor)
//  El usuario solo escribe dígitos (y opcionalmente una coma para
//  decimales) — el separador de miles (.) y el símbolo $ se agregan solos
//  en cada tecla. Copia de las mismas funciones en js/proceso-detalle.js
//  (esa página no carga script.js, ver comentario ahí).
// ════════════════════════════════════════════════════
function _fmt_formatearValorInput(input) {
    var valorPrevio = input.value;
    var posCursor   = input.selectionStart;

    // Cuántos caracteres significativos (dígitos o coma) había antes del
    // cursor, para reubicarlo en el mismo punto después de reformatear.
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

// Convierte "$ 15.000.000,50" -> "15000000.50" (formato numérico estándar,
// el mismo que ya espera hist_formatMoney() al leer p.valor).
function _fmt_valorARaw(valorFormateado) {
    if (!valorFormateado) return '';
    var limpio = valorFormateado.replace(/\$/g, '').replace(/\s/g, '');
    limpio = limpio.replace(/\./g, '');
    limpio = limpio.replace(',', '.');
    return limpio;
}

// Actualiza el textito "(quince millones de pesos m/cte)" debajo del campo
// "Valor del Proceso", usando numeroALetras() ya existente para scdp-valor.
// El div destino es <input id>-letras (ver mp_valor_letras en las 4 páginas
// de creación de proceso).
function _fmt_actualizarValorLetras(input) {
    var destino = document.getElementById(input.id + '_letras');
    if (!destino) return;
    var raw = parseFloat(_fmt_valorARaw(input.value));
    destino.textContent = (raw > 0) ? numeroALetras(raw) : '';
}

function _cd1pMostrarCamposPostVerificacion() {
    ['fg_area', 'fg_responsable', 'fg_valor', 'cd1p-post-verificacion'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = '';
    });
}

function _cd1pOcultarCamposPostVerificacion() {
    ['fg_area', 'fg_responsable', 'fg_valor', 'cd1p-post-verificacion'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

async function verificarObjetoContractual() {
    var objetoEl    = document.getElementById('mp_objeto');
    var resultadoEl = document.getElementById('mp_verificacion_resultado');
    var objeto      = objetoEl ? objetoEl.value.trim() : '';

    if (!objeto) {
        alert('⚠️ Ingrese el Objeto Contractual antes de verificar.');
        return;
    }

    var btn = document.getElementById('mp_verificar_btn');
    var _btnVerificarIcono = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:6px;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }

    var resultado = await db_verificarObjetoSimilar(objeto);

    if (btn) { btn.disabled = false; btn.innerHTML = _btnVerificarIcono + 'Verificar objeto contractual'; }
    if (!resultadoEl) return;
    // Una nueva verificación siempre debe mostrarse, aunque la anterior
    // haya quedado oculta por _cd1pToggleForzarDuplicado().
    resultadoEl.style.display = '';

    if (resultado.error) {
        resultadoEl.innerHTML =
            '<div style="background:#FEF2F2;border-left:4px solid #DC2626;' +
            'padding:10px 12px;border-radius:8px;color:#DC2626;font-size:13px;">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>No se pudo verificar en este momento. Intente nuevamente.</div>';
        _cd1pObjetoVerificado = false;
        _cd1pForzarDuplicado  = false;
        _cd1pOcultarCamposPostVerificacion();
        return;
    }

    if (resultado.coincidencia) {
        var perfil = await db_perfil();
        var fecha  = new Date(resultado.coincidencia.fecha_creacion)
            .toLocaleDateString('es-CO', {day:'2-digit', month:'2-digit', year:'numeric'});
        var pct    = Math.round((resultado.coincidencia.similitud || 0) * 100);

        var msg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Ya existe un objeto contractual muy similar (' + pct + '% de coincidencia), ' +
                  'registrado el ' + fecha + ' con el código <strong>' + resultado.coincidencia.codigo + '</strong>.';

        _cd1pObjetoVerificado = false;
        _cd1pForzarDuplicado  = false;
        _cd1pOcultarCamposPostVerificacion();

        // Solo un admin puede forzar el guardado pese a la advertencia — la
        // base de datos (trigger trg_bloquear_objeto_duplicado) vuelve a
        // exigir el rol admin antes de aceptarlo, este checkbox es solo la
        // intención del lado del cliente.
        if (perfil && perfil.rol === 'admin') {
            msg += ' Como administrador, puede forzar la creación de todas formas si confirma que aplica.';
            resultadoEl.innerHTML =
                '<div style="background:#FEF2F2;border-left:4px solid #DC2626;' +
                'padding:10px 12px;border-radius:8px;color:#991B1B;font-size:13px;">' + msg +
                '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;' +
                'font-weight:600;cursor:pointer;font-size:12.5px;color:#7F1D1D;">' +
                '<input type="checkbox" id="mp_forzar_duplicado" ' +
                'style="width:auto;flex-shrink:0;" ' +
                'onchange="_cd1pToggleForzarDuplicado(this)"> ' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>Forzar creación de todas formas</label>' +
                '</div>';
        } else {
            msg += ' Por favor comuníquese con un administrador para continuar.';
            resultadoEl.innerHTML =
                '<div style="background:#FEF2F2;border-left:4px solid #DC2626;' +
                'padding:10px 12px;border-radius:8px;color:#991B1B;font-size:13px;">' + msg + '</div>';
        }
        return;
    }

    resultadoEl.innerHTML =
        '<div style="background:#ECFDF5;border-left:4px solid #0B7A43;' +
        'padding:10px 12px;border-radius:8px;color:#0B7A43;font-size:13px;">' +
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>No se encontraron objetos similares este año. Puede continuar.</div>';

    _cd1pObjetoVerificado = true;
    _cd1pForzarDuplicado  = false;
    _cd1pMostrarCamposPostVerificacion();
}

// Checkbox de override para admin dentro del aviso de duplicado — al
// marcarlo, habilita Área/Responsable/checklist igual que una verificación
// exitosa y oculta el aviso (con el propio checkbox) para que no quede
// estorbando junto a los campos revelados. guardarProceso() /
// guardarProcesoHistorial() envían forzarDuplicado=true para que el
// trigger de Supabase lo autorice.
function _cd1pToggleForzarDuplicado(checkboxEl) {
    _cd1pForzarDuplicado  = !!(checkboxEl && checkboxEl.checked);
    _cd1pObjetoVerificado = _cd1pForzarDuplicado;
    var resultadoEl = document.getElementById('mp_verificacion_resultado');
    if (_cd1pForzarDuplicado) {
        _cd1pMostrarCamposPostVerificacion();
        if (resultadoEl) resultadoEl.style.display = 'none';
    } else {
        if (resultadoEl) resultadoEl.style.display = '';
        _cd1pOcultarCamposPostVerificacion();
    }
}

// Si el usuario modifica el objeto después de verificarlo, se oculta todo
// de nuevo y se exige re-verificar — evita verificar un texto y luego
// cambiarlo antes de guardar.
document.addEventListener('DOMContentLoaded', function() {
    var objetoEl = document.getElementById('mp_objeto');
    if (!objetoEl) return;
    objetoEl.addEventListener('input', function() {
        if (!_cd1pObjetoVerificado) return;
        _cd1pObjetoVerificado = false;
        _cd1pForzarDuplicado  = false;
        _cd1pOcultarCamposPostVerificacion();
        var resultadoEl = document.getElementById('mp_verificacion_resultado');
        if (resultadoEl) {
            resultadoEl.style.display = '';
            resultadoEl.innerHTML =
                '<div style="font-size:12px;color:#92400E;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Modificó el objeto — ' +
                'verifique nuevamente antes de continuar.</div>';
        }
    });
});

async function guardarProceso() {

    // ── Validaciones básicas ──────────────────────────
    var objeto = (document.getElementById('mp_objeto') || {}).value || '';
    var area   = (document.getElementById('mp_area')   || {}).value || '';

    if (!objeto.trim()) {
        alert('⚠️ Debe ingresar el Objeto Contractual antes de guardar.');
        return;
    }
    if (document.getElementById('mp_verificar_btn') && !_cd1pObjetoVerificado) {
        alert('⚠️ Debe verificar el Objeto Contractual antes de guardar el proceso.');
        return;
    }
    if (!area.trim()) {
        alert('⚠️ Debe ingresar el Área Solicitante antes de guardar.');
        return;
    }

    // ── Verificar perfil antes de continuar ───────────
    var perfil = await db_perfil();
    if (!perfil) return;

    if (perfil.area !== 'biomedica' && perfil.rol !== 'admin') {
        alert('⚠️ Solo el área Biomédica puede crear procesos.');
        return;
    }

    // ── Deshabilitar botón mientras guarda ────────────
    var btnGuardar = document.querySelector(
        'button[onclick="guardarProceso()"], ' +
        'button[onclick="guardarProceso()"]'
    );
    if (btnGuardar) {
        btnGuardar.disabled    = true;
        btnGuardar.textContent = 'Guardando...';
    }

    // ── Recopilar datos del formulario ─────────────────
    var responsable = (document.getElementById('mp_responsable') || {}).value || '';
    var valor       = _fmt_valorARaw((document.getElementById('mp_valor') || {}).value || '');

    // ── Ítems que Biomédica NO puede ver ni subir ─────
    // (única fuente de verdad: ITEMS_RESTRINGIDOS_GLOBAL en js/db.js)
    var ITEMS_RESTRINGIDOS = ITEMS_RESTRINGIDOS_GLOBAL;

    // Labels de los 23 ítems (única fuente de verdad: CHECKLIST_LABELS_POR_TIPO.CD1P,
    // reutilizada también por db_inicializar en js/db.js para reconstruir el
    // avance documental al recargar procesos ya guardados)
    var LABELS = CHECKLIST_LABELS_POR_TIPO.CD1P;

    // ── Recopilar checklist con archivos ──────────────
    var checklist = [];

    LABELS.forEach(function(label, i) {
        var num = i + 1;

        // Obtener checkbox según el ítem
        var cbIds = { 13:'check_13', 15:'check_15', 20:'check_20', 21:'check_21' };
        var cbId  = cbIds[num] || null;
        var cb    = cbId
            ? document.getElementById(cbId)
            : (function(){
                var todos = document.querySelectorAll(
                    '#modalProceso input[type="checkbox"], ' +
                    '.content input[type="checkbox"]'
                );
                return todos[i] || null;
              })();
        var ok = cb ? cb.checked : false;

        // Obtener archivo(s) del ítem — se guardan TODAS las versiones
        // elegidas antes de guardar para CADA recuadro del ítem (el simple
        // "archivo_N", o los sub-recuadros del ítem 9/15/20/21), no solo la
        // que quedó vigente en el input nativo (ver _histU_todasLasVersiones
        // — un input de archivo solo retiene la última selección; sin esto,
        // reemplazar un archivo antes de guardar perdía en silencio la
        // versión anterior y su análisis JURISKILLS).
        var versionesItem     = _histU_todasLasVersiones('', num);
        var archivos          = versionesItem.map(function(v) { return v.archivo; });
        var versionesArchivos = versionesItem.map(function(v) { return v.version; });
        var activosArchivos   = versionesItem.map(function(v) { return v.activo; });

        var comentEl  = document.getElementById('coment_' + num);
        var comentario = comentEl ? comentEl.value.trim() : '';

        // Análisis JURISKILLS ya hecho (botón "Analizar") para cada archivo
        // de este ítem, en el mismo orden que `archivos` — se guarda como
        // historial en analisis_juriskills junto con el documento (ver
        // db_guardarProceso en js/db.js). null si ese archivo no se analizó.
        var analisisArchivos = archivos.map(function(a) {
            var entry = (typeof estadoDocumentos !== 'undefined') ? estadoDocumentos[num + '__' + a.name] : null;
            return (entry && entry.analisis) ? entry.analisis : null;
        });

        // `archivo` (singular) solo se usa como resumen informativo (ej. la
        // fila local de HIST_BD en db_guardarProceso, ver js/db.js) — debe
        // ser un archivo VIGENTE (activo), no necesariamente el primero que
        // se registró en _histU_datos.
        var archivoVigente = (versionesItem.filter(function(v) { return v.activo; })[0] || {}).archivo || null;

        checklist.push({
            num:              num,
            label:            label,
            ok:               ok,
            versionesArchivos: versionesArchivos,
            activosArchivos:   activosArchivos,
            archivo:          archivoVigente,
            archivos:         archivos,
            analisisArchivos: analisisArchivos,
            esRestringido:    ITEMS_RESTRINGIDOS.indexOf(num) !== -1,
            comentario:       comentario
        });
    });

    // ── Llamar a db.js ────────────────────────────────
    var resultado = await db_guardarProceso({
        tipo:            'CD1P',
        objeto:          objeto.trim(),
        area:            area.trim(),
        valor:           valor.trim(),
        responsable:     responsable.trim(),
        checklist:       checklist,
        forzarDuplicado: _cd1pForzarDuplicado,
        plazoVigencia:   _plazoVigenciaParaGuardar()
    });

    // ── Restaurar botón ───────────────────────────────
    if (btnGuardar) {
        btnGuardar.disabled    = false;
        btnGuardar.innerHTML   = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar Proceso';
    }

    if (!resultado) return;

    // Proceso guardado con éxito: ya no hay nada que se pierda al cerrar.
    _procesoFormSucio = false;

    // ── Limpiar formulario ────────────────────────────
    limpiarFormularioProceso();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // ── Actualizar dashboard ──────────────────────────
    if (typeof dash_actualizar === 'function') {
        setTimeout(dash_actualizar, 300);
    }

    // ── Toast de éxito ────────────────────────────────
    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Proceso <strong>' + resultado.codigo +
                      '</strong> guardado correctamente';
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 4000);
}



function validarLogin() {
    window.location.href = '/login';
}

function limpiarFormularioProceso() {
    // Campos texto
    const obj = document.getElementById('mp_objeto');
    const mod = document.getElementById('mp_modalidad');
    const are = document.getElementById('mp_area');
    if (obj) obj.value = '';
    if (mod) mod.selectedIndex = 0;
    if (are) are.value = '';

    // Re-exigir verificación del objeto contractual para el próximo proceso
    if (document.getElementById('mp_verificar_btn')) {
        _cd1pObjetoVerificado = false;
        _cd1pForzarDuplicado  = false;
        _cd1pOcultarCamposPostVerificacion();
        var resultadoEl = document.getElementById('mp_verificacion_resultado');
        if (resultadoEl) {
            resultadoEl.style.display = '';
            resultadoEl.innerHTML = '';
        }
    }

    // Checkboxes
    document.querySelectorAll('#modalProceso input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.indeterminate = false;
    });

    // Inputs file y etiquetas de nombre
    for (let i = 1; i <= 23; i++) {
        const inp = document.getElementById('archivo_' + i);
        if (inp) inp.value = '';
        const nom = document.getElementById('nombreArchivo_' + i);
        if (nom) nom.innerHTML = 'Sin archivo cargado';
    }
    // Sub-archivos (15a, 15b, 15c, 15d, 20a, 20b, 20c, 21a, 21b)
    ['15a','15b','15c','15d','20a','20b','20c','21a','21b'].forEach(s => {
        const inp = document.getElementById('archivo_' + s);
        if (inp) inp.value = '';
        const nom = document.getElementById('nombreArchivo_' + s);
        if (nom) nom.innerHTML = 'Sin archivo cargado';
    });

    // Limpiar previews CDP y PAA y SCDP
    const cdpPrev = document.getElementById('cdp-preview');
    if (cdpPrev) { cdpPrev.style.display = 'none'; }
    const paaPrev = document.getElementById('paa-unspsc-preview');
    if (paaPrev) { paaPrev.style.display = 'none'; }
    const scdpPrev = document.getElementById('scdp-preview');
    if (scdpPrev) { scdpPrev.style.display = 'none'; }

    // Limpiar labels de los previews
    ['paa-unspsc-label','paa-detalle-label'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.textContent = '';
    });
    ['scdp-rubro-label','scdp-numrubro-label','scdp-valor-label','scdp-letras-label','scdp-fecha-label','scdp-solicitud-label'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.textContent = '';
    });
    ['cdp-num-label','cdp-fecha-label','cdp-objeto-label'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.textContent = '';
    });

    // Limpiar inputs de los mini-modales
    var paaInp = document.getElementById('paa-unspsc-input'); if(paaInp) paaInp.value = '';
    var paaDetInp = document.getElementById('paa-detalle-input'); if(paaDetInp) paaDetInp.value = '';
    ['scdp-rubro','scdp-numrubro','scdp-valor-num','scdp-valor-letras','scdp-fecha'].forEach(function(id){
        var el = document.getElementById(id); if(el) el.value = '';
    });
    var cdpNumInp = document.getElementById('cdp-num'); if(cdpNumInp) cdpNumInp.value = '';
    var cdpFechaInp = document.getElementById('cdp-fecha'); if(cdpFechaInp) cdpFechaInp.value = '';
    var cdpObjInp = document.getElementById('cdp-objeto'); if(cdpObjInp) cdpObjInp.value = '';

    // Borrar localStorage para que no se restauren al reabrir
    ['paa_unspsc','paa_detalle',
     'scdp_rubro','scdp_numrubro','scdp_valor','scdp_letras','scdp_fecha','scdp_solicitud_nombre',
     'cdp_num','cdp_fecha','cdp_objeto'
    ].forEach(function(k){ try { localStorage.removeItem(k); } catch(e){} });

    // Limpiar barra de avance documental
    var fill  = document.getElementById('cd1p-avance-fill');
    var pctEl = document.getElementById('cd1p-avance-pct');
    var txt   = document.getElementById('cd1p-avance-texto');
    if (fill)  { fill.style.width = '0%'; fill.style.background = 'linear-gradient(90deg,#DC2626,#D97706)'; }
    if (pctEl) pctEl.textContent = '0%';
    if (txt)   txt.textContent = '0 de 23 documentos verificados';

    // Limpiar progreso ítems 15, 20 y 21
    ['15','20','21'].forEach(n => {
        const txt = document.getElementById('progreso_' + n + '_txt');
        const bar = document.getElementById('progreso_' + n + '_bar');
        if (txt) txt.textContent = '0 / ' + (n === '20' ? '3' : n === '15' ? '4' : '2');
        if (bar) bar.style.width = '0%';
    });

    // Limpiar historial de versiones en memoria (ítems 4,5,9,23)
    [4,5,9,23].forEach(num => {
        if (typeof historialDocs !== 'undefined' && historialDocs[num]) {
            historialDocs[num] = [];
            renderizarHistorial(num);
            const badge = document.getElementById('badge_hist_' + num);
            if (badge) badge.textContent = '0';
        }
    });

    // Limpiar panel JURISKILLS IA (contador global + la celda de análisis de cada fila)
    if (typeof estadoDocumentos !== 'undefined') {
        Object.keys(estadoDocumentos).forEach(k => delete estadoDocumentos[k]);
    }
    const cntDocs = document.getElementById('iaContadorDocs');
    if (cntDocs) cntDocs.textContent = '0 documentos';
    const badge2 = document.getElementById('iaEstadoBadge');
    if (badge2) badge2.style.display = 'none';
    const resG = document.getElementById('iaResumenGlobal');
    if (resG) resG.textContent = '';
    document.querySelectorAll('[id^="ia-item-"]').forEach(function(celda) {
        celda.innerHTML = '<span style="color:#9CA3AF;font-style:italic;font-size:12px;">Sin analizar aún.</span>';
    });

    // Radio libreta militar
    const radios = document.querySelectorAll('input[name="aplica_13"]');
    radios.forEach(r => r.checked = false);
    const carga13 = document.getElementById('carga_13_wrap');
    if (carga13) carga13.style.display = 'none';
    const noapl13 = document.getElementById('noaplica_13_banner');
    if (noapl13) noapl13.style.display = 'none';
    const badge13 = document.getElementById('badge_aplica_13');
    if (badge13) badge13.style.display = 'none';
    const justif13w = document.getElementById('justif_13_wrap');
    if (justif13w) justif13w.style.display = 'none';

    // Limpiar contexto global del expediente (concordancia entre documentos)
    if (typeof EXPEDIENTE_CONTEXTO !== 'undefined') {
        ['objeto','valor','contratista','nit','cdp','fecha'].forEach(k => {
            EXPEDIENTE_CONTEXTO[k] = [];
        });
    }
}

function formatearTamanoProc(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ── Abrir modal historial de procesos ──
function abrirHistorialProcesos() {
    renderizarBDProcesos();
    document.getElementById('modalHistorialProcesos').style.display = 'flex';
}

function cerrarHistorialProcesos() {
    document.getElementById('modalHistorialProcesos').style.display = 'none';
}

function renderizarBDProcesos() {
    const tbody     = document.getElementById('bd_tbody');
    const contador  = document.getElementById('bd_contador');
    const filtro    = (document.getElementById('bd_filtro') || {}).value || '';
    if (!tbody) return;

    const lista = BD_PROCESOS.filter(p =>
        !filtro || p.objeto.toLowerCase().includes(filtro.toLowerCase()) ||
        p.area.toLowerCase().includes(filtro.toLowerCase()) ||
        p.id.toLowerCase().includes(filtro.toLowerCase())
    );

    if (contador) contador.textContent = lista.length + ' proceso' + (lista.length !== 1 ? 's' : '');

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#9ca3af;">
            <div style="margin-bottom:8px;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div>
            <p>${BD_PROCESOS.length === 0 ? 'Aún no se han guardado procesos.' : 'Sin resultados para la búsqueda.'}</p>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const pct     = p.docsTotal > 0 ? Math.min(100, Math.round((p.checkOk / 23) * 100)) : 0;
        const pctCol  = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const estadoBg = pct >= 80 ? '#dcfce7;color:#166534' : pct >= 50 ? '#fef3c7;color:#92400e' : '#fee2e2;color:#991b1b';
        const iconCheck = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        const iconWarn  = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        const iconAlert = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        const estadoLbl = pct >= 80 ? iconCheck + 'Completo' : pct >= 50 ? iconWarn + 'Parcial' : iconAlert + 'Incompleto';

        return `<tr style="transition:background .15s;" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background=''">
          <td style="font-weight:700;color:#123C7B;white-space:nowrap;">${p.id}</td>
          <td style="max-width:220px;">
            <div style="font-weight:600;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;" title="${p.objeto}">${p.objeto}</div>
            <div style="font-size:10.5px;color:#6b7280;margin-top:2px;">${p.modalidad}</div>
          </td>
          <td style="white-space:nowrap;font-size:13px;">${p.area}</td>
          <td style="white-space:nowrap;font-size:12px;">
            ${p.responsable ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;color:#123C7B;border:1px solid #BFDBFE;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' + p.responsable + '</span>' : '<span style="color:#9CA3AF;font-style:italic;font-size:11px;">Sin asignar</span>'}
          </td>
          <td style="white-space:nowrap;font-size:12px;color:#6b7280;">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${p.fecha}<br><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${p.hora}
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;min-width:60px;background:#e5e7eb;border-radius:6px;height:7px;overflow:hidden;">
                <div style="width:${pct}%;height:7px;background:${pctCol};border-radius:6px;transition:width .4s;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${pctCol};white-space:nowrap;">${p.checkOk}/23</span>
            </div>
          </td>
          <td>
            <span style="background:${estadoBg};border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700;white-space:nowrap;">
              ${estadoLbl}
            </span>
          </td>
          <td>
            <button onclick="verDetalleProceso('${p.id}')"
              style="background:#EFF6FF;color:#123C7B;border:1px solid #BFDBFE;
                     border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;
                     cursor:pointer;white-space:nowrap;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Ver
            </button>
            <button onclick="eliminarProceso('${p.id}')"
              style="background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;
                     border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;
                     cursor:pointer;margin-left:4px;">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        </tr>`;
    }).join('');
}

function verDetalleProceso(id) {
    const p = BD_PROCESOS.find(x => x.id === id);
    if (!p) return;

    const docsHtml = p.documentos.length > 0
        ? p.documentos.map(d => `<li style="margin-bottom:3px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Ítem ${d.item}: <strong>${d.nombre}</strong> (${d.tamano})</li>`).join('')
        : '<li style="color:#9ca3af;">Sin documentos cargados</li>';

    const pct    = Math.min(100, Math.round((p.checkOk / 23) * 100));
    const pctCol = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

    const detalle = document.getElementById('bd_detalle_contenido');
    if (!detalle) return;
    detalle.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px;">
        <div style="background:#EFF6FF;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px;">ID PROCESO</div>
          <div style="font-size:16px;font-weight:800;color:#123C7B;">${p.id}</div>
        </div>
        <div style="background:#F0FDF4;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px;">MODALIDAD</div>
          <div style="font-size:14px;font-weight:700;color:#0B7A43;">${p.modalidad}</div>
        </div>
        <div style="background:#FFFBEB;border-radius:12px;padding:14px;">
          <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px;">FECHA REGISTRO</div>
          <div style="font-size:13px;font-weight:700;color:#92400e;">${p.fecha} ${p.hora}</div>
        </div>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:6px;">OBJETO CONTRACTUAL</div>
        <p style="margin:0;color:#1f2937;font-size:13px;line-height:1.6;">${p.objeto}</p>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px;">ÁREA SOLICITANTE</div>
        <p style="margin:0;color:#1f2937;font-size:13px;">${p.area}</p>
      </div>
      <div style="background:#EFF6FF;border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid #BFDBFE;">
        <div style="font-size:11px;font-weight:700;color:#123C7B;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>RESPONSABLE DEL PROCESO</div>
        <p style="margin:0;color:#123C7B;font-size:14px;font-weight:700;">${p.responsable || '<span style="color:#9CA3AF;font-style:italic;font-weight:400;">Sin asignar</span>'}</p>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:14px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:8px;">CUMPLIMIENTO CHECKLIST</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;background:#e5e7eb;border-radius:10px;height:10px;overflow:hidden;">
            <div style="width:${pct}%;height:10px;background:${pctCol};border-radius:10px;"></div>
          </div>
          <span style="font-weight:800;color:${pctCol};font-size:15px;">${pct}%</span>
          <span style="font-size:12px;color:#6b7280;">(${p.checkOk} de 23 ítems marcados)</span>
        </div>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:14px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;margin-bottom:8px;">DOCUMENTOS CARGADOS (${p.documentos.length})</div>
        <ul style="margin:0;padding-left:16px;">${docsHtml}</ul>
      </div>`;
    document.getElementById('bd_detalle_panel').style.display = 'block';
}

function eliminarProceso(id) {
    if (!confirm('¿Confirma eliminar el proceso ' + id + ' del historial?')) return;
    const idx = BD_PROCESOS.findIndex(x => x.id === id);
    if (idx !== -1) BD_PROCESOS.splice(idx, 1);
    renderizarBDProcesos();
    const detalle = document.getElementById('bd_detalle_panel');
    if (detalle) detalle.style.display = 'none';
}

// Animación toast
const _toastStyle = document.createElement('style');
_toastStyle.textContent = '@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(_toastStyle);

function registrarSupervision(){
    alert('Informe de supervisión registrado correctamente');
}

function publicarSecop(){
    alert('Proceso publicado en SECOP II correctamente');
}

function abrirSolicitudesCDP(){

    renderTablaCDP();

    showSection('solicitudescdp');

    const seccion = document.getElementById('solicitudescdp');

    if(seccion){
        seccion.scrollIntoView({
            behavior:'smooth'
        });
    }
}

function showSection(sectionId){
    const sections = document.querySelectorAll('.section-content');

    sections.forEach(section => {
        section.style.display='none';
    });

    document.getElementById(sectionId).style.display='block';
}

// Sincronizar nombre de archivo entre modal y celda
var _arch1 = document.getElementById('archivo_1');
if (_arch1) {
    _arch1.addEventListener('change', function() {
        const nombre = this.files[0] ? this.files[0].name : '';
        const lbl = document.getElementById('nombreArchivo_1_modal');
        if (lbl) lbl.innerHTML = nombre ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(nombre) : '';
    });
}

// Conversión número a letras (pesos colombianos)
function numeroALetras(num) {
    const unidades = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
        'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
    const decenas = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
    const centenas = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
        'seiscientos','setecientos','ochocientos','novecientos'];

    function convertirGrupo(n) {
        if (n === 0) return '';
        if (n === 100) return 'cien';
        let res = '';
        if (n >= 100) { res += centenas[Math.floor(n/100)] + ' '; n %= 100; }
        if (n >= 20) { res += decenas[Math.floor(n/10)]; if (n%10) res += ' y ' + unidades[n%10]; }
        else if (n > 0) res += unidades[n];
        return res.trim();
    }

    // Recursivo por grupos de 3 dígitos (unidades → miles → millones → mil
    // millones), para soportar valores grandes: convertirGrupo() por sí solo
    // solo cubre 0-999, así que "9.999 millones" necesita volver a pasar por
    // acá para resolver el "nueve mil" antes de la palabra "millones".
    // Soporta hasta 999.999.999.999 (999 mil millones); no maneja "billón".
    function convertirNumero(n) {
        n = Math.floor(n);
        if (n === 0) return '';
        if (n < 1000) return convertirGrupo(n);
        if (n < 1000000) {
            const miles = Math.floor(n / 1000), resto = n % 1000;
            const parteMiles = (miles === 1) ? 'mil' : convertirNumero(miles) + ' mil';
            return resto > 0 ? parteMiles + ' ' + convertirGrupo(resto) : parteMiles;
        }
        if (n < 1000000000) {
            const millones = Math.floor(n / 1000000), resto = n % 1000000;
            const parteMillones = (millones === 1) ? 'un millón' : convertirNumero(millones) + ' millones';
            return resto > 0 ? parteMillones + ' ' + convertirNumero(resto) : parteMillones;
        }
        const milMillones = Math.floor(n / 1000000000), resto = n % 1000000000;
        const parteMilMillones = (milMillones === 1) ? 'mil millones' : convertirNumero(milMillones) + ' mil millones';
        return resto > 0 ? parteMilMillones + ' ' + convertirNumero(resto) : parteMilMillones;
    }

    num = Math.round(num);
    if (num === 0) return 'cero pesos';
    return convertirNumero(num).trim() + ' pesos';
}

function scdpAutoLetras() {
    const val = parseFloat(document.getElementById('scdp-valor-num').value);
    if (!isNaN(val) && val > 0) {
        document.getElementById('scdp-valor-letras').value = numeroALetras(val);
    }
}

function d3p_mostrarArchivo(input, labelId, miniLabelId) {
  if (!input.files || !input.files[0]) return;
  var nombre = input.files[0].name;
  var el = document.getElementById(labelId);
  if (el) el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><strong>' + escaparHTML(nombre) + '</strong>';
  if (miniLabelId) {
    var ml = document.getElementById(miniLabelId);
    if (ml) ml.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(nombre);
  }
}

// Sync archivo inputs con labels del mini-modal
document.addEventListener('DOMContentLoaded', function() {
  var a1 = document.getElementById('d3p_arch_1');
  if (a1) a1.addEventListener('change', function() {
    var lbl = document.getElementById('d3p_arch_1_lbl');
    if (lbl && this.files[0]) lbl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(this.files[0].name);
  });
  var a2 = document.getElementById('d3p_arch_2');
  if (a2) a2.addEventListener('change', function() {
    var lbl = document.getElementById('d3p_arch_2_lbl');
    if (lbl && this.files[0]) lbl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + escaparHTML(this.files[0].name);
  });

  // ===== FIX FORZADO: restaurar display correcto en tabla del modal 3P =====
  function fixTabla3P() {
    var modal = document.getElementById('modalDirecta3P');
    if (!modal) return;
    var tabla = modal.querySelector('table');
    if (tabla) {
      tabla.style.setProperty('display', 'table', 'important');
      tabla.style.setProperty('width', '100%', 'important');
      tabla.style.setProperty('border-collapse', 'collapse', 'important');
    }
    var thead = modal.querySelector('thead');
    if (thead) thead.style.setProperty('display', 'table-header-group', 'important');
    var tbody = modal.querySelector('tbody');
    if (tbody) tbody.style.setProperty('display', 'table-row-group', 'important');
    modal.querySelectorAll('tr').forEach(function(tr) {
      tr.style.setProperty('display', 'table-row', 'important');
    });
    modal.querySelectorAll('th, td').forEach(function(cell) {
      cell.style.setProperty('display', 'table-cell', 'important');
      cell.style.setProperty('padding', '13px 14px', 'important');
      cell.style.setProperty('border-bottom', '1px solid #E5E7EB', 'important');
      cell.style.setProperty('vertical-align', 'top', 'important');
    });
  }

  // Ejecutar al cargar y cada vez que se abra el modal
  fixTabla3P();
  var btnAbrir = document.querySelector('[onclick*="modalDirecta3P"]');
  if (btnAbrir) btnAbrir.addEventListener('click', function() {
    setTimeout(fixTabla3P, 50);
  });
});

function supActualizarBarra(val) {
  var v = Math.min(100, Math.max(0, parseInt(val) || 0));
  document.getElementById('sup_barra').style.width = v + '%';
  document.getElementById('sup_pct_label').textContent = v + '%';
  // Color según avance
  var color = v >= 80 ? 'linear-gradient(90deg,#0B7A43,#166534)'
            : v >= 50 ? 'linear-gradient(90deg,#0B7A43,#123C7B)'
            : 'linear-gradient(90deg,#DC2626,#EA580C)';
  document.getElementById('sup_barra').style.background = color;
}

function supLimpiar() {
  ['sup_nombre','sup_area','sup_contrato','sup_hallazgos'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var av = document.getElementById('sup_avance'); if (av) av.value = '';
  supActualizarBarra(0);
  document.getElementById('sup_preview').style.display = 'none';
}

// Mostrar preview del supervisor al completar campos
document.addEventListener('DOMContentLoaded', function() {
  function actualizarPreview() {
    var nombre = (document.getElementById('sup_nombre') || {}).value || '';
    var area   = (document.getElementById('sup_area') || {}).value || '';
    var preview = document.getElementById('sup_preview');
    if (!preview) return;
    if (nombre || area) {
      preview.style.display = 'flex';
      document.getElementById('sup_preview_nombre').textContent = nombre || '(sin nombre)';
      document.getElementById('sup_preview_area').innerHTML = area ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/></svg>' + escaparHTML(area) : '';
    } else {
      preview.style.display = 'none';
    }
  }
  var fn = document.getElementById('sup_nombre');
  var fa = document.getElementById('sup_area');
  if (fn) fn.addEventListener('input', actualizarPreview);
  if (fa) fa.addEventListener('input', actualizarPreview);
});

// ═══════════════════════════════════════════════════════════════
// HISTORIAL DE PROCESOS — Base de datos global y funciones
// ═══════════════════════════════════════════════════════════════
var HIST_BD = []; // Array global de todos los procesos guardados

var HIST_TIPOS = {
  'CD1P': { label: 'Directa 1 Propuesta',    badge: 'hist-badge-cd1p', prefix: 'CD1P' },
  'D3P':  { label: 'Directa 3 Invitaciones', badge: 'hist-badge-d3p',  prefix: 'D3P'  },
  'CONV': { label: 'Convocatoria Pública',    badge: 'hist-badge-conv', prefix: 'CONV' },
  'SUB':  { label: 'Subasta Inversa',         badge: 'hist-badge-sub',  prefix: 'SUB'  }
};

function hist_genId(tipo) {
  var count = HIST_BD.filter(function(p){ return p.tipo === tipo; }).length + 1;
  return HIST_TIPOS[tipo].prefix + '-' + String(count).padStart(4,'0') + '-' + new Date().getFullYear();
}

function hist_formatMoney(v) {
  if (!v || isNaN(v)) return '—';
  return '$ ' + Number(v).toLocaleString('es-CO');
}

function hist_checklistCount(tipo) {
  var checks = 0, total = 0;
  if (tipo === 'CD1P') {
    var cbs = document.querySelectorAll('#modalProceso input[type="checkbox"]');
    total = cbs.length;
    cbs.forEach(function(c){ if(c.checked) checks++; });
  } else if (tipo === 'D3P') {
    var cbs = document.querySelectorAll('#modalDirecta3P input[type="checkbox"]');
    total = cbs.length;
    cbs.forEach(function(c){ if(c.checked) checks++; });
  } else if (tipo === 'CONV') {
    var cbs = document.querySelectorAll('#modalConvocatoria input[type="checkbox"]');
    total = cbs.length;
    cbs.forEach(function(c){ if(c.checked) checks++; });
  } else if (tipo === 'SUB') {
    var cbs = document.querySelectorAll('#modalSubasta input[type="checkbox"]');
    total = cbs.length;
    cbs.forEach(function(c){ if(c.checked) checks++; });
  }
  return { checks: checks, total: total };
}

// ── Números de ítem reales por tipo de proceso, cuando NO son contiguos ──
// D3P reutiliza un subconjunto de los 7 ítems de CD1P con sus mismos números
// (1,2,3,5,6,8,9 — sin 4,7,10..23), para que el motor de análisis JURISKILLS
// (SKILLS_JURIDICOS, ITEMS_CHECKLIST, _MODO_ANALISIS_CD1P, todos indexados
// por número real de ítem) le aplique los criterios correctos a cada
// documento. CONV/SUB no están aquí porque sus 15 ítems sí son contiguos
// (1..15) — ver ITEMS_POR_TIPO_NO_CONTIGUOS.
var ITEMS_POR_TIPO_NO_CONTIGUOS = {
    D3P: [1, 2, 3, 5, 6, 8, 9]
};

// ── Etiquetas reales de los checklists, por tipo de proceso ──
// Misma lista que CHECKLISTS_POR_TIPO en js/proceso-detalle.js (esa página
// no carga script.js, por eso mantiene su propia copia). D3P tiene su propio
// checklist reducido de 7 ítems (independiente de los 23 de CD1P); Convocatoria
// y Subasta tienen 15 propios. El orden de las etiquetas debe coincidir con
// el de ITEMS_POR_TIPO_NO_CONTIGUOS.D3P (misma posición → mismo ítem).
var CHECKLIST_LABELS_POR_TIPO = {
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
    D3P: [
        'CERTIFICADO PAA',
        'SOLICITUD DE CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',
        'ESTUDIOS PREVIOS',
        'MATRIZ DE RIESGO',
        'PROPUESTA',
        'ESTUDIO DE MERCADO'
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

async function guardarProcesoHistorial(tipo) {
    var tipoKey = tipo.toUpperCase() === 'D3P'  ? 'D3P'  :
                  tipo.toUpperCase() === 'CONV' ? 'CONV' :
                  tipo.toUpperCase() === 'SUB'  ? 'SUB'  : 'D3P';

    // ── Verificar perfil ──────────────────────────────
    var perfil = await db_perfil();
    if (!perfil) return;

    if (perfil.area !== 'biomedica' && perfil.rol !== 'admin') {
        alert('⚠️ Solo el área Biomédica puede crear procesos.');
        return;
    }

    // ── Recopilar datos según módulo ──────────────────
    var objeto = '', area = '', valor = '', responsable = '';

    // Los 3 módulos comparten los mismos IDs para estos campos (mp_objeto,
    // mp_area, mp_responsable, mp_valor).
    var campos = {
        D3P:  { obj:'mp_objeto', area:'mp_area', val:'mp_valor', resp:'mp_responsable' },
        CONV: { obj:'mp_objeto', area:'mp_area', val:'mp_valor', resp:'mp_responsable' },
        SUB:  { obj:'mp_objeto', area:'mp_area', val:'mp_valor', resp:'mp_responsable' }
    };

    var c = campos[tipoKey];
    if (c) {
        var oEl = document.getElementById(c.obj);
        var aEl = document.getElementById(c.area);
        var vEl = c.val ? document.getElementById(c.val) : null;
        var rEl = document.getElementById(c.resp);
        objeto      = (oEl && oEl.value) ? oEl.value.trim() : '(sin objeto)';
        area        = (aEl && aEl.value) ? aEl.value.trim() : '(sin área)';
        valor       = (vEl && vEl.value) ? _fmt_valorARaw(vEl.value) : '';
        responsable = (rEl && rEl.value) ? rEl.value.trim() : '';
    }

    if (!objeto || objeto === '(sin objeto)') {
        alert('⚠️ Debe ingresar el Objeto Contractual antes de guardar.');
        return;
    }

    // D3P comparte el flujo de verificación de objeto contractual con CD1P
    // (mismo botón mp_verificar_btn) — CONV/SUB no lo tienen, por eso el
    // guard es condicional, igual que en guardarProceso().
    if (document.getElementById('mp_verificar_btn') && !_cd1pObjetoVerificado) {
        alert('⚠️ Debe verificar el Objeto Contractual antes de guardar el proceso.');
        return;
    }

    // ── Deshabilitar botón mientras guarda (mismo patrón que guardarProceso,
    //    evita que un doble clic cree el mismo proceso dos veces) ──────
    var btnGuardar = document.querySelector(
        'button[onclick="guardarProcesoHistorial(\'' + tipo + '\')"]'
    );
    if (btnGuardar) {
        btnGuardar.disabled    = true;
        btnGuardar.textContent = 'Guardando...';
    }

    // ── Recopilar checklist según módulo ──────────────
    var prefijos = { D3P:'i3', CONV:'conv', SUB:'sub' };
    var pref     = prefijos[tipoKey];
    // (única fuente de verdad: ITEMS_RESTRINGIDOS_GLOBAL en js/db.js)
    var ITEMS_RESTRINGIDOS = ITEMS_RESTRINGIDOS_GLOBAL;
    var checklist = [];

    // Etiquetas reales de cada checklist (D3P tiene su propio checklist
    // reducido de 7 ítems; Convocatoria y Subasta tienen su propio checklist
    // de 15 ítems). Antes se guardaba el label genérico "Ítem N" y se
    // recorrían siempre 23 ítems, aunque CONV/SUB solo tienen 15 (inflaba el
    // conteo del historial).
    var labelsModulo = (typeof CHECKLIST_LABELS_POR_TIPO !== 'undefined' &&
                        CHECKLIST_LABELS_POR_TIPO[tipoKey])
        ? CHECKLIST_LABELS_POR_TIPO[tipoKey]
        : null;
    var totalItems = labelsModulo ? labelsModulo.length : 15;

    // D3P usa números de ítem no contiguos (comparte numeración con CD1P) —
    // ver ITEMS_POR_TIPO_NO_CONTIGUOS. CONV/SUB siguen siendo 1..totalItems.
    var itemsNoContiguos = (typeof ITEMS_POR_TIPO_NO_CONTIGUOS !== 'undefined')
        ? ITEMS_POR_TIPO_NO_CONTIGUOS[tipoKey]
        : null;
    var listaNumeros = itemsNoContiguos || Array.apply(null, { length: totalItems })
        .map(function(_, idx) { return idx + 1; });

    listaNumeros.forEach(function(n, idx) {
        // Se guardan TODAS las versiones elegidas antes de guardar (ver
        // _histU_todasLasVersiones y la misma nota en guardarProceso() /
        // checklist CD1P más arriba) — no solo la vigente en el input
        // nativo, que se pierde en silencio si el usuario reemplazó el
        // archivo del ítem antes de presionar "Guardar Proceso".
        var versionesItem2     = _histU_todasLasVersiones(pref + '_', n);
        var archivos           = versionesItem2.map(function(v) { return v.archivo; });
        var versionesArchivos2 = versionesItem2.map(function(v) { return v.version; });
        var activosArchivos2   = versionesItem2.map(function(v) { return v.activo; });

        // Checkbox del ítem
        var cbEl = document.getElementById(pref + '_chk_' + n);
        var ok = cbEl ? cbEl.checked : false;

        var comentEl2  = document.getElementById(pref + '_coment_' + n);
        var comentario = comentEl2 ? comentEl2.value.trim() : '';

        // Ver misma nota en guardarProceso() (checklist CD1P) más arriba —
        // D3P usa el mismo motor JURISKILLS con la numeración real de ítem
        // (n), así que la clave de estadoDocumentos también es n + '__' + nombre.
        var analisisArchivos2 = archivos.map(function(a) {
            var entry = (typeof estadoDocumentos !== 'undefined') ? estadoDocumentos[n + '__' + a.name] : null;
            return (entry && entry.analisis) ? entry.analisis : null;
        });

        // Ver misma nota sobre `archivo` (singular) en guardarProceso() más arriba.
        var archivoVigente2 = (versionesItem2.filter(function(v) { return v.activo; })[0] || {}).archivo || null;

        checklist.push({
            num:               n,
            label:             labelsModulo ? labelsModulo[idx] : ('Ítem ' + n),
            ok:                ok,
            versionesArchivos: versionesArchivos2,
            activosArchivos:   activosArchivos2,
            archivo:           archivoVigente2,
            archivos:          archivos,
            analisisArchivos:  analisisArchivos2,
            esRestringido:     ITEMS_RESTRINGIDOS.indexOf(n) !== -1,
            comentario:        comentario
        });
    });

    // ── Guardar en Supabase ───────────────────────────
    var resultado = await db_guardarProceso({
        tipo:            tipoKey,
        objeto:          objeto,
        area:            area,
        valor:           valor,
        responsable:     responsable,
        checklist:       checklist,
        forzarDuplicado: _cd1pForzarDuplicado,
        plazoVigencia:   _plazoVigenciaParaGuardar()
    });

    // ── Restaurar botón ───────────────────────────────
    if (btnGuardar) {
        btnGuardar.disabled    = false;
        btnGuardar.innerHTML   = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Guardar Proceso';
    }

    if (!resultado) return;

    // Proceso guardado con éxito: ya no hay nada que se pierda al cerrar.
    _procesoFormSucio = false;

    // Re-exigir verificación del objeto contractual para el próximo proceso
    // (D3P comparte mp_verificar_btn con CD1P; CONV/SUB no lo tienen).
    if (document.getElementById('mp_verificar_btn')) {
        _cd1pObjetoVerificado = false;
        _cd1pForzarDuplicado  = false;
        _cd1pOcultarCamposPostVerificacion();
        var resultadoVerifEl = document.getElementById('mp_verificacion_resultado');
        if (resultadoVerifEl) {
            resultadoVerifEl.style.display = '';
            resultadoVerifEl.innerHTML = '';
        }
    }

    // ── Cerrar modal del módulo ───────────────────────
    var modalMap = {
        D3P:  'modalDirecta3P',
        CONV: 'modalConvocatoria',
        SUB:  'modalSubasta'
    };
    if (typeof closeModal === 'function' && modalMap[tipoKey]) {
        closeModal(modalMap[tipoKey]);
    }

    // ── Actualizar dashboard ──────────────────────────
    if (typeof dash_actualizar === 'function') {
        setTimeout(dash_actualizar, 300);
    }

    // ── Toast ─────────────────────────────────────────
    var toast = document.createElement('div');
    toast.style.cssText =
        'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Proceso <strong>' + resultado.codigo +
                      '</strong> guardado correctamente';
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 4000);
}

// Registrar CD1P en el historial al guardar (llamado desde guardarProceso original)
function hist_registrarCD1P() {}  // vacía — la lógica real está dentro de guardarProceso()

// ── Avance Documental en tiempo real (CD1P) ──────────────────────
function cd1p_actualizarAvance() {
  // ── Conteo: 23 ítems en total ─────────────────────────────────────────────
  // - Ítems simples (1-8, 10-12, 14, 16-19, 22-23): verificado = archivo cargado
  // - Ítems multi-archivo (9, 15, 20, 21): verificado = al menos 1 sub-archivo cargado
  // - Ítem 13 (Libreta Militar "si aplica"): verificado = checkbox marcado manualmente
  var TOTAL = 23;
  var ok = 0;

  // Ítems simples: verificar por div de nombre de archivo
  var itemsSimples = [1,2,3,4,5,6,7,8,10,11,12,14,16,17,18,19,22,23];
  itemsSimples.forEach(function(n) {
    var div = document.getElementById('nombreArchivo_' + n);
    if (div) {
      var t = (div.textContent || div.innerText || '').trim();
      if (t && t !== 'Sin archivo cargado' && t.indexOf('⏳') === -1) ok++;
    }
  });

  // Ítem 13 (opcional): verificado si el checkbox está marcado
  var cb13 = document.getElementById('check_13');
  if (cb13 && cb13.checked) ok++;

  // Ítems multi-archivo: verificado si al menos 1 sub-archivo está cargado.
  // El ítem 9 (Estudio de mercado) también es multi-archivo (mercado/
  // propuestas/carta) — no tiene un "nombreArchivo_9" único, por eso antes
  // nunca contaba como verificado en itemsSimples ni al subir ni al quitar.
  var multiItems = {
    9:  ['nombreArchivo_9_mercado','nombreArchivo_9_propuestas','nombreArchivo_9_carta'],
    15: ['nombreArchivo_15a','nombreArchivo_15b','nombreArchivo_15c','nombreArchivo_15d'],
    20: ['nombreArchivo_20a','nombreArchivo_20b','nombreArchivo_20c'],
    21: ['nombreArchivo_21a','nombreArchivo_21b']
  };
  Object.keys(multiItems).forEach(function(num) {
    var ids = multiItems[num];
    var alguno = ids.some(function(id) {
      var d = document.getElementById(id);
      if (!d) return false;
      var t = (d.textContent || d.innerText || '').trim();
      return t && t !== 'Sin archivo cargado' && t.indexOf('⏳') === -1;
    });
    if (alguno) ok++;
  });

  var pct = Math.round((ok / TOTAL) * 100);

  var fill  = document.getElementById('cd1p-avance-fill');
  var pctEl = document.getElementById('cd1p-avance-pct');
  var txt   = document.getElementById('cd1p-avance-texto');
  if (!fill) return;

  fill.style.width  = pct + '%';
  pctEl.textContent = pct + '%';
  txt.textContent   = ok + ' de ' + TOTAL + ' documentos verificados';

  // Color según avance
  var color = pct === 100 ? 'linear-gradient(90deg,#0B7A43,#059669)'
            : pct >= 60   ? 'linear-gradient(90deg,#0B7A43,#123C7B)'
            : pct >= 30   ? 'linear-gradient(90deg,#D97706,#0B7A43)'
            :               'linear-gradient(90deg,#DC2626,#D97706)';
  fill.style.background = color;
}

// Enganchar listeners al abrir el modal
document.addEventListener('DOMContentLoaded', function() {
  // Checkboxes → actualizar al marcar/desmarcar (especialmente check_13 manual)
  document.querySelectorAll('#modalProceso input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', cd1p_actualizarAvance);
  });

  // Inputs de archivo → marcar checkbox + actualizar barra inmediatamente
  document.querySelectorAll('#modalProceso input[type="file"]').forEach(function(inp) {
    inp.addEventListener('change', function() {
      setTimeout(cd1p_actualizarAvance, 900);
    });
  });
});

// ── Avance Documental en tiempo real (D3P — Directa 3 Invitaciones) ──────
// Checklist propio y reducido de 7 ítems, con la misma numeración de CD1P
// (1,2,3,5,6,8,9 — ver ITEMS_POR_TIPO_NO_CONTIGUOS.D3P), independiente del
// de 23 ítems de CD1P — ver cd1p_actualizarAvance() arriba.
function d3p_actualizarAvance() {
  var ITEMS = (typeof ITEMS_POR_TIPO_NO_CONTIGUOS !== 'undefined' && ITEMS_POR_TIPO_NO_CONTIGUOS.D3P)
      || [1, 2, 3, 5, 6, 8, 9];
  var TOTAL = ITEMS.length;
  var ok = 0;

  ITEMS.forEach(function(n) {
    var div = document.getElementById('i3_nom_' + n);
    if (div) {
      var t = (div.textContent || div.innerText || '').trim();
      if (t && t !== 'Sin archivo cargado' && t.indexOf('⏳') === -1) ok++;
    }
  });

  var pct = Math.round((ok / TOTAL) * 100);

  var fill  = document.getElementById('d3p-avance-fill');
  var pctEl = document.getElementById('d3p-avance-pct');
  var txt   = document.getElementById('d3p-avance-texto');
  if (!fill) return;

  fill.style.width  = pct + '%';
  pctEl.textContent = pct + '%';
  txt.textContent   = ok + ' de ' + TOTAL + ' documentos verificados';

  var color = pct === 100 ? 'linear-gradient(90deg,#0B7A43,#059669)'
            : pct >= 60   ? 'linear-gradient(90deg,#0B7A43,#123C7B)'
            : pct >= 30   ? 'linear-gradient(90deg,#D97706,#0B7A43)'
            :               'linear-gradient(90deg,#DC2626,#D97706)';
  fill.style.background = color;
}

function hist_filtrarProcesos() {
  var filtroTipo = document.getElementById('hist-filtro-modal').value;
  var filtroBuscar = (document.getElementById('hist-filtro-buscar').value || '').toLowerCase().trim();
  var filtroResp = (document.getElementById('hist-filtro-responsable').value || '').toLowerCase().trim();
  return HIST_BD.filter(function(p) {
    var matchTipo = !filtroTipo || p.tipo === filtroTipo;
    var matchBuscar = !filtroBuscar ||
      (p.objeto || '').toLowerCase().includes(filtroBuscar) ||
      (p.area   || '').toLowerCase().includes(filtroBuscar) ||
      (p.id     || '').toLowerCase().includes(filtroBuscar);
    var matchResp = !filtroResp ||
      (p.responsable || '').toLowerCase().includes(filtroResp) ||
      (p.supervisor  || '').toLowerCase().includes(filtroResp) ||
      (p.contratista || '').toLowerCase().includes(filtroResp);
    return matchTipo && matchBuscar && matchResp;
  });
}

// Actualizar datalist de responsables con los valores únicos del historial
function hist_actualizarDatalistResponsables() {
  var dl = document.getElementById('hist-responsables-datalist');
  if (!dl) return;
  var nombres = new Set();
  (HIST_BD || []).forEach(function(p) {
    if (p.responsable) nombres.add(p.responsable);
    if (p.supervisor)  nombres.add(p.supervisor);
  });
  dl.innerHTML = Array.from(nombres).sort().map(function(n) {
    return '<option value="' + n.replace(/"/g,'&quot;') + '">';
  }).join('');
}

// ── Escape de HTML para texto escrito por usuarios ──
// Convierte < > & " ' en sus versiones inofensivas antes de inyectar el
// texto con innerHTML. Sin esto, un "Objeto Contractual" que contenga
// código HTML/JavaScript se ejecutaría en el navegador de quien abra el
// historial (ataque conocido como XSS). Misma idea que ya usan
// js/notificaciones.js y js/proceso-detalle.js.
function escaparHTML(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function hist_renderTabla() {
  var tbody = document.getElementById('hist-tabla-body');
  var empty = document.getElementById('hist-empty');
  var contador = document.getElementById('hist-contador');
  hist_actualizarDatalistResponsables();
  var lista = hist_filtrarProcesos();

  contador.textContent = lista.length + ' proceso' + (lista.length !== 1 ? 's' : '');

  if (lista.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  var html = '';
  lista.forEach(function(p, i) {
    var t = HIST_TIPOS[p.tipo] || HIST_TIPOS['D3P'];
    var bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
    // Responsable del área solicitante (dato propio del proceso)
    var areaResponsableCell = p.responsable
        ? escaparHTML(p.responsable)
        : '<span style="color:#9CA3AF;font-style:italic;">—</span>';

    // Celdas de "Responsable Jurídico Asignado" y "Proceso Asignado Por"
    // según perfil del usuario actual
    var juridicoCell, asignadoPorCell;

    asignadoPorCell = p.responsable_asignado_por_nombre
        ? escaparHTML(p.responsable_asignado_por_nombre)
        : '<span style="color:#9CA3AF;font-style:italic;">—</span>';

  if (_perfilCache && _perfilCache.rol === 'admin') {
    // Admin ve un selector con usuarios jurídicos
      var opcionesHTML = '<option value="">— Seleccione —</option>';
      if (window._usuariosJuridicos && window._usuariosJuridicos.length > 0) {
          window._usuariosJuridicos.forEach(function(u) {
              var seleccionado = (p.responsable_asignado === u.id) ? 'selected' : '';
              opcionesHTML += '<option value="' + u.id + '" ' + seleccionado + '>' +
                            escaparHTML(u.nombre || u.email) + '</option>';
          });
    }

      var textoAsignado = p.responsable_asignado_nombre
          ? ''
           : '<div style="font-size:11px;color:#9CA3AF;font-style:italic;margin-bottom:6px;">' +
            'Sin responsable asignado</div>';

      juridicoCell =
          '<div style="min-width:200px;">' +
              textoAsignado +
              '<div style="display:flex;gap:6px;align-items:center;">' +
                  '<select id="resp_select_' + p.id + '" ' +
                      'data-guardado="' + (p.responsable_asignado || '') + '" ' +
                      'onchange="_hist_marcarCambioResponsable(\'' + p.id + '\')" ' +
                      'style="flex:1;padding:6px 9px;border-radius:8px;' +
                           'border:1.5px solid #BFDBFE;font-size:11px;' +
                           'color:#123C7B;outline:none;background:#F8FAFF;">' +
                    opcionesHTML +
                '</select>' +
                '<button id="resp_btn_' + p.id + '" ' +
                    'onclick="hist_asignarResponsable(\'' + p.id + '\',\'' +
                             (p.supabase_id || '') + '\')" ' +
                    'title="Guardar responsable" ' +
                    'style="background:#123C7B;color:white;border:none;' +
                           'border-radius:7px;padding:6px 10px;font-size:13px;' +
                           'cursor:pointer;flex-shrink:0;transition:background .2s;" ' +
                    'onmouseover="this.style.background=\'#0B7A43\'" ' +
                    'onmouseout="this.style.background=\'#123C7B\'"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg></button>' +
            '</div>' +
        '</div>';

  } else {
    // No admin: solo ver el nombre del responsable asignado
      juridicoCell =
        '<div style="font-size:13px;color:#374151;">' +
            (p.responsable_asignado_nombre
                ? '<span style="display:inline-flex;align-items:center;gap:4px;' +
                  'background:#EFF6FF;color:#123C7B;border:1px solid #BFDBFE;' +
                  'border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;">' +
                  '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' + escaparHTML(p.responsable_asignado_nombre) + '</span>'
                : '<span style="color:#9CA3AF;font-style:italic;font-size:11px;">' +
                  'Sin asignar</span>') +
        '</div>';
      }
    html += '<tr style="background:' + bg + ';border-bottom:1px solid #E5E7EB;">' +
      '<td style="padding:12px 14px;font-weight:700;font-size:12px;white-space:nowrap;">' +
        '<a href="/proceso/' + encodeURIComponent(p.id) + '" ' +
          'style="color:#123C7B;text-decoration:underline;" ' +
          'title="Ver detalle y documentos de este proceso">' + p.id + '</a>' +
      '</td>' +
      '<td style="padding:12px 14px;"><span class="hist-badge ' + t.badge + '">' + t.label + '</span></td>' +
      '<td style="padding:12px 14px;max-width:260px;"><span title="' + escaparHTML(p.objeto||'') + '" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + (p.objeto ? escaparHTML(p.objeto) : '—') + '</span></td>' +
      '<td style="padding:12px 14px;color:#374151;white-space:nowrap;">' + (p.area ? escaparHTML(p.area) : '—') + '</td>' +
      '<td style="padding:12px 14px;color:#374151;white-space:nowrap;">' + areaResponsableCell + '</td>' +
      '<td style="padding:10px 14px;">' + juridicoCell + '</td>' +
      '<td style="padding:12px 14px;color:#374151;white-space:nowrap;">' + asignadoPorCell + '</td>' +
      '<td style="padding:12px 14px;white-space:nowrap;color:#0B7A43;font-weight:600;">' + hist_formatMoney(p.valor) + '</td>' +
      '<td style="padding:12px 14px;white-space:nowrap;color:#6B7280;font-size:12px;">' + p.fecha + '<br><span style="font-size:11px;">' + p.hora + '</span></td>' +
      '<td style="padding:12px 14px;text-align:center;">' +
        '<div style="display:flex;gap:6px;justify-content:center;">' +
          '<button class="hist-btn-ver" onclick="hist_verDetalle(\'' + p.id + '\')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:-2px;margin-right:3px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>Ver</button>' +
          (_perfilCache && _perfilCache.rol === 'admin'
            ? '<button class="hist-btn-del" onclick="hist_eliminar(\'' + p.id + '\')"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>'
            : '') +
        '</div>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

function hist_verDetalle(id) {
  var p = HIST_BD.find(function(x){ return x.id === id; });
  if (!p) return;

  var t = HIST_TIPOS[p.tipo] || HIST_TIPOS['D3P'];
  var pct = p.checksTotal > 0 ? Math.round((p.checksOk / p.checksTotal) * 100) : 0;

  // Construir sección de checklist de documentos (solo lectura — la carga y
  // reemplazo de archivos se hace desde la página de detalle del proceso,
  // no desde este panel del historial)
  var checklistHTML = '';
  if (p.checklist && p.checklist.length > 0) {
    var filasCheck = '';
    p.checklist.forEach(function(item, idxItem) {
      var archivoGuardado = item.archivo || '';
      var rowBg = item.ok ? '#F0FDF4' : '#FFF';
      var estadoIcon = item.ok
        ? '<span style="color:#0B7A43;font-weight:700;font-size:13px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:-2px;"><polyline points="20 6 9 17 4 12"/></svg></span>'
        : '<span style="color:#D1D5DB;font-size:13px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;vertical-align:-2px;"><rect x="4" y="4" width="16" height="16" rx="3"/></svg></span>';

      var archCell =
        '<div id="hist-arch-nom-' + id + '-' + item.num + '" style="font-size:11px;' +
          (archivoGuardado ? 'color:#0B7A43;font-weight:600;' : 'color:#9CA3AF;font-style:italic;') + '">' +
          (archivoGuardado ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;vertical-align:-1px;margin-right:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>' + escaparHTML(archivoGuardado) : 'Sin archivo') +
        '</div>';

      // Se muestra la posición secuencial (idxItem+1), no item.num — para
      // D3P item.num salta (1,2,3,5,6,8,9, ver ITEMS_POR_TIPO_NO_CONTIGUOS.D3P
      // en este mismo archivo) y esos huecos no eran intuitivos para el
      // usuario. item.num se sigue usando sin cambios en el id del archivo
      // (hist-arch-nom-*), que es lo único que necesita el número real.
      filasCheck +=
        '<tr style="background:' + rowBg + ';border-bottom:1px solid #E5E7EB;">' +
          '<td style="padding:8px 6px;text-align:center;font-weight:700;color:#6B7280;font-size:12px;">' + (idxItem + 1) + '</td>' +
          '<td style="padding:8px 10px;font-size:12px;color:#1F2937;overflow-wrap:break-word;">' + escaparHTML(item.label) + '</td>' +
          '<td style="padding:8px 6px;text-align:center;">' + estadoIcon + '</td>' +
          '<td style="padding:8px 10px;overflow-wrap:break-word;">' + archCell + '</td>' +
        '</tr>';
    });
    checklistHTML =
      '<div style="margin-top:16px;">' +
        '<div style="font-size:11px;color:#123C7B;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Documentos del Expediente</div>' +
        '<div style="background:#EFF6FF;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#374151;border:1px solid #BFDBFE;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">' +
          '<span>Para cargar o reemplazar documentos, entre al detalle del proceso.</span>' +
          '<a href="/proceso/' + encodeURIComponent(id) + '" ' +
            'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;text-decoration:none;' +
            'padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;max-width:100%;box-sizing:border-box;overflow-wrap:break-word;text-align:center;display:inline-flex;align-items:center;justify-content:center;gap:5px;">' +
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M3 7a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9L12 8h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>Ir al proceso ' + escaparHTML(id) +
          '</a>' +
        '</div>' +
        '<div style="border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;max-height:380px;overflow-y:auto;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;">' +
            '<colgroup>' +
              '<col style="width:32px;">' +
              '<col style="width:auto;">' +
              '<col style="width:32px;">' +
              '<col style="width:auto;">' +
            '</colgroup>' +
            '<thead><tr style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;">' +
              '<th style="padding:9px 6px;text-align:center;font-weight:700;">#</th>' +
              '<th style="padding:9px 10px;text-align:left;font-weight:700;">Documento</th>' +
              '<th style="padding:9px 6px;text-align:center;font-weight:700;">✓</th>' +
              '<th style="padding:9px 10px;text-align:left;font-weight:700;">Archivo</th>' +
            '</tr></thead>' +
            '<tbody>' + filasCheck + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  document.getElementById('hist-det-titulo').textContent = p.id;
  document.getElementById('hist-det-body').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;">' +
      '<div style="background:#F8FAFC;border-radius:12px;padding:14px;border:1px solid #E5E7EB;">' +
        '<div style="font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Modalidad</div>' +
        '<span class="hist-badge ' + t.badge + '">' + t.label + '</span>' +
      '</div>' +
      '<div style="background:#F8FAFC;border-radius:12px;padding:14px;border:1px solid #E5E7EB;">' +
        '<div style="font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Fecha y Hora</div>' +
        '<div style="font-weight:600;color:#374151;">' + p.fecha + ' — ' + p.hora + '</div>' +
      '</div>' +
      '<div style="background:#F8FAFC;border-radius:12px;padding:14px;border:1px solid #E5E7EB;">' +
        '<div style="font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Área Solicitante</div>' +
        '<div style="font-weight:600;color:#374151;">' + (p.area ? escaparHTML(p.area) : '—') + '</div>' +
      '</div>' +
      '<div style="background:#EFF6FF;border-radius:12px;padding:14px;border:1px solid #BFDBFE;">' +
        '<div style="font-size:11px;color:#123C7B;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Responsable del Proceso</div>' +
        '<div style="font-weight:700;color:#123C7B;font-size:14px;">' + (p.responsable ? escaparHTML(p.responsable) : '<span style="color:#9CA3AF;font-style:italic;font-weight:400;">Sin asignar</span>') + '</div>' +
      '</div>' +
      '<div style="background:#F0FDF4;border-radius:12px;padding:14px;border:1px solid #BBF7D0;grid-column:span 2;">' +
        '<div style="font-size:11px;color:#0B7A43;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Avance Documental</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="flex:1;height:8px;border-radius:6px;background:#D1FAE5;overflow:hidden;">' +
            '<div id="hist-det-barra-' + id + '" style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#0B7A43,#123C7B);border-radius:6px;transition:width .4s;"></div>' +
          '</div>' +
          '<div id="hist-det-pct-' + id + '" style="font-weight:800;color:#0B7A43;font-size:15px;">' + pct + '%</div>' +
        '</div>' +
        '<div id="hist-det-txt-' + id + '" style="font-size:11px;color:#374151;margin-top:4px;">' + p.checksOk + ' de ' + p.checksTotal + ' verificados</div>' +
      '</div>' +
    '</div>' +
    '<div style="background:#F8FAFC;border-radius:12px;padding:14px;border:1px solid #E5E7EB;margin-bottom:4px;">' +
      '<div style="font-size:11px;color:#6B7280;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Objeto Contractual</div>' +
      '<div style="color:#1F2937;font-size:14px;line-height:1.6;">' + (p.objeto ? escaparHTML(p.objeto) : '—') + '</div>' +
    '</div>' +
    checklistHTML +
    '<div style="text-align:right;margin-top:20px;">' +
      '<button onclick="document.getElementById(\'hist-detalle-panel\').classList.remove(\'open\')" style="background:#E5E7EB;color:#374151;border:none;padding:10px 22px;border-radius:10px;font-weight:700;cursor:pointer;">Cerrar</button>' +
    '</div>';

  document.getElementById('hist-detalle-panel').classList.add('open');
}

async function hist_eliminar(id) {
  if (!_perfilCache || _perfilCache.rol !== 'admin') {
    alert('⚠️ Solo un Administrador puede eliminar procesos.');
    return;
  }

  var p = HIST_BD.find(function(x){ return x.id === id; });
  if (!p || !p.supabase_id) return;

  if (!confirm('¿Eliminar definitivamente el proceso ' + id + '?\n\n' +
               'Esta acción borra el proceso y sus documentos/comentarios ' +
               'de la base de datos y no se puede deshacer.')) return;

  var ok = await db_eliminarProceso(p.supabase_id);
  if (!ok) return;

  HIST_BD = HIST_BD.filter(function(x){ return x.id !== id; });
  hist_renderTabla();

  // ── Toast de éxito (mismo estilo que al guardar un proceso) ──
  var toast = document.createElement('div');
  toast.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:99999999;' +
      'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
      'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.3);';
  toast.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>Proceso <strong>' + id + '</strong> eliminado correctamente';
  document.body.appendChild(toast);
  setTimeout(function(){ toast.remove(); }, 4000);
}

// Enciende/apaga el parpadeo del botón "Guardar responsable" según si la
// selección del combo difiere de lo que ya está guardado (data-guardado).
function _hist_marcarCambioResponsable(procesoId) {
    var selectEl = document.getElementById('resp_select_' + procesoId);
    var btnEl    = document.getElementById('resp_btn_' + procesoId);
    if (!selectEl || !btnEl) return;

    // Solo parpadea si se eligió un responsable real (no "— Seleccione —")
    // y es distinto al que ya está guardado; volver a "— Seleccione —" o
    // dejarlo igual al guardado apaga el parpadeo.
    var haycambio = selectEl.value !== '' &&
                    selectEl.value !== (selectEl.dataset.guardado || '');
    btnEl.classList.toggle('btn-resp-pendiente', haycambio);
}

// ── Asignar responsable jurídico a un proceso ──
async function hist_asignarResponsable(procesoId, supabaseId) {

    // Obtener el select correspondiente a este proceso
    var selectEl = document.getElementById('resp_select_' + procesoId);
    if (!selectEl) return;

    var usuarioId = selectEl.value;
    var nombreSeleccionado = selectEl.options[selectEl.selectedIndex]
                                     ? selectEl.options[selectEl.selectedIndex].text
                                     : '';

    if (!usuarioId) {
        alert('Por favor seleccione un responsable de la lista.');
        return;
    }

    // Feedback visual
    var btnEl = document.getElementById('resp_btn_' + procesoId);
    var svgCheck = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>';
    if (btnEl) {
        btnEl.disabled    = true;
        btnEl.textContent = '...';
    }

    // Si el proceso está en Supabase, guardar allí
    if (supabaseId && typeof db_asignarResponsable === 'function') {
        var ok = await db_asignarResponsable(supabaseId, usuarioId);
        if (!ok) {
            if (btnEl) {
                btnEl.disabled    = false;
                btnEl.innerHTML   = svgCheck;
            }
            return;
        }
    }

    // Actualizar también en HIST_BD local
    var proceso = HIST_BD.find(function(p) {
        return p.id === procesoId || p.supabase_id === supabaseId;
    });
    if (proceso) {
        proceso.responsable_asignado    = usuarioId;
        proceso.responsable_asignado_nombre = nombreSeleccionado;
        proceso.responsable_asignado_por = (_perfilCache || {}).id || '';
        proceso.responsable_asignado_por_nombre = (_perfilCache || {}).nombre || 'Admin';
        proceso.responsable_asignado_fecha = new Date().toISOString();
    }

    // Feedback de éxito en el botón
    if (btnEl) {
        btnEl.disabled    = false;
        btnEl.innerHTML   = svgCheck;
        btnEl.style.background = '#0B7A43';
        setTimeout(function() {
            btnEl.innerHTML        = svgCheck;
            btnEl.style.background = '#123C7B';
        }, 2000);
    }

    // Actualizar datalist para que coincida
    hist_actualizarDatalistResponsables();

    // Refrescar tabla sin cerrar el panel
    hist_renderTabla();
}

function hist_exportarExcel() {
  var lista = hist_filtrarProcesos();
  if (!lista.length) { alert('No hay procesos para exportar.'); return; }
  if (typeof XLSX === 'undefined') { alert('⚠️ No se pudo cargar el módulo de Excel.'); return; }

  var encabezados = [
    'ID Proceso', 'Modalidad', 'Objeto Contractual', 'Área Solicitante',
    'Responsable del Área Solicitante', 'Responsable Jurídico Asignado',
    'Proceso Asignado Por', 'Valor', 'Fecha'
  ];
  var filas = lista.map(function(p) {
    var t = HIST_TIPOS[p.tipo] || { label: p.tipo };
    return [
      p.id || '',
      t.label || '',
      p.objeto || '',
      p.area || '',
      p.responsable || '',
      p.responsable_asignado_nombre || '',
      p.responsable_asignado_por_nombre || '',
      p.valor || 0,
      p.fecha || ''
    ];
  });

  var hoja = XLSX.utils.aoa_to_sheet([encabezados].concat(filas));
  hoja['!cols'] = [
    {wch:14}, {wch:20}, {wch:40}, {wch:20}, {wch:26}, {wch:26}, {wch:22}, {wch:14}, {wch:12}
  ];

  var libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Historial de Procesos');
  XLSX.writeFile(libro, 'historial_procesos_HSLV_' + new Date().toISOString().slice(0,10) + '.xlsx');
}

// Abrir el modal siempre refresca la tabla
var _origOpenModal = typeof openModal === 'function' ? openModal : null;
(function() {
  var __open = window.openModal;
  window.openModal = function(id) {
    if (id === 'modalHistorialProcesos') {
      var fr = document.getElementById('hist-filtro-responsable');
      if (fr && !fr.value) fr.value = '';
      hist_renderTabla();
      // Si los datos reales todavía no habían llegado, redibujar
      // apenas terminen de cargar (evita que quede "Sin asignar"
      // mostrado por error si el modal se abrió muy rápido tras F5)
      if (window._dbListo && typeof window._dbListo.then === 'function') {
        window._dbListo.then(function() { hist_renderTabla(); });
      }
    }
    if (typeof __open === 'function') __open(id);
  };
})();


const botones = document.querySelectorAll('.menu-item');

botones.forEach(btn => {

    btn.addEventListener('click', function(){

        if(this.innerText.includes('Contratación Directa 1 Propuesta')){
            openModal('modalProceso');
        }

        if(this.innerText.includes('Supervisión')){
            openModal('modalSupervision');
        }

        if(this.innerText.includes('SECOP')){
            openModal('modalSecop');
        }

    });

});

window.onload = function(){
    renderTablaCDP();
    renderTablaArchivosCDP();
    renderTablaPAA();

    console.log('Solicitudes CDP cargadas correctamente desde LocalStorage');
}


document.querySelectorAll('.modal').forEach(modal=>{
    modal.addEventListener('click',function(e){
        if(e.target === this){
            this.style.display='none';
            document.body.style.overflow='auto';
        }
    });
});


// ════════════════════════════════════════════════════
//  COLUMNA "ANÁLISIS JURISKILLS" — Contratación Directa 1 Propuesta y
//  Directa 3 Invitaciones (comparten el mismo id #cd1p-checklist).
//  Se agrega por JS a cada fila (no se editó el HTML a mano, para no
//  arriesgar el balance de <div>/<tr>). El contenido de cada celda lo
//  llena actualizarPanelAgente() más abajo.
//  El número de ítem real se lee del atributo data-item-num de la fila si
//  existe; si no, de la 1ª celda (número visible). CD1P numera 1..23 de
//  forma consecutiva y visible = real, así que no necesita el atributo.
//  D3P en cambio muestra una numeración 1..7 consecutiva para el usuario
//  (más cómoda de leer) pero internamente reutiliza los números reales de
//  CD1P (1,2,3,5,6,8,9) en data-item-num, para quedar alineado con el
//  numItem que usa el motor de análisis (SKILLS_JURIDICOS,
//  _MODO_ANALISIS_CD1P, etc., indexados por el número real del ítem).
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    var wrapper = document.getElementById('cd1p-checklist');
    if (!wrapper) return; // esta página no tiene columna de análisis JURISKILLS

    wrapper.querySelectorAll('table tbody > tr').forEach(function(fila) {
        var num = parseInt(fila.getAttribute('data-item-num'));
        if (!num) {
            var primerTd = fila.querySelector('td');
            num = primerTd ? parseInt(primerTd.textContent) : NaN;
        }
        if (!num || document.getElementById('ia-item-' + num)) return; // ya existe

        var celda = document.createElement('td');
        celda.id = 'ia-item-' + num;
        celda.style.cssText = 'min-width:260px;max-width:340px;vertical-align:top;';
        celda.innerHTML = '<span style="color:#9CA3AF;font-style:italic;font-size:12px;">Sin analizar aún.</span>';
        fila.appendChild(celda);
    });

    // Modal compartido para ver el detalle completo de un análisis JURISKILLS
    // (uno solo para las 23 filas, se rellena según el "Ver análisis completo"
    // que se haya presionado — ver juriskillsAbrirModal()).
    if (!document.getElementById('juriskillsModal')) {
        var modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'juriskillsModal';
        modal.innerHTML =
            '<div class="modal-content" style="max-width:640px;max-height:85vh;overflow-y:auto;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
                '<h2 id="juriskillsModalTitulo" style="margin:0;font-size:16px;color:#123C7B;display:flex;align-items:center;gap:8px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg><span id="juriskillsModalTituloTexto">Análisis JURISKILLS</span></h2>' +
                '<button type="button" onclick="juriskillsCerrarModal()" style="border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#6B7280;">&times;</button>' +
              '</div>' +
              '<div id="juriskillsModalContenido"></div>' +
            '</div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', function(e) { if (e.target === modal) juriskillsCerrarModal(); });
    }
});

function juriskillsAbrirModal(clave) {
    const val = estadoDocumentos[clave];
    if (!val || !val.analisis) return;
    document.getElementById('juriskillsModalTituloTexto').textContent = 'Análisis JURISKILLS — ' + (val.archivo?.name || '');
    document.getElementById('juriskillsModalContenido').innerHTML = _renderContenidoCompletoAnalisis(val);
    document.getElementById('juriskillsModal').style.display = 'flex';
}

function juriskillsCerrarModal() {
    document.getElementById('juriskillsModal').style.display = 'none';
}

/* =====================================================================
   AGENTE IA HSLV – ANÁLISIS DE DOCUMENTOS CARGADOS
   El motor (ITEMS_CHECKLIST, SKILLS_JURIDICOS, leerArchivo,
   ejecutarSkillJuridico, ejecutarAnalisisLocalReglas, analizarConGroq...)
   se extrajo a js/juriskills-engine.js el 2026-07-27 para poder
   reutilizarlo desde proceso-detalle.js sin duplicar código — ver
   _Segundo_Cerebro/Flujo_Analisis_IA_JURISKILLS.md. Ese archivo se carga
   ANTES que este (ver orden de <script> en cada .html), así que sus
   funciones/constantes están disponibles aquí como globales normales.
   ===================================================================== */

// ── Marcar automáticamente el checkbox del ítem cuando se carga un archivo ──
function cd1p_marcarCheckboxPorItem(numStr) {
    // numStr puede ser "1", "15a", "20b", etc. → extraer número base
    var num = parseInt(numStr);
    if (isNaN(num)) return;

    // Checkboxes con ID explícito
    var cbConId = { 13: 'check_13', 15: 'check_15', 20: 'check_20', 21: 'check_21' };
    if (cbConId[num]) {
        var cb = document.getElementById(cbConId[num]);
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
        return;
    }

    // El resto por posición: ítems 1–23, salvo los con ID propio
    // Posiciones (0-based) en allCbs del #modalProceso:
    // ítem 1→0, 2→1, 3→2, 4→3, 5→4, 6→5, 7→6, 8→7, 9→8, 10→9,
    // 11→10, 12→11, (13 ID), 14→13, 15 ID, 16→15, 17→16, 18→17,
    // 19→18, 20 ID, 21 ID, 22→21, 23→22
    var posMap = {1:0,2:1,3:2,4:3,5:4,6:5,7:6,8:7,9:8,10:9,
                  11:10,12:11,14:13,16:15,17:16,18:17,19:18,22:21,23:22};
    if (posMap[num] !== undefined) {
        var allCbs = Array.from(document.querySelectorAll('#modalProceso input[type="checkbox"]'));
        var cb = allCbs[posMap[num]];
        if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
    }
}

// Analiza un documento ya cargado y "pendiente" (se dispara con el botón
// "🔎 Analizar" de la casilla JURISKILLS, nunca automáticamente al subir el
// archivo) — así no se gasta cuota de Groq si por error se cargó el
// documento equivocado. Enruta a Groq o al motor local según el ítem.
async function analizarDocumentoCD1P(clave) {
    const val = estadoDocumentos[clave];
    if (!val || !val.archivo) return;
    const { numItem, archivo } = val;

    estadoDocumentos[clave] = { numItem, archivo, analisis: null, estado: 'analizando' };
    actualizarPanelAgente();

    try {
        const contenido = await leerArchivo(archivo, (msg) => _reportarProgresoOCR(clave, msg));
        const modo = _MODO_ANALISIS_CD1P[numItem] || 'local';
        const analisis = modo === 'ia'
            ? await analizarConIA(numItem, archivo.name, contenido)
            : ejecutarAnalisisLocalReglas(numItem, archivo.name, contenido);

        // Ítem 5 = Estudios Previos: además del análisis normal, intentar
        // extraer localmente la fecha de vigencia declarada en su sección
        // "PLAZO" (ver _extraerPlazoVigencia en juriskills-engine.js). Se
        // guarda junto al proceso al hacer "Guardar Proceso" para alimentar
        // las alertas de vencimiento del dashboard.
        if (numItem === 5 && contenido.tipo === 'texto' && contenido.data) {
            analisis.plazoVigenciaDetectado = _extraerPlazoVigencia(contenido.data);
        }

        estadoDocumentos[clave] = { numItem, archivo, analisis, estado: analisis.estado };
        actualizarPanelAgente();
        if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();

        if (numItem === 7 || numItem === 8) _aplicarCruceFechas7y8();

    } catch (err) {
        console.error('Error analizando documento:', err);

        let mensajeError = 'No fue posible procesar el documento con Skills Inteligentes Jurídicos.';
        const msg = err.message || '';
        if (msg.includes('too large') || msg.includes('large') || msg.includes('413')) {
            mensajeError = 'El archivo es demasiado grande. Use archivos de texto o PDF ligero.';
        } else if (msg) {
            mensajeError = msg.slice(0, 180);
        }

        estadoDocumentos[clave] = {
            numItem, archivo,
            analisis: {
                estado: 'error',
                titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
                hallazgos: [mensajeError], advertencias: [], recomendaciones: [],
                resumen: 'Error al procesar el archivo.',
                camposPresentes: [], camposAusentes: []
            },
            estado: 'error'
        };
        actualizarPanelAgente();
        if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
    }
}

// Busca en estadoDocumentos si el ítem 5 (Estudios Previos) ya fue
// analizado y se le detectó una fecha de vigencia de plazo (ver
// _extraerPlazoVigencia en juriskills-engine.js) — usado al guardar el
// proceso (CD1P/D3P) para persistirla en `procesos.plazo_estudios_previos_hasta`.
function _plazoVigenciaParaGuardar() {
    if (typeof estadoDocumentos === 'undefined') return null;
    for (var k in estadoDocumentos) {
        var v = estadoDocumentos[k];
        if (v && v.numItem === 5 && v.analisis && v.analisis.plazoVigenciaDetectado) {
            return v.analisis.plazoVigenciaDetectado.fecha;
        }
    }
    return null;
}

// Función llamada cuando se selecciona un archivo en la tabla del checklist.
// Ya NO analiza automático: solo registra el archivo como "pendiente" (o
// "sin análisis" para los ítems que no lo requieren) — el análisis real
// arranca con el botón "🔎 Analizar" que aparece en la columna JURISKILLS.
async function mostrarArchivo(input, elementoId) {
    const sufijo = elementoId.replace(/^(nombreArchivo_|i3_nom_)/, '');
    const numItem = parseInt(sufijo);
    const divNombre = document.getElementById(elementoId);

    if (!input.files || input.files.length === 0) {
        if (divNombre) divNombre.innerHTML = 'Sin archivo cargado';
        return;
    }

    const archivo = input.files[0];

    // ── Marcar el checkbox automáticamente al cargar el archivo ──
    cd1p_marcarCheckboxPorItem(sufijo);

    if (divNombre) divNombre.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' + `<strong>${archivo.name}</strong>`;

    const modo = _modoAnalisisPorSufijo(sufijo);
    if (modo === 'ninguno') {
        _lexconRegistrar(numItem, archivo, _analisisSinRequerir(numItem), 'sin_analisis');
    } else {
        _lexconRegistrar(numItem, archivo, null, 'pendiente');
    }

    actualizarPanelAgente();
    if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
    if (typeof d3p_actualizarAvance === 'function') d3p_actualizarAvance();
}

// ════════════════════════════════════════════════════
//  HISTORIAL DE VERSIONES — UNIVERSAL
//  Antes solo 4 de 23 ítems de Contratación Directa 1 y
//  Directa 3 Invitaciones tenían "Ver historial" (y en
//  Directa 3 Invitaciones ni siquiera funcionaba, por un
//  desajuste de nombres). Este sistema envuelve mostrarArchivo()
//  para que TODOS los ítems de los 4 módulos lo tengan,
//  incluyendo los datos capturados en mini-modales (PAA,
//  Solicitud CDP, CDP).
// ════════════════════════════════════════════════════
var _histU_datos = {}; // clave: prefijo+num → array de versiones

// Reconstruye TODAS las versiones elegidas para un ítem antes de guardar,
// agrupadas por recuadro (origenId) — no solo la que quedó vigente en cada
// `<input type="file">` nativo. Un input de archivo nativo solo retiene el
// ÚLTIMO archivo elegido: si el usuario carga un documento, JURISKILLS lo
// analiza, y luego reemplaza ese mismo recuadro por otro archivo antes de
// presionar "Guardar Proceso", el primero desaparece de `input.files` —
// pero `_histU_datos` sí lo conserva (guarda la referencia real al File,
// ver histU_registrar). Sin esta función, guardarProceso()/
// guardarProcesoHistorial() leían el input directamente y perdían esa
// primera versión (y su análisis JURISKILLS) en silencio al guardar.
// Cada recuadro (origenId) mantiene su propia numeración de versión — un
// ítem con sub-documentos (9, 15, 20, 21) tiene varios recuadros
// compartiendo el mismo `_histU_datos[clave]`, cada uno con su propia
// cadena de versiones independiente.
function _histU_todasLasVersiones(prefijo, num) {
    var hist = _histU_datos[prefijo + num] || [];
    var porOrigen = {};
    var ordenOrigenes = [];
    hist.forEach(function(h) {
        if (!porOrigen[h.origenId]) {
            porOrigen[h.origenId] = [];
            ordenOrigenes.push(h.origenId);
        }
        porOrigen[h.origenId].push(h);
    });
    var resultado = [];
    ordenOrigenes.forEach(function(origenId) {
        var versiones = porOrigen[origenId];
        versiones.forEach(function(v, idx) {
            resultado.push({
                archivo: v.archivo,
                version: idx + 1,
                activo:  idx === versiones.length - 1
            });
        });
    });
    return resultado;
}

function _histU_parsear(elementoId) {
    var m;
    if ((m = elementoId.match(/^i3_nom_(\d+)/)))          return { prefijo: 'i3_',  num: parseInt(m[1]) };
    if ((m = elementoId.match(/^conv_nom_(\d+)/)))        return { prefijo: 'conv_', num: parseInt(m[1]) };
    if ((m = elementoId.match(/^sub_nom_(\d+)/)))         return { prefijo: 'sub_',  num: parseInt(m[1]) };
    if ((m = elementoId.match(/^nombreArchivo_(\d+)/)))   return { prefijo: '',     num: parseInt(m[1]) };
    return null;
}

function _histU_infoMiniModal(prefijo, num) {
    function txt(id) { var el = document.getElementById(id); return el ? el.textContent.trim() : ''; }
    if (num === 1) {
        var unspsc  = txt(prefijo === 'i3_' ? 'i3_paa_unspsc_label'  : 'paa-unspsc-label');
        var detalle = txt(prefijo === 'i3_' ? 'i3_paa_detalle_label' : 'paa-detalle-label');
        return unspsc ? ('UNSPSC: ' + unspsc + (detalle && detalle !== '—' ? ' · ' + detalle : '')) : '';
    }
    if (num === 2) {
        var rubro = txt(prefijo === 'i3_' ? 'i3_scdp_rubro-label' : 'scdp-rubro-label');
        var valor = txt(prefijo === 'i3_' ? 'i3_scdp_valor-label' : 'scdp-valor-label');
        return rubro ? ('Rubro: ' + rubro + (valor ? ' · ' + valor : '')) : '';
    }
    if (num === 3) {
        var numCdp = txt(prefijo === 'i3_' ? 'i3_cdp_num-label' : 'cdp-num-label');
        return numCdp ? ('N° CDP: ' + numCdp) : '';
    }
    return '';
}

function _histU_asegurarContenedor(prefijo, num, inputEl) {
    if (document.getElementById(prefijo + 'historial_' + num)) return; // ya existe

    var celda = inputEl.closest('td');
    if (!celda) return;

    var bloque = document.createElement('div');
    bloque.className = 'historial-universal-inyectado';
    bloque.style.cssText = 'margin-top:8px;';
    bloque.innerHTML =
        '<button onclick="histU_toggle(\'' + prefijo + '\',' + num + ')" ' +
            'style="background:none;border:1px solid #CBD5E1;border-radius:8px;' +
            'padding:5px 10px;font-size:11px;color:#123C7B;cursor:pointer;font-weight:600;' +
            'display:flex;align-items:center;gap:5px;">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            'Ver historial <span id="' + prefijo + 'badge_hist_' + num + '" ' +
                'style="background:#123C7B;color:white;border-radius:10px;padding:1px 7px;font-size:10px;">0</span>' +
        '</button>' +
        '<div id="' + prefijo + 'historial_' + num + '" ' +
            'style="display:none;margin-top:8px;max-height:160px;overflow-y:auto;' +
            'border:1px solid #E5E7EB;border-radius:10px;font-size:11px;background:#F8FAFC;">' +
            '<div style="padding:8px 10px;color:#6B7280;font-style:italic;" ' +
                'id="' + prefijo + 'historial_empty_' + num + '">Sin cargas registradas aún.</div>' +
        '</div>';
    celda.appendChild(bloque);
}

var _histU_contadorId = 0; // id único incremental para cada versión registrada

function histU_registrar(input, elementoId) {
    if (!input.files || !input.files[0]) return;
    var info = _histU_parsear(elementoId);
    if (!info) return;

    _histU_asegurarContenedor(info.prefijo, info.num, input);

    var clave = info.prefijo + info.num;
    if (!_histU_datos[clave]) _histU_datos[clave] = [];
    var hist = _histU_datos[clave];

    var f = input.files[0];

    // Última versión registrada de ESTE recuadro específico (no la última
    // del ítem completo — en ítems con sub-documentos, 9/15/20/21, varios
    // recuadros comparten el mismo historial). Solo sirve para detectar el
    // caso de un mini-modal que dispara esto dos veces para el mismo
    // archivo (selección + confirmación) y no duplicar esa versión.
    var ultimaDeEsteRecuadro = null;
    for (var i = hist.length - 1; i >= 0; i--) {
        if (hist[i].origenId === elementoId) { ultimaDeEsteRecuadro = hist[i]; break; }
    }
    if (ultimaDeEsteRecuadro && ultimaDeEsteRecuadro.nombre === f.name && ultimaDeEsteRecuadro.tamanoBytes === f.size) {
        ultimaDeEsteRecuadro.extra = _histU_infoMiniModal(info.prefijo, info.num);
        histU_render(info.prefijo, info.num);
        return;
    }

    // Cada archivo elegido crea su propia versión nueva, sin importar si
    // reemplaza a uno anterior del mismo recuadro — así se conserva un
    // registro de todo lo que se intentó cargar antes de guardar.
    var ahora = new Date();
    var tam = f.size < 1048576
        ? (f.size / 1024).toFixed(1) + ' KB'
        : (f.size / 1048576).toFixed(2) + ' MB';

    hist.push({
        id:          ++_histU_contadorId,
        origenId:    elementoId,
        origenInput: input,
        archivo:     f, // referencia real al File, para poder restaurarlo si se quita una versión más nueva
        version:     hist.length + 1,
        nombre:      f.name,
        tamanoBytes: f.size,
        tamano:      tam,
        fecha:       ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora:        ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        extra:       _histU_infoMiniModal(info.prefijo, info.num)
    });

    histU_render(info.prefijo, info.num);
}

function histU_render(prefijo, num) {
    var clave = prefijo + num;
    var hist  = _histU_datos[clave] || [];
    var c  = document.getElementById(prefijo + 'historial_' + num);
    var b  = document.getElementById(prefijo + 'badge_hist_' + num);
    var em = document.getElementById(prefijo + 'historial_empty_' + num);
    if (!c) return;
    if (b)  b.textContent = hist.length;
    if (em) em.style.display = hist.length ? 'none' : 'block';
    c.querySelectorAll('.hist-entrada').forEach(function(e) { e.remove(); });
    hist.slice().reverse().forEach(function(e, idx) {
        var div = document.createElement('div');
        div.className = 'hist-entrada';
        var esPrimera = e.version === 1;
        div.innerHTML =
            '<div class="hist-num ' + (esPrimera ? 'hist-num-v1' : 'hist-num-vN') + '">' + e.version + '</div>' +
            '<div class="hist-info">' +
                '<div class="hist-nombre"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' + e.nombre +
                    (esPrimera ? '<span class="hist-tag-v1">v1 · Inicial</span>' : '<span class="hist-tag-vN">v' + e.version + '</span>') +
                    (idx === 0 ? '<span class="hist-tag-last"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Actual</span>' : '') +
                    ' <button onclick="histU_quitarVersion(\'' + prefijo + '\',' + num + ',' + e.id + ')" ' +
                        'title="Quitar esta versión" style="background:none;border:1px solid #DC2626;color:#DC2626;' +
                        'border-radius:6px;padding:1px 7px;font-size:10.5px;cursor:pointer;font-weight:600;margin-left:6px;display:inline-flex;align-items:center;gap:2px;">' +
                        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                        'Quitar</button>' +
                '</div>' +
                (e.extra ? '<div class="hist-meta"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' + e.extra + '</div>' : '') +
                '<div class="hist-meta">' +
                    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + e.fecha +
                    ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + e.hora +
                    ' &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>' + e.tamano +
                '</div>' +
            '</div>';
        c.appendChild(div);
    });
    c.style.display = 'block';
}

function histU_toggle(prefijo, num) {
    var c = document.getElementById(prefijo + 'historial_' + num);
    if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

// Para mini-modales donde el archivo real se selecciona ANTES de guardar
// los datos extra (UNSPSC, N° de CDP, etc.) — actualiza la última versión
// ya registrada en vez de crear una nueva.
function histU_actualizarExtra(prefijo, num) {
    var hist = _histU_datos[prefijo + num];
    if (!hist || hist.length === 0) return;
    hist[hist.length - 1].extra = _histU_infoMiniModal(prefijo, num);
    histU_render(prefijo, num);
}

// ── Quitar una versión específica del historial local ──────────────────
// Nada de esto ha llegado a Supabase todavía (solo se sube al presionar
// "Guardar Proceso"), así que quitar aquí es seguro y no rompe la regla de
// "nada se elimina" — esa regla aplica a documentos YA guardados en un
// proceso existente, no a archivos recién seleccionados.
function _histU_quitarEntradaPorIndice(prefijo, num, idx) {
    var hist = _histU_datos[prefijo + num];
    if (!hist || !hist[idx]) return;

    var entrada = hist[idx];

    // ¿Queda alguna versión anterior de ESTE mismo recuadro? Si esta era la
    // única (o la más reciente), buscar la que le sigue en antigüedad para
    // restaurarla como la actual — usando DataTransfer, ya que el navegador
    // no permite reasignar un archivo directamente a un <input type="file">.
    // Si no queda ninguna, el recuadro sí vuelve a "Sin archivo cargado".
    var anterior = null;
    for (var i = idx - 1; i >= 0; i--) {
        if (hist[i].origenId === entrada.origenId) { anterior = hist[i]; break; }
    }
    var haySiguienteMasNueva = hist.some(function(h, i) {
        return i > idx && h.origenId === entrada.origenId;
    });

    hist.splice(idx, 1);
    hist.forEach(function(h, j) { h.version = j + 1; }); // renumerar (evita huecos v1, v3…)

    if (!haySiguienteMasNueva) {
        var divNombre = document.getElementById(entrada.origenId);
        if (anterior && entrada.origenInput) {
            var dt = new DataTransfer();
            dt.items.add(anterior.archivo);
            entrada.origenInput.files = dt.files;
            if (divNombre) divNombre.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>' + anterior.nombre + '</strong>';
        } else {
            if (entrada.origenInput) entrada.origenInput.value = '';
            if (divNombre) divNombre.innerHTML = 'Sin archivo cargado';

            // Ítem 13 (Libreta Militar): si se eligió "Aplica", el avance
            // depende del archivo (igual que los demás ítems) — al quitar el
            // único que había, hay que revertir también el checkbox que
            // alimenta la barra de progreso. Si se eligió "No aplica", el
            // checkbox se deja tal cual (nunca dependió de un archivo).
            if (num == 13) {
                var radioAplica13 = document.querySelector('input[name="aplica_13"][value="aplica"]');
                var check13El = document.getElementById('check_13');
                if (check13El && radioAplica13 && radioAplica13.checked) {
                    check13El.checked = false;
                }
            }
        }
    }

    // ── Limpiar el análisis de JURISKILLS ligado al archivo que se quitó ──
    // (si no, la columna "Análisis JURISKILLS" seguía mostrando el análisis
    // de un archivo que ya no está cargado en ningún lado)
    if (typeof estadoDocumentos !== 'undefined') {
        delete estadoDocumentos[num + '__' + entrada.nombre];

        var quedanDocsDeEsteItem = Object.values(estadoDocumentos).some(function(v) {
            return v.numItem == num;
        });
        if (!quedanDocsDeEsteItem) {
            var celdaIA = document.getElementById('ia-item-' + num);
            if (celdaIA) celdaIA.innerHTML = '<span style="color:#9CA3AF;font-style:italic;font-size:12px;">Sin analizar aún.</span>';
        }
    }
    if (typeof actualizarPanelAgente === 'function') actualizarPanelAgente();

    // Ítems 15/20/21 (sub-documentos): su mini-barra "📁 Documentos cargados:
    // N / M" solo se actualizaba al SUBIR un archivo (actualizarProgresoSub()
    // se llama desde mostrarArchivoSub()) — nunca al quitarlo con este botón,
    // por eso se quedaba mostrando un número más alto del real.
    var _subdocInputIds = {
        15: ['archivo_15a','archivo_15b','archivo_15c','archivo_15d'],
        20: ['archivo_20a','archivo_20b','archivo_20c'],
        21: ['archivo_21a','archivo_21b']
    };
    if (_subdocInputIds[num] && typeof actualizarProgresoSub === 'function') {
        actualizarProgresoSub('check_' + num, _subdocInputIds[num]);
    }

    histU_render(prefijo, num);
    if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
    if (typeof d3p_actualizarAvance === 'function') d3p_actualizarAvance();
}

// Botón "🗑️ Quitar" dentro de cada fila de "Ver historial" — quita esa
// versión puntual, sea o no la que está actualmente cargada en el recuadro.
function histU_quitarVersion(prefijo, num, id) {
    if (!confirm('¿Quitar esta versión del historial?')) return;
    var hist = _histU_datos[prefijo + num];
    if (!hist) return;
    var idx = hist.findIndex(function(h) { return h.id === id; });
    if (idx === -1) return;
    _histU_quitarEntradaPorIndice(prefijo, num, idx);
}

// Envolver mostrarArchivo para que TODO ítem registre su historial,
// sin importar si llega por carga directa o por un mini-modal.
(function() {
    var _mostrarArchivoOriginal = mostrarArchivo;
    window.mostrarArchivo = async function(input, elementoId) {
        await _mostrarArchivoOriginal(input, elementoId);
        histU_registrar(input, elementoId);
    };
})();

// Ítems con sub-documentos (15, 20, 21) usan mostrarArchivoSub en vez de
// mostrarArchivo — se envuelve igual para que también tengan historial.
(function() {
    var _mostrarArchivoSubOriginal = mostrarArchivoSub;
    window.mostrarArchivoSub = async function(input, divId, checkId, todosIds) {
        await _mostrarArchivoSubOriginal(input, divId, checkId, todosIds);
        histU_registrar(input, divId);
    };
})();



// Actualizar el panel visual de JURISKILLS IA con todos los análisis actuales
// Actualiza el contador global del panel JURISKILLS y, por cada ítem con
// documentos cargados, rellena su propia celda "Análisis JURISKILLS" en el
// checklist (antes todo esto se acumulaba en un solo acordeón al final de
// la página — ver _renderTarjetasJuriskills más abajo para el detalle).
function actualizarPanelAgente() {
    const resumenGlobal = document.getElementById('iaResumenGlobal');
    const contadorDocs  = document.getElementById('iaContadorDocs');
    const estadoBadge   = document.getElementById('iaEstadoBadge');

    const items = Object.entries(estadoDocumentos);
    const total = items.length;

    if (contadorDocs) {
        contadorDocs.textContent = total === 0
            ? '0 documentos'
            : `${total} documento${total !== 1 ? 's' : ''} cargado${total !== 1 ? 's' : ''}`;
    }

    if (total === 0) {
        if (estadoBadge) estadoBadge.style.display = 'none';
        if (resumenGlobal) resumenGlobal.textContent = 'Sin documentos analizados aún.';
        return;
    }

    // Contar estados
    let nOk = 0, nAdv = 0, nErr = 0, nAnal = 0, nPend = 0;
    items.forEach(([,v]) => {
        if (v.estado === 'ok') nOk++;
        else if (v.estado === 'advertencia') nAdv++;
        else if (v.estado === 'correccion' || v.estado === 'error') nErr++;
        else if (v.estado === 'analizando') nAnal++;
        else if (v.estado === 'pendiente') nPend++;
        // 'sin_analisis' no suma a ningún contador — no requiere acción.
    });

    if (estadoBadge) {
        estadoBadge.style.display = 'inline-block';
        if (nAnal > 0) {
            estadoBadge.className = 'ia-badge badge-analizando';
            estadoBadge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Analizando…';
        } else if (nErr > 0) {
            estadoBadge.className = 'ia-badge badge-error';
            estadoBadge.textContent = `${nErr} ${nErr !== 1 ? 'correcciones requeridas' : 'corrección requerida'}`;
        } else if (nAdv > 0) {
            estadoBadge.className = 'ia-badge badge-warning';
            estadoBadge.textContent = `${nAdv} advertencia${nAdv !== 1 ? 's' : ''}`;
        } else if (nPend > 0) {
            estadoBadge.className = 'ia-badge badge-warning';
            estadoBadge.textContent = `${nPend} pendiente${nPend !== 1 ? 's' : ''} de analizar`;
        } else {
            estadoBadge.className = 'ia-badge badge-ok';
            estadoBadge.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Todo en orden';
        }
    }

    if (resumenGlobal) {
        resumenGlobal.textContent = `${nOk} correctos · ${nAdv} con advertencias · ${nErr} con correcciones · ${nPend} pendientes de analizar`;
    }

    // Agrupar entradas por numItem y renderizar cada una en su propia celda
    const porItem = {};
    items.forEach(([, val]) => {
        const n = val.numItem;
        if (!porItem[n]) porItem[n] = [];
        porItem[n].push(val);
    });

    Object.keys(porItem).forEach(num => {
        const celda = document.getElementById('ia-item-' + num);
        if (celda) celda.innerHTML = _renderTarjetasJuriskills(porItem[num]);
    });
}

// Versión COMPACTA para la celda del checklist: semáforo + barra + resumen
// corto + enlace "Ver análisis completo" que abre el modal con el detalle
// (hallazgos, advertencias, recomendaciones, normativa) — ver
// _renderContenidoCompletoAnalisis() y juriskillsAbrirModal().
function _renderTarjetasJuriskills(docs) {
    let html = '';

    docs.forEach((val, idxDoc) => {
        if (val.estado === 'analizando') {
            html += `<div style="padding:6px 0;${idxDoc>0?'border-top:1px solid #F1F5F9;':''}">
              <div style="display:flex;align-items:center;gap:6px;color:#6366F1;font-size:11px;">
                <span class="ia-badge badge-analizando"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Analizando</span>
                <span style="color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${val.archivo?.name || ''}</span>
              </div>
              ${val.progreso ? `<div style="margin-top:4px;font-size:10px;color:#6366F1;">${val.progreso}</div>` : ''}
              <div class="ia-loader" style="margin-top:6px;"><div></div><div></div><div></div></div>
            </div>`;
            return;
        }

        // Archivo cargado pero aún no analizado: se muestra con su botón
        // "Analizar" en vez de disparar el análisis automático (así no se
        // gasta cuota de Groq si por error se subió el documento equivocado).
        if (val.estado === 'pendiente') {
            const clavePend = (val.numItem ?? '') + '__' + (val.archivo?.name || '');
            html += `<div style="padding:8px 0;${idxDoc>0?'border-top:1px solid #F1F5F9;':''}">
              <div style="margin-bottom:8px;font-size:12px;color:#0B7A43;font-weight:600;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>${val.archivo?.name || ''}</strong></div>
              <button class="btn" style="padding:10px 14px;font-size:13px;display:inline-flex;align-items:center;gap:5px;"
                onclick="analizarDocumentoCD1P('${clavePend.replace(/'/g,"\\'")}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Analizar</button>
            </div>`;
            return;
        }

        const a = val.analisis;
        if (!a) return;

        // Ítems que no requieren análisis (documentos de identificación): se
        // muestra el archivo cargado sin badge ni barra de cumplimiento.
        if (val.estado === 'sin_analisis' || a.sinAnalisis) {
            html += `<div style="padding:8px 0;${idxDoc>0?'border-top:1px solid #F1F5F9;':''}">
              <div style="font-size:12px;color:#0B7A43;font-weight:600;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>${val.archivo?.name || ''}</strong></div>
              <div style="font-size:10.5px;color:#9CA3AF;font-style:italic;margin-top:2px;">Documento de identificación — sin análisis.</div>
            </div>`;
            return;
        }

        const puntaje = a.puntaje ?? (a.estado==='ok'?90:a.estado==='advertencia'?65:30);
        const pColor  = puntaje>=80?'#22C55E':puntaje>=50?'#F59E0B':'#EF4444';
        const badgeClass = a.estado==='ok'?'badge-ok':a.estado==='advertencia'?'badge-warning':'badge-error';
        const badgeLabel = a.estado==='ok'?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Correcto':a.estado==='advertencia'?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencia':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Corrección';
        const clave = (val.numItem ?? '') + '__' + (val.archivo?.name || '');

        html += `<div style="padding:8px 0;${idxDoc>0?'border-top:1px solid #F1F5F9;':''}">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="ia-badge ${badgeClass}" style="flex-shrink:0;">${badgeLabel}</span>
            <span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${val.archivo?.name||''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap;">Cumplimiento</span>
            <div style="flex:1;background:#E5E7EB;border-radius:10px;height:6px;overflow:hidden;">
              <div style="width:${puntaje}%;height:6px;border-radius:10px;background:${pColor};transition:width .5s;"></div>
            </div>
            <span style="font-size:11px;font-weight:800;color:${pColor};white-space:nowrap;">${puntaje}%</span>
          </div>
          <a href="javascript:void(0)" onclick="juriskillsAbrirModal('${clave.replace(/'/g,"\\'")}')" style="font-size:11px;font-weight:700;color:#2563EB;text-decoration:underline;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Ver análisis completo</a>
        </div>`;
    });

    return html;
}

// Arma el detalle COMPLETO de un solo documento (hallazgos, advertencias,
// redacción, concordancia, recomendaciones, normativa) — es el contenido que
// se muestra dentro del modal al presionar "Ver análisis completo".
function _renderContenidoCompletoAnalisis(val) {
    {
        const a = val.analisis;
        if (!a) return '<p style="color:#9CA3AF;">Sin análisis disponible.</p>';

        const puntaje = a.puntaje ?? (a.estado==='ok'?90:a.estado==='advertencia'?65:30);
        const pColor  = puntaje>=80?'#22C55E':puntaje>=50?'#F59E0B':'#EF4444';
        const badgeClass = a.estado==='ok'?'badge-ok':a.estado==='advertencia'?'badge-warning':'badge-error';
        const badgeLabel = a.estado==='ok'?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Correcto':a.estado==='advertencia'?'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencia':'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>Corrección';

        // Separar hallazgos: normativos vs concordancia
        const hallNorm  = (a.hallazgos||[]).filter(x => !x.startsWith('⚠️ Concordancia') && !x.startsWith('🔴 Inconsistencia'));
        const hallConc  = (a.hallazgos||[]).filter(x => x.startsWith('⚠️ Concordancia') || x.startsWith('🔴 Inconsistencia'));
        // Separar advertencias: normativas vs redacción vs concordancia
        const advNorm   = (a.advertencias||[]).filter(x => !x.startsWith('✏️') && !x.startsWith('⚠️ Concordancia') && !x.startsWith('🔴 Inconsistencia'));
        const advRedac  = (a.advertencias||[]).filter(x => x.startsWith('✏️'));
        const advConc   = (a.advertencias||[]).filter(x => x.startsWith('⚠️ Concordancia'));

        const hallNormHTML  = hallNorm.map(x=>`<li style="margin-bottom:4px;">${x}</li>`).join('');
        const hallConcHTML  = hallConc.map(x=>`<li style="margin-bottom:4px;">${x}</li>`).join('');
        const advNormHTML = advNorm.map((x, i) => {
            const resaltado = x.replace(/(Art\.\s*[\d.]+[^)]*\)|Ley\s+\d+[^\s,;.]*|Decreto\s+\d+[^\s,;.]*|Acuerdo\s+\d+[^\s,;.]*|Res(?:olución|\.)\s*\d+[^\s,;.]*)/gi,
                '<span style="background:#FEF3C7;border-radius:3px;padding:0 3px;font-weight:700;color:#92400E;">$1</span>');
            return `<li style="margin-bottom:8px;">
              <span style="display:inline-block;background:#F59E0B;color:white;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:800;text-align:center;line-height:16px;margin-right:5px;flex-shrink:0;">${i+1}</span>
              ${resaltado}
            </li>`;
        }).join('');
        // ── Renderizar observaciones de redacción con detalle expandible ──
        function _renderRedacHTML(obs) {
            if (!obs.includes('||')) {
                return `<li style="margin-bottom:6px;">${obs.replace('✏️ Redacción: ','').replace('✏️ ','')}</li>`;
            }
            const partes = obs.split('||');
            const tipo   = partes[1];
            const dato   = partes[2];
            const det    = partes[3] || '';
            const titulos = {
                'CAMPOS_VACIOS': `<strong>${dato} campo(s) sin diligenciar</strong> — marcadores encontrados:`,
                'INCOMPLETO':    `<strong>Documento posiblemente incompleto</strong> (${dato} fragmentos muy cortos):`,
                'REPETICION':    `<strong>${dato} línea(s) repetida(s)</strong> — posible plantilla sin personalizar:`,
                'OBJETO_AUSENTE':'<strong>Sección "Objeto / Necesidad" no identificada</strong>:',
                'FECHAS_VIEJAS': `<strong>Fechas de vigencias anteriores detectadas</strong> (${dato}):`,
            };
            const titulo = titulos[tipo] || '<strong>Observación de redacción:</strong>';
            return `<li style="margin-bottom:10px;">
              <span style="display:block;margin-bottom:4px;">${titulo}</span>
              <div style="background:#E0F2FE;border-radius:6px;padding:6px 10px;font-size:11px;color:#075985;line-height:1.7;">${det}</div>
            </li>`;
        }
        const advRedacHTML  = advRedac.map(x => _renderRedacHTML(x)).join('');
        const advConcHTML   = advConc.map(x=>`<li style="margin-bottom:4px;">${x}</li>`).join('');
        const recomHTML = (a.recomendaciones||[]).map((x, i) => {
            const iconos = { '🖊️': '#0B7A43', '🔗': '#C2410C', '📄': '#1D4ED8' };
            let color = '#0B7A43';
            Object.keys(iconos).forEach(ic => { if (x.startsWith(ic)) color = iconos[ic]; });
            return `<li style="margin-bottom:10px;padding-left:6px;border-left:3px solid ${color}30;">
              <span style="display:block;font-weight:700;color:${color};font-size:11px;margin-bottom:2px;">Acción ${i+1}</span>
              <span style="font-size:12px;color:#374151;">${x}</span>
            </li>`;
        }).join('');

        return `<div>
          <!-- nombre archivo + badge -->
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="ia-badge ${badgeClass}" style="flex-shrink:0;">${badgeLabel}</span>
            <span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${val.archivo?.name||''}</span>
          </div>
          <!-- barra cumplimiento -->
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap;">Cumplimiento</span>
            <div style="flex:1;background:#E5E7EB;border-radius:10px;height:6px;overflow:hidden;">
              <div style="width:${puntaje}%;height:6px;border-radius:10px;background:${pColor};transition:width .5s;"></div>
            </div>
            <span style="font-size:11px;font-weight:800;color:${pColor};white-space:nowrap;">${puntaje}%</span>
          </div>
          <!-- resumen -->
          ${a.resumen?`<p style="font-size:11.5px;color:#374151;font-style:italic;margin:0 0 6px;">${a.resumen}</p>`:''}
          <!-- hallazgos normativos -->
          ${hallNormHTML?`<div style="margin-bottom:6px;background:#FEF2F2;border-radius:8px;padding:6px 8px;">
            <div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Incumplimientos normativos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${hallNormHTML}</ul></div>`:''}
          <!-- hallazgos concordancia crítica -->
          ${hallConcHTML?`<div style="margin-bottom:6px;background:#FFF1F2;border-radius:8px;padding:6px 8px;border:1px solid #FECDD3;">
            <div style="font-size:11px;font-weight:700;color:#BE123C;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Inconsistencias entre documentos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${hallConcHTML}</ul></div>`:''}
          <!-- advertencias normativas -->
          ${advNormHTML?`<div style="margin-bottom:6px;background:#FFFBEB;border-radius:8px;padding:6px 8px;">
            <div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>Advertencias normativas:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advNormHTML}</ul></div>`:''}
          <!-- observaciones de redacción -->
          ${advRedacHTML?`<div style="margin-bottom:6px;background:#F0F9FF;border-radius:8px;padding:6px 8px;border:1px solid #BAE6FD;">
            <div style="font-size:11px;font-weight:700;color:#0369A1;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>Observaciones de redacción:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advRedacHTML}</ul></div>`:''}
          <!-- concordancia entre documentos -->
          ${advConcHTML?`<div style="margin-bottom:6px;background:#FFF7ED;border-radius:8px;padding:6px 8px;border:1px solid #FED7AA;">
            <div style="font-size:11px;font-weight:700;color:#C2410C;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Concordancia entre documentos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advConcHTML}</ul></div>`:''}
          <!-- recomendaciones -->
          ${recomHTML?`<div style="margin-bottom:2px;background:#F0FDF4;border-radius:8px;padding:6px 8px;">
            <div style="font-size:11px;font-weight:700;color:#0B7A43;margin-bottom:4px;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:2px;" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>Recomendaciones:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;">${recomHTML}</ul></div>`:''}
          <!-- normativa -->
          ${a.normativa?`<div style="font-size:10px;color:#9CA3AF;border-top:1px solid #F1F5F9;padding-top:4px;margin-top:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2"/></svg>${a.normativa}</div>`:''}
          <!-- aviso fijo: la IA no reemplaza el criterio jurídico -->
          <div style="margin-top:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 10px;font-size:10.5px;color:#1E3A8A;line-height:1.5;">
            ⓘ El análisis es generado por IA/reglas automáticas con base en el contenido real de cada documento cargado y la normativa contractual vigente. No reemplaza el criterio jurídico del equipo de contratación. <strong>Independientemente del porcentaje o resultado obtenido — incluso al 100% — este documento siempre debe revisarse manualmente antes de continuar el proceso.</strong>
          </div>
        </div>`;
    }
}

// Botón "Actualizar análisis": re-analizar todos los documentos cargados
// Botón "⟳ Actualizar análisis": solo RE-analiza documentos que ya se habían
// analizado antes (estado ok/advertencia/correccion/error) — los que están
// "pendiente" (nunca se presionó su botón "Analizar") o "sin análisis" se
// dejan tal cual, para no gastar cuota de Groq en documentos que el usuario
// nunca pidió analizar.
async function reAnalizarTodo() {
    const btn = document.querySelector('.btn-actualizar');
    if (btn) { btn.disabled = true; btn.textContent = 'Analizando…'; }

    const estadosReanalizables = ['ok', 'advertencia', 'correccion', 'error'];
    const clavesAReanalizar = Object.entries(estadoDocumentos)
        .filter(([, val]) => val.archivo && estadosReanalizables.indexOf(val.estado) !== -1)
        .map(([clave]) => clave);

    clavesAReanalizar.forEach(clave => {
        estadoDocumentos[clave].estado   = 'analizando';
        estadoDocumentos[clave].analisis = null;
    });
    actualizarPanelAgente();

    let tocoItem7u8 = false;
    const promesas = clavesAReanalizar.map(async (clave) => {
        const val = estadoDocumentos[clave];
        const numItem = val.numItem;
        try {
            const contenido = await leerArchivo(val.archivo, (msg) => _reportarProgresoOCR(clave, msg));
            const modo = _MODO_ANALISIS_CD1P[numItem] || 'local';
            const analisis = modo === 'ia'
                ? await analizarConIA(numItem, val.archivo.name, contenido)
                : ejecutarAnalisisLocalReglas(numItem, val.archivo.name, contenido);
            estadoDocumentos[clave] = { numItem, archivo: val.archivo, analisis, estado: analisis.estado };
            if (numItem === 7 || numItem === 8) tocoItem7u8 = true;
        } catch (err) {
            console.error(`Error re-analizando ítem ${numItem}:`, err);
            estadoDocumentos[clave].estado   = 'error';
            estadoDocumentos[clave].analisis = {
                estado: 'error',
                titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
                hallazgos: [err.message || 'Error al re-analizar el documento.'],
                recomendaciones: [],
                resumen: 'Error al procesar el archivo.'
            };
        }
        actualizarPanelAgente();
    });

    await Promise.all(promesas);
    if (tocoItem7u8) _aplicarCruceFechas7y8();
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px;" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>Actualizar análisis'; }
}

function openModal(modalId){
    const modal = document.getElementById(modalId);

    if(modal){
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // ── Al abrir un nuevo proceso CD1P: limpiar previews e historial local ──
    if (modalId === 'modalProceso') {
        limpiarFormularioProceso();
    }

    // Fix tabla modalDirecta3P
    if (modalId === 'modalDirecta3P') {
        setTimeout(function() {
            var m = document.getElementById('modalDirecta3P');
            if (!m) return;
            var t = m.querySelector('table');
            if (t) {
                t.style.setProperty('display','table','important');
                t.style.setProperty('width','100%','important');
                t.style.setProperty('border-collapse','collapse','important');
                t.style.setProperty('min-width','580px','important');
            }
            var thead = m.querySelector('thead');
            if (thead) thead.style.setProperty('display','table-header-group','important');
            var tbody = m.querySelector('tbody');
            if (tbody) tbody.style.setProperty('display','table-row-group','important');
            m.querySelectorAll('tr').forEach(function(tr){
                tr.style.setProperty('display','table-row','important');
            });
            m.querySelectorAll('th').forEach(function(th){
                th.style.setProperty('display','table-cell','important');
                th.style.setProperty('padding','13px 15px','important');
                th.style.setProperty('background','#EFF6FF','important');
                th.style.setProperty('color','#123C7B','important');
                th.style.setProperty('font-weight','700','important');
                th.style.setProperty('border-bottom','2px solid #DBEAFE','important');
                th.style.setProperty('text-align','left','important');
            });
            m.querySelectorAll('td').forEach(function(td){
                td.style.setProperty('display','table-cell','important');
                td.style.setProperty('padding','13px 15px','important');
                td.style.setProperty('border-bottom','1px solid #E5E7EB','important');
                td.style.setProperty('vertical-align','top','important');
                td.style.setProperty('white-space','normal','important');
            });
        }, 30);
    }
}

function closeModal(modalId){
    const modal = document.getElementById(modalId);

    if(modal){
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

document.addEventListener('DOMContentLoaded', function(){

    // Cerrar al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal=>{
        modal.addEventListener('click', function(e){
            if(e.target === modal){
                modal.style.display='none';
                document.body.style.overflow='auto';
            }
        });
    });

    // Habilitar botones con data-modal
    document.querySelectorAll('[data-modal]').forEach(btn=>{
        btn.addEventListener('click', function(){
            const modalId = this.getAttribute('data-modal');
            openModal(modalId);
        });
    });

    // Cerrar con X
    document.querySelectorAll('.close').forEach(btn=>{
        btn.addEventListener('click', function(){

            const modal = this.closest('.modal');

            if(modal){
                modal.style.display='none';
                document.body.style.overflow='auto';
            }
        });
    });

});

// Cerrar cualquier modal abierto con la tecla Escape — antes solo se podía
// cerrar con la "X" o con clic fuera. El sitio usa varios patrones de modal
// distintos (la clase genérica ".modal", el modal de JURISKILLS creado por
// JS, los mini-modales de PAA/CDP de Directa 3 Invitaciones, etc.), así que
// en vez de enumerar cada uno se detecta cualquier elemento visible cuyo id
// contenga "modal" (sin importar mayúsculas) y cuya posición sea "fixed"
// (así nunca se confunde con, por ejemplo, un <div> que solo muestra el
// nombre de un archivo y que por coincidencia también tiene "modal" en el id).
document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape' && e.key !== 'Esc') return;

    // El panel de detalle del historial ("👁 Ver") se dibuja ENCIMA del modal
    // de historial pero no es un ".modal" (usa la clase "open", no display),
    // así que el detector genérico de abajo (busca ids que contengan "modal")
    // nunca lo veía y Escape cerraba de una vez el modal de historial que
    // quedaba detrás. Si el panel de detalle está abierto, Escape lo cierra
    // a él primero; recién en una segunda pulsación se cierra el modal.
    var panelDetalle = document.getElementById('hist-detalle-panel');
    if (panelDetalle && panelDetalle.classList.contains('open')) {
        panelDetalle.classList.remove('open');
        return;
    }

    document.querySelectorAll('[id]').forEach(function(el){
        if (el.id.toLowerCase().indexOf('modal') === -1) return;
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed' || cs.display === 'none') return;
        el.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
});

// ===== GESTIÓN DE SKILLS INTELIGENTES JURÍDICOS =====
// Las credenciales se manejan internamente sin exposición de API Keys

function mostrarModalApiKey() {
    const modal = document.getElementById('modalApiKey');
    modal.style.display = 'flex';
}

function cerrarModalApiKey() {
    document.getElementById('modalApiKey').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
var _modalApiKey = document.getElementById('modalApiKey');
if (_modalApiKey) {
    _modalApiKey.addEventListener('click', function(e) {
        if (e.target === this) cerrarModalApiKey();
    });
}
// ===== LÓGICA SUBDOCUMENTOS ÍTEMS 20 Y 21 ===== 


/**
 * Maneja la carga de un sub-documento dentro de un ítem compuesto.
 * @param {HTMLInputElement} input       - El input file disparado
 * @param {string}           divId       - ID del div donde mostrar el nombre
 * @param {string}           checkId     - ID del checkbox del ítem padre
 * @param {string[]}         todosIds    - Array con los IDs de todos los inputs del ítem
 */
// Ítems con sub-documentos (15, 20, 21). Igual que mostrarArchivo(): ya no
// analiza automático, solo registra "pendiente" (o "sin análisis" para las
// sub-casillas que no lo requieren, ver _SUBDOC_SIN_ANALISIS).
async function mostrarArchivoSub(input, divId, checkId, todosIds) {
    const div = document.getElementById(divId);
    if (!div) return;

    if (!input.files || input.files.length === 0) {
        div.innerHTML = 'Sin archivo cargado';
        actualizarProgresoSub(checkId, todosIds);
        return;
    }

    const archivo = input.files[0];
    const numItem = parseInt(checkId.replace('check_', ''));
    const sufijo  = divId.replace('nombreArchivo_', ''); // ej. '15a', '20b', '21a'

    div.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong>${archivo.name}</strong>`;

    if (_SUBDOC_SIN_ANALISIS.indexOf(sufijo) !== -1) {
        _lexconRegistrar(numItem, archivo, _analisisSinRequerir(numItem), 'sin_analisis');
    } else {
        _lexconRegistrar(numItem, archivo, null, 'pendiente');
    }

    actualizarPanelAgente();
    actualizarProgresoSub(checkId, todosIds);
    if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
}

function actualizarProgresoSub(checkId, todosIds) {
    // Determinar el número de ítem a partir del checkId (ej. 'check_20' → 20)
    const numItem = checkId.replace('check_', '');
    const total   = todosIds.length;
    let cargados  = 0;

    todosIds.forEach(id => {
        const inp = document.getElementById(id);
        if (inp && inp.files && inp.files.length > 0) cargados++;
    });

    // Actualizar barra de progreso
    const txt = document.getElementById('progreso_' + numItem + '_txt');
    const bar = document.getElementById('progreso_' + numItem + '_bar');
    if (txt) txt.textContent = cargados + ' / ' + total;
    if (bar) bar.style.width = Math.round((cargados / total) * 100) + '%';

    // Marcar checkbox cuando estén todos cargados
    const chk = document.getElementById(checkId);
    if (chk) {
        if (cargados === total) {
            chk.checked       = true;
            chk.indeterminate = false;
        } else if (cargados > 0) {
            chk.checked       = false;
            chk.indeterminate = true;   // parcialmente completado
        } else {
            chk.checked       = false;
            chk.indeterminate = false;
        }
    }
}


//===== LÓGICA LIBRETA MILITAR — ÍTEM 13 ===== 


function evaluarAplica13(radio) {
    const cargaWrap     = document.getElementById('carga_13_wrap');
    const justifWrap    = document.getElementById('justif_13_wrap');
    const banner        = document.getElementById('noaplica_13_banner');
    const badge         = document.getElementById('badge_aplica_13');
    const check13       = document.getElementById('check_13');

    // Si se deseleccionó (ver radioClicConDeseleccion), volver al estado
    // inicial: ninguna de las dos opciones marcada, nada visible todavía.
    if (!radio.checked) {
        cargaWrap.style.display  = 'none';
        justifWrap.style.display = 'none';
        banner.style.display     = 'none';
        badge.style.display      = 'none';
        return;
    }

    const aplica = radio.value === 'aplica';

    if (aplica) {
        // Mostrar sección de carga
        cargaWrap.style.display  = 'block';
        justifWrap.style.display = 'none';
        banner.style.display     = 'none';

        // Badge en la celda del nombre
        badge.innerHTML = '<span style="background:#DCFCE7;color:#166534;border:1px solid #86EFAC;'
            + 'border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Aplica</span>';
        badge.style.display = 'block';

        // Marcar checkbox automáticamente: contar el avance apenas se responde
        // "Aplica", sin esperar a que además se suba el archivo (igual que ya
        // pasaba del lado de "No aplica" un poco más abajo).
        if (check13) { check13.checked = true; check13.indeterminate = false; }

    } else {
        // Ocultar carga, mostrar justificación y banner
        cargaWrap.style.display  = 'none';
        justifWrap.style.display = 'block';

        // Limpiar select y campo libre
        const sel = document.getElementById('justif_13_sel');
        if (sel) sel.value = '';
        const otro = document.getElementById('justif_13_otro_wrap');
        if (otro) otro.style.display = 'none';
        document.getElementById('justif_13_preview').textContent = '';

        banner.style.display = 'none'; // Se mostrará cuando elija motivo

        badge.innerHTML = '<span style="background:#FEE2E2;color:#DC2626;border:1px solid #FECACA;'
            + 'border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/></svg>No aplica</span>';
        badge.style.display = 'block';

        // Marcar checkbox como no requerido (checked + estilo tachado como N/A)
        if (check13) { check13.checked = true; check13.indeterminate = false; }
    }
}

function actualizarJustif13() {
    const sel    = document.getElementById('justif_13_sel');
    const otro   = document.getElementById('justif_13_otro');
    const otroW  = document.getElementById('justif_13_otro_wrap');
    const prev   = document.getElementById('justif_13_preview');
    const banner = document.getElementById('noaplica_13_banner');
    const motivo = document.getElementById('noaplica_13_motivo');

    if (!sel) return;

    const val = sel.value;
    const esOtro = val === 'Otro motivo';
    otroW.style.display = esOtro ? 'block' : 'none';

    let textoFinal = '';
    if (val && !esOtro)   textoFinal = val;
    if (esOtro && otro)   textoFinal = otro.value.trim() || '';

    if (textoFinal) {
        prev.innerHTML  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Justificación registrada: ' + escaparHTML(textoFinal);
        banner.style.display = 'block';
        if (motivo) motivo.textContent = textoFinal;
    } else {
        prev.textContent  = '';
        banner.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════
//  JURISKILLS IA — MOTOR DE VERSIONES + REANALISIS COMPARATIVO POR SKILLS
//  Ítems 4 · 5 · 9 · 23  —  Acuerdo 015/2024 + Resolución 0456/2024
// ═══════════════════════════════════════════════════════════════════════

// Historial completo con análisis por versión
const historialDocs = { 4: [], 5: [], 9: [], 23: [] };

// ── Función principal: registra versión, analiza y compara ──
async function registrarVersionDoc(input, numItem) {
    if (!input.files || input.files.length === 0) return;
    const archivo = input.files[0];
    const ahora   = new Date();
    const hist    = historialDocs[numItem];
    if (!hist) return;

    const version  = hist.length + 1;
    const fechaStr = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr  = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Marcar como "analizando" mientras se procesa
    const entrada = {
        version,
        nombre:    archivo.name,
        tamano:    formatearTamano(archivo.size),
        fecha:     fechaStr,
        hora:      horaStr,
        timestamp: ahora.getTime(),
        analisis:  null,
        estado:    'analizando'
    };
    hist.push(entrada);
    renderizarHistorial(numItem);

    // Leer contenido y correr análisis por skills
    try {
        const contenido = await leerArchivo(archivo);
        const analisis  = ejecutarSkillJuridico(numItem, archivo.name, contenido);

        // Comparación con versión anterior (si existe)
        const versionAnterior = hist.length >= 2 ? hist[hist.length - 2] : null;
        const comparacion     = versionAnterior && versionAnterior.analisis
            ? compararVersiones(versionAnterior.analisis, analisis, numItem)
            : null;

        entrada.analisis    = analisis;
        entrada.estado      = analisis.estado;
        entrada.comparacion = comparacion;

    } catch (err) {
        entrada.estado   = 'error';
        entrada.analisis = {
            estado: 'error',
            hallazgos: ['Error al leer el documento: ' + (err.message || 'desconocido')],
            advertencias: [], correccionesResueltas: [], advertenciasResueltas: [],
            recomendaciones: [], puntaje: 0
        };
    }

    renderizarHistorial(numItem);
}


// ── Comparar versión anterior vs versión actual ──
function compararVersiones(analisisAnterior, analisisActual, numItem) {
    const skill = typeof SKILLS_JURIDICOS !== 'undefined' ? SKILLS_JURIDICOS[numItem] : null;

    const hallazgosAnt = new Set(analisisAnterior.hallazgos || []);
    const hallazgosAct = new Set(analisisActual.hallazgos   || []);
    const advAnt       = new Set(analisisAnterior.advertencias || []);
    const advAct       = new Set(analisisActual.advertencias   || []);

    // Correcciones resueltas: estaban en anterior, ya no están en actual
    const correccionesResueltas = [...hallazgosAnt].filter(h => !hallazgosAct.has(h));
    // Advertencias resueltas
    const advertenciasResueltas = [...advAnt].filter(a => !advAct.has(a));
    // Nuevos problemas que no estaban antes
    const nuevosHallazgos = [...hallazgosAct].filter(h => !hallazgosAnt.has(h));
    // Problemas que persisten
    const persistentes    = [...hallazgosAct].filter(h => hallazgosAnt.has(h));

    // Tendencia del puntaje
    const deltaP  = (analisisActual.puntaje || 0) - (analisisAnterior.puntaje || 0);
    let tendencia = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>Sin cambio';
    if (deltaP > 0)  tendencia = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Mejora de ${deltaP} puntos`;
    if (deltaP < 0)  tendencia = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>Retroceso de ${Math.abs(deltaP)} puntos`;

    return {
        correccionesResueltas,
        advertenciasResueltas,
        nuevosHallazgos,
        persistentes,
        deltaP,
        tendencia
    };
}

// ── renderizarPanelVersiones eliminado: el análisis jurídico por skills
//    solo se muestra en el modal JURISKILLS IA – Análisis Documental ──

// ── Historial compacto (sidebar de cargas) ──
function formatearTamano(bytes) {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function renderizarHistorial(numItem) {
    const contenedor = document.getElementById('historial_' + numItem);
    const badge      = document.getElementById('badge_hist_' + numItem);
    const emptyMsg   = document.getElementById('historial_empty_' + numItem);
    const hist       = historialDocs[numItem];

    if (!contenedor) return;
    if (badge)    badge.textContent = hist.length;
    if (emptyMsg) emptyMsg.style.display = hist.length > 0 ? 'none' : 'block';

    contenedor.querySelectorAll('.hist-entrada').forEach(e => e.remove());

    [...hist].reverse().forEach((entrada, idx) => {
        const esUltima  = idx === 0;
        const esPrimera = entrada.version === 1;

        const _svgCheck  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
        const _svgAlerta = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        const _svgReloj  = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
        const _svgArchivo = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        const estadoIcono = {
            ok: _svgCheck, advertencia: _svgAlerta, correccion: _svgAlerta,
            error: _svgAlerta, analizando: _svgReloj
        }[entrada.estado] || _svgArchivo;

        const div = document.createElement('div');
        div.className = 'hist-entrada';
        div.innerHTML = `
            <div class="hist-num ${esPrimera ? 'hist-num-v1' : 'hist-num-vN'}">${entrada.version}</div>
            <div class="hist-info">
                <div class="hist-nombre">
                    ${estadoIcono} ${entrada.nombre}
                    ${esPrimera ? '<span class="hist-tag-v1">v1 · Inicial</span>' : `<span class="hist-tag-vN">v${entrada.version}</span>`}
                    ${esUltima ? '<span class="hist-tag-last"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Actual</span>' : ''}
                </div>
                <div class="hist-meta">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${entrada.fecha}
                    &nbsp;·&nbsp; ${_svgReloj.replace('12" height="12"','10" height="10"').replace('vertical-align:-2px','vertical-align:-1px;margin-right:2px')}${entrada.hora}
                    &nbsp;·&nbsp; <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>${entrada.tamano}
                </div>
            </div>`;
        contenedor.appendChild(div);
    });

    contenedor.style.display = 'block';
}

function toggleHistorial(numItem) {
    const contenedor = document.getElementById('historial_' + numItem);
    if (!contenedor) return;
    contenedor.style.display = contenedor.style.display === 'none' ? 'block' : 'none';
}
window.cd3p_cargar = function(input, num) {
  if (!input.files || input.files.length === 0) return;
  var archivo = input.files[0];
  var nombre  = document.getElementById('cd3p_nombre_' + num);
  var estado  = document.getElementById('cd3p_estado_' + num);
  var row     = document.getElementById('cd3p_row_' + num);
  var tam = archivo.size < 1024*1024
    ? (archivo.size/1024).toFixed(1)+' KB'
    : (archivo.size/1024/1024).toFixed(2)+' MB';
  if (nombre) nombre.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><strong style="color:#1F2937;">' + archivo.name + '</strong> <span style="font-size:10px;color:#6B7280;">(' + tam + ')</span>';
  if (estado) { estado.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Cargado'; estado.style.background='#DCFCE7'; estado.style.color='#166534'; }
  if (row)    { row.style.background='#F0FDF4'; row.style.borderColor='#86EFAC'; }
  cd3p_actualizarProgreso();
};

function cd3p_actualizarProgreso() {
  var cargados = 0;
  for (var i = 1; i <= 6; i++) {
    var e = document.getElementById('cd3p_estado_' + i);
    if (e && e.textContent.indexOf('Cargado') !== -1) cargados++;
  }
  var pct      = Math.round((cargados / 6) * 100);
  var barra    = document.getElementById('cd3p_barra');
  var txt      = document.getElementById('cd3p_txt');
  var completo = document.getElementById('cd3p_completado');
  if (barra)    barra.style.width = pct + '%';
  if (txt)      txt.textContent   = cargados + ' / 6';
  if (completo) completo.style.display = (cargados === 6) ? 'block' : 'none';
}

/* ===== HISTORIAL VERSIONES DIRECTA 3P ===== */
var d3p_historial = { 3: [], 4: [], 6: [] };

function d3p_registrarVersion(input, numItem) {
  if (!input.files || !input.files[0]) return;
  var f = input.files[0];
  var ahora = new Date();
  var hist = d3p_historial[numItem];
  if (!hist) return;
  var tam = f.size < 1048576
    ? (f.size/1024).toFixed(1)+' KB'
    : (f.size/1048576).toFixed(2)+' MB';
  hist.push({
    version: hist.length + 1,
    nombre:  f.name,
    tamano:  tam,
    fecha:   ahora.toLocaleDateString('es-CO',{day:'2-digit',month:'2-digit',year:'numeric'}),
    hora:    ahora.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit',second:'2-digit'})
  });
  d3p_renderHistorial(numItem);
}

function d3p_renderHistorial(numItem) {
  var c  = document.getElementById('d3p_historial_' + numItem);
  var b  = document.getElementById('d3p_badge_hist_' + numItem);
  var em = document.getElementById('d3p_historial_empty_' + numItem);
  var hist = d3p_historial[numItem];
  if (!c) return;
  if (b)  b.textContent = hist.length;
  if (em) em.style.display = hist.length ? 'none' : 'block';
  c.querySelectorAll('.hist-entrada').forEach(function(e){ e.remove(); });
  hist.slice().reverse().forEach(function(e, idx) {
    var div = document.createElement('div');
    div.className = 'hist-entrada';
    var isPrimera = e.version === 1;
    div.innerHTML =
      '<div class="hist-num '+(isPrimera?'hist-num-v1':'hist-num-vN')+'">'+e.version+'</div>'+
      '<div class="hist-info">'+
        '<div class="hist-nombre"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'+e.nombre+
          (isPrimera?'<span class="hist-tag-v1">v1 · Inicial</span>':'<span class="hist-tag-vN">v'+e.version+'</span>')+
          (idx===0?'<span class="hist-tag-last"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:1px;" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>Actual</span>':'')+
        '</div>'+
        '<div class="hist-meta"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'+e.fecha+' · <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'+e.hora+' · <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:2px;" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>'+e.tamano+'</div>'+
      '</div>';
    c.appendChild(div);
  });
  c.style.display = 'block';
}

function d3p_toggleHistorial(numItem) {
  var c = document.getElementById('d3p_historial_' + numItem);
  if (c) c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

function exportarBDProcesos() {
    if (BD_PROCESOS.length === 0) {
        alert('No hay procesos guardados para exportar.');
        return;
    }
    const cols = ['ID','Objeto','Modalidad','Área','Fecha','Hora','Docs Cargados','Ítems Marcados'];
    const filas = BD_PROCESOS.map(p => [
        p.id,
        '"' + p.objeto.replace(/"/g, '""') + '"',
        p.modalidad,
        '"' + p.area.replace(/"/g, '""') + '"',
        p.fecha, p.hora,
        p.docsTotal,
        p.checkOk
    ].join(','));
    const csv     = [cols.join(','), ...filas].join('\n');
    const blob    = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = 'historial_procesos_CD1P_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}


(function(){
  var HSLV_D3P_DOCS = [
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
    'LIBRETA MILITAR',
    'REGISTRO ÚNICO TRIBUTARIO',
    'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
    'CERTIFICADO ANTECEDENTES DE DELITOS SEXUALES',
    'CERTIFICADO DE INEXISTENCIA DE INHABILIDADES E INCOMPATIBILIDADES',
    'CERTIFICADO DE MEDIDAS CORRECTIVAS',
    'CERTIFICADO REDAM',
    'REVISOR FISCAL (CÉDULA, ANTECEDENTES, TARJETA PROFESIONAL)',
    'CERTIFICACIÓN Y PLANILLAS DE SEGURIDAD SOCIAL',
    'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT',
    'ACTA DE EVALUACIÓN'
  ];

  function hslvSetDisplay(el, prop, value){
    if(el) el.style.setProperty(prop, value, 'important');
  }

  function hslvUpdateD3PProgress(){
    var checks = document.querySelectorAll('#hslvD3PChecklistFallback input[type="checkbox"]');
    if(!checks.length) return;
    var ok = 0;
    checks.forEach(function(c){ if(c.checked) ok++; });
    var pct = Math.round((ok / checks.length) * 100);
    var pctEl = document.getElementById('d3p-avance-pct');
    var fill = document.getElementById('d3p-avance-fill');
    var txt = document.getElementById('d3p-avance-texto');
    if(pctEl) pctEl.textContent = pct + '%';
    if(fill) fill.style.width = pct + '%';
    if(txt) txt.textContent = ok + ' de ' + checks.length + ' documentos verificados';
  }

  function hslvCrearFallback(modal){
    var old = document.getElementById('hslvD3PChecklistFallback');
    if(old) return old;

    var wrap = document.createElement('div');
    wrap.id = 'hslvD3PChecklistFallback';
    wrap.innerHTML = '<div class="hslv-d3p-fallback-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Checklist documental habilitado en modo de visualización reforzada. Puede validar cada requisito y cargar su soporte individual.</div>' +
      '<table><thead><tr><th style="width:70px;">#</th><th>Documento Requerido</th><th style="width:130px;">Validación</th><th style="width:330px;">Carga de Documento</th></tr></thead><tbody>' +
      HSLV_D3P_DOCS.map(function(doc, idx){
        var n = idx + 1;
        return '<tr>' +
          '<td><strong>' + n + '</strong></td>' +
          '<td>' + doc + '</td>' +
          '<td><input type="checkbox" id="hslv_d3p_chk_' + n + '" onchange="window.hslvUpdateD3PProgress && window.hslvUpdateD3PProgress()"></td>' +
          '<td>' +
            '<button type="button" class="btn" onclick="document.getElementById(\'hslv_d3p_arch_' + n + '\').click()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px;" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Cargar Documento</button>' +
            '<input type="file" id="hslv_d3p_arch_' + n + '" style="display:none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onchange="window.hslvD3PFallbackFile(this,' + n + ')">' +
            '<div id="hslv_d3p_nom_' + n + '" class="hslv-file-name">Sin archivo cargado</div>' +
          '</td>' +
        '</tr>';
      }).join('') + '</tbody></table>';

    var alertas = modal.querySelectorAll('.alert-box');
    var anchor = alertas.length ? alertas[alertas.length - 1] : modal.querySelector('.modal-header');
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    }else{
      modal.querySelector('.modal-content').appendChild(wrap);
    }
    return wrap;
  }

  window.hslvD3PFallbackFile = function(input, n){
    var lbl = document.getElementById('hslv_d3p_nom_' + n);
    if(lbl){
      lbl.innerHTML = input.files && input.files[0] ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><strong style="color:#1F2937;">' + input.files[0].name + '</strong>' : 'Sin archivo cargado';
    }
    var chk = document.getElementById('hslv_d3p_chk_' + n);
    if(chk) chk.checked = !!(input.files && input.files[0]);
    hslvUpdateD3PProgress();
  };
  window.hslvUpdateD3PProgress = hslvUpdateD3PProgress;

  function hslvFixD3PVisual(){
    var modal = document.getElementById('modalDirecta3P');
    if(!modal) return;
    var content = modal.querySelector('.modal-content');
    var wrapper = modal.querySelector('.checklist-wrapper');
    var table = wrapper ? wrapper.querySelector('table') : modal.querySelector('table');

    hslvSetDisplay(modal, 'overflow-y', 'auto');
    if(content){
      hslvSetDisplay(content, 'overflow-y', 'auto');
      hslvSetDisplay(content, 'overflow-x', 'hidden');
      hslvSetDisplay(content, 'max-height', '94vh');
    }
    if(wrapper){
      hslvSetDisplay(wrapper, 'display', 'block');
      hslvSetDisplay(wrapper, 'visibility', 'visible');
      hslvSetDisplay(wrapper, 'opacity', '1');
      hslvSetDisplay(wrapper, 'height', 'auto');
      hslvSetDisplay(wrapper, 'max-height', 'none');
      hslvSetDisplay(wrapper, 'overflow-x', 'auto');
      hslvSetDisplay(wrapper, 'overflow-y', 'visible');
    }
    if(table){
      hslvSetDisplay(table, 'display', 'table');
      hslvSetDisplay(table, 'width', '100%');
      hslvSetDisplay(table, 'min-width', '980px');
      var thead = table.querySelector('thead');
      var tbody = table.querySelector('tbody');
      hslvSetDisplay(thead, 'display', 'table-header-group');
      hslvSetDisplay(tbody, 'display', 'table-row-group');
      table.querySelectorAll('tr').forEach(function(tr){hslvSetDisplay(tr, 'display', 'table-row');});
      table.querySelectorAll('th,td').forEach(function(td){hslvSetDisplay(td, 'display', 'table-cell');});
    }

    // Si por el HTML original el navegador no muestra la tabla, activar respaldo visual.
    setTimeout(function(){
      var w = modal.querySelector('.checklist-wrapper');
      var rows = w ? w.querySelectorAll('tbody tr').length : 0;
      var visibleHeight = w ? w.getBoundingClientRect().height : 0;
      var fallback = hslvCrearFallback(modal);
      var usarFallback = (!w || rows < 10 || visibleHeight < 80);
      if(usarFallback){
        if(w) w.style.setProperty('display','none','important');
        // Evitar que los checkboxes ocultos del HTML original alteren el conteo del historial.
        if(w){
          w.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
            cb.setAttribute('data-hslv-original-type','checkbox');
            cb.type = 'hidden';
          });
        }
        fallback.style.display = 'block';
        hslvUpdateD3PProgress();
      }else{
        fallback.style.display = 'none';
      }
    }, 90);
  }

  document.addEventListener('DOMContentLoaded', function(){
    hslvFixD3PVisual();
    var btns = document.querySelectorAll('[onclick*="modalDirecta3P"]');
    btns.forEach(function(btn){ btn.addEventListener('click', function(){ setTimeout(hslvFixD3PVisual, 120); }); });
  });

  var originalOpenModal = window.openModal;
  window.openModal = function(modalId){
    if(typeof originalOpenModal === 'function') originalOpenModal.apply(this, arguments);
    else {
      var modal = document.getElementById(modalId);
      if(modal) modal.style.display = 'flex';
    }
    if(modalId === 'modalDirecta3P') setTimeout(hslvFixD3PVisual, 120);
  };
})();

/* ─── Utilidades transferencia de datos entre modales ─── */
function _mpGetData() {
  return {
    objeto: (document.getElementById('mp_objeto') || {}).value || '',
    area:   (document.getElementById('mp_area')   || {}).value || ''
  };
}
function _d3pGetData() {
  var obj  = document.querySelector('#modalDirecta3P textarea');
  var area = document.querySelector('#modalDirecta3P input[placeholder="Dependencia solicitante"]');
  return { objeto: obj ? obj.value : '', area: area ? area.value : '' };
}
function _fillMPFields(data) {
  var ob = document.getElementById('mp_objeto');
  var ar = document.getElementById('mp_area');
  if (ob && data.objeto) ob.value = data.objeto;
  if (ar && data.area)   ar.value = data.area;
}
function _fillD3PFields(data) {
  var obj  = document.querySelector('#modalDirecta3P textarea');
  var area = document.querySelector('#modalDirecta3P input[placeholder="Dependencia solicitante"]');
  if (obj  && data.objeto) obj.value  = data.objeto;
  if (area && data.area)   area.value = data.area;
}

/* ─── Toast de aviso ─── */
var _toastTimer = null;
function _mostrarToast(nombre) {
  var n = document.getElementById('mod-redirect-notice');
  if (!n) return;
  n.style.display = 'flex';
  n.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>&nbsp;<span>Cambiando a <strong>' + nombre + '</strong></span>';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ n.style.display = 'none'; }, 2800);
}


/* ═══════════════════════════════════════════════════════════════
     JURISKILLS IA BLOCK PARA MODAL DIRECTA 3 PROPUESTAS
    ═══════════════════════════════════════════════════════════════ */

(function(){
  // Inyectar JURISKILLS IA + Observaciones en modalDirecta3P justo antes del footer de botones
  var target = document.querySelector('#modalDirecta3P .modal-content');
  if (!target) return;
  var footer = target.querySelector('div[style*="display:flex;gap:12px"]');
  if (!footer) return;

  var lexconHtml = `
  <div class="agente-ia-box" id="d3p_lexcon_box" style="margin-top:22px;">
    <div class="agente-ia-header">
      <div class="agente-ia-info">
        <div class="agente-ia-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg></div>
        <div>
          <div class="agente-ia-title">JURISKILLS IA - Análisis Inteligente de Contratacion <span class="beta-tag">BETA</span></div>
          <div class="agente-ia-text">Carga documentos en el checklist y JURISKILLS los analiza con base en el <strong>Acuerdo 015/2024</strong> y la <strong>Resolución 0456/2024</strong> del HSLV, Ley 80/1993 y Decreto 1082/2015. Ahora también revisa <strong>redacción</strong> (campos vacíos, fechas incorrectas) y <strong>concordancia</strong> entre documentos (objeto, NIT, CDP).</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
            <span id="d3p_iaContadorDocs">0 documentos</span>
          </div>
          <div id="d3p_iaResumenGlobal"></div>
        </div>
      </div>
    </div>
    <div id="d3p_iaResultadosContenedor">
      <div style="text-align:center;padding:30px;color:#9CA3AF;">
        <div style="margin-bottom:10px;"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
        <p>Carga documentos en el checklist para que JURISKILLS los analice automáticamente.</p>
      </div>
    </div>
    <div class="ia-grid" style="margin-top:18px;">
      <div>
        <div class="ia-section-title">Observaciones adicionales</div>
        <textarea class="ia-observaciones" id="d3p_iaObservaciones"
          placeholder="Escriba observaciones o justificaciones adicionales…"
          oninput="document.getElementById('d3p_iaCharCount').textContent=this.value.length+'/1000 caracteres'"
          maxlength="1000"></textarea>
        <div id="d3p_iaCharCount" style="margin-top:6px;color:#6B7280;font-size:12px;">0/1000 caracteres</div>
      </div>
      <div>
        <div class="normativa-box">
          <h4>Normativa aplicada por JURISKILLS</h4>
          <ul>
            <li>Ley 80 de 1993 y Ley 1150 de 2007</li>
            <li>Decreto 1082 de 2015</li>
            <li><strong>Acuerdo 015/2024 HSLV</strong> – Estatuto de Contratación</li>
            <li><strong>Resolución 0456/2024 HSLV</strong> – Manual de Contratación</li>
            <li>Ley 734/2002 · Ley 610/2000 · Ley 1918/2018</li>
          </ul>
        </div>
      </div>
    </div>
    <div class="agente-ia-footer">
      ⓘ El análisis es generado por IA/reglas automáticas con base en el contenido real de cada documento cargado y la normativa contractual vigente. No reemplaza el criterio jurídico del equipo de contratación. <strong>Independientemente del porcentaje o resultado obtenido — incluso al 100% — el documento siempre debe revisarse manualmente antes de continuar el proceso.</strong>
    </div>
  </div>`;

  footer.insertAdjacentHTML('beforebegin', lexconHtml);
})();


// Nota: el historial de versiones de Convocatoria y Subasta ahora se maneja
// con el mismo sistema universal (histU_*) que usan los otros 2 módulos —
// ver la sección "HISTORIAL DE VERSIONES — UNIVERSAL" más arriba en este archivo.

function conv_mostrarArchivo(input, labelId) {
  if (!input.files || !input.files[0]) return;
  var el = document.getElementById(labelId);
  if (el) el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong style="color:#1F2937;">' + input.files[0].name + '</strong>';
  histU_registrar(input, labelId);
}
function sub_mostrarArchivo(input, labelId) {
  if (!input.files || !input.files[0]) return;
  var el = document.getElementById(labelId);
  if (el) el.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><strong style="color:#1F2937;">' + input.files[0].name + '</strong>';
  histU_registrar(input, labelId);
}

/* ── Reemplazar las funciones de cambio de modalidad para usar los nuevos modales ── */
window.cambiarModalidadDesdeMP = function(val) {
  if (!val || val === 'Contratación Directa (1) Propuesta') return;
  var data = { objeto: (document.getElementById('mp_objeto')||{}).value||'', area: (document.getElementById('mp_area')||{}).value||'' };
  var sel = document.getElementById('mp_modalidad');
  if (sel) sel.value = 'Contratación Directa (1) Propuesta';

  if (val === 'Contratación Directa (3) Propuestas') {
    closeModal('modalProceso');
    setTimeout(function() {
      var obj = document.querySelector('#modalDirecta3P textarea'); if (obj && data.objeto) obj.value = data.objeto;
      var ar  = document.querySelector('#modalDirecta3P input[placeholder="Dependencia solicitante"]'); if (ar && data.area) ar.value = data.area;
      var s = document.getElementById('d3p_modalidad'); if (s) s.value = val;
      openModal('modalDirecta3P');
    }, 120);
  } else if (val === 'Contratación por Convocatoria Pública') {
    closeModal('modalProceso');
    setTimeout(function() {
      var ob = document.getElementById('conv_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('conv_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalConvocatoria');
    }, 120);
    _mostrarToast('Convocatoria Pública');
  } else if (val === 'Subasta Inversa') {
    closeModal('modalProceso');
    setTimeout(function() {
      var ob = document.getElementById('sub_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('sub_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalSubasta');
    }, 120);
    _mostrarToast('Subasta Inversa');
  }
};

window.cambiarModalidadDesdeD3P = function(val) {
  if (!val || val === 'Contratación Directa (3) Propuestas') return;
  var obj  = document.querySelector('#modalDirecta3P textarea');
  var area = document.querySelector('#modalDirecta3P input[placeholder="Dependencia solicitante"]');
  var data = { objeto: obj ? obj.value : '', area: area ? area.value : '' };
  var sel = document.getElementById('d3p_modalidad'); if (sel) sel.value = 'Contratación Directa (3) Propuestas';

  if (val === 'Contratación Directa (1) Propuesta') {
    closeModal('modalDirecta3P');
    setTimeout(function() {
      var ob = document.getElementById('mp_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('mp_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalProceso');
    }, 120);
  } else if (val === 'Contratación por Convocatoria Pública') {
    closeModal('modalDirecta3P');
    setTimeout(function() {
      var ob = document.getElementById('conv_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('conv_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalConvocatoria');
    }, 120);
    _mostrarToast('Convocatoria Pública');
  } else if (val === 'Subasta Inversa') {
    closeModal('modalDirecta3P');
    setTimeout(function() {
      var ob = document.getElementById('sub_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('sub_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalSubasta');
    }, 120);
    _mostrarToast('Subasta Inversa');
  }
};

/* ── Permitir "desmarcar" un radio haciendo clic de nuevo sobre el que ya
   estaba elegido ────────────────────────────────────────────────────────
   Un <input type="radio"> nativo no se puede desmarcar por sí solo con un
   segundo clic — el navegador solo permite CAMBIAR a otro radio del mismo
   grupo, nunca dejar el grupo sin ninguno marcado. Estas dos funciones se
   usan juntas en el HTML (onmousedown + onclick) para lograrlo:
   1) onmousedown guarda si el radio YA estaba marcado antes de este clic
      (hay que capturarlo ANTES del clic, porque al momento del evento
      "click" el navegador ya lo dejó marcado de todas formas).
   2) onclick revisa ese dato: si ya estaba marcado, lo desmarca a mano y
      llama la función de turno (actualizarOpcionesSubasta, evaluarAplica13,
      etc.) para que la pantalla refleje "ninguna opción elegida". */
function radioPermitirDeseleccion(input) {
    input.dataset.previoMarcado = input.checked ? '1' : '0';
}

function radioClicConDeseleccion(input, callback) {
    if (input.dataset.previoMarcado === '1') {
        input.checked = false;
    }
    if (typeof callback === 'function') callback(input);
}

/* ── Ítem 9 (Estudio de Mercado) de Contratación Directa 1 Propuesta ──
   Antes había que elegir el radio amarillo (distribuidor sí/no) y LUEGO
   otro radio en el recuadro blanco para que aparecieran los botones de
   carga. Como el recuadro blanco de cada caso solo tenía una única opción
   posible, ese segundo clic era innecesario — ahora basta con elegir el
   radio amarillo para que aparezcan los botones directamente; el recuadro
   blanco quedó solo como texto informativo (sin radio). */
function actualizarOpcionesSubasta() {
  var opcion = document.querySelector('input[name="sub_distribuidor"]:checked');
  var opcDocumentos = document.getElementById('sub_opciones_documentos');
  var opcionNo = document.getElementById('sub_opcion_no_distribuidor');
  var opcionSi = document.getElementById('sub_opcion_distribuidor');
  var botonesCarga = document.getElementById('sub_botones_carga');
  var btnMercado = document.getElementById('sub_btn_mercado');
  var btnPropuestas = document.getElementById('sub_btn_propuestas');
  var btnCarta = document.getElementById('sub_btn_carta');

  if (!opcion) {
    opcDocumentos.style.display = 'none';
    botonesCarga.style.display = 'none';
    return;
  }

  opcDocumentos.style.display = 'block';
  botonesCarga.style.display = 'flex';

  if (opcion.value === 'no') {
    opcionNo.style.display = 'block';
    opcionSi.style.display = 'none';
    btnMercado.style.display = 'block';
    btnPropuestas.style.display = 'block';
    btnCarta.style.display = 'none';
  } else {
    opcionNo.style.display = 'none';
    opcionSi.style.display = 'block';
    btnMercado.style.display = 'none';
    btnPropuestas.style.display = 'none';
    btnCarta.style.display = 'block';
  }
}

/* ── Funciones para Estudio de Mercado con lógica condicional (Convocatoria) ── */
function actualizarOpcionesConv() {
  var opcion = document.querySelector('input[name="conv_distribuidor"]:checked');
  var opcDocumentos = document.getElementById('conv_opciones_documentos');
  var opcionNo = document.getElementById('conv_opcion_no_distribuidor');
  var opcionSi = document.getElementById('conv_opcion_distribuidor');
  
  if (!opcion) {
    opcDocumentos.style.display = 'none';
    return;
  }
  
  opcDocumentos.style.display = 'block';
  
  if (opcion.value === 'no') {
    opcionNo.style.display = 'block';
    opcionSi.style.display = 'none';
    // Limpiar checksboxes del distribuidor
    var cartaDist = document.getElementById('conv_carta_distribuidor');
    if (cartaDist) cartaDist.checked = false;
  } else {
    opcionNo.style.display = 'none';
    opcionSi.style.display = 'block';
    // Limpiar checkboxes de no distribuidor
    var mercado = document.getElementById('conv_mercado_file');
    var propuestas = document.getElementById('conv_propuestas_file');
    if (mercado) mercado.checked = false;
    if (propuestas) propuestas.checked = false;
  }
}

/* También actualizar los modales de conv y sub para permitir cambio de modalidad */
function cambiarModalidadDesdeConv(val) {
  if (!val || val === 'Contratación por Convocatoria Pública') return;
  var data = { objeto: (document.getElementById('conv_objeto')||{}).value||'', area: (document.getElementById('conv_area')||{}).value||'' };
  closeModal('modalConvocatoria');
  setTimeout(function() {
    if (val === 'Contratación Directa (1) Propuesta') {
      var ob = document.getElementById('mp_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('mp_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalProceso');
    } else if (val === 'Contratación Directa (3) Propuestas') {
      var obj2 = document.querySelector('#modalDirecta3P textarea'); if (obj2 && data.objeto) obj2.value = data.objeto;
      openModal('modalDirecta3P');
    } else if (val === 'Subasta Inversa') {
      var ob2 = document.getElementById('sub_objeto'); if (ob2 && data.objeto) ob2.value = data.objeto;
      var ar2 = document.getElementById('sub_area');   if (ar2 && data.area)   ar2.value = data.area;
      openModal('modalSubasta');
    }
  }, 120);
  _mostrarToast(val);
}

function cambiarModalidadDesdeSub(val) {
  if (!val || val === 'Subasta Inversa') return;
  var data = { objeto: (document.getElementById('sub_objeto')||{}).value||'', area: (document.getElementById('sub_area')||{}).value||'' };
  closeModal('modalSubasta');
  setTimeout(function() {
    if (val === 'Contratación Directa (1) Propuesta') {
      var ob = document.getElementById('mp_objeto'); if (ob && data.objeto) ob.value = data.objeto;
      var ar = document.getElementById('mp_area');   if (ar && data.area)   ar.value = data.area;
      openModal('modalProceso');
    } else if (val === 'Contratación Directa (3) Propuestas') {
      var obj2 = document.querySelector('#modalDirecta3P textarea'); if (obj2 && data.objeto) obj2.value = data.objeto;
      openModal('modalDirecta3P');
    } else if (val === 'Contratación por Convocatoria Pública') {
      var ob2 = document.getElementById('conv_objeto'); if (ob2 && data.objeto) ob2.value = data.objeto;
      var ar2 = document.getElementById('conv_area');   if (ar2 && data.area)   ar2.value = data.area;
      openModal('modalConvocatoria');
    }
  }, 120);
  _mostrarToast(val);
}

/* ── Función para actualizar indicadores del dashboard desde historial ── */
function actualizarIndicadoresDesdeHistorial() {
  var historialJson = localStorage.getItem('historialProcesos');
  var historial = historialJson ? JSON.parse(historialJson) : [];
  
  if (!historial || historial.length === 0) return;
  
  var totalProcesos = historial.length;
  var conteoModalidad = {};
  
  historial.forEach(function(proc) {
    var modalidad = proc.modalidad || 'Indefinida';
    conteoModalidad[modalidad] = (conteoModalidad[modalidad] || 0) + 1;
  });
  
  // Actualizar cards de indicadores
  var cardTotal = document.querySelector('[data-indicator="total"]');
  var cardConvocatoria = document.querySelector('[data-indicator="convocatoria"]');
  var cardSubasta = document.querySelector('[data-indicator="subasta"]');
  var cardDirecta = document.querySelector('[data-indicator="directa"]');
  
  if (cardTotal) {
    var numTotal = cardTotal.querySelector('.card-number');
    if (numTotal) numTotal.textContent = totalProcesos;
  }
  
  if (cardConvocatoria) {
    var num = cardConvocatoria.querySelector('.card-number');
    if (num) num.textContent = conteoModalidad['Contratación por Convocatoria Pública'] || 0;
  }
  
  if (cardSubasta) {
    var num = cardSubasta.querySelector('.card-number');
    if (num) num.textContent = conteoModalidad['Subasta Inversa'] || 0;
  }
  
  if (cardDirecta) {
    var num = cardDirecta.querySelector('.card-number');
    if (num) num.textContent = (conteoModalidad['Contratación Directa (1) Propuesta'] || 0) + (conteoModalidad['Contratación Directa (3) Propuestas'] || 0);
  }
}

/* Actualizar los menús del sidebar para abrir los nuevos modales */
document.addEventListener('DOMContentLoaded', function() {
  // Actualizar indicadores al cargar la página
  actualizarIndicadoresDesdeHistorial();
  
  document.querySelectorAll('.menu-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var txt = this.innerText.trim();
      if (txt.includes('Convocatoria')) openModal('modalConvocatoria');
      if (txt.includes('Subasta'))      openModal('modalSubasta');
    });
  });
});
