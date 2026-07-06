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
    var btn = document.getElementById('sidebar-toggle');

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

        var num = parseInt((celdas[0].textContent || '').trim());
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
                        '🕓 Ver historial <span id="' + prefijoComentario + 'badge_hist_' + num + '" ' +
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

        var bloque = document.createElement('div');
        bloque.className = 'checklist-comentario';
        bloque.style.cssText = 'margin-top:10px;border-top:1px dashed #E5E7EB;padding-top:8px;';
        bloque.innerHTML =
            '<div style="font-size:10px;color:#6B7280;font-weight:700;' +
                'text-transform:uppercase;margin-bottom:4px;">💬 Comentarios</div>' +
            '<textarea id="' + prefijoComentario + 'coment_' + num + '" rows="1" ' +
                'placeholder="Escribir un comentario para este documento…" autocomplete="off" ' +
                'oninput="this.style.height=\'auto\';this.style.height=this.scrollHeight+\'px\';" ' +
                'style="width:44ch;max-width:100%;font-size:12px;padding:6px 8px;border:1px solid #CBD5E1;' +
                'border-radius:8px;resize:none;overflow:hidden;box-sizing:border-box;"></textarea>';
        celdaCarga.appendChild(bloque);
    });
});

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
//  SPLASH — barra sincronizada con carga real
//  Combina tiempo mínimo (3s) + carga real de la página
// ════════════════════════════════════════════════════
(function() {
    // Si ya se mostró el splash en esta sesión, no mostrarlo de nuevo
    var yaVisto = sessionStorage.getItem('splash_visto');
    var splash  = document.getElementById('splashScreen');

    if (yaVisto && splash) {
        splash.remove();
        document.body.style.overflow = 'auto';
        document.body.classList.remove('splash-activo');
        return; // salir sin hacer nada más
    }

    // Primera vez — mostrar el splash normalmente
    document.body.classList.add('splash-activo');

    var percent       = document.getElementById('splashPercent');
    var bar           = document.getElementById('splashBar');
    var MIN_MS        = 3000;
    var start         = Date.now();
    var paginaCargada = false;
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

    window.addEventListener('load', function() {
        pctCarga      = 100;
        paginaCargada = true;
        actualizarBarra();
        intentarOcultar();
    });

    function actualizarBarra() {
        var pctFinal = Math.round((pctTiempo + pctCarga) / 2);
        if (percent) percent.textContent = pctFinal + '%';
        if (bar)     bar.style.width     = pctFinal + '%';
    }

    function intentarOcultar() {
        if (!paginaCargada || !tiempoMinCumplido) return;

        if (percent) percent.textContent = '100%';
        if (bar)     bar.style.width     = '100%';
        document.body.style.overflow     = 'auto';

        setTimeout(function() {
            if (splash) {
                splash.classList.add('hide');
                setTimeout(function() {
                    if (splash) splash.remove();
                    document.body.classList.remove('splash-activo');

                    // Marcar como visto para esta sesión
                    sessionStorage.setItem('splash_visto', '1');

                }, 800);
            }
        }, 300);
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

    var total = HIST_BD.length;
    var cd1p  = HIST_BD.filter(function(p){ return p.tipo === 'CD1P'; }).length;
    var d3p   = HIST_BD.filter(function(p){ return p.tipo === 'D3P';  }).length;
    var conv  = HIST_BD.filter(function(p){ return p.tipo === 'CONV'; }).length;
    var sub   = HIST_BD.filter(function(p){ return p.tipo === 'SUB';  }).length;
    var docs  = HIST_BD.reduce(function(acc, p){ return acc + (p.checksOk || 0); }, 0);
    var docsTotal = HIST_BD.reduce(function(acc, p){ return acc + (p.checksTotal || 0); }, 0);
    var docsPct   = docsTotal > 0 ? Math.round((docs / docsTotal) * 100) : 0;
    var maxVal    = Math.max(total, 1);

    // Actualizar números en dashboard
    document.getElementById('dash-total').textContent = total;
    document.getElementById('dash-cd1p').textContent  = cd1p;
    document.getElementById('dash-d3p').textContent   = d3p;
    document.getElementById('dash-conv').textContent  = conv;
    document.getElementById('dash-sub').textContent   = sub;
    document.getElementById('dash-docs').textContent  = docs;

    // Barras de progreso proporcionales
    document.getElementById('dash-bar-total').style.width = '100%';
    document.getElementById('dash-bar-cd1p').style.width  = (total > 0 ? Math.round((cd1p/maxVal)*100) : 0) + '%';
    document.getElementById('dash-bar-d3p').style.width   = (total > 0 ? Math.round((d3p/maxVal)*100)  : 0) + '%';
    document.getElementById('dash-bar-conv').style.width  = (total > 0 ? Math.round((conv/maxVal)*100) : 0) + '%';
    document.getElementById('dash-bar-sub').style.width   = (total > 0 ? Math.round((sub/maxVal)*100)  : 0) + '%';
    document.getElementById('dash-bar-docs').style.width  = docsPct + '%';

    // Sub-textos informativos
    document.getElementById('dash-sub-total').textContent = total === 0
        ? 'Sin procesos guardados aún'
        : total + ' proceso' + (total !== 1 ? 's' : '') + ' en historial';
    document.getElementById('dash-sub-cd1p').textContent  = cd1p  + ' proceso' + (cd1p  !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-d3p').textContent   = d3p   + ' proceso' + (d3p   !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-conv').textContent  = conv  + ' proceso' + (conv  !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-sub').textContent   = sub   + ' proceso' + (sub   !== 1 ? 's' : '') + ' · Ver historial';
    document.getElementById('dash-sub-docs').textContent  = docs  + ' de ' + docsTotal + ' docs OK (' + docsPct + '%) · Ver historial';

    // Actualizar también los cards de indicadores si existen con atributos data-indicator
    actualizarCardsIndicadores(cd1p, d3p, conv, sub, total);
    
    // Actualizar contador de alertas jurídicas
    actualizarContadorAlertas();
}

function actualizarCardsIndicadores(cd1p, d3p, conv, sub, total) {
    // Actualizar card de Contratación Directa (CD1P + D3P)
    var cardDirecta = document.querySelector('[data-indicator="directa"]');
    if (cardDirecta) {
        var numEl = cardDirecta.querySelector('.card-number');
        if (numEl) numEl.textContent = cd1p + d3p;
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

/* ═══════════════════════════════════════════════════
   KPI VIGENCIAS — actualización dinámica desde HIST_BD
   ═══════════════════════════════════════════════════ */
function kpi_actualizarVigencias() {
  if (typeof HIST_BD === 'undefined') return;

  var hoy = new Date();
  var mes = hoy.toLocaleString('es-CO', { month: 'long' });
  var anio = hoy.getFullYear();
  var corte = document.getElementById('kpi_corte');
  if (corte) corte.textContent = 'Corte: ' + mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + anio;

  var total = HIST_BD.length;
  var cd1p  = HIST_BD.filter(function(p){ return p.tipo === 'CD1P'; }).length;
  var d3p   = HIST_BD.filter(function(p){ return p.tipo === 'D3P';  }).length;
  var conv  = HIST_BD.filter(function(p){ return p.tipo === 'CONV'; }).length;
  var sub   = HIST_BD.filter(function(p){ return p.tipo === 'SUB';  }).length;

  // KPI cards
  var el = function(id){ return document.getElementById(id); };
  if (el('kpi_vigentes'))      el('kpi_vigentes').textContent      = total;
  if (el('kpi_proxvencer'))    el('kpi_proxvencer').textContent    = cd1p;
  if (el('kpi_vencidos'))      el('kpi_vencidos').textContent      = d3p;
  if (el('kpi_liquidados'))    el('kpi_liquidados').textContent    = conv;
  if (el('kpi_adicionados'))   el('kpi_adicionados').textContent   = sub;

  // Sub-textos
  if (el('kpi_vigentes_sub'))    el('kpi_vigentes_sub').textContent    = total + ' proceso' + (total !== 1 ? 's' : '') + ' en historial';
  if (el('kpi_proxvencer_sub'))  el('kpi_proxvencer_sub').textContent  = cd1p + ' proceso' + (cd1p !== 1 ? 's' : '') + ' · Ver →';
  if (el('kpi_vencidos_sub'))    el('kpi_vencidos_sub').textContent    = d3p  + ' proceso' + (d3p  !== 1 ? 's' : '') + ' · Ver →';
  if (el('kpi_liquidados_sub'))  el('kpi_liquidados_sub').textContent  = conv + ' proceso' + (conv !== 1 ? 's' : '') + ' · Ver →';
  if (el('kpi_adicionados_sub')) el('kpi_adicionados_sub').textContent = sub  + ' proceso' + (sub  !== 1 ? 's' : '') + ' · Ver →';

  // Tabla de procesos recientes (últimos 5)
  var tbody = document.getElementById('kpi_tabla_recientes');
  if (!tbody) return;

  var TIPOS = {
    'CD1P': { label: 'Directa 1P',     color: '#0B7A43', bg: '#E8FFF0', border: '#86d19d' },
    'D3P':  { label: 'Directa 3P',     color: '#123C7B', bg: '#EFF6FF', border: '#BFDBFE' },
    'CONV': { label: 'Convocatoria',    color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
    'SUB':  { label: 'Subasta Inversa', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' }
  };

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:32px;text-align:center;color:#9CA3AF;">' +
      '<div style="font-size:32px;margin-bottom:8px;">📂</div>' +
      '<div style="font-size:13px;font-weight:600;">Aún no hay procesos guardados.</div>' +
      '<div style="font-size:12px;margin-top:4px;">Guarda un proceso desde cualquier modal y aparecerá aquí.</div>' +
      '</td></tr>';
    return;
  }

  var recientes = HIST_BD.slice(0, 5);
  var html = '';
  recientes.forEach(function(p, i) {
    var t = TIPOS[p.tipo] || TIPOS['D3P'];
    var pct = p.checksTotal > 0 ? Math.round((p.checksOk / p.checksTotal) * 100) : 0;
    var barColor = pct === 100 ? '#0B7A43' : pct >= 60 ? '#2563EB' : pct >= 30 ? '#D97706' : '#DC2626';
    var bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
    var objetoCorto = (p.objeto || '—').length > 45 ? (p.objeto.substring(0, 45) + '…') : (p.objeto || '—');
    html +=
      '<tr style="background:' + bg + ';border-bottom:1px solid #E5E7EB;">' +
        '<td style="padding:11px 14px;font-weight:700;color:#123C7B;font-size:12px;white-space:nowrap;">' + p.id + '</td>' +
        '<td style="padding:11px 14px;">' +
          '<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;' +
          'background:' + t.bg + ';color:' + t.color + ';border:1px solid ' + t.border + ';">' + t.label + '</span>' +
        '</td>' +
        '<td style="padding:11px 14px;color:#374151;max-width:200px;" title="' + (p.objeto||'') + '">' + objetoCorto + '</td>' +
        '<td style="padding:11px 14px;color:#374151;white-space:nowrap;">' + (p.area || '—') + '</td>' +
        '<td style="padding:11px 14px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<div style="flex:1;height:6px;border-radius:4px;background:#E5E7EB;overflow:hidden;min-width:60px;">' +
              '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:4px;"></div>' +
            '</div>' +
            '<span style="font-size:11px;color:#6B7280;font-weight:700;white-space:nowrap;">' + pct + '%</span>' +
          '</div>' +
          '<div style="font-size:10px;color:#9CA3AF;margin-top:2px;">' + p.checksOk + '/' + p.checksTotal + ' docs</div>' +
        '</td>' +
        '<td style="padding:11px 14px;white-space:nowrap;color:#6B7280;font-size:12px;">' + p.fecha + '</td>' +
        '<td style="padding:11px 14px;text-align:center;">' +
          '<button onclick="hist_verDetalle(\'' + p.id + '\')" ' +
            'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
            'padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">👁 Ver</button>' +
        '</td>' +
      '</tr>';
  });

  if (total > 5) {
    html += '<tr style="background:#F8FAFC;">' +
      '<td colspan="7" style="padding:10px 14px;text-align:center;">' +
        '<button onclick="dash_abrirHistorial(\'\')" ' +
          'style="background:none;border:1px solid #CBD5E1;color:#123C7B;padding:6px 18px;' +
          'border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">' +
          '+ ' + (total - 5) + ' proceso' + (total - 5 !== 1 ? 's' : '') + ' más — Ver historial completo' +
        '</button>' +
      '</td>' +
    '</tr>';
  }

  tbody.innerHTML = html;
}

// Enganchar kpi_actualizarVigencias a dash_actualizar
(function() {
  var _origDash = window.dash_actualizar;
  window.dash_actualizar = function() {
    if (typeof _origDash === 'function') _origDash();
    kpi_actualizarVigencias();
  };
  // Ejecutar al cargar
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(kpi_actualizarVigencias, 300);
  });
})();

/* ═══════════════════════════════════════════════════
   EJECUCIÓN CONTRACTUAL — KPIs + tabla desde HIST_BD
   ═══════════════════════════════════════════════════ */
function ejec_actualizarEjecucion() {
  if (typeof HIST_BD === 'undefined') return;

  var anio = new Date().getFullYear();
  var vigEl = document.getElementById('ejec_vigencia');
  if (vigEl) vigEl.textContent = 'Vigencia ' + anio;

  var total      = HIST_BD.length;
  var docsOk     = HIST_BD.reduce(function(a,p){ return a + (p.checksOk||0); }, 0);
  var docsTotal  = HIST_BD.reduce(function(a,p){ return a + (p.checksTotal||0); }, 0);
  var pctGlobal  = docsTotal > 0 ? Math.round((docsOk/docsTotal)*100) : 0;

  // ── Por modalidad: promedio de avance documental ──
  function avgPct(tipo) {
    var arr = HIST_BD.filter(function(p){ return p.tipo === tipo; });
    if (!arr.length) return { pct: 0, n: 0 };
    var sum = arr.reduce(function(a,p){ return a + (p.checksTotal>0 ? Math.round((p.checksOk/p.checksTotal)*100) : 0); }, 0);
    return { pct: Math.round(sum/arr.length), n: arr.length };
  }
  var cd1p = avgPct('CD1P');
  var d3p  = avgPct('D3P');
  var convArr = HIST_BD.filter(function(p){ return p.tipo==='CONV'||p.tipo==='SUB'; });
  var convPct = convArr.length ? Math.round(convArr.reduce(function(a,p){ return a+(p.checksTotal>0?Math.round((p.checksOk/p.checksTotal)*100):0); },0)/convArr.length) : 0;

  var g = function(id){ return document.getElementById(id); };

  // Global
  if(g('ejec_pct_global')) g('ejec_pct_global').textContent = pctGlobal + '%';
  if(g('ejec_det_global')) g('ejec_det_global').textContent = docsOk + ' / ' + docsTotal + ' docs';
  if(g('ejec_bar_global')) g('ejec_bar_global').style.width = pctGlobal + '%';
  var gc = pctGlobal>=70?'#0B7A43':pctGlobal>=40?'#D97706':'#DC2626';
  if(g('ejec_bar_global')) g('ejec_bar_global').style.background = 'linear-gradient(90deg,'+gc+','+gc+'aa)';
  if(g('ejec_pct_global')) g('ejec_pct_global').style.color = gc;

  // CD1P
  if(g('ejec_pct_cd1p')) g('ejec_pct_cd1p').textContent = cd1p.pct + '%';
  if(g('ejec_det_cd1p')) g('ejec_det_cd1p').textContent = cd1p.n + ' proceso'+(cd1p.n!==1?'s':'');
  if(g('ejec_bar_cd1p')) g('ejec_bar_cd1p').style.width = cd1p.pct + '%';

  // D3P
  if(g('ejec_pct_d3p')) g('ejec_pct_d3p').textContent = d3p.pct + '%';
  if(g('ejec_det_d3p')) g('ejec_det_d3p').textContent = d3p.n + ' proceso'+(d3p.n!==1?'s':'');
  if(g('ejec_bar_d3p')) g('ejec_bar_d3p').style.width = d3p.pct + '%';
  var d3pc = d3p.pct>=70?'#0B7A43':d3p.pct>=40?'#D97706':'#DC2626';
  if(g('ejec_pct_d3p')) g('ejec_pct_d3p').style.color = d3pc;
  if(g('ejec_bar_d3p')) g('ejec_bar_d3p').style.background = 'linear-gradient(90deg,'+d3pc+','+d3pc+'aa)';
  if(g('ejec_alerta_d3p') && d3p.pct>0 && d3p.pct<40) g('ejec_alerta_d3p').innerHTML='<span style="color:#DC2626;font-weight:700;">⚠ Avance crítico · Ver →</span>';

  // CONV + SUB
  if(g('ejec_pct_conv')) g('ejec_pct_conv').textContent = convPct + '%';
  if(g('ejec_det_conv')) g('ejec_det_conv').textContent = convArr.length + ' proceso'+(convArr.length!==1?'s':'');
  if(g('ejec_bar_conv')) g('ejec_bar_conv').style.width = convPct + '%';

  // ── Tabla dinámica ──
  var tbody = document.getElementById('ejec_tabla_body');
  if (!tbody) return;

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:32px;text-align:center;color:#9CA3AF;">' +
      '<div style="font-size:32px;margin-bottom:8px;">📊</div>' +
      '<div style="font-size:13px;font-weight:600;">Sin procesos registrados aún.</div>' +
      '<div style="font-size:12px;margin-top:4px;">Guarda un proceso desde cualquier modal y su ejecución aparecerá aquí.</div>' +
      '</td></tr>';
    return;
  }

  var TIPOS = {
    'CD1P': { label:'Directa 1P',     color:'#0B7A43', bg:'#E8FFF0', border:'#86d19d' },
    'D3P':  { label:'Directa 3P',     color:'#123C7B', bg:'#EFF6FF', border:'#BFDBFE' },
    'CONV': { label:'Convocatoria',   color:'#1D4ED8', bg:'#DBEAFE', border:'#93C5FD' },
    'SUB':  { label:'Subasta Inv.',   color:'#7C3AED', bg:'#F5F3FF', border:'#C4B5FD' }
  };

  var html = '';
  HIST_BD.slice(0,6).forEach(function(p, i) {
    var t   = TIPOS[p.tipo] || TIPOS['D3P'];
    var pct = p.checksTotal > 0 ? Math.round((p.checksOk/p.checksTotal)*100) : 0;
    var barC = pct===100?'#0B7A43':pct>=60?'#2563EB':pct>=30?'#D97706':'#DC2626';
    var estadoBg, estadoColor, estadoTxt;
    if(pct===100)      { estadoBg='#DCFCE7'; estadoColor='#166534'; estadoTxt='Completo'; }
    else if(pct>=60)   { estadoBg='#DBEAFE'; estadoColor='#1D4ED8'; estadoTxt='En curso'; }
    else if(pct>=30)   { estadoBg='#FEF3C7'; estadoColor='#D97706'; estadoTxt='Pendiente'; }
    else               { estadoBg='#FEE2E2'; estadoColor='#DC2626'; estadoTxt='Crítico'; }
    var bg = i%2===0?'#fff':'#F9FAFB';
    html +=
      '<tr style="background:'+bg+';border-bottom:1px solid #E5E7EB;">' +
        '<td style="padding:11px 14px;font-weight:700;color:#123C7B;font-size:12px;white-space:nowrap;">'+p.id+'</td>' +
        '<td style="padding:11px 14px;">' +
          '<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;' +
          'background:'+t.bg+';color:'+t.color+';border:1px solid '+t.border+';">'+t.label+'</span>' +
        '</td>' +
        '<td style="padding:11px 14px;color:#374151;white-space:nowrap;">'+(p.area||'—')+'</td>' +
        '<td style="padding:11px 14px;min-width:140px;">' +
          '<div style="display:flex;align-items:center;gap:7px;">' +
            '<div style="flex:1;background:#E2E8F0;border-radius:6px;height:8px;overflow:hidden;min-width:70px;">' +
              '<div style="background:'+barC+';width:'+pct+'%;height:8px;border-radius:6px;transition:width .4s;"></div>' +
            '</div>' +
            '<span style="font-size:11px;font-weight:800;color:'+barC+';white-space:nowrap;">'+pct+'%</span>' +
          '</div>' +
        '</td>' +
        '<td style="padding:11px 14px;color:#374151;font-size:12px;white-space:nowrap;">' +
          p.checksOk+' / '+p.checksTotal+' docs' +
        '</td>' +
        '<td style="padding:11px 14px;">' +
          '<span style="background:'+estadoBg+';color:'+estadoColor+';border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;">'+estadoTxt+'</span>' +
        '</td>' +
        '<td style="padding:11px 14px;text-align:center;">' +
          '<button onclick="hist_verDetalle(\''+p.id+'\')" ' +
            'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
            'padding:5px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">👁 Ver</button>' +
        '</td>' +
      '</tr>';
  });

  if (total > 6) {
    html += '<tr style="background:#F8FAFC;"><td colspan="7" style="padding:10px;text-align:center;">' +
      '<button onclick="dash_abrirHistorial(\'\')" style="background:none;border:1px solid #CBD5E1;color:#123C7B;' +
      'padding:6px 18px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">' +
      '+ '+(total-6)+' proceso'+(total-6!==1?'s':'')+' más — Ver historial completo</button></td></tr>';
  }

  tbody.innerHTML = html;
}

// Enganchar a dash_actualizar
(function(){
  var _prev = window.dash_actualizar;
  window.dash_actualizar = function(){
    if(typeof _prev==='function') _prev();
    ejec_actualizarEjecucion();
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(ejec_actualizarEjecucion, 400);
  });
})();

// ══════════════════════════════════════════════════════════════════════
//  DASHBOARD DINÁMICO — lee exclusivamente de HIST_BD
// ══════════════════════════════════════════════════════════════════════

// ── Mapeo de ítems precontractuales (checklist Directa 1P, ítems 1-9) ──
var ITEMS_PRECONTRACTUAL = [
  { num:1,  label:'Certificado PAA' },
  { num:2,  label:'Solicitud CDP' },
  { num:3,  label:'Certificado CDP' },
  { num:4,  label:'Solicitud para contratar' },
  { num:5,  label:'Estudios previos' },
  { num:6,  label:'Matriz de riesgos' },
  { num:7,  label:'Propuesta / Cotización' },
  { num:8,  label:'Estudio de mercado' },
  { num:9,  label:'Análisis del sector' },
];
var ITEMS_CONTRACTUAL = [
  { num:10, label:'Certificado de existencia' },
  { num:11, label:'Cédula del contratista' },
  { num:14, label:'RUT' },
  { num:15, label:'Antecedentes disciplinarios/fiscales' },
  { num:20, label:'Certificación seguridad social' },
  { num:21, label:'Formulario SARLAFT' },
  { num:22, label:'Acta de evaluación' },
  { num:23, label:'Informe de supervisión' },
];

function _val(id) { var e=document.getElementById(id); return e?parseFloat(e.value.replace(/[^0-9.]/g,'')):0; }

function _moneda(v) {
  if (!v || isNaN(v) || v===0) return '—';
  if (v >= 1e9)  return '$ '+(v/1e9).toFixed(2)+' B';
  if (v >= 1e6)  return '$ '+(v/1e6).toFixed(1)+' M';
  return '$ '+Number(v).toLocaleString('es-CO');
}

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
//  GENERADOR DE ALERTAS DESDE HIST_BD
// ══════════════════════════════════════
function _generarAlertasDesdeHistorial() {
  var criticas=[], moderadas=[], informativas=[];
  if (typeof HIST_BD === 'undefined' || HIST_BD.length===0) return {criticas:criticas,moderadas:moderadas,informativas:informativas};

  var total       = HIST_BD.length;
  var docsOkSum   = HIST_BD.reduce(function(a,p){ return a+(p.checksOk||0); },0);
  var docsTotSum  = HIST_BD.reduce(function(a,p){ return a+(p.checksTotal||0); },0);
  var pctGlobal   = docsTotSum>0 ? Math.round((docsOkSum/docsTotSum)*100) : 100;

  // ── CRÍTICAS ──
  // Procesos con cumplimiento < 40%
  var criticosList = HIST_BD.filter(function(p){
    return p.checksTotal>0 && (p.checksOk/p.checksTotal)<0.4;
  });
  if (criticosList.length>0) {
    var ids = criticosList.slice(0,3).map(function(p){ return p.id; }).join(', ');
    criticas.push({
      titulo: criticosList.length+' proceso'+(criticosList.length>1?'s':'')+' con expediente crítico (<40%)',
      detalle: 'Procesos: '+ids+(criticosList.length>3?' y otros…':'')+'. Documentos mínimos obligatorios incompletos. Riesgo de nulidad. Art. 9 Ley 80/1993.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // Procesos sin responsable asignado
  var sinResp = HIST_BD.filter(function(p){ return !p.responsable || p.responsable.trim()==='' || p.responsable==='(sin área)'; });
  if (sinResp.length>0) {
    criticas.push({
      titulo: sinResp.length+' proceso'+(sinResp.length>1?'s':'')+' sin responsable asignado',
      detalle: 'Los procesos sin supervisor o responsable identificado no cumplen el requisito de supervisión contractual. Art. 83 Ley 1474/2011.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // Procesos con cero documentos
  var sinDocs = HIST_BD.filter(function(p){ return (p.checksOk||0)===0 && (p.checksTotal||0)===0; });
  if (sinDocs.length>0) {
    criticas.push({
      titulo: sinDocs.length+' proceso'+(sinDocs.length>1?'s':'')+' sin ningún documento cargado',
      detalle: 'Expediente vacío. Debe conformarse el expediente contractual completo conforme Acuerdo 015/2024 HSLV.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // ── MODERADAS ──
  // Procesos con cumplimiento 40–70%
  var medioProcesos = HIST_BD.filter(function(p){
    var pct = p.checksTotal>0 ? p.checksOk/p.checksTotal : 1;
    return pct>=0.4 && pct<0.7;
  });
  if (medioProcesos.length>0) {
    moderadas.push({
      titulo: medioProcesos.length+' proceso'+(medioProcesos.length>1?'s':'')+' con expediente incompleto (40–70%)',
      detalle: 'Requieren completar documentos habilitantes antes de continuar la etapa contractual. Res. 0456/2024 HSLV.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // Áreas con más de 2 procesos abiertos
  var porArea = {};
  HIST_BD.forEach(function(p){ porArea[p.area]=(porArea[p.area]||0)+1; });
  var areasConCarga = Object.entries(porArea).filter(function(e){ return e[1]>2; });
  if (areasConCarga.length>0) {
    var listaAreas = areasConCarga.map(function(e){ return e[0]+' (×'+e[1]+')'; }).join(', ');
    moderadas.push({
      titulo: areasConCarga.length+' área'+(areasConCarga.length>1?'s':'')+' con carga de procesos elevada',
      detalle: 'Áreas con más de 2 procesos simultáneos: '+listaAreas+'. Verificar capacidad de supervisión y seguimiento.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // Procesos D3P sin valor registrado
  var d3pSinValor = HIST_BD.filter(function(p){ return (p.tipo==='D3P'||p.tipo==='CONV'||p.tipo==='SUB') && (!p.valor||p.valor.trim()===''); });
  if (d3pSinValor.length>0) {
    moderadas.push({
      titulo: d3pSinValor.length+' proceso'+(d3pSinValor.length>1?'s':'')+' sin valor contractual registrado',
      detalle: 'El valor estimado es obligatorio en los formularios de contratación. Art. 12 num.7 Res. 0456/2024.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // ── INFORMATIVAS ──
  // Distribución de modalidades
  var porTipo = {CD1P:0,D3P:0,CONV:0,SUB:0};
  HIST_BD.forEach(function(p){ if(porTipo[p.tipo]!==undefined) porTipo[p.tipo]++; });
  var masUsada = Object.entries(porTipo).sort(function(a,b){return b[1]-a[1];})[0];
  if (masUsada && masUsada[1]>0) {
    var nombres = {CD1P:'Contratación Directa 1P',D3P:'Directa 3 Invitaciones',CONV:'Convocatoria Pública',SUB:'Subasta Inversa'};
    informativas.push({
      titulo: 'Modalidad más utilizada: '+nombres[masUsada[0]],
      detalle: masUsada[1]+' de '+total+' procesos ('+Math.round(masUsada[1]/total*100)+'%). Verifique que la selección de modalidad corresponde a los topes y naturaleza del objeto. Art. 2 Ley 1150/2007.',
      accion: function(){ dash_abrirHistorial(masUsada[0]); }
    });
  }

  // Cumplimiento global de expedientes
  if (total>0) {
    var colorCump = pctGlobal>=80?'verde':pctGlobal>=60?'amarillo':'rojo';
    informativas.push({
      titulo: 'Cumplimiento documental global: '+pctGlobal+'%',
      detalle: docsOkSum+' de '+docsTotSum+' documentos verificados en todos los procesos. Estado: '+(pctGlobal>=80?'Satisfactorio':pctGlobal>=60?'Por mejorar':'Deficiente')+'. Acuerdo 015/2024 HSLV.',
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  // Responsables con más de 1 proceso
  var porResp = {};
  HIST_BD.forEach(function(p){ if(p.responsable) porResp[p.responsable]=(porResp[p.responsable]||0)+1; });
  var respConCarga = Object.entries(porResp).filter(function(e){ return e[1]>1; });
  if (respConCarga.length>0) {
    informativas.push({
      titulo: respConCarga.length+' responsable'+(respConCarga.length>1?'s':'')+' con múltiples procesos',
      detalle: respConCarga.slice(0,3).map(function(e){ return e[0]+' ('+e[1]+' proc.)'; }).join(', ')+(respConCarga.length>3?' y otros.':'.'),
      accion: function(){ dash_abrirHistorial(''); }
    });
  }

  return { criticas:criticas, moderadas:moderadas, informativas:informativas };
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

// ── Renderizar checklist dinámico ──
function _renderChecklist(containerEl, itemsDef, hist) {
  if (!hist || hist.length===0) {
    containerEl.innerHTML='<div style="color:#9CA3AF;font-size:12px;text-align:center;padding:20px 0;">Sin datos — guarda un proceso para ver el estado.</div>';
    return;
  }
  // Tomar el proceso más reciente con checklist array
  var reciente = null;
  for (var i=0;i<hist.length;i++) {
    if (hist[i].checklist && Array.isArray(hist[i].checklist) && hist[i].checklist.length>0) { reciente=hist[i]; break; }
  }
  if (!reciente) {
    containerEl.innerHTML='<div style="color:#9CA3AF;font-size:12px;text-align:center;padding:20px 0;">Los procesos guardados no contienen detalle de checklist.</div>';
    return;
  }
  // Contar estado global de cada ítem a través de todos los procesos
  var html='<div style="font-size:10px;color:#6B7280;margin-bottom:6px;">Basado en '+hist.length+' proceso'+(hist.length>1?'s':'')+' — ítem OK si al menos un proceso lo tiene marcado</div>';
  itemsDef.forEach(function(def) {
    var totalConItem=0, okCount=0;
    hist.forEach(function(p) {
      if (!p.checklist||!Array.isArray(p.checklist)) return;
      var item=p.checklist.find(function(c){return c.num===def.num;});
      if (item) { totalConItem++; if(item.ok) okCount++; }
    });
    var icon, color, extra='';
    if (totalConItem===0) { icon='—'; color='#9CA3AF'; extra='<span style="font-size:10px;color:#9CA3AF;">(no aplica en procesos guardados)</span>'; }
    else if (okCount===totalConItem) { icon='✔'; color='#0B7A43'; }
    else if (okCount===0) { icon='✖'; color='#DC2626'; extra='<span style="font-size:10px;color:#DC2626;">(pendiente en todos)</span>'; }
    else { icon='⚠'; color='#D97706'; extra='<span style="font-size:10px;color:#D97706;">('+okCount+'/'+totalConItem+' procesos)</span>'; }
    html+='<div style="display:flex;align-items:center;gap:8px;font-size:13px;">'+
      '<span style="color:'+color+';font-size:16px;flex-shrink:0;">'+icon+'</span>'+
      '<span>'+def.label+'</span> '+extra+'</div>';
  });
  containerEl.innerHTML=html;
}

// ══════════════════════════════════════
//  ACTUALIZAR TODO EL BLOQUE DINÁMICO
// ══════════════════════════════════════
function _actualizarBloquesDinamicos() {
  if (typeof HIST_BD === 'undefined') return;
  var hist = HIST_BD;
  var total = hist.length;

  // ── 1. INDICADORES GENERALES ──
  var docsOk    = hist.reduce(function(a,p){return a+(p.checksOk||0);},0);
  var docsTot   = hist.reduce(function(a,p){return a+(p.checksTotal||0);},0);
  var docsPend  = docsTot - docsOk;
  var completos = hist.filter(function(p){return p.checksTotal>0 && p.checksOk>=p.checksTotal;}).length;
  var incompletos = total - completos;
  var valorSum  = hist.reduce(function(a,p){
    var n=parseFloat((p.valor||'').toString().replace(/[^0-9.]/g,''));
    return a+(isNaN(n)?0:n);
  },0);
  var resps  = new Set(hist.filter(function(p){return p.responsable&&p.responsable.trim()!=='';}).map(function(p){return p.responsable.trim();}));
  var areas  = new Set(hist.filter(function(p){return p.area&&p.area.trim()!=='';}).map(function(p){return p.area.trim();}));

  function _set(id,v){ var e=document.getElementById(id); if(e) e.textContent=v; }
  _set('ind-total',        total);
  _set('ind-completos',    completos);
  _set('ind-incompletos',  incompletos);
  _set('ind-docs-ok',      docsOk);
  _set('ind-docs-pend',    docsPend);
  _set('ind-valor-total',  _moneda(valorSum));
  _set('ind-responsables', resps.size);
  _set('ind-areas',        areas.size);

  // ── 2. CHECKLISTS ──
  var preEl  = document.getElementById('checklist-precontractual');
  var contEl = document.getElementById('checklist-contractual');
  if (preEl)  _renderChecklist(preEl,  ITEMS_PRECONTRACTUAL, hist);
  if (contEl) _renderChecklist(contEl, ITEMS_CONTRACTUAL,    hist);

  // ── 3. ALERTAS JURÍDICAS ──
  var alertas = _generarAlertasDesdeHistorial();
  var grid    = document.getElementById('alertas-grid');
  var badge   = document.getElementById('badge_alertas_total');
  var totalAl = alertas.criticas.length + alertas.moderadas.length + alertas.informativas.length;

  if (grid) {
    if (totalAl===0) {
      grid.innerHTML='<div style="text-align:center;color:#0B7A43;padding:30px;grid-column:1/-1;">'+
        '<div style="font-size:36px;margin-bottom:8px;">✅</div>'+
        '<p style="font-size:13px;font-weight:700;">Sin alertas jurídicas activas. Los '+total+' proceso'+(total!==1?'s':'')+' guardados no presentan incidencias detectadas.</p>'+
        '</div>';
    } else {
      var htmlGrid='';
      if (alertas.criticas.length>0) {
        htmlGrid+='<div><div style="font-size:11.5px;font-weight:800;color:#DC2626;margin-bottom:10px;">🔴 CRÍTICAS — Acción inmediata</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+alertas.criticas.map(function(a){return _alertaCard(a,'critica');}).join('')+'</div></div>';
      }
      if (alertas.moderadas.length>0) {
        htmlGrid+='<div><div style="font-size:11.5px;font-weight:800;color:#D97706;margin-bottom:10px;">🟡 MODERADAS — Gestionar pronto</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+alertas.moderadas.map(function(a){return _alertaCard(a,'moderada');}).join('')+'</div></div>';
      }
      if (alertas.informativas.length>0) {
        htmlGrid+='<div><div style="font-size:11.5px;font-weight:800;color:#2563EB;margin-bottom:10px;">🔵 INFORMATIVAS — Seguimiento</div>'+
          '<div style="display:flex;flex-direction:column;gap:8px;">'+alertas.informativas.map(function(a){return _alertaCard(a,'informativa');}).join('')+'</div></div>';
      }
      grid.innerHTML=htmlGrid;
    }
  }

  if (badge) {
    if (totalAl===0) {
      badge.textContent='Sin alertas'; badge.style.background='#10B981';
    } else if (alertas.criticas.length>0) {
      badge.textContent=alertas.criticas.length+' crítica'+(alertas.criticas.length>1?'s':'');
      badge.style.background='#DC2626';
    } else if (alertas.moderadas.length>0) {
      badge.textContent=alertas.moderadas.length+' moderada'+(alertas.moderadas.length>1?'s':'');
      badge.style.background='#D97706';
    } else {
      badge.textContent=alertas.informativas.length+' informativa'+(alertas.informativas.length>1?'s':'');
      badge.style.background='#3B82F6';
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
        if (lbl && this.files[0]) lbl.textContent = '📄 ' + this.files[0].name;
      });
      var a2 = document.getElementById('d3p_arch_2');
      if (a2) a2.addEventListener('change', function() {
        var lbl = document.getElementById('d3p_arch_2_modal');
        if (lbl && this.files[0]) lbl.textContent = '📄 ' + this.files[0].name;
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
            📎 Cargar
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
  document.getElementById(nameId).innerHTML = '📄 <strong style="color:#1F2937;">' + f.name + '</strong> <span style="font-size:10px;color:#6B7280;">('+size+')</span>';
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

  resultado.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:36px;">⏳</div><p style="color:#6B7280;font-size:14px;margin-top:8px;">Analizando expediente...</p></div>';

  setTimeout(() => {
    const criticos = faltantes.filter(f => f.num <= 5);
    const otros = faltantes.filter(f => f.num > 5);
    const estadoColor = pct >= 80 ? '#166534' : pct >= 50 ? '#92400E' : '#991B1B';
    const estadoBg = pct >= 80 ? '#DCFCE7' : pct >= 50 ? '#FEF3C7' : '#FEE2E2';
    const estadoIcon = pct >= 80 ? '✅' : pct >= 50 ? '⚠️' : '🔴';

    let html = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;">
        <div style="background:${estadoBg};color:${estadoColor};border-radius:12px;padding:10px 18px;font-size:16px;font-weight:800;">
          ${estadoIcon} Expediente al ${pct}%
        </div>
        <span style="color:#6B7280;font-size:13px;">${cargados} de ${items.length} ítems verificados</span>
      </div>
      <div style="background:#F8FAFC;border-radius:12px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:800;color:#0B7A43;margin-bottom:10px;font-size:15px;">🤖 Análisis JURISKILLS IA — Contratación HSLV</div>
        <p style="color:#374151;font-size:13px;line-height:1.7;">
          ${pct >= 80
            ? 'El expediente contractual presenta un nivel de completitud <strong>ACEPTABLE</strong>. Se recomienda completar los ítems pendientes antes de la firma del contrato.'
            : pct >= 50
            ? 'El expediente está <strong>PARCIALMENTE COMPLETO</strong>. Existen documentos críticos pendientes que deben ser gestionados con urgencia para no incurrir en responsabilidad disciplinaria o fiscal.'
            : 'El expediente presenta <strong>DEFICIENCIAS CRÍTICAS</strong>. No se recomienda avanzar en el proceso contractual hasta completar los documentos mínimos habilitantes conforme al Acuerdo 015/2024 HSLV.'}
        </p>
      </div>`;

    if (criticos.length > 0) {
      html += `<div style="margin-bottom:14px;"><div style="font-weight:800;color:#DC2626;margin-bottom:8px;font-size:13px;">🔴 Documentos Críticos Faltantes</div>`;
      criticos.forEach(f => {
        html += `<div style="background:#FEF2F2;border:1px solid #FECACA;border-left:4px solid #DC2626;border-radius:10px;padding:10px 13px;margin-bottom:8px;">
          <strong style="color:#991B1B;font-size:13px;">Ítem ${f.num}: ${f.doc}</strong>
          <p style="color:#6B7280;font-size:12px;margin-top:3px;">Documento obligatorio conforme al Manual de Contratación HSLV.</p></div>`;
      });
      html += '</div>';
    }

    if (otros.length > 0) {
      html += `<div style="margin-bottom:14px;"><div style="font-weight:800;color:#D97706;margin-bottom:8px;font-size:13px;">🟡 Documentos Pendientes</div>`;
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
        <div style="font-size:28px;margin-bottom:6px;">🎉</div>
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
          ${e.resp ? '<p style="font-size:12px;color:#6B7280;margin-bottom:6px;">👤 Responsable: '+e.resp+'</p>' : ''}
          ${e.general ? '<p style="font-size:13px;color:#374151;margin-bottom:6px;">📝 '+e.general+'</p>' : ''}
          ${e.alertas ? '<p style="font-size:12px;color:#D97706;margin-bottom:4px;">⚠️ Alerta: '+e.alertas+'</p>' : ''}
          ${e.acciones ? '<p style="font-size:12px;color:#0B7A43;">✅ Acción: '+e.acciones+'</p>' : ''}
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

async function guardarProceso() {

    // ── Validaciones básicas ──────────────────────────
    var objeto = (document.getElementById('mp_objeto') || {}).value || '';
    var area   = (document.getElementById('mp_area')   || {}).value || '';

    if (!objeto.trim()) {
        alert('⚠️ Debe ingresar el Objeto Contractual antes de guardar.');
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
        btnGuardar.textContent = '⏳ Guardando...';
    }

    // ── Recopilar datos del formulario ─────────────────
    var responsable = (document.getElementById('mp_responsable') || {}).value || '';

    // ── Ítems que Biomédica NO puede ver ni subir ─────
    // (única fuente de verdad: ITEMS_RESTRINGIDOS_GLOBAL en js/db.js)
    var ITEMS_RESTRINGIDOS = ITEMS_RESTRINGIDOS_GLOBAL;

    // Labels de los 23 ítems
    var LABELS = [
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
    ];

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

        // Obtener archivo(s) del ítem — se guardan TODOS los archivos de los
        // ítems con varios recuadros, no solo el primero (antes se perdían).
        var archivos = [];

        // Ítems simples
        var archSimple = document.getElementById('archivo_' + num);
        if (archSimple && archSimple.files && archSimple.files[0]) {
            archivos.push(archSimple.files[0]);
        }

        // Ítems con sub-archivos. El ítem 9 (Estudio de Mercado) tiene 3
        // recuadros propios y NO existe un "archivo_9" simple — por eso antes
        // este ítem nunca guardaba ningún archivo en la base de datos.
        var subSufijos = {
            9:  ['9_mercado','9_propuestas','9_carta'],
            15: ['15a','15b','15c'],
            20: ['20a','20b','20c'],
            21: ['21a','21b']
        };
        if (subSufijos[num]) {
            subSufijos[num].forEach(function(sufijo) {
                var inp = document.getElementById('archivo_' + sufijo);
                if (inp && inp.files && inp.files[0]) {
                    archivos.push(inp.files[0]);
                }
            });
        }

        var comentEl  = document.getElementById('coment_' + num);
        var comentario = comentEl ? comentEl.value.trim() : '';

        checklist.push({
            num:           num,
            label:         label,
            ok:            ok,
            archivo:       archivos[0] || null,
            archivos:      archivos,
            esRestringido: ITEMS_RESTRINGIDOS.indexOf(num) !== -1,
            comentario:    comentario
        });
    });

    // ── Llamar a db.js ────────────────────────────────
    var resultado = await db_guardarProceso({
        tipo:        'CD1P',
        objeto:      objeto.trim(),
        area:        area.trim(),
        valor:       '',
        responsable: responsable.trim(),
        checklist:   checklist
    });

    // ── Restaurar botón ───────────────────────────────
    if (btnGuardar) {
        btnGuardar.disabled    = false;
        btnGuardar.textContent = '💾 Guardar Proceso';
    }

    if (!resultado) return;

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
        'position:fixed;bottom:24px;right:24px;z-index:99998;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '✅ Proceso <strong>' + resultado.codigo +
                      '</strong> guardado correctamente';
    document.body.appendChild(toast);
    setTimeout(function(){ toast.remove(); }, 4000);
}

// ══════════════════════════════════════════════════════════════
// IMPRIMIR / DESCARGAR CHECKLIST — Contratación Directa 1 Propuesta
// Lee directamente cada <tr> del tbody del checklist-wrapper
// ══════════════════════════════════════════════════════════════
function imprimirChecklistCD1P() {
    const objeto    = (document.getElementById('mp_objeto')    || {}).value || '—';
    const area      = (document.getElementById('mp_area')      || {}).value || '—';
    const modalidad = (document.getElementById('mp_modalidad') || {}).value || 'Contratación Directa (1) Propuesta';

    // Mapa explícito: cada ítem con su label, los IDs de su(s) checkbox(es) y div(s) de nombre de archivo.
    // Para ítems sin ID en el checkbox se usa chkIdx (posición entre todos los checkboxes del modal).
    // NOTA: Los <div> de mini-modales entre <tr> hacen que el DOM del tbody sea poco confiable,
    //       por eso leemos directamente por ID de elemento.
    function getNom(ids) {
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el) {
                var txt = el.textContent.replace(/📄\s*/g,'').trim();
                if (txt && txt !== 'Sin archivo cargado') return txt;
            }
        }
        return '';
    }
    function getChk(id) {
        var el = document.getElementById(id);
        return el ? el.checked : false;
    }
    // Para checkboxes sin ID, los obtenemos por posición dentro del modal
    var allCbs = Array.from(document.querySelectorAll('#modalProceso input[type="checkbox"]'));

    var ITEMS = [
        { num:1,  label:'CERTIFICADO PAA',                                                    chk: allCbs[0],            noms:['nombreArchivo_1'] },
        { num:2,  label:'SOLICITUD DE CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',            chk: allCbs[1],            noms:['nombreArchivo_2'] },
        { num:3,  label:'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL',                         chk: allCbs[2],            noms:['nombreArchivo_3'] },
        { num:4,  label:'SOLICITUD PARA CONTRATAR',                                           chk: allCbs[3],            noms:['nombreArchivo_4'] },
        { num:5,  label:'ESTUDIOS PREVIOS',                                                   chk: allCbs[4],            noms:['nombreArchivo_5'] },
        { num:6,  label:'MATRIZ DE RIESGO',                                                   chk: allCbs[5],            noms:['nombreArchivo_6'] },
        { num:7,  label:'ANEXO IO PRESENTACIÓN DE LA PROPUESTA',                              chk: allCbs[6],            noms:['nombreArchivo_7'] },
        { num:8,  label:'PROPUESTA',                                                          chk: allCbs[7],            noms:['nombreArchivo_8'] },
        { num:9,  label:'ESTUDIO DE MERCADO',                                                 chk: allCbs[8],            noms:['nombreArchivo_9'] },
        { num:10, label:'EXPERIENCIA',                                                        chk: allCbs[9],            noms:['nombreArchivo_10'] },
        { num:11, label:'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN',                         chk: allCbs[10],           noms:['nombreArchivo_11'] },
        { num:12, label:'CÉDULA DE CIUDADANÍA',                                               chk: allCbs[11],           noms:['nombreArchivo_12'] },
        { num:13, label:'LIBRETA MILITAR (si aplica)',                                        chk: document.getElementById('check_13'), noms:['nombreArchivo_13'] },
        { num:14, label:'REGISTRO ÚNICO TRIBUTARIO',                                          chk: allCbs[13],           noms:['nombreArchivo_14'] },
        { num:15, label:'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',   chk: document.getElementById('check_15'), noms:['nombreArchivo_15a','nombreArchivo_15b','nombreArchivo_15c'] },
        { num:16, label:'CERTIFICADO ANTECEDENTES DE DELITOS SEXUALES',                       chk: allCbs[15],           noms:['nombreArchivo_16'] },
        { num:17, label:'CERTIFICADO INEXISTENCIA DE INHABILIDADES E INCOMPATIBILIDADES',     chk: allCbs[16],           noms:['nombreArchivo_17'] },
        { num:18, label:'CERTIFICADO DE MEDIDAS CORRECTIVAS',                                 chk: allCbs[17],           noms:['nombreArchivo_18'] },
        { num:19, label:'CERTIFICADO REDAM',                                                  chk: allCbs[18],           noms:['nombreArchivo_19'] },
        { num:20, label:'REVISOR FISCAL (CÉDULA, ANTECEDENTES, TARJETA PROFESIONAL)',         chk: document.getElementById('check_20'), noms:['nombreArchivo_20a','nombreArchivo_20b','nombreArchivo_20c'] },
        { num:21, label:'CERTIFICACIÓN Y PLANILLAS DE SEGURIDAD SOCIAL',                      chk: document.getElementById('check_21'), noms:['nombreArchivo_21a','nombreArchivo_21b'] },
        { num:22, label:'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT',                           chk: allCbs[21],           noms:['nombreArchivo_22'] },
        { num:23, label:'ACTA DE EVALUACIÓN',                                                 chk: allCbs[22],           noms:['nombreArchivo_23'] }
    ];

    var totalMarcados = 0;
    var filas = '';

    ITEMS.forEach(function(item) {
        var marcado = item.chk ? item.chk.checked : false;
        var archivo = getNom(item.noms);
        if (marcado) totalMarcados++;

        var rowBg      = marcado ? '#F0FDF4' : '#FFFAFA';
        var estadoHTML = marcado
            ? '<span style="color:#166534;font-weight:700;">&#10004; Verificado</span>'
            : '<span style="color:#991B1B;font-weight:700;">&#10008; Pendiente</span>';
        var archHTML   = archivo
            ? '<span style="color:#0B7A43;font-size:11px;">&#128196; ' + archivo + '</span>'
            : '<span style="color:#9CA3AF;font-size:11px;font-style:italic;">Sin archivo cargado</span>';

        filas += '<tr style="background:' + rowBg + ';">'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-weight:700;color:#374151;">' + item.num + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#1F2937;line-height:1.4;">' + item.label + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:center;">' + estadoHTML + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;">' + archHTML + '</td>'
            + '</tr>';
    });

    var pct    = Math.round((totalMarcados / 23) * 100);
    var pctCol = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
    var ahora  = new Date().toLocaleString('es-CO');

    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>Checklist Contratacion Directa 1 Propuesta</title>'
        + '<style>'
        + '*{margin:0;padding:0;box-sizing:border-box;}'
        + 'body{font-family:Segoe UI,Arial,sans-serif;color:#1F2937;background:#fff;padding:30px 36px;}'
        + 'h1{color:#046A38;font-size:20px;border-bottom:3px solid #046A38;padding-bottom:8px;margin-bottom:4px;}'
        + 'h2{color:#123C7B;font-size:15px;margin-bottom:16px;}'
        + '.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}'
        + '.meta-item{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:10px 14px;}'
        + '.lbl{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:3px;}'
        + '.val{font-size:13px;font-weight:700;color:#1F2937;}'
        + '.pb-wrap{background:#E5E7EB;border-radius:10px;height:14px;overflow:hidden;margin:6px 0 2px;}'
        + '.pb-fill{height:14px;border-radius:10px;background:' + pctCol + ';width:' + pct + '%;}'
        + 'table{width:100%;border-collapse:collapse;margin-top:12px;}'
        + 'thead th{background:#046A38;color:white;padding:10px;font-size:12px;text-align:left;}'
        + 'thead th:nth-child(1){width:36px;text-align:center;}'
        + 'thead th:nth-child(3){width:120px;text-align:center;}'
        + 'thead th:nth-child(4){width:190px;}'
        + '.footer{margin-top:24px;border-top:1px solid #E5E7EB;padding-top:10px;color:#9CA3AF;font-size:10px;display:flex;justify-content:space-between;}'
        + '@media print{body{padding:14px 18px;}}'
        + '</style>'
        + '</head><body>'
        + '<h1>Hospital Susana Lopez de Valencia E.S.E.</h1>'
        + '<h2>Checklist Documental &mdash; ' + modalidad + '</h2>'
        + '<div class="meta">'
        +   '<div class="meta-item" style="grid-column:1/-1;"><div class="lbl">Objeto Contractual</div><div class="val" style="font-weight:400;line-height:1.5;">' + objeto + '</div></div>'
        +   '<div class="meta-item"><div class="lbl">Area Solicitante</div><div class="val">' + area + '</div></div>'
        +   '<div class="meta-item"><div class="lbl">Fecha de generacion</div><div class="val">' + ahora + '</div></div>'
        +   '<div class="meta-item" style="grid-column:1/-1;">'
        +     '<div class="lbl">Cumplimiento &mdash; ' + totalMarcados + ' de 23 items verificados (' + pct + '%)</div>'
        +     '<div class="pb-wrap"><div class="pb-fill"></div></div>'
        +     '<div style="font-size:11px;color:' + pctCol + ';font-weight:700;margin-top:2px;">' + pct + '% completado</div>'
        +   '</div>'
        + '</div>'
        + '<table><thead><tr>'
        +   '<th>#</th><th>Documento Requerido</th><th>Verificacion</th><th>Documento Cargado</th>'
        + '</tr></thead><tbody>' + filas + '</tbody></table>'
        + '<div class="footer">'
        +   '<span>Generado por Aplicativo HSLV &middot; JURISKILLS IA &middot; ' + ahora + '</span>'
        +   '<span>Contratacion Directa &mdash; 1 Propuesta</span>'
        + '</div>'
        + '<script>window.print();<\/script>'
        + '</body></html>';

    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

// ── Versión genérica de "Descargar Checklist" para Convocatoria y Subasta
//    (no lo traían en su HTML original) ──
function imprimirChecklistGenerico(prefijo, labels, tituloModalidad) {
    var objeto = (document.getElementById('mp_objeto') || {}).value || '—';
    var area   = (document.getElementById('mp_area')   || {}).value || '—';

    var totalMarcados = 0;
    var filas = '';

    labels.forEach(function(label, i) {
        var num = i + 1;
        var chk = document.getElementById(prefijo + 'chk_' + num);
        var nom = document.getElementById(prefijo + 'nom_' + num);
        var marcado = chk ? chk.checked : false;
        var archivo = nom ? nom.textContent.replace(/[📄✅]\s*/g, '').trim() : '';
        if (archivo === 'Sin archivo cargado') archivo = '';
        if (marcado) totalMarcados++;

        var rowBg = marcado ? '#F0FDF4' : '#FFFAFA';
        var estadoHTML = marcado
            ? '<span style="color:#166534;font-weight:700;">&#10004; Verificado</span>'
            : '<span style="color:#991B1B;font-weight:700;">&#10008; Pendiente</span>';
        var archHTML = archivo
            ? '<span style="color:#0B7A43;font-size:11px;">&#128196; ' + archivo + '</span>'
            : '<span style="color:#9CA3AF;font-size:11px;font-style:italic;">Sin archivo cargado</span>';

        filas += '<tr style="background:' + rowBg + ';">'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:center;font-weight:700;color:#374151;">' + num + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;color:#1F2937;line-height:1.4;">' + label + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;text-align:center;">' + estadoHTML + '</td>'
            + '<td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;">' + archHTML + '</td>'
            + '</tr>';
    });

    var pct    = Math.round((totalMarcados / labels.length) * 100);
    var pctCol = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
    var ahora  = new Date().toLocaleString('es-CO');

    var html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
        + '<title>Checklist ' + tituloModalidad + '</title>'
        + '<style>'
        + '*{margin:0;padding:0;box-sizing:border-box;}'
        + 'body{font-family:Segoe UI,Arial,sans-serif;color:#1F2937;background:#fff;padding:30px 36px;}'
        + 'h1{color:#046A38;font-size:20px;border-bottom:3px solid #046A38;padding-bottom:8px;margin-bottom:4px;}'
        + 'h2{color:#123C7B;font-size:15px;margin-bottom:16px;}'
        + '.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}'
        + '.meta-item{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:8px;padding:10px 14px;}'
        + '.lbl{font-size:10px;font-weight:700;color:#6B7280;text-transform:uppercase;margin-bottom:3px;}'
        + '.val{font-size:13px;font-weight:700;color:#1F2937;}'
        + '.pb-wrap{background:#E5E7EB;border-radius:10px;height:14px;overflow:hidden;margin:6px 0 2px;}'
        + '.pb-fill{height:14px;border-radius:10px;background:' + pctCol + ';width:' + pct + '%;}'
        + 'table{width:100%;border-collapse:collapse;margin-top:12px;}'
        + 'thead th{background:#046A38;color:white;padding:10px;font-size:12px;text-align:left;}'
        + 'thead th:nth-child(1){width:36px;text-align:center;}'
        + 'thead th:nth-child(3){width:120px;text-align:center;}'
        + 'thead th:nth-child(4){width:190px;}'
        + '.footer{margin-top:24px;border-top:1px solid #E5E7EB;padding-top:10px;color:#9CA3AF;font-size:10px;display:flex;justify-content:space-between;}'
        + '@media print{body{padding:14px 18px;}}'
        + '</style>'
        + '</head><body>'
        + '<h1>Hospital Susana Lopez de Valencia E.S.E.</h1>'
        + '<h2>Checklist Documental &mdash; ' + tituloModalidad + '</h2>'
        + '<div class="meta">'
        +   '<div class="meta-item" style="grid-column:1/-1;"><div class="lbl">Objeto Contractual</div><div class="val" style="font-weight:400;line-height:1.5;">' + objeto + '</div></div>'
        +   '<div class="meta-item"><div class="lbl">Area Solicitante</div><div class="val">' + area + '</div></div>'
        +   '<div class="meta-item"><div class="lbl">Fecha de generacion</div><div class="val">' + ahora + '</div></div>'
        +   '<div class="meta-item" style="grid-column:1/-1;">'
        +     '<div class="lbl">Cumplimiento &mdash; ' + totalMarcados + ' de ' + labels.length + ' items verificados (' + pct + '%)</div>'
        +     '<div class="pb-wrap"><div class="pb-fill"></div></div>'
        +     '<div style="font-size:11px;color:' + pctCol + ';font-weight:700;margin-top:2px;">' + pct + '% completado</div>'
        +   '</div>'
        + '</div>'
        + '<table><thead><tr>'
        +   '<th>#</th><th>Documento Requerido</th><th>Verificacion</th><th>Documento Cargado</th>'
        + '</tr></thead><tbody>' + filas + '</tbody></table>'
        + '<div class="footer">'
        +   '<span>Generado por Aplicativo HSLV &middot; JURISKILLS IA &middot; ' + ahora + '</span>'
        +   '<span>' + tituloModalidad + '</span>'
        + '</div>'
        + '<script>window.print();<\/script>'
        + '</body></html>';

    var win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

function imprimirChecklistConv() {
    imprimirChecklistGenerico('conv_', [
        'CERTIFICADO PAA', 'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL', 'SOLICITUD PARA CONTRATAR',
        'ESTUDIOS PREVIOS', 'MATRIZ DE RIESGO', 'AVISO DE CONVOCATORIA', 'PLIEGO DE CONDICIONES',
        'PROPUESTAS RECIBIDAS', 'ACTA DE EVALUACIÓN DE PROPUESTAS', 'ACTA DE ADJUDICACIÓN',
        'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN', 'REGISTRO ÚNICO TRIBUTARIO (RUT)',
        'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
        'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT', 'MINUTA DE CONTRATO'
    ], 'Convocatoria Pública');
}

function imprimirChecklistSub() {
    imprimirChecklistGenerico('sub_', [
        'CERTIFICADO PAA', 'CERTIFICADO DE DISPONIBILIDAD PRESUPUESTAL', 'SOLICITUD PARA CONTRATAR',
        'ESTUDIOS PREVIOS', 'MATRIZ DE RIESGO', 'AVISO DE CONVOCATORIA / INVITACIÓN SUBASTA',
        'REGLAS DE LA SUBASTA (PLIEGO)', 'ACTA DE HABILITACIÓN DE PROPONENTES',
        'CONFIGURACIÓN DEL EVENTO DE SUBASTA (SECOP II)', 'ACTA DE CIERRE Y RESULTADO DE SUBASTA',
        'CERTIFICADO DE EXISTENCIA Y REPRESENTACIÓN', 'REGISTRO ÚNICO TRIBUTARIO (RUT)',
        'CERTIFICADO ANTECEDENTES (DISCIPLINARIOS, FISCALES Y JUDICIALES)',
        'FORMULARIO ÚNICO DE CONOCIMIENTO SARLAFT', 'MINUTA DE CONTRATO'
    ], 'Subasta Inversa');
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
    // Sub-archivos (15a, 15b, 15c, 20a, 20b, 20c, 21a, 21b)
    ['15a','15b','15c','20a','20b','20c','21a','21b'].forEach(s => {
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
        if (txt) txt.textContent = '0 / ' + (n === '20' ? '3' : n === '15' ? '3' : '2');
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
            <div style="font-size:32px;margin-bottom:8px;">📭</div>
            <p>${BD_PROCESOS.length === 0 ? 'Aún no se han guardado procesos.' : 'Sin resultados para la búsqueda.'}</p>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const pct     = p.docsTotal > 0 ? Math.min(100, Math.round((p.checkOk / 23) * 100)) : 0;
        const pctCol  = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const estadoBg = pct >= 80 ? '#dcfce7;color:#166534' : pct >= 50 ? '#fef3c7;color:#92400e' : '#fee2e2;color:#991b1b';
        const estadoLbl = pct >= 80 ? '✅ Completo' : pct >= 50 ? '⚠️ Parcial' : '🔴 Incompleto';

        return `<tr style="transition:background .15s;" onmouseover="this.style.background='#f8faff'" onmouseout="this.style.background=''">
          <td style="font-weight:700;color:#123C7B;white-space:nowrap;">${p.id}</td>
          <td style="max-width:220px;">
            <div style="font-weight:600;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px;" title="${p.objeto}">${p.objeto}</div>
            <div style="font-size:10.5px;color:#6b7280;margin-top:2px;">${p.modalidad}</div>
          </td>
          <td style="white-space:nowrap;font-size:13px;">${p.area}</td>
          <td style="white-space:nowrap;font-size:12px;">
            ${p.responsable ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#EFF6FF;color:#123C7B;border:1px solid #BFDBFE;border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;">👤 ' + p.responsable + '</span>' : '<span style="color:#9CA3AF;font-style:italic;font-size:11px;">Sin asignar</span>'}
          </td>
          <td style="white-space:nowrap;font-size:12px;color:#6b7280;">
            📅 ${p.fecha}<br>🕐 ${p.hora}
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
              🔍 Ver
            </button>
            <button onclick="eliminarProceso('${p.id}')"
              style="background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;
                     border-radius:8px;padding:6px 10px;font-size:11px;font-weight:700;
                     cursor:pointer;margin-left:4px;">
              🗑
            </button>
          </td>
        </tr>`;
    }).join('');
}

function verDetalleProceso(id) {
    const p = BD_PROCESOS.find(x => x.id === id);
    if (!p) return;

    const docsHtml = p.documentos.length > 0
        ? p.documentos.map(d => `<li style="margin-bottom:3px;">📄 Ítem ${d.item}: <strong>${d.nombre}</strong> (${d.tamano})</li>`).join('')
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
        <div style="font-size:11px;font-weight:700;color:#123C7B;margin-bottom:4px;">👤 RESPONSABLE DEL PROCESO</div>
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
        if (lbl) lbl.textContent = nombre ? '📄 ' + nombre : '';
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

    num = Math.round(num);
    if (num === 0) return 'cero pesos m/cte';
    let res = '';
    const millones = Math.floor(num / 1000000);
    const miles = Math.floor((num % 1000000) / 1000);
    const resto = num % 1000;
    if (millones === 1) res += 'un millón ';
    else if (millones > 1) res += convertirGrupo(millones) + ' millones ';
    if (miles === 1) res += 'mil ';
    else if (miles > 1) res += convertirGrupo(miles) + ' mil ';
    if (resto > 0) res += convertirGrupo(resto);
    return res.trim() + ' pesos m/cte';
}

function scdpAutoLetras() {
    const val = parseFloat(document.getElementById('scdp-valor-num').value);
    if (!isNaN(val) && val > 0) {
        document.getElementById('scdp-valor-letras').value = numeroALetras(val);
    }
}

// NOTA: esta función tenía un bug — usaba los IDs de Contratación Directa 1
// Propuesta (sin prefijo) en vez de los de Directa 3 Invitaciones (i3_),
// por lo que el botón "Guardar" de este mini-modal nunca funcionaba ahí.
function i3_guardarPAAItem() {
    const unspsc  = document.getElementById('i3_paa_unspsc_input').value.trim();
    const detalle = document.getElementById('i3_paa_detalle_input').value.trim();

    if (!unspsc) {
        alert('Por favor ingrese al menos un código UNSPSC.');
        return;
    }

    // Mostrar preview en la celda
    document.getElementById('i3_paa_unspsc_label').textContent  = unspsc;
    document.getElementById('i3_paa_detalle_label').textContent = detalle || '—';
    var preview = document.getElementById('i3_paa_unspsc_preview');
    if (preview) preview.style.display = 'block';
    if (typeof histU_actualizarExtra === 'function') histU_actualizarExtra('i3_', 1);

    document.getElementById('i3_modalPAAItem').style.display = 'none';
}

// Igual que i3_guardarPAAItem: faltaban por completo (Directa 3 Invitaciones
// usaba las funciones de Contratación Directa 1, con IDs que no existen ahí).
function i3_guardarSolicitudCDPItem() {
    const rubro    = document.getElementById('i3_scdp_rubro').value.trim();
    const numrubro = document.getElementById('i3_scdp_numrubro').value.trim();
    const valNum   = document.getElementById('i3_scdp_valor-num').value.trim();
    const valLetra = document.getElementById('i3_scdp_valor-letras').value.trim();
    const fecha    = document.getElementById('i3_scdp_fecha').value;

    if (!rubro || !numrubro || !valNum || !fecha) {
        alert('Por favor complete: Nombre del rubro, Número del rubro, Valor y Fecha de solicitud.');
        return;
    }

    var valorFmt = parseInt(valNum).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    document.getElementById('i3_scdp_rubro-label').textContent    = rubro;
    document.getElementById('i3_scdp_numrubro-label').textContent = numrubro;
    document.getElementById('i3_scdp_valor-label').textContent    = valorFmt + (valLetra ? ' (' + valLetra + ')' : '');
    document.getElementById('i3_scdp_fecha-label').textContent    = fecha;
    var preview = document.getElementById('i3_scdp_preview');
    if (preview) preview.style.display = 'block';
    if (typeof histU_actualizarExtra === 'function') histU_actualizarExtra('i3_', 2);

    document.getElementById('i3_modalSolicitudCDPItem').style.display = 'none';
}

function i3_guardarCDPItem() {
    const num    = document.getElementById('i3_cdp_num').value.trim();
    const fecha  = document.getElementById('i3_cdp_fecha').value;
    const objeto = document.getElementById('i3_cdp_objeto').value.trim();

    if (!num || !fecha || !objeto) {
        alert('Por favor complete: Número de CDP, Fecha y Objeto.');
        return;
    }

    document.getElementById('i3_cdp_num-label').textContent    = num;
    document.getElementById('i3_cdp_fecha-label').textContent  = fecha;
    document.getElementById('i3_cdp_objeto-label').textContent = objeto.slice(0, 70) + (objeto.length > 70 ? '…' : '');
    var preview = document.getElementById('i3_cdp_preview');
    if (preview) preview.style.display = 'block';
    if (typeof histU_actualizarExtra === 'function') histU_actualizarExtra('i3_', 3);

    document.getElementById('i3_modalCDPItem').style.display = 'none';
}

function d3p_mostrarArchivo(input, labelId, miniLabelId) {
  if (!input.files || !input.files[0]) return;
  var nombre = input.files[0].name;
  var el = document.getElementById(labelId);
  if (el) el.innerHTML = '📄 <strong>' + nombre + '</strong>';
  if (miniLabelId) {
    var ml = document.getElementById(miniLabelId);
    if (ml) ml.textContent = '📄 ' + nombre;
  }
}

// Sync archivo inputs con labels del mini-modal
document.addEventListener('DOMContentLoaded', function() {
  var a1 = document.getElementById('d3p_arch_1');
  if (a1) a1.addEventListener('change', function() {
    var lbl = document.getElementById('d3p_arch_1_lbl');
    if (lbl && this.files[0]) lbl.textContent = '📄 ' + this.files[0].name;
  });
  var a2 = document.getElementById('d3p_arch_2');
  if (a2) a2.addEventListener('change', function() {
    var lbl = document.getElementById('d3p_arch_2_lbl');
    if (lbl && this.files[0]) lbl.textContent = '📄 ' + this.files[0].name;
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
      document.getElementById('sup_preview_area').textContent = area ? '🏢 ' + area : '';
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

// ── Etiquetas reales de los checklists, por tipo de proceso ──
// Misma lista que CHECKLISTS_POR_TIPO en js/proceso-detalle.js (esa página
// no carga script.js, por eso mantiene su propia copia). D3P comparte el
// checklist de 23 ítems de CD1P; Convocatoria y Subasta tienen 15 propios.
var CHECKLIST_LABELS_POR_TIPO = {
    D3P: [
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
    // mp_area, mp_responsable) — ninguno tiene campo de "valor" propio.
    var campos = {
        D3P:  { obj:'mp_objeto', area:'mp_area', val:null, resp:'mp_responsable' },
        CONV: { obj:'mp_objeto', area:'mp_area', val:null, resp:'mp_responsable' },
        SUB:  { obj:'mp_objeto', area:'mp_area', val:null, resp:'mp_responsable' }
    };

    var c = campos[tipoKey];
    if (c) {
        var oEl = document.getElementById(c.obj);
        var aEl = document.getElementById(c.area);
        var vEl = c.val ? document.getElementById(c.val) : null;
        var rEl = document.getElementById(c.resp);
        objeto      = (oEl && oEl.value) ? oEl.value.trim() : '(sin objeto)';
        area        = (aEl && aEl.value) ? aEl.value.trim() : '(sin área)';
        valor       = (vEl && vEl.value) ? vEl.value.trim() : '';
        responsable = (rEl && rEl.value) ? rEl.value.trim() : '';
    }

    if (!objeto || objeto === '(sin objeto)') {
        alert('⚠️ Debe ingresar el Objeto Contractual antes de guardar.');
        return;
    }

    // ── Deshabilitar botón mientras guarda (mismo patrón que guardarProceso,
    //    evita que un doble clic cree el mismo proceso dos veces) ──────
    var btnGuardar = document.querySelector(
        'button[onclick="guardarProcesoHistorial(\'' + tipo + '\')"]'
    );
    if (btnGuardar) {
        btnGuardar.disabled    = true;
        btnGuardar.textContent = '⏳ Guardando...';
    }

    // ── Recopilar checklist según módulo ──────────────
    var prefijos = { D3P:'i3', CONV:'conv', SUB:'sub' };
    var pref     = prefijos[tipoKey];
    // (única fuente de verdad: ITEMS_RESTRINGIDOS_GLOBAL en js/db.js)
    var ITEMS_RESTRINGIDOS = ITEMS_RESTRINGIDOS_GLOBAL;
    var checklist = [];

    // Etiquetas reales de cada checklist (D3P comparte los 23 ítems de CD1P;
    // Convocatoria y Subasta tienen su propio checklist de 15 ítems). Antes
    // se guardaba el label genérico "Ítem N" y se recorrían siempre 23 ítems,
    // aunque CONV/SUB solo tienen 15 (inflaba el conteo del historial).
    var labelsModulo = (typeof CHECKLIST_LABELS_POR_TIPO !== 'undefined' &&
                        CHECKLIST_LABELS_POR_TIPO[tipoKey])
        ? CHECKLIST_LABELS_POR_TIPO[tipoKey]
        : null;
    var totalItems = labelsModulo ? labelsModulo.length
                                  : (tipoKey === 'D3P' ? 23 : 15);

    for (var n = 1; n <= totalItems; n++) {
        // Se guardan TODOS los archivos de los ítems con varios recuadros
        // (antes solo se guardaba el primero y los demás se perdían)
        var archivos = [];

        // Intentar archivo simple con prefijo del módulo
        var archEl = document.getElementById(pref + '_arch_' + n);
        if (archEl && archEl.files && archEl.files[0]) {
            archivos.push(archEl.files[0]);
        }

        // Sub-archivos para ítems 15, 20, 21 (solo existen en D3P)
        var subSufijos = {
            15: ['15a','15b','15c'],
            20: ['20a','20b','20c'],
            21: ['21a','21b']
        };
        if (subSufijos[n]) {
            subSufijos[n].forEach(function(s) {
                var si = document.getElementById(pref + '_arch_' + s);
                if (si && si.files && si.files[0]) archivos.push(si.files[0]);
            });
        }

        // Checkbox del ítem
        var cbEl = document.getElementById(pref + '_chk_' + n) ||
                   document.getElementById('i3_check_' + n);
        var ok = cbEl ? cbEl.checked : false;

        var comentEl2  = document.getElementById(pref + '_coment_' + n);
        var comentario = comentEl2 ? comentEl2.value.trim() : '';

        checklist.push({
            num:           n,
            label:         labelsModulo ? labelsModulo[n - 1] : ('Ítem ' + n),
            ok:            ok,
            archivo:       archivos[0] || null,
            archivos:      archivos,
            esRestringido: ITEMS_RESTRINGIDOS.indexOf(n) !== -1,
            comentario:    comentario
        });
    }

    // ── Guardar en Supabase ───────────────────────────
    var resultado = await db_guardarProceso({
        tipo:        tipoKey,
        objeto:      objeto,
        area:        area,
        valor:       valor,
        responsable: responsable,
        checklist:   checklist
    });

    // ── Restaurar botón ───────────────────────────────
    if (btnGuardar) {
        btnGuardar.disabled    = false;
        btnGuardar.textContent = '💾 Guardar Proceso';
    }

    if (!resultado) return;

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
        'position:fixed;bottom:24px;right:24px;z-index:99998;' +
        'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
        'padding:16px 24px;border-radius:16px;font-weight:700;font-size:14px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.3);';
    toast.innerHTML = '✅ Proceso <strong>' + resultado.codigo +
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
    15: ['nombreArchivo_15a','nombreArchivo_15b','nombreArchivo_15c'],
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
    var pct = p.checksTotal > 0 ? Math.round((p.checksOk / p.checksTotal) * 100) : 0;
    var bg = i % 2 === 0 ? '#fff' : '#F9FAFB';
    // Construir celda de responsable según perfil del usuario actual
  var responsableCell;

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

      var textoAsignadoPor = p.responsable_asignado_por_nombre
          ? '<div style="font-size:10px;color:#6B7280;margin-bottom:4px;">' +
            'Asignado por: ' + escaparHTML(p.responsable_asignado_por_nombre) + '</div>'
          : '';

      var textoAsignado = p.responsable_asignado_nombre
          ? '<div style="font-size:11px;color:#0B7A43;font-weight:700;margin-bottom:2px;">' +
            '✅ Asignado: ' + escaparHTML(p.responsable_asignado_nombre) + '</div>' + textoAsignadoPor
           : '<div style="font-size:11px;color:#9CA3AF;font-style:italic;margin-bottom:6px;">' +
            'Sin responsable asignado</div>';

      responsableCell =
          '<div style="min-width:200px;">' +
              textoAsignado +
              '<div style="display:flex;gap:6px;align-items:center;">' +
                  '<select id="resp_select_' + p.id + '" ' +
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
                    'onmouseout="this.style.background=\'#123C7B\'">✔</button>' +
            '</div>' +
        '</div>';

  } else {
    // No admin: solo ver el nombre del responsable asignado
      var textoAsignadoPorNoAdmin = p.responsable_asignado_por_nombre
          ? '<div style="font-size:10px;color:#6B7280;margin-top:3px;">' +
            'Asignado por: ' + escaparHTML(p.responsable_asignado_por_nombre) + '</div>'
          : '';
      responsableCell =
        '<div style="font-size:13px;color:#374151;">' +
            (p.responsable_asignado_nombre
                ? '<span style="display:inline-flex;align-items:center;gap:4px;' +
                  'background:#EFF6FF;color:#123C7B;border:1px solid #BFDBFE;' +
                  'border-radius:20px;padding:2px 9px;font-size:11px;font-weight:700;">' +
                  '👤 ' + escaparHTML(p.responsable_asignado_nombre) + '</span>' + textoAsignadoPorNoAdmin
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
      '<td style="padding:10px 14px;">' + responsableCell + '</td>' +
      '<td style="padding:12px 14px;white-space:nowrap;color:#0B7A43;font-weight:600;">' + hist_formatMoney(p.valor) + '</td>' +
      '<td style="padding:12px 14px;">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<div class="hist-progress-bar"><div class="hist-progress-fill" style="width:' + pct + '%;"></div></div>' +
          '<span style="font-size:11px;color:#6B7280;font-weight:600;">' + p.checksOk + '/' + p.checksTotal + '</span>' +
        '</div>' +
      '</td>' +
      '<td style="padding:12px 14px;white-space:nowrap;color:#6B7280;font-size:12px;">' + p.fecha + '<br><span style="font-size:11px;">' + p.hora + '</span></td>' +
      '<td style="padding:12px 14px;text-align:center;">' +
        '<div style="display:flex;gap:6px;justify-content:center;">' +
          '<button class="hist-btn-ver" onclick="hist_verDetalle(\'' + p.id + '\')">👁 Ver</button>' +
          '<button class="hist-btn-del" onclick="hist_eliminar(\'' + p.id + '\')">🗑</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  });
  tbody.innerHTML = html;
}

function hist_verDetalle(id) {
  var p = HIST_BD.find(function(x){ return x.id === id; });
  if (!p) return;

  // Inicializar almacén de archivos del historial si no existe
  if (!p._archivos) p._archivos = {};

  var t = HIST_TIPOS[p.tipo] || HIST_TIPOS['D3P'];
  var pct = p.checksTotal > 0 ? Math.round((p.checksOk / p.checksTotal) * 100) : 0;

  // Construir sección de checklist de documentos con carga habilitada
  var checklistHTML = '';
  if (p.checklist && p.checklist.length > 0) {
    var filasCheck = '';
    p.checklist.forEach(function(item) {
      var archivoGuardado = p._archivos[item.num] || item.archivo || '';
      var rowBg = item.ok ? '#F0FDF4' : '#FFF';
      var estadoIcon = item.ok
        ? '<span style="color:#0B7A43;font-weight:700;font-size:13px;">✅</span>'
        : '<span style="color:#D1D5DB;font-size:13px;">⬜</span>';

      var archCell =
        '<div style="display:flex;flex-direction:column;gap:4px;">' +
          '<div id="hist-arch-nom-' + id + '-' + item.num + '" style="font-size:11px;' +
            (archivoGuardado ? 'color:#0B7A43;font-weight:600;' : 'color:#9CA3AF;font-style:italic;') + '">' +
            (archivoGuardado ? '📄 ' + escaparHTML(archivoGuardado) : 'Sin archivo') +
          '</div>' +
          '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">' +
            '<button onclick="hist_triggerUpload(\'' + id + '\',' + item.num + ')" ' +
              'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
              'padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;' +
              'white-space:nowrap;display:flex;align-items:center;gap:4px;">' +
              '📎 ' + (archivoGuardado ? 'Reemplazar' : 'Cargar') +
            '</button>' +
            (archivoGuardado
              ? '<button onclick="hist_eliminarArchivo(\'' + id + '\',' + item.num + ')" ' +
                'title="Quitar archivo" ' +
                'style="background:#FEE2E2;color:#DC2626;border:1px solid #FECACA;' +
                'padding:5px 8px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">🗑</button>'
              : '') +
          '</div>' +
          '<input type="file" id="hist-file-' + id + '-' + item.num + '" style="display:none;" ' +
            'accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" ' +
            'onchange="hist_guardarArchivo(\'' + id + '\',' + item.num + ',this)">' +
        '</div>';

      filasCheck +=
        '<tr style="background:' + rowBg + ';border-bottom:1px solid #E5E7EB;">' +
          '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#6B7280;font-size:12px;width:32px;">' + item.num + '</td>' +
          '<td style="padding:8px 10px;font-size:12px;color:#1F2937;">' + escaparHTML(item.label) + '</td>' +
          '<td style="padding:8px 10px;text-align:center;width:36px;">' + estadoIcon + '</td>' +
          '<td style="padding:8px 10px;min-width:180px;">' + archCell + '</td>' +
        '</tr>';
    });
    checklistHTML =
      '<div style="margin-top:16px;">' +
        '<div style="font-size:11px;color:#123C7B;font-weight:700;text-transform:uppercase;margin-bottom:8px;">📋 Documentos del Expediente</div>' +
        '<div style="background:#EFF6FF;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#374151;border:1px solid #BFDBFE;">' +
          '💡 Puede cargar o reemplazar documentos directamente desde esta vista. Los archivos se asocian al proceso de forma permanente.' +
        '</div>' +
        '<div style="border-radius:12px;border:1px solid #E5E7EB;overflow:hidden;max-height:380px;overflow-y:auto;">' +
          '<table style="width:100%;border-collapse:collapse;font-size:12px;">' +
            '<thead><tr style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;">' +
              '<th style="padding:9px 10px;text-align:center;font-weight:700;">#</th>' +
              '<th style="padding:9px 10px;text-align:left;font-weight:700;">Documento</th>' +
              '<th style="padding:9px 10px;text-align:center;font-weight:700;">✓</th>' +
              '<th style="padding:9px 10px;text-align:left;font-weight:700;">Archivo</th>' +
            '</tr></thead>' +
            '<tbody>' + filasCheck + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  document.getElementById('hist-det-titulo').textContent = '📋 ' + p.id;
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
        '<div style="font-size:11px;color:#123C7B;font-weight:700;text-transform:uppercase;margin-bottom:4px;">👤 Responsable del Proceso</div>' +
        '<div style="font-weight:700;color:#123C7B;font-size:14px;">' + (p.responsable ? escaparHTML(p.responsable) : '<span style="color:#9CA3AF;font-style:italic;font-weight:400;">Sin asignar</span>') + '</div>' +
      '</div>' +
      '<div style="background:#F0FDF4;border-radius:12px;padding:14px;border:1px solid #BBF7D0;grid-column:span 2;">' +
        '<div style="font-size:11px;color:#0B7A43;font-weight:700;text-transform:uppercase;margin-bottom:6px;">✅ Avance Documental</div>' +
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

/* ── Funciones de carga de documentos desde el panel de detalle del historial ── */
function hist_triggerUpload(procId, itemNum) {
  var inp = document.getElementById('hist-file-' + procId + '-' + itemNum);
  if (inp) inp.click();
}

async function hist_guardarArchivo(procId, itemNum, inputEl) {
  if (!inputEl.files || !inputEl.files[0]) return;
  var archivo = inputEl.files[0];
  var nombre  = archivo.name;
  var p = HIST_BD.find(function(x){ return x.id === procId; });
  if (!p) return;

  // Subir de verdad a Supabase. Antes esta función solo guardaba el nombre
  // en memoria (el archivo desaparecía al recargar la página), aunque el
  // aviso del panel decía "se asocia al proceso de forma permanente".
  if (p.supabase_id) {
    var itemCk   = p.checklist
        ? p.checklist.find(function(c){ return c.num === itemNum; })
        : null;
    var etiqueta = (itemCk && itemCk.label) ? itemCk.label : ('Ítem ' + itemNum);
    var esRestr  = itemCk
        ? !!itemCk.esRestringido
        : (ITEMS_RESTRINGIDOS_GLOBAL.indexOf(itemNum) !== -1);

    var docSubido = await db_subirDocumento(p.supabase_id, itemNum, etiqueta, archivo, esRestr);
    if (!docSubido) {
      alert('❌ No se pudo guardar el documento. Intente de nuevo.');
      inputEl.value = '';
      return;
    }
  }

  if (!p._archivos) p._archivos = {};
  p._archivos[itemNum] = nombre;

  // Actualizar el ítem en el checklist y marcarlo como ok
  if (p.checklist) {
    var item = p.checklist.find(function(c){ return c.num === itemNum; });
    if (item) {
      item.archivo = nombre;
      if (!item.ok) {
        item.ok = true;
        p.checksOk = Math.min(p.checksTotal, p.checksOk + 1);
      }
    }
  }

  // Actualizar la vista del nombre del archivo
  var nomEl = document.getElementById('hist-arch-nom-' + procId + '-' + itemNum);
  if (nomEl) {
    nomEl.style.color = '#0B7A43';
    nomEl.style.fontWeight = '600';
    nomEl.style.fontStyle = 'normal';
    nomEl.textContent = '📄 ' + nombre;
  }

  // Actualizar la barra de progreso en el panel de detalle
  var newPct = p.checksTotal > 0 ? Math.round((p.checksOk / p.checksTotal) * 100) : 0;
  var barraEl = document.getElementById('hist-det-barra-' + procId);
  var pctEl   = document.getElementById('hist-det-pct-' + procId);
  var txtEl   = document.getElementById('hist-det-txt-' + procId);
  if (barraEl) barraEl.style.width = newPct + '%';
  if (pctEl)   pctEl.textContent = newPct + '%';
  if (txtEl)   txtEl.textContent = p.checksOk + ' de ' + p.checksTotal + ' verificados';

  // Refrescar fila de la tabla principal del historial sin cerrar el panel
  hist_renderTabla();

  // Reemplazar el botón "Cargar" por "Reemplazar" + mostrar el botón eliminar
  var btnCell = nomEl ? nomEl.parentElement : null;
  if (btnCell) {
    var botonesDiv = btnCell.querySelector('div[style*="display:flex"]');
    if (botonesDiv) {
      botonesDiv.innerHTML =
        '<button onclick="hist_triggerUpload(\'' + procId + '\',' + itemNum + ')" ' +
        'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
        'padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;' +
        'white-space:nowrap;display:flex;align-items:center;gap:4px;">📎 Reemplazar</button>' +
        '<button onclick="hist_eliminarArchivo(\'' + procId + '\',' + itemNum + ')" ' +
        'title="Quitar archivo" ' +
        'style="background:#FEE2E2;color:#DC2626;border:1px solid #FECACA;' +
        'padding:5px 8px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">🗑</button>';
    }
    // Actualizar fondo de la fila
    var fila = nomEl.closest('tr');
    if (fila) fila.style.background = '#F0FDF4';
  }

  // Toast de confirmación
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999999;' +
    'background:linear-gradient(90deg,#0B7A43,#123C7B);color:white;' +
    'padding:12px 20px;border-radius:12px;font-weight:700;font-size:13px;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.25);animation:fadeInUp .3s ease;';
  toast.innerHTML = '✅ Documento <strong>' + escaparHTML(nombre) + '</strong> cargado en ítem ' + itemNum;
  document.body.appendChild(toast);
  setTimeout(function(){ toast.style.opacity='0'; toast.style.transition='opacity .4s'; setTimeout(function(){ toast.remove(); }, 400); }, 2500);
}

function hist_eliminarArchivo(procId, itemNum) {
  var p = HIST_BD.find(function(x){ return x.id === procId; });
  if (!p) return;
  // Nada se borra de la base de datos (todo queda trazable): esto solo quita
  // el archivo de la vista actual. Si ya se había guardado en el sistema,
  // seguirá visible en la página de detalle del proceso.
  if (!confirm('¿Quitar el archivo del ítem ' + itemNum + ' de esta vista?\n\n' +
               'Si el archivo ya se guardó en el sistema, NO se elimina: ' +
               'seguirá visible en el detalle del proceso.')) return;

  if (p._archivos) delete p._archivos[itemNum];
  if (p.checklist) {
    var item = p.checklist.find(function(c){ return c.num === itemNum; });
    if (item) {
      item.archivo = '';
    }
  }

  // Actualizar la vista
  var nomEl = document.getElementById('hist-arch-nom-' + procId + '-' + itemNum);
  if (nomEl) {
    nomEl.style.color = '#9CA3AF';
    nomEl.style.fontWeight = 'normal';
    nomEl.style.fontStyle = 'italic';
    nomEl.textContent = 'Sin archivo';
  }

  // Actualizar botones
  var btnCell = nomEl ? nomEl.parentElement : null;
  if (btnCell) {
    var botonesDiv = btnCell.querySelector('div[style*="display:flex"]');
    if (botonesDiv) {
      botonesDiv.innerHTML =
        '<button onclick="hist_triggerUpload(\'' + procId + '\',' + itemNum + ')" ' +
        'style="background:linear-gradient(90deg,#123C7B,#0B7A43);color:white;border:none;' +
        'padding:5px 10px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;' +
        'white-space:nowrap;display:flex;align-items:center;gap:4px;">📎 Cargar</button>';
    }
    var fila = nomEl.closest('tr');
    if (fila) fila.style.background = '#FFF';
  }
}

function hist_eliminar(id) {
  // Nota: por diseño del sistema NADA se borra de la base de datos (todo es
  // trazable). Este botón solo oculta el proceso de la vista actual — al
  // recargar la página volverá a aparecer. El mensaje lo aclara para no
  // hacerle creer al usuario que eliminó algo de verdad.
  if (!confirm('¿Ocultar el proceso ' + id + ' de esta vista?\n\n' +
               'El proceso NO se elimina del sistema: al recargar la página ' +
               'volverá a aparecer (nada se borra, todo queda trazable).')) return;
  HIST_BD = HIST_BD.filter(function(p){ return p.id !== id; });
  hist_renderTabla();
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
    if (btnEl) {
        btnEl.disabled    = true;
        btnEl.textContent = '⏳';
    }

    // Si el proceso está en Supabase, guardar allí
    if (supabaseId && typeof db_asignarResponsable === 'function') {
        var ok = await db_asignarResponsable(supabaseId, usuarioId);
        if (!ok) {
            if (btnEl) {
                btnEl.disabled    = false;
                btnEl.textContent = '✔';
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
        btnEl.textContent = '✅';
        btnEl.style.background = '#0B7A43';
        setTimeout(function() {
            btnEl.textContent      = '✔';
            btnEl.style.background = '#123C7B';
        }, 2000);
    }

    // Actualizar datalist para que coincida
    hist_actualizarDatalistResponsables();

    // Refrescar tabla sin cerrar el panel
    hist_renderTabla();
}

function hist_exportarCSV() {
  var lista = hist_filtrarProcesos();
  if (!lista.length) { alert('No hay procesos para exportar.'); return; }
  var csv = 'ID Proceso,Modalidad,Objeto,Área,Responsable,Valor,Docs Ok,Docs Total,Fecha,Hora\n';
  lista.forEach(function(p) {
    var t = HIST_TIPOS[p.tipo] || { label: p.tipo };
    csv += [
      '"' + p.id + '"',
      '"' + t.label + '"',
      '"' + (p.objeto||'').replace(/"/g,'""') + '"',
      '"' + (p.area||'').replace(/"/g,'""') + '"',
      '"' + (p.responsable||'').replace(/"/g,'""') + '"',
      p.valor || '',
      p.checksOk,
      p.checksTotal,
      p.fecha,
      p.hora
    ].join(',') + '\n';
  });
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'historial_procesos_HSLV_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
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
//  COLUMNA "ANÁLISIS JURISKILLS" — Contratación Directa 1 Propuesta
//  Se agrega por JS a cada una de las 23 filas (no se editó el HTML a
//  mano, para no arriesgar el balance de <div>/<tr>). El contenido de
//  cada celda lo llena actualizarPanelAgente() más abajo.
// ════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
    var wrapper = document.getElementById('cd1p-checklist');
    if (!wrapper) return; // esta página no es Contratación Directa 1 Propuesta

    wrapper.querySelectorAll('table tbody > tr').forEach(function(fila, i) {
        var num = i + 1;
        if (document.getElementById('ia-item-' + num)) return; // ya existe

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
                '<h2 id="juriskillsModalTitulo" style="margin:0;font-size:16px;color:#123C7B;">🤖 Análisis JURISKILLS</h2>' +
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
    document.getElementById('juriskillsModalTitulo').textContent = '🤖 Análisis JURISKILLS — ' + (val.archivo?.name || '');
    document.getElementById('juriskillsModalContenido').innerHTML = _renderContenidoCompletoAnalisis(val);
    document.getElementById('juriskillsModal').style.display = 'flex';
}

function juriskillsCerrarModal() {
    document.getElementById('juriskillsModal').style.display = 'none';
}

/* =====================================================================
   AGENTE IA HSLV – ANÁLISIS DE DOCUMENTOS CARGADOS (MOTOR LOCAL)
   IMPORTANTE: pese al nombre, esto NO llama a ninguna IA por internet —
   es una búsqueda de palabras clave hecha en JavaScript, 100% local (ver
   ejecutarSkillJuridico() más abajo). El comentario anterior mencionaba
   la API de Claude, pero eso nunca llegó a implementarse; se corrige aquí
   para que quede claro mientras se decide cómo conectar una IA real.
   ===================================================================== */

// Mapa de ítems: número → nombre y criterios jurídicos de validación
const ITEMS_CHECKLIST = {
  1:  { nombre: "Certificado PAA", criterios: "Verifica inclusión del proceso en el Plan Anual de Adquisiciones vigente, código UNSPSC, valor estimado coherente con el contrato, firma del responsable. Aplica Decreto 1082/2015 art 2.2.1.1.1.3.1." },
  2:  { nombre: "Solicitud de Certificado de Disponibilidad Presupuestal", criterios: "Verifica que contenga: área solicitante, objeto, valor estimado, justificación de la necesidad, rubro presupuestal, firma del jefe de área. Aplica Manual Interno de Contratación HSLV, Decreto 1082/2015 art 2.2.1.1.1.3." },
  3:  { nombre: "Certificado de Disponibilidad Presupuestal (CDP)", criterios: "Verifica número CDP, fecha de expedición (no puede ser posterior a la firma del contrato), valor, rubro presupuestal correcto, vigencia, firma del jefe de presupuesto. Aplica Ley 38/1989, Decreto 111/1996." },
  4:  { nombre: "Solicitud para contratar", criterios: "Verifica que la justificación de la necesidad esté alineada con el PAA y el Plan de Desarrollo. Debe incluir: objeto, modalidad de selección propuesta, valor estimado, área requirente, firma. Aplica Decreto 1082/2015 art 2.2.1.1.1.6." },
  5:  { nombre: "Estudios previos", criterios: "Verifica: descripción de la necesidad, fundamento legal, modalidad de selección y justificación, objeto del contrato, estimación del valor, riesgo previsible, garantías, análisis del sector, estudio de mercado con mínimo 3 cotizaciones. Aplica Decreto 1082/2015 art 2.2.1.1.1.6.1." },
  6:  { nombre: "Matriz de riesgo", criterios: "Verifica: identificación de riesgos, probabilidad, impacto, mitigación por cada riesgo previsible. Aplica Decreto 1082/2015 art 2.2.1.1.1.6.3." },
  7:  { nombre: "Anexo IO Presentación de la Propuesta", criterios: "Verifica: formato de presentación de propuesta debidamente diligenciado, datos del proponente, objeto, valor ofertado, plazo, firma del representante legal. Aplica Ley 80/1993 y pliego de condiciones." },
  8:  { nombre: "Propuesta", criterios: "Verifica: oferta económica firmada, propuesta técnica, documentos habilitantes (cámara de comercio, RUT, estados financieros), vigencia de la oferta. Aplica Ley 80/1993 art 25." },
  9:  { nombre: "Estudio de mercado", criterios: "Verifica: mínimo 3 cotizaciones, análisis comparativo de precios, valor de mercado resultante, fuentes consultadas, fecha de consulta reciente. Aplica Decreto 1082/2015 art 2.2.1.1.1.6.1." },
  10: { nombre: "Experiencia", criterios: "Verifica: contratos o certificaciones en objeto similar, valores, fechas, entidades contratantes, firmas. La experiencia debe cumplir los requisitos mínimos del proceso. Aplica Decreto 1082/2015." },
  11: { nombre: "Certificado de existencia y representación legal", criterios: "Verifica: vigencia (no mayor a 30 días), objeto social compatible con el contrato, representante legal y facultades, capital social. Aplica Decreto 1082/2015." },
  12: { nombre: "Cédula de ciudadanía", criterios: "Verifica: legibilidad, documento vigente, coincidencia del número con el RUT y demás documentos del expediente. Aplica normas de identificación." },
  13: { nombre: "Libreta militar", criterios: "Verifica: aplica para hombres menores de 50 años, documento vigente, coincidencia con la persona contratista o representante legal. Aplica Ley 48/1993." },
  14: { nombre: "Registro Único Tributario (RUT)", criterios: "Verifica: NIT correcto, actividad económica (código CIIU) compatible con el objeto, responsabilidades tributarias activas, fecha de inscripción. Aplica DIAN." },
  15: { nombre: "Certificado antecedentes (disciplinarios, fiscales y judiciales)", criterios: "Verifica: nombre completo del contratista o representante legal, fecha de consulta (no mayor a 30 días), resultado sin antecedentes disciplinarios (Procuraduría), fiscales (Contraloría) ni judiciales. Aplica Ley 734/2002, Ley 610/2000 y, para el antecedente judicial, Decreto 1070/2015 (Certificado Judicial Policía Nacional)." }, // SUGERENCIA SIN CONFIRMAR: cita del antecedente judicial agregada por IA, revisar con Jurídica
  16: { nombre: "Certificado antecedentes de delitos sexuales", criterios: "Verifica: nombre completo, número de documento, fecha de consulta (no mayor a 30 días), resultado negativo de antecedentes. Obligatorio para contratos con menores de edad. Aplica Ley 1918/2018." },
  17: { nombre: "Certificado de inexistencia de inhabilidades e incompatibilidades", criterios: "Verifica: declaración del contratista sin inhabilidades ni incompatibilidades conforme a los arts 8 y 9 de la Ley 80/1993, fecha ≤ 30 días, firma representante legal." },
  18: { nombre: "Certificado de medidas correctivas", criterios: "Verifica: certificación de no tener medidas correctivas vigentes impuestas por autoridades de policía o administrativas que impidan contratar con el Estado. Fecha reciente. Aplica Ley 1801/2016 (Código Nacional de Seguridad y Convivencia Ciudadana)." }, // SUGERENCIA SIN CONFIRMAR: cita agregada por IA, revisar con Jurídica
  19: { nombre: "Certificado REDAM", criterios: "Verifica: consulta en el Registro de Deudores Alimentarios Morosos (REDAM), resultado sin registro de deudor moroso, fecha de consulta reciente. Aplica Ley 2097/2021." },
  20: { nombre: "Revisor fiscal (cédula, antecedentes, tarjeta profesional)", criterios: "Verifica: cédula del revisor, tarjeta profesional activa en la Junta Central de Contadores, certificado de antecedentes disciplinarios (Procuraduría y Junta Central de Contadores). Aplica Ley 43/1990." },
  21: { nombre: "Certificación y planillas de seguridad social", criterios: "Verifica: pago de aportes a salud, pensión y ARL del contratista o empleados según corresponda, planillas del mes anterior, coherencia de valores con el contrato. Aplica Ley 100/1993, Decreto 1273/2018." },
  22: { nombre: "Formulario único de conocimiento SARLAFT", criterios: "Verifica: formulario SARLAFT debidamente diligenciado, datos completos del contratista, declaración de origen de fondos, firma del representante legal, fecha reciente. Aplica normativa UIAF y SIPLAFT institucional." },
  23: { nombre: "Acta de evaluación", criterios: "Verifica: criterios objetivos de selección, calificación de todos los oferentes, firmas del comité evaluador (jurídico, técnico, financiero), publicación del acta para observaciones. Aplica Decreto 1082/2015." }
};

// Estado global: archivos cargados y análisis generados
// Clave: "numItem__nombreArchivo" para acumular todos sin sobreescribir
const estadoDocumentos = {};

// Registrar/actualizar un documento en estadoDocumentos
function _lexconRegistrar(numItem, archivo, analisis, estado) {
    const clave = numItem + '__' + archivo.name;
    estadoDocumentos[clave] = { numItem, archivo, analisis, estado };
}

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

// Función llamada cuando se selecciona un archivo en la tabla del checklist
async function mostrarArchivo(input, elementoId) {
    const numItem = parseInt(elementoId.replace('nombreArchivo_', ''));
    const divNombre = document.getElementById(elementoId);

    if (!input.files || input.files.length === 0) {
        if (divNombre) divNombre.innerHTML = 'Sin archivo cargado';
        return;
    }

    const archivo = input.files[0];

    // ── Marcar el checkbox automáticamente al cargar el archivo ──
    const sufijo = elementoId.replace('nombreArchivo_', '');
    cd1p_marcarCheckboxPorItem(sufijo);

    if (divNombre) divNombre.innerHTML = `⏳ Analizando: <strong>${archivo.name}</strong>…`;

    // Registrar como analizando
    _lexconRegistrar(numItem, archivo, null, 'analizando');
    actualizarPanelAgente();

    try {
        const contenido = await leerArchivo(archivo);
        const analisis  = await analizarConIA(numItem, archivo.name, contenido);

        _lexconRegistrar(numItem, archivo, analisis, analisis.estado);
        if (divNombre) divNombre.innerHTML = `✅ <strong>${archivo.name}</strong>`;
        actualizarPanelAgente();
        if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();

    } catch (err) {
        console.error('Error analizando documento:', err);

        let mensajeError = 'No fue posible procesar el documento con Skills Inteligentes Jurídicos.';
        let recomError = [];
        const msg = err.message || '';
        if (msg.includes('too large') || msg.includes('large') || msg.includes('413')) {
            mensajeError = 'El archivo es demasiado grande. Use archivos de texto o PDF ligero.';
            recomError = ['Reduzca el tamaño del archivo antes de cargarlo.'];
        } else if (msg) {
            mensajeError = msg.slice(0, 180);
        }

        _lexconRegistrar(numItem, archivo, {
            estado: 'error',
            titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
            hallazgos: [mensajeError],
            recomendaciones: recomError,
            resumen: 'Error al procesar el archivo.'
        }, 'error');
        if (divNombre) divNombre.innerHTML = `⚠️ Error: <strong>${archivo.name}</strong>`;
        actualizarPanelAgente();
        if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
    }
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
            '🕓 Ver historial <span id="' + prefijo + 'badge_hist_' + num + '" ' +
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
                '<div class="hist-nombre">📄 ' + e.nombre +
                    (esPrimera ? '<span class="hist-tag-v1">v1 · Inicial</span>' : '<span class="hist-tag-vN">v' + e.version + '</span>') +
                    (idx === 0 ? '<span class="hist-tag-last">⬆ Actual</span>' : '') +
                    ' <button onclick="histU_quitarVersion(\'' + prefijo + '\',' + num + ',' + e.id + ')" ' +
                        'title="Quitar esta versión" style="background:none;border:1px solid #DC2626;color:#DC2626;' +
                        'border-radius:6px;padding:1px 7px;font-size:10.5px;cursor:pointer;font-weight:600;margin-left:6px;">🗑️ Quitar</button>' +
                '</div>' +
                (e.extra ? '<div class="hist-meta">ℹ️ ' + e.extra + '</div>' : '') +
                '<div class="hist-meta">📅 ' + e.fecha + ' &nbsp;·&nbsp; 🕐 ' + e.hora + ' &nbsp;·&nbsp; 💾 ' + e.tamano + '</div>' +
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
            if (divNombre) divNombre.innerHTML = '✅ <strong>' + anterior.nombre + '</strong>';
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
        15: ['archivo_15a','archivo_15b','archivo_15c'],
        20: ['archivo_20a','archivo_20b','archivo_20c'],
        21: ['archivo_21a','archivo_21b']
    };
    if (_subdocInputIds[num] && typeof actualizarProgresoSub === 'function') {
        actualizarProgresoSub('check_' + num, _subdocInputIds[num]);
    }

    histU_render(prefijo, num);
    if (typeof cd1p_actualizarAvance === 'function') cd1p_actualizarAvance();
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

// Leer el archivo como texto o base64
async function leerArchivo(archivo) {
    const tipo = archivo.type || '';
    const nombre = archivo.name.toLowerCase();

    if (tipo === 'application/pdf' || nombre.endsWith('.pdf')) {
        // PDF: primero se intenta extraer el texto real con pdf.js (si el PDF tiene
        // capa de texto, p.ej. exportado desde Word). Si no se logra (PDF escaneado
        // sin texto), se cae al comportamiento anterior de solo enviar el base64.
        try {
            const textoExtraido = await _pdfATextoConTablas(archivo);
            if (textoExtraido && textoExtraido.replace(/\s/g, '').length > 40) {
                // Tope de seguridad muy alto (no es un recorte real de contenido legal,
                // solo evita que un archivo corrupto/gigante congele el navegador).
                // La IA sí analiza el documento completo dividiéndolo en partes,
                // ver analizarConGroq().
                return { tipo: 'texto', data: textoExtraido.slice(0, 300000) };
            }
        } catch (e) {
            console.warn('No se pudo extraer texto del PDF con pdf.js, se usará solo el archivo:', e);
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
            reader.onload = () => resolve({
                tipo: 'pdf',
                data: reader.result.split(',')[1],
                mimeType: 'application/pdf'
            });
            reader.readAsDataURL(archivo);
        });

    } else if (tipo.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(nombre)) {
        // Imagen: base64
        return new Promise((resolve, reject) => {
            const mimeType = tipo || 'image/png';
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.onload = () => resolve({
                tipo: 'imagen',
                data: reader.result.split(',')[1],
                mimeType
            });
            reader.readAsDataURL(archivo);
        });

    } else if (nombre.endsWith('.docx') ||
               tipo === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOCX: extraer texto real con mammoth.js
        try {
            if (typeof mammoth === 'undefined') {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
                    s.onload = res;
                    s.onerror = () => rej(new Error('No se pudo cargar mammoth.js'));
                    document.head.appendChild(s);
                });
            }
            const arrayBuffer = await archivo.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer });
            const texto = _htmlATextoConTablas(result.value) || '(Sin texto extraíble del DOCX)';
            // Mismo tope de seguridad que en el caso de PDF (ver comentario arriba).
            return { tipo: 'texto', data: texto.slice(0, 300000) };
        } catch (e) {
            // Fallback: intentar leer como texto
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    tipo: 'texto',
                    data: '(Documento Word – contenido no extraíble directamente. Por favor convierta a PDF para mejor análisis.)\n\nNombre: ' + archivo.name
                });
                reader.onerror = () => resolve({
                    tipo: 'texto',
                    data: '(No se pudo leer el archivo Word. Por favor convierta a PDF.)'
                });
                reader.readAsText(archivo, 'utf-8');
            });
        }

    } else if (nombre.endsWith('.doc')) {
        // DOC antiguo: no soportado nativamente
        return {
            tipo: 'texto',
            data: '(Formato .doc antiguo no compatible. Por favor guarde el archivo como .docx o .pdf e inténtelo de nuevo.)\nArchivo: ' + archivo.name
        };

    } else if (nombre.endsWith('.xls') || nombre.endsWith('.xlsx') ||
               tipo.includes('spreadsheet') || tipo.includes('excel')) {
        // Excel: leer como texto básico con indicación
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                tipo: 'texto',
                data: reader.result || '(Archivo Excel – conviene exportar a PDF para mejor análisis.)'
            });
            reader.onerror = () => resolve({
                tipo: 'texto',
                data: '(No se pudo leer el archivo Excel. Por favor convierta a PDF.)'
            });
            reader.readAsText(archivo, 'utf-8');
        });

    } else {
        // Texto plano u otro formato
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.onload = () => resolve({
                tipo: 'texto',
                data: reader.result || '(archivo sin contenido de texto extraíble)'
            });
            reader.readAsText(archivo, 'utf-8');
        });
    }
}

// ---- pdf.js: carga perezosa desde CDN (mismo patrón que mammoth.js arriba) ----
async function _cargarPdfJs() {
    if (typeof pdfjsLib !== 'undefined') return;
    await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = res;
        s.onerror = () => rej(new Error('No se pudo cargar pdf.js'));
        document.head.appendChild(s);
    });
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ---- PDF → texto, reconstruyendo filas/columnas por posición aproximada ----
// No es una lectura perfecta de tablas (un PDF no guarda el concepto de "tabla"
// internamente, solo texto ubicado en coordenadas x/y) pero agrupar por fila y
// ordenar por columna da una aproximación suficiente para que la IA entienda
// la estructura. Solo funciona si el PDF tiene una capa de texto real (por
// ejemplo, exportado desde Word) — un PDF escaneado no tiene nada que extraer.
async function _pdfATextoConTablas(archivo) {
    await _cargarPdfJs();
    const arrayBuffer = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPaginas = Math.min(pdf.numPages, 15);
    let texto = '';
    for (let p = 1; p <= maxPaginas; p++) {
        const page = await pdf.getPage(p);
        const content = await page.getTextContent();
        const filas = [];
        content.items.forEach(item => {
            const y = item.transform[5];
            let fila = filas.find(f => Math.abs(f.y - y) < 3);
            if (!fila) { fila = { y, items: [] }; filas.push(fila); }
            fila.items.push({ x: item.transform[4], texto: item.str });
        });
        filas.sort((a, b) => b.y - a.y);
        filas.forEach(f => {
            f.items.sort((a, b) => a.x - b.x);
            const celdas = f.items.map(i => i.texto).filter(t => t.trim());
            if (celdas.length) texto += celdas.join(' | ') + '\n';
        });
        texto += '\n';
    }
    return texto.trim();
}

// ---- HTML de mammoth → texto plano, convirtiendo <table> a filas "| celda |" ----
function _htmlATextoConTablas(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('table').forEach(tabla => {
        const filas = Array.from(tabla.querySelectorAll('tr')).map(tr =>
            '| ' + Array.from(tr.querySelectorAll('td,th'))
                .map(c => c.textContent.trim().replace(/\s+/g, ' '))
                .join(' | ') + ' |'
        );
        tabla.replaceWith(document.createTextNode('\n' + filas.join('\n') + '\n'));
    });
    return div.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================================
//  SKILLS INTELIGENTES JURÍDICOS – Motor local sin API Key
//  Base normativa: Acuerdo 015/2024 + Resolución 0456/2024 HSLV
// ============================================================

// --- REGLAS NORMATIVAS POR ÍTEM (Acuerdo 015/2024 + Res. 0456/2024) ---
const SKILLS_JURIDICOS = {

  1: {
    nombre: 'Certificado PAA',
    palabrasClave: ['plan anual', 'adquisiciones', 'paa', 'unspsc', 'clasificador', 'vigencia'],
    camposObligatorios: [
      { campo: ['unspsc','clasificador','código'], msg: 'Falta código UNSPSC del bien/servicio (Art. 13 Acuerdo 015/2024 – Art. 11 Res. 0456/2024).' },
      { campo: ['valor estimado','valor del contrato','presupuesto'], msg: 'No se evidencia el valor estimado de la contratación en el PAA.' },
      { campo: ['vigencia','vigente','año 202'], msg: 'No se confirma la vigencia del PAA. Debe estar actualizado al año fiscal en curso (Art. 13.1 Acuerdo 015/2024).' },
      { campo: ['firma','aprobado','autorizado'], msg: 'Falta firma o aprobación del responsable del PAA (Art. 11 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['secop','publicado'], msg: 'Verifique que el PAA esté publicado en SECOP II y página web a más tardar el 31 de enero (Art. 13 Acuerdo 015/2024).' }
    ],
    normativa: 'Art. 13 Acuerdo 015/2024 – Art. 11 Res. 0456/2024 – Decreto 1082/2015 art. 2.2.1.1.1.3.1'
  },

  2: {
    nombre: 'Solicitud de Certificado de Disponibilidad Presupuestal',
    palabrasClave: ['disponibilidad presupuestal','cdp','solicitud','rubro','presupuest'],
    camposObligatorios: [
      { campo: ['objeto','contratar','necesidad'], msg: 'Falta descripción del objeto o necesidad a contratar (Art. 12 num.1 Res. 0456/2024).' },
      { campo: ['valor','presupuesto','estimado'], msg: 'No se indica el valor estimado de la contratación (Art. 12 num.4 Res. 0456/2024).' },
      { campo: ['rubro','código presupuestal','partida'], msg: 'No se identifica el rubro presupuestal específico.' },
      { campo: ['firma','jefe','responsable','autoriza'], msg: 'Falta firma del jefe de área solicitante (Art. 6.4 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['área','dependencia','proceso'], msg: 'Verifique que se identifique claramente el área o proceso requirente.' }
    ],
    normativa: 'Art. 6.4 y Art. 12 Res. 0456/2024 – Art. 8 Acuerdo 015/2024'
  },

  3: {
    nombre: 'Certificado de Disponibilidad Presupuestal (CDP)',
    palabrasClave: ['certificado de disponibilidad','cdp','disponibilidad presupuestal','apropiación','vigencia fiscal'],
    camposObligatorios: [
      { campo: ['número','no.','n°'], msg: 'No se identifica el número del CDP (requerido en Art. 25 num.12 Res. 0456/2024).' },
      { campo: ['valor','pesos','$'], msg: 'No se evidencia el valor amparado en el CDP.' },
      { campo: ['objeto','destinación','concepto'], msg: 'Falta el objeto o concepto del gasto amparado.' },
      { campo: ['fecha','expedición'], msg: 'No se identifica la fecha de expedición del CDP.' },
      { campo: ['firma','subdirección administrativa','presupuesto'], msg: 'Falta firma de la Subdirección Administrativa o de Presupuesto (Art. 6.2 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['vigencia','vence','plazo'], msg: 'Verifique que el CDP esté vigente para el proceso contractual.' }
    ],
    normativa: 'Art. 6.2 y Art. 25 num.12 Res. 0456/2024 – Art. 8 Acuerdo 015/2024'
  },

  4: {
    nombre: 'Solicitud para contratar',
    palabrasClave: ['solicitud','contratar','contratación','necesidad','modalidad','área'],
    camposObligatorios: [
      { campo: ['objeto','contratar','necesidad'], msg: 'Falta descripción clara del objeto a contratar (Art. 13 lit.e Res. 0456/2024).' },
      { campo: ['modalidad','directa','convocatoria','subasta'], msg: 'No se indica la modalidad de selección propuesta (Art. 15 Acuerdo 015/2024).' },
      { campo: ['valor','presupuesto','estimado'], msg: 'No se incluye el valor estimado del contrato.' },
      { campo: ['área','dependencia','proceso','requirente'], msg: 'No se identifica el área requirente.' },
      { campo: ['firma','jefe','responsable'], msg: 'Falta firma del responsable del área (Art. 6.4 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['paa','plan anual'], msg: 'Verifique que la necesidad esté alineada con el PAA vigente (Art. 13 Acuerdo 015/2024).' },
      { campo: ['smlmv','salarios mínimos','cuantía'], msg: 'Confirme la cuantía para determinar correctamente la modalidad de contratación (Art. 16 Acuerdo 015/2024).' }
    ],
    normativa: 'Art. 13 lit.e y Art. 6.4 Res. 0456/2024 – Art. 15 y 16 Acuerdo 015/2024'
  },

  5: {
    nombre: 'Estudios previos',
    palabrasClave: ['estudio previo','necesidad','objeto','modalidad','análisis de sector','mercado','riesgo','garantía'],
    camposObligatorios: [
      { campo: ['necesidad','justificación','descripción de la necesidad'], msg: 'Falta la descripción de la necesidad que se pretende satisfacer (Art. 12 num.1 Res. 0456/2024 – Art. 20.2.1 Acuerdo 015/2024).' },
      { campo: ['objeto','especificaciones','alcance'], msg: 'No se describe el objeto a contratar con sus especificaciones técnicas (Art. 12 num.2 Res. 0456/2024).' },
      { campo: ['modalidad','directa','convocatoria','justificación legal'], msg: 'Falta la modalidad de selección y su justificación jurídica (Art. 12 num.3 Res. 0456/2024 – Art. 20.2.3 Acuerdo 015/2024).' },
      { campo: ['valor estimado','valor del contrato','presupuesto'], msg: 'No se incluye el valor estimado del contrato (Art. 12 num.4 Res. 0456/2024).' },
      { campo: ['riesgo','matriz de riesgo','riesgos previsibles'], msg: 'Falta el análisis de riesgo previsible y forma de mitigarlo (Art. 12 num.10 Res. 0456/2024 – Art. 20.2.6 Acuerdo 015/2024).' },
      { campo: ['garantía','póliza','amparo'], msg: 'No se indican las garantías exigidas (Art. 12 num.11 Res. 0456/2024 – Art. 23 Acuerdo 015/2024).' },
      { campo: ['unspsc','clasificador','código'], msg: 'Falta identificación del objeto con el clasificador de bienes y servicios UNSPSC (Art. 12 num.7 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['análisis de sector','sector relativo','perspectiva'], msg: 'Verifique la inclusión del análisis del sector (legal, comercial, financiero, organizacional, técnico) (Art. 12 num.6 Res. 0456/2024 – Art. 20.4 Acuerdo 015/2024).' },
      { campo: ['plazo','término','duración'], msg: 'Confirme que se especifica el plazo de ejecución del contrato (Art. 12 num.9 Res. 0456/2024).' }
    ],
    normativa: 'Art. 12 Res. 0456/2024 – Art. 20.2 Acuerdo 015/2024 – Decreto 1082/2015 art. 2.2.1.1.1.6.1'
  },

  6: {
    nombre: 'Matriz de riesgo',
    palabrasClave: ['riesgo','matriz','probabilidad','impacto','mitigación','tratamiento'],
    camposObligatorios: [
      { campo: ['riesgo','tipo de riesgo','identificación'], msg: 'No se identifican los riesgos previsibles del contrato (Art. 20.2.6 Acuerdo 015/2024).' },
      { campo: ['probabilidad','likelihood','ocurrencia'], msg: 'Falta la evaluación de probabilidad de ocurrencia de cada riesgo.' },
      { campo: ['impacto','consecuencia','efecto'], msg: 'No se determina el impacto de cada riesgo identificado.' },
      { campo: ['mitigación','tratamiento','acción','medida'], msg: 'Faltan las medidas de mitigación o tratamiento para cada riesgo (Art. 20.2.6 Acuerdo 015/2024).' }
    ],
    advertencias: [
      { campo: ['asignación','responsable','parte'], msg: 'Verifique que se asigne el riesgo entre las partes contratantes.' }
    ],
    normativa: 'Art. 20.2.6 Acuerdo 015/2024 – Decreto 1082/2015 art. 2.2.1.1.1.6.3'
  },

  7: {
    nombre: 'Anexo IO – Presentación de la Propuesta',
    palabrasClave: ['propuesta','oferta','invitación','formulario','presentación','proponente'],
    camposObligatorios: [
      { campo: ['nombre','razón social','proponente'], msg: 'No se identifican los datos completos del proponente.' },
      { campo: ['objeto','contratar','bien','servicio'], msg: 'Falta la descripción del objeto de la propuesta.' },
      { campo: ['valor','precio','oferta económica'], msg: 'No se evidencia el valor ofertado (Art. 19 Res. 0456/2024).' },
      { campo: ['plazo','término','días'], msg: 'No se indica el plazo de ejecución propuesto.' },
      { campo: ['firma','representante legal'], msg: 'Falta firma del representante legal del proponente.' }
    ],
    advertencias: [
      { campo: ['vigencia de la oferta','validez'], msg: 'Verifique la vigencia de la oferta conforme a los términos de condiciones.' }
    ],
    normativa: 'Art. 19 Res. 0456/2024 – Art. 22 Acuerdo 015/2024 – Ley 80/1993 art. 25'
  },

  8: {
    nombre: 'Propuesta',
    palabrasClave: ['propuesta','oferta','proponente','técnica','económica'],
    camposObligatorios: [
      { campo: ['oferta económica','precio','valor'], msg: 'Falta la oferta económica firmada (Art. 19 Res. 0456/2024).' },
      { campo: ['propuesta técnica','especificaciones técnicas','ficha técnica'], msg: 'No se incluye la propuesta técnica del bien o servicio.' },
      { campo: ['cámara de comercio','existencia','representación'], msg: 'Falta certificado de existencia y representación legal vigente (Art. 15 Res. 0456/2024 – máx. 30 días).' },
      { campo: ['rut','registro tributario'], msg: 'Falta el RUT actualizado del proponente (Art. 14 y 15 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['estados financieros','balance','capacidad financiera'], msg: 'Verifique la presentación de documentos financieros si aplican como requisito habilitante (Art. 17 Res. 0456/2024).' },
      { campo: ['sarlaft','conocimiento del cliente'], msg: 'Verifique la inclusión del formulario SARLAFT (Art. 14 y 15 Res. 0456/2024).' }
    ],
    normativa: 'Art. 14, 15, 17 y 19 Res. 0456/2024 – Ley 80/1993 art. 25'
  },

  9: {
    nombre: 'Estudio de mercado',
    palabrasClave: ['estudio de mercado','cotización','precio de mercado','consulta','proveedores'],
    camposObligatorios: [
      { campo: ['cotización','cotizaciones','proforma'], msg: 'No se evidencian las cotizaciones. Para compraventa/suministro/servicios se requieren mínimo 2 cotizaciones escritas de establecimientos matriculados en Cámara de Comercio (Art. 20.5 Acuerdo 015/2024 – Art. 16 Res. 0456/2024).' },
      { campo: ['precio de mercado','valor promedio','media aritmética'], msg: 'Falta el precio de mercado resultante (promedio o precio más bajo con justificación) (Art. 20.5 Acuerdo 015/2024).' },
      { campo: ['fecha','consulta','reciente'], msg: 'No se identifica la fecha de las consultas de precios. Las cotizaciones deben ser recientes.' }
    ],
    advertencias: [
      { campo: ['secop','plataforma','antecedentes'], msg: 'Si no se obtuvieron cotizaciones adecuadas, verifique el análisis de históricos en SECOP (mínimo 3 procesos similares del año anterior) (Art. 20.5 Acuerdo 015/2024).' },
      { campo: ['cámara de comercio','matriculado'], msg: 'Confirme que los proveedores cotizantes están matriculados en Cámara de Comercio (Art. 20.5 Acuerdo 015/2024).' }
    ],
    normativa: 'Art. 20.5 Acuerdo 015/2024 – Art. 16 Res. 0456/2024 – Decreto 1082/2015'
  },

  10: {
    nombre: 'Experiencia',
    palabrasClave: ['experiencia','contrato','certificación','contratos similares','objeto similar'],
    camposObligatorios: [
      { campo: ['objeto similar','actividad similar','experiencia en'], msg: 'Falta acreditar experiencia en objeto similar al contrato (Art. 17 Res. 0456/2024).' },
      { campo: ['valor','cuantía','monto'], msg: 'No se indica el valor de los contratos de experiencia.' },
      { campo: ['fecha','período','inicio','terminación'], msg: 'Faltan las fechas de los contratos que acreditan experiencia.' },
      { campo: ['entidad','contratante','cliente'], msg: 'No se identifica la entidad o contratante de los contratos de experiencia.' }
    ],
    advertencias: [
      { campo: ['firma','certificación','constancia'], msg: 'Verifique que las certificaciones estén firmadas por la entidad contratante.' },
      { campo: ['actas de liquidación','acta de recibo'], msg: 'Para mayor soporte, incluya actas de liquidación o de recibo final.' }
    ],
    normativa: 'Art. 17 Res. 0456/2024 – Decreto 1082/2015. Nota: en contratación directa no es obligatorio exigir experiencia si el pago es contra entrega.'
  },

  11: {
    nombre: 'Certificado de existencia y representación legal',
    palabrasClave: ['certificado de existencia','representación legal','cámara de comercio','matrícula mercantil'],
    camposObligatorios: [
      { campo: ['fecha de expedición','expedido el','expedición'], msg: 'No se identifica la fecha de expedición. Debe ser de máximo 30 días calendario (Art. 15 Res. 0456/2024).' },
      { campo: ['objeto social','actividad principal'], msg: 'Verifique que el objeto social sea compatible con el objeto del contrato.' },
      { campo: ['representante legal','apoderado'], msg: 'No se identifica claramente el representante legal y sus facultades (Art. 12 Acuerdo 015/2024).' },
      { campo: ['cámara de comercio','registro'], msg: 'Confirme que el certificado sea expedido por la Cámara de Comercio correspondiente.' }
    ],
    advertencias: [
      { campo: ['vigencia','activa','vigente'], msg: 'Verifique que la sociedad/empresa esté activa y con matrícula vigente.' }
    ],
    normativa: 'Art. 15 Res. 0456/2024 – Art. 12 Acuerdo 015/2024 – Decreto 1082/2015'
  },

  17: {
    nombre: 'Certificado de inexistencia de inhabilidades e incompatibilidades',
    palabrasClave: ['inhabilidades','incompatibilidades','declaración','certificado','sin inhabilidades'],
    camposObligatorios: [
      { campo: ['inhabilidades','incompatibilidades'], msg: 'El documento no hace referencia explícita a inhabilidades e incompatibilidades (Arts. 8 y 9 Ley 80/1993).' },
      { campo: ['declaro','manifiesto','bajo juramento','certific'], msg: 'Falta la declaración o manifestación del contratista.' },
      { campo: ['firma','representante legal'], msg: 'Falta firma del representante legal o persona natural contratista.' },
      { campo: ['fecha'], msg: 'No se identifica la fecha del documento. Debe tener fecha reciente (máx. 30 días) (Art. 15 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['procuraduría','fiscalía','contraloría'], msg: 'Verifique adicionalmente en los sistemas SIRI (Procuraduría), FACO (Fiscalía) y SICA (Contraloría).' }
    ],
    normativa: 'Arts. 8 y 9 Ley 80/1993 – Art. 14 y 15 Res. 0456/2024 – Ley 1474/2011'
  },

  22: {
    nombre: 'Formulario único de conocimiento SARLAFT',
    palabrasClave: ['sarlaft','lavado de activos','financiación','conocimiento del cliente','siplaft','uiaf'],
    camposObligatorios: [
      { campo: ['sarlaft','conocimiento del cliente','lavado'], msg: 'El documento no corresponde a un formulario SARLAFT institucional (Art. 14 y 15 Res. 0456/2024).' },
      { campo: ['nombre','razón social','identificación'], msg: 'Faltan los datos de identificación del contratista en el formulario.' },
      { campo: ['origen de fondos','actividad económica','recursos'], msg: 'Falta la declaración de origen de fondos y actividad económica.' },
      { campo: ['firma'], msg: 'Falta firma del representante legal o persona natural (Art. 14 y 15 Res. 0456/2024).' },
      { campo: ['huella','dactilar','índice derecho'], msg: 'Falta la huella digital del índice derecho exigida por el HSLV (Art. 14 y 15 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['fecha','diligenciado'], msg: 'Verifique que el formulario esté diligenciado con fecha reciente.' }
    ],
    normativa: 'Art. 14 y 15 Res. 0456/2024 – Normativa UIAF – SIPLAFT institucional HSLV'
  },

  23: {
    nombre: 'Acta de evaluación',
    palabrasClave: ['acta de evaluación','evaluación','criterios','calificación','comité evaluador','selección'],
    camposObligatorios: [
      { campo: ['criterios de evaluación','criterios de selección','puntaje'], msg: 'No se evidencian los criterios objetivos de evaluación (Art. 19 y Art. 22 Res. 0456/2024).' },
      { campo: ['calificación','puntaje','evaluación técnica','evaluación económica'], msg: 'Falta la calificación de los oferentes según los criterios establecidos.' },
      { campo: ['comité evaluador','evaluador jurídico','evaluador técnico','evaluador financiero'], msg: 'No se identifican los miembros del comité evaluador (Art. 6.6 Res. 0456/2024 – Art. 22 Acuerdo 015/2024).' },
      { campo: ['firma','suscrito','aprobado'], msg: 'Falta firma de los miembros del comité evaluador (jurídico, técnico, financiero) (Art. 6.6 Res. 0456/2024).' }
    ],
    advertencias: [
      { campo: ['traslado','observaciones','publicación'], msg: 'Verifique que el acta haya sido publicada para observaciones: 1 día para contratación directa con 3 invitaciones, 5 días para convocatoria pública (Art. 22.4 y 23.6 Res. 0456/2024).' },
      { campo: ['fecha'], msg: 'Confirme la fecha de elaboración del acta de evaluación.' }
    ],
    normativa: 'Art. 6.6, Art. 19, Art. 22 y Art. 23 Res. 0456/2024 – Art. 22 Acuerdo 015/2024 – Ley 80/1993'
  }
};

// --- MOTOR DE ANÁLISIS – JURISKILLS con IA (Groq) + respaldo local ---
// Ítems restringidos a Jurídica (única fuente de verdad:
// ITEMS_RESTRINGIDOS_GLOBAL en js/db.js, que carga antes que este archivo).
const _NUMS_RESTRINGIDOS_ANALISIS = ITEMS_RESTRINGIDOS_GLOBAL;

function _marcarComoLocal(resultado, mensaje) {
    resultado.resumen = `⚠️ ${mensaje}\n${resultado.resumen || ''}`.trim();
    resultado.motor = 'fallback_local';
    return resultado;
}

// Tamaño máximo de texto que se manda en UNA sola llamada a Groq. Documentos
// más largos que esto se dividen en varias partes (ver _dividirTextoEnPartes)
// para que la IA SIEMPRE termine leyendo el 100% del contenido — nunca se
// descarta texto por ser largo, solo se reparte en varias llamadas.
// 25.000 caracteres ≈ 8.000 tokens de texto, que sumado al prompt fijo y al
// espacio de respuesta se mantiene bajo el límite de 12.000 tokens/minuto de
// la capa gratuita de Groq (comprobado: 40.000 caracteres ya lo superaba).
const _TAMANO_PARTE_GROQ = 25000;

// El límite de Groq es POR MINUTO, no por llamada — si un documento necesita
// varias partes, hay que espaciarlas en el tiempo para que cada llamada caiga
// en su propia "ventana" de minuto, si no, la 2ª/3ª parte falla aunque cada
// una por separado esté dentro del límite.
const _ESPERA_ENTRE_PARTES_MS = 60000;
function _esperar(ms) { return new Promise(res => setTimeout(res, ms)); }

// Quita tildes y caracteres raros para comparar texto de forma más tolerante.
function _normalizarTexto(s) {
    return (s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ');
}

// La IA a veces repite una observación ("no se encontró X") aunque X ya haya
// sido confirmado como presente en otra parte del documento — no siempre
// descarta bien esa contradicción por su cuenta. En vez de confiar en que lo
// haga, se filtra aquí de forma determinística: si la observación comparte
// una palabra clave (>4 letras) con algo ya confirmado como presente, se
// considera resuelta y se descarta antes de mandarla a la síntesis final.
function _pareceContradichaPorPresente(observacion, camposPresentes) {
    const obsNorm = _normalizarTexto(observacion);
    return camposPresentes.some(campo => {
        const palabrasCampo = _normalizarTexto(campo).split(/\s+/).filter(p => p.length > 4);
        return palabrasCampo.length > 0 && palabrasCampo.some(p => obsNorm.includes(p));
    });
}

// Divide el texto en partes de ~tamano caracteres, cortando en saltos de línea
// (nunca a la mitad de una palabra/oración) para que cada parte quede legible.
function _dividirTextoEnPartes(texto, tamano) {
    if (texto.length <= tamano) return [texto];
    const partes = [];
    let inicio = 0;
    while (inicio < texto.length) {
        let fin = Math.min(inicio + tamano, texto.length);
        if (fin < texto.length) {
            const corte = texto.lastIndexOf('\n', fin);
            if (corte > inicio) fin = corte;
        }
        partes.push(texto.slice(inicio, fin));
        inicio = fin;
    }
    return partes;
}

// Intenta analizar con Groq (IA real); si el archivo no tiene texto legible o
// la llamada falla (red, límite gratuito agotado, etc.), usa el motor local
// ejecutarSkillJuridico() como respaldo, para que el checklist nunca se quede
// en blanco o roto.
async function analizarConGroq(numItem, nombreArchivo, contenido) {
    const tieneTexto = contenido.tipo === 'texto' && contenido.data && contenido.data.trim().length > 40;

    if (!tieneTexto) {
        return _marcarComoLocal(
            ejecutarSkillJuridico(numItem, nombreArchivo, contenido),
            'Este archivo no tiene texto legible por la IA (imagen o documento escaneado sin texto). Se muestra una validación básica local.'
        );
    }

    try {
        const meta = (typeof ITEMS_CHECKLIST !== 'undefined' ? ITEMS_CHECKLIST[numItem] : null) || {};
        const skill = typeof SKILLS_JURIDICOS !== 'undefined' ? SKILLS_JURIDICOS[numItem] : null;
        const partes = _dividirTextoEnPartes(contenido.data, _TAMANO_PARTE_GROQ);
        const esDividido = partes.length > 1;
        const otrosItemsChecklist = typeof ITEMS_CHECKLIST !== 'undefined'
            ? Object.entries(ITEMS_CHECKLIST)
                .filter(([num]) => Number(num) !== numItem)
                .map(([num, info]) => ({ num: Number(num), nombre: info.nombre }))
            : [];

        const infoBase = {
            numItem,
            nombreArchivo,
            itemNombre: meta.nombre || `Ítem ${numItem}`,
            criterios: meta.criterios || '',
            normativaSkill: skill ? skill.normativa : null,
            esRestringido: _NUMS_RESTRINGIDOS_ANALISIS.indexOf(numItem) !== -1,
            contextoExpediente: typeof EXPEDIENTE_CONTEXTO !== 'undefined' ? EXPEDIENTE_CONTEXTO : null,
            otrosItemsChecklist
        };

        // Se llama una vez por cada parte, EN SECUENCIA (no en paralelo) para no
        // disparar de golpe el límite por minuto de la capa gratuita de Groq.
        const resultadosPartes = [];
        for (let i = 0; i < partes.length; i++) {
            if (i > 0) await _esperar(_ESPERA_ENTRE_PARTES_MS);
            const { data, error } = await supabaseClient.functions.invoke('analizar-documento', {
                body: { ...infoBase, modo: 'parte', texto: partes[i], parteActual: i + 1, totalPartes: partes.length }
            });
            if (error) throw error;
            if (!data || data.error || !data.estado) throw new Error((data && data.error) || 'Respuesta de IA incompleta.');
            resultadosPartes.push(data);
        }

        let resultadoFinal;
        if (esDividido) {
            // Paso de síntesis: con lo confirmado en TODAS las partes, la IA da
            // el veredicto final — así algo que la parte 1 no vio pero la parte 3
            // sí confirmó no queda reportado como "ausente" por error.
            await _esperar(_ESPERA_ENTRE_PARTES_MS);
            const camposPresentesConocidos = [...new Set(resultadosPartes.flatMap(r => r.camposPresentes || []))];
            const observacionesCandidatas = [...new Set(resultadosPartes.flatMap(r => [...(r.hallazgos || []), ...(r.advertencias || [])]))]
                .filter(obs => !_pareceContradichaPorPresente(obs, camposPresentesConocidos));

            const { data, error } = await supabaseClient.functions.invoke('analizar-documento', {
                body: { ...infoBase, modo: 'sintesis', camposPresentesConocidos, observacionesCandidatas }
            });
            if (error) throw error;
            if (!data || data.error || !data.estado) throw new Error((data && data.error) || 'Respuesta de IA incompleta.');
            resultadoFinal = data;
        } else {
            resultadoFinal = resultadosPartes[0];
        }

        const textoLow = contenido.data.toLowerCase();
        _extraerContexto(numItem, nombreArchivo, textoLow);
        const obsConcordancia = _verificarConcordancia(numItem, nombreArchivo, textoLow);
        const concordanciaErr = obsConcordancia.filter(a => a.startsWith('🔴'));
        const concordanciaAdv = obsConcordancia.filter(a => !a.startsWith('🔴'));

        return {
            estado: resultadoFinal.estado,
            puntaje: resultadoFinal.puntaje,
            resumen: resultadoFinal.resumen || '',
            titulo: resultadoFinal.titulo,
            hallazgos: [...(resultadoFinal.hallazgos || []), ...concordanciaErr],
            advertencias: [...(resultadoFinal.advertencias || []), ...concordanciaAdv],
            recomendaciones: resultadoFinal.recomendaciones || [],
            camposPresentes: resultadoFinal.camposPresentes || [],
            camposAusentes: resultadoFinal.camposAusentes || [],
            normativa: resultadoFinal.normativa,
            motor: 'groq'
        };

    } catch (err) {
        console.error('Groq no disponible, usando motor local de respaldo:', err);
        return _marcarComoLocal(
            ejecutarSkillJuridico(numItem, nombreArchivo, contenido),
            'Análisis automático no disponible temporalmente (posible límite de uso gratuito o problema de red). Se muestra una validación básica local.'
        );
    }
}

// Punto de entrada usado por mostrarArchivo()/mostrarArchivoSub()/reAnalizarTodo() —
// se mantiene el mismo nombre para no tener que tocar esos otros lugares.
async function analizarConIA(numItem, nombreArchivo, contenido) {
    return analizarConGroq(numItem, nombreArchivo, contenido);
}

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
    let nOk = 0, nAdv = 0, nErr = 0, nAnal = 0;
    items.forEach(([,v]) => {
        if (v.estado === 'ok') nOk++;
        else if (v.estado === 'advertencia') nAdv++;
        else if (v.estado === 'correccion' || v.estado === 'error') nErr++;
        else nAnal++;
    });

    if (estadoBadge) {
        estadoBadge.style.display = 'inline-block';
        if (nAnal > 0) {
            estadoBadge.className = 'ia-badge badge-analizando';
            estadoBadge.textContent = '⏳ Analizando…';
        } else if (nErr > 0) {
            estadoBadge.className = 'ia-badge badge-error';
            estadoBadge.textContent = `${nErr} corrección${nErr !== 1 ? 'es' : ''} requerida${nErr !== 1 ? 's' : ''}`;
        } else if (nAdv > 0) {
            estadoBadge.className = 'ia-badge badge-warning';
            estadoBadge.textContent = `${nAdv} advertencia${nAdv !== 1 ? 's' : ''}`;
        } else {
            estadoBadge.className = 'ia-badge badge-ok';
            estadoBadge.textContent = '✅ Todo en orden';
        }
    }

    if (resumenGlobal) {
        resumenGlobal.textContent = `${nOk} correctos · ${nAdv} con advertencias · ${nErr} con correcciones · ${nAnal} en análisis`;
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
                <span class="ia-badge badge-analizando">⏳ Analizando</span>
                <span style="color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ${val.archivo?.name || ''}</span>
              </div>
              <div class="ia-loader" style="margin-top:6px;"><div></div><div></div><div></div></div>
            </div>`;
            return;
        }

        const a = val.analisis;
        if (!a) return;

        const puntaje = a.puntaje ?? (a.estado==='ok'?90:a.estado==='advertencia'?65:30);
        const pColor  = puntaje>=80?'#22C55E':puntaje>=50?'#F59E0B':'#EF4444';
        const badgeClass = a.estado==='ok'?'badge-ok':a.estado==='advertencia'?'badge-warning':'badge-error';
        const badgeLabel = a.estado==='ok'?'✅ Correcto':a.estado==='advertencia'?'⚠️ Advertencia':'🔴 Corrección';
        const clave = (val.numItem ?? '') + '__' + (val.archivo?.name || '');

        html += `<div style="padding:8px 0;${idxDoc>0?'border-top:1px solid #F1F5F9;':''}">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
            <span class="ia-badge ${badgeClass}" style="flex-shrink:0;">${badgeLabel}</span>
            <span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ${val.archivo?.name||''}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:10px;font-weight:700;color:#6B7280;white-space:nowrap;">Cumplimiento</span>
            <div style="flex:1;background:#E5E7EB;border-radius:10px;height:6px;overflow:hidden;">
              <div style="width:${puntaje}%;height:6px;border-radius:10px;background:${pColor};transition:width .5s;"></div>
            </div>
            <span style="font-size:11px;font-weight:800;color:${pColor};white-space:nowrap;">${puntaje}%</span>
          </div>
          <a href="javascript:void(0)" onclick="juriskillsAbrirModal('${clave.replace(/'/g,"\\'")}')" style="font-size:11px;font-weight:700;color:#2563EB;text-decoration:underline;">🔍 Ver análisis completo</a>
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
        const badgeLabel = a.estado==='ok'?'✅ Correcto':a.estado==='advertencia'?'⚠️ Advertencia':'🔴 Corrección';

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
            <span style="font-size:11px;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 ${val.archivo?.name||''}</span>
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
            <div style="font-size:11px;font-weight:700;color:#DC2626;margin-bottom:4px;">🔴 Incumplimientos normativos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${hallNormHTML}</ul></div>`:''}
          <!-- hallazgos concordancia crítica -->
          ${hallConcHTML?`<div style="margin-bottom:6px;background:#FFF1F2;border-radius:8px;padding:6px 8px;border:1px solid #FECDD3;">
            <div style="font-size:11px;font-weight:700;color:#BE123C;margin-bottom:4px;">🔴 Inconsistencias entre documentos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${hallConcHTML}</ul></div>`:''}
          <!-- advertencias normativas -->
          ${advNormHTML?`<div style="margin-bottom:6px;background:#FFFBEB;border-radius:8px;padding:6px 8px;">
            <div style="font-size:11px;font-weight:700;color:#D97706;margin-bottom:4px;">⚠️ Advertencias normativas:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advNormHTML}</ul></div>`:''}
          <!-- observaciones de redacción -->
          ${advRedacHTML?`<div style="margin-bottom:6px;background:#F0F9FF;border-radius:8px;padding:6px 8px;border:1px solid #BAE6FD;">
            <div style="font-size:11px;font-weight:700;color:#0369A1;margin-bottom:4px;">✏️ Observaciones de redacción:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advRedacHTML}</ul></div>`:''}
          <!-- concordancia entre documentos -->
          ${advConcHTML?`<div style="margin-bottom:6px;background:#FFF7ED;border-radius:8px;padding:6px 8px;border:1px solid #FED7AA;">
            <div style="font-size:11px;font-weight:700;color:#C2410C;margin-bottom:4px;">🔗 Concordancia entre documentos:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;color:#4B5563;">${advConcHTML}</ul></div>`:''}
          <!-- recomendaciones -->
          ${recomHTML?`<div style="margin-bottom:2px;background:#F0FDF4;border-radius:8px;padding:6px 8px;">
            <div style="font-size:11px;font-weight:700;color:#0B7A43;margin-bottom:4px;">💡 Recomendaciones:</div>
            <ul style="margin:0 0 0 14px;padding:0;font-size:11.5px;">${recomHTML}</ul></div>`:''}
          <!-- normativa -->
          ${a.normativa?`<div style="font-size:10px;color:#9CA3AF;border-top:1px solid #F1F5F9;padding-top:4px;margin-top:4px;">📌 ${a.normativa}</div>`:''}
          <!-- aviso fijo: la IA no reemplaza el criterio jurídico -->
          <div style="margin-top:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 10px;font-size:10.5px;color:#1E3A8A;line-height:1.5;">
            ⓘ El análisis es generado por IA con base en el contenido real de cada documento cargado y la normativa contractual vigente. No reemplaza el criterio jurídico del equipo de contratación.
          </div>
        </div>`;
    }
}

// Botón "Actualizar análisis": re-analizar todos los documentos cargados
async function reAnalizarTodo() {
    const btn = document.querySelector('.btn-actualizar');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analizando…'; }

    // Marcar todos como "analizando"
    Object.keys(estadoDocumentos).forEach(clave => {
        if (estadoDocumentos[clave].archivo) {
            estadoDocumentos[clave].estado   = 'analizando';
            estadoDocumentos[clave].analisis = null;
        }
    });
    actualizarPanelAgente();

    // Re-analizar todos en paralelo
    const promesas = Object.entries(estadoDocumentos).map(async ([clave, val]) => {
        if (!val.archivo) return;
        const numItem = val.numItem;
        try {
            const contenido = await leerArchivo(val.archivo);
            const analisis  = await analizarConIA(numItem, val.archivo.name, contenido);
            estadoDocumentos[clave] = { numItem, archivo: val.archivo, analisis, estado: analisis.estado };
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
    if (btn) { btn.disabled = false; btn.textContent = '⟳ Actualizar análisis'; }
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
async function mostrarArchivoSub(input, divId, checkId, todosIds) {
    const div = document.getElementById(divId);
    if (!div) return;

    if (!input.files || input.files.length === 0) {
        div.innerHTML = 'Sin archivo cargado';
        actualizarProgresoSub(checkId, todosIds);
        return;
    }

    const archivo  = input.files[0];
    const numItem  = parseInt(checkId.replace('check_', ''));
    div.innerHTML  = `⏳ Analizando: <strong>${archivo.name}</strong>…`;

    _lexconRegistrar(numItem, archivo, null, 'analizando');
    actualizarPanelAgente();
    actualizarProgresoSub(checkId, todosIds);

    try {
        const contenido = await leerArchivo(archivo);
        const analisis  = await analizarConIA(numItem, archivo.name, contenido);
        _lexconRegistrar(numItem, archivo, analisis, analisis.estado);
        div.innerHTML = `✅ <strong>${archivo.name}</strong>`;
    } catch (err) {
        _lexconRegistrar(numItem, archivo, {
            estado: 'error',
            titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
            hallazgos: ['No se pudo analizar el archivo: ' + (err.message || 'error desconocido')],
            recomendaciones: [],
            resumen: 'Error al procesar el archivo.'
        }, 'error');
        div.innerHTML = `⚠️ Error: <strong>${archivo.name}</strong>`;
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
            + 'border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700;">✅ Aplica</span>';
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
            + 'border-radius:20px;padding:2px 9px;font-size:10px;font-weight:700;">🚫 No aplica</span>';
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
        prev.textContent  = '📋 Justificación registrada: ' + textoFinal;
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

// ── Motor de análisis basado en SKILLS_JURIDICOS ──
// ══════════════════════════════════════════════════════════════════
//  CONTEXTO GLOBAL DEL EXPEDIENTE
//  Acumula datos extraídos de cada documento para cruzar información
// ══════════════════════════════════════════════════════════════════
const EXPEDIENTE_CONTEXTO = {
    objeto:      [],   // { valor, numItem, archivo }
    valor:       [],
    contratista: [],
    nit:         [],
    cdp:         [],
    fecha:       []
};

// Extrae y registra datos relevantes del texto en el contexto global
function _extraerContexto(numItem, nombreArchivo, textoLow) {
    // Objeto contractual — buscar frases después de "objeto:"
    const matchObjeto = textoLow.match(/objeto[:\s]+([^\n\r.]{15,120})/);
    if (matchObjeto) {
        EXPEDIENTE_CONTEXTO.objeto.push({ valor: matchObjeto[1].trim(), numItem, archivo: nombreArchivo });
    }
    // Valor — extraer cifras seguidas de "pesos", "$" o "COP"
    const matchValor = textoLow.match(/\$\s?([\d.,]+)|(\d[\d.,]+)\s*(pesos|cop|mlte|smlmv)/);
    if (matchValor) {
        const cifra = (matchValor[1] || matchValor[2] || '').replace(/[.,]/g,'');
        if (cifra.length >= 4) EXPEDIENTE_CONTEXTO.valor.push({ valor: cifra, numItem, archivo: nombreArchivo });
    }
    // NIT / cédula del contratista
    const matchNit = textoLow.match(/nit[:\s#]*(\d[\d.\-]{5,15})|c[eé]dula[:\s#]*(\d[\d.\-]{5,12})/);
    if (matchNit) {
        const nit = (matchNit[1] || matchNit[2] || '').replace(/[\s.\-]/g,'');
        EXPEDIENTE_CONTEXTO.nit.push({ valor: nit, numItem, archivo: nombreArchivo });
    }
    // Razón social / nombre del contratista
    const matchRS = textoLow.match(/raz[oó]n social[:\s]+([^\n\r,]{5,80})|contratista[:\s]+([^\n\r,]{5,80})/);
    if (matchRS) {
        const rs = (matchRS[1] || matchRS[2] || '').trim();
        if (rs.length > 4) EXPEDIENTE_CONTEXTO.contratista.push({ valor: rs, numItem, archivo: nombreArchivo });
    }
    // Número CDP
    const matchCDP = textoLow.match(/cdp\s*(?:n[°o.]|n[uú]mero)?\s*:?\s*(\d+)/);
    if (matchCDP) EXPEDIENTE_CONTEXTO.cdp.push({ valor: matchCDP[1], numItem, archivo: nombreArchivo });
    // Fechas (formato dd/mm/yyyy o yyyy)
    const matchFecha = textoLow.match(/(\d{1,2}\/\d{1,2}\/20\d{2}|202\d)/);
    if (matchFecha) EXPEDIENTE_CONTEXTO.fecha.push({ valor: matchFecha[1], numItem, archivo: nombreArchivo });
}

// Verifica concordancia del documento actual contra el contexto acumulado
function _verificarConcordancia(numItem, nombreArchivo, textoLow) {
    const alertas = [];

    // ── Concordancia de OBJETO ──
    if (EXPEDIENTE_CONTEXTO.objeto.length >= 2) {
        const objetos = EXPEDIENTE_CONTEXTO.objeto.filter(o => o.numItem !== numItem);
        const matchObjeto = textoLow.match(/objeto[:\s]+([^\n\r.]{15,120})/);
        if (matchObjeto && objetos.length > 0) {
            const objDoc = matchObjeto[1].trim().toLowerCase();
            // Buscar palabras comunes (al menos 3 palabras de 4+ chars coinciden)
            const palabrasRef = objetos[0].valor.split(/\s+/).filter(p => p.length >= 4);
            const coinciden = palabrasRef.filter(p => objDoc.includes(p)).length;
            const umbralConcordancia = Math.max(2, Math.floor(palabrasRef.length * 0.35));
            if (palabrasRef.length >= 3 && coinciden < umbralConcordancia) {
                alertas.push(`⚠️ Concordancia de objeto: el objeto descrito en este documento ("${objDoc.slice(0,60)}...") podría no coincidir con el declarado en el ítem ${objetos[0].numItem} ("${objetos[0].valor.slice(0,60)}..."). Verifique que todos los documentos del expediente se refieran al mismo proceso contractual.`);
            }
        }
    }

    // ── Concordancia de NIT / Identificación ──
    if (EXPEDIENTE_CONTEXTO.nit.length >= 2) {
        const matchNit = textoLow.match(/nit[:\s#]*(\d[\d.\-]{5,15})|c[eé]dula[:\s#]*(\d[\d.\-]{5,12})/);
        if (matchNit) {
            const nitDoc = ((matchNit[1] || matchNit[2]) || '').replace(/[\s.\-]/g,'');
            const nitRef = EXPEDIENTE_CONTEXTO.nit.find(n => n.numItem !== numItem);
            if (nitRef && nitDoc && nitDoc !== nitRef.valor && nitDoc.length >= 5) {
                alertas.push(`🔴 Inconsistencia de identificación: este documento contiene el NIT/cédula "${nitDoc}", pero el ítem ${nitRef.numItem} registra "${nitRef.valor}". Verifique que correspondan al mismo contratista.`);
            }
        }
    }

    // ── Concordancia de CDP ──
    if (EXPEDIENTE_CONTEXTO.cdp.length >= 2) {
        const matchCDP = textoLow.match(/cdp\s*(?:n[°o.]|n[uú]mero)?\s*:?\s*(\d+)/);
        if (matchCDP) {
            const cdpDoc = matchCDP[1];
            const cdpRef = EXPEDIENTE_CONTEXTO.cdp.find(c => c.numItem !== numItem);
            if (cdpRef && cdpDoc !== cdpRef.valor) {
                alertas.push(`⚠️ Número de CDP diferente: este documento referencia el CDP N° ${cdpDoc}, mientras que el ítem ${cdpRef.numItem} registra CDP N° ${cdpRef.valor}. Confirme que corresponden al mismo proceso.`);
            }
        }
    }

    return alertas;
}

// ── Utilidad: extraer fragmento de contexto alrededor de una posición ──
function _fragmentoContexto(texto, pos, radio) {
    radio = radio || 60;
    const ini = Math.max(0, pos - radio);
    const fin = Math.min(texto.length, pos + radio);
    let frag = texto.slice(ini, fin).replace(/\s+/g, ' ').trim();
    if (ini > 0) frag = '…' + frag;
    if (fin < texto.length) frag = frag + '…';
    return frag;
}

// ── Utilidad: encontrar número de línea aproximado de una posición ──
function _lineaDePos(texto, pos) {
    return texto.slice(0, pos).split('\n').length;
}

// Análisis de calidad redaccional del texto — VERSIÓN DETALLADA
function _analizarRedaccion(texto, textoLow, numItem) {
    const obs = [];
    if (!texto || texto.length < 30) return obs;

    // ── 1. Campos sin diligenciar: reportar CADA instancia con su fragmento ──
    const patronesPlaceholder = [
        { re: /\[([^\]]{1,80})\]/g,        tipo: 'corchete',    label: (m) => `"[${m[1]}]"` },
        { re: /\{([^}]{1,60})\}/g,          tipo: 'llave',       label: (m) => `"{${m[1]}}"` },
        { re: /_{3,}/g,                      tipo: 'guión',       label: (m) => `"${m[0].slice(0,8)}…"` },
        { re: /\b(pendiente de [^.]{1,40})/gi, tipo: 'pendiente', label: (m) => `"${m[1]}"` },
        { re: /\bpor definir\b/gi,           tipo: 'indefinido',  label: (m) => `"por definir"` },
        { re: /\bcompletar aquí\b/gi,        tipo: 'incompleto',  label: (m) => `"completar aquí"` },
        { re: /\bllenar\b/gi,               tipo: 'incompleto',  label: (m) => `"llenar"` },
    ];

    const instanciasPlaceholder = [];
    patronesPlaceholder.forEach(({ re, label }) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(texto)) !== null) {
            instanciasPlaceholder.push({
                linea: _lineaDePos(texto, m.index),
                etiqueta: label(m),
                contexto: _fragmentoContexto(texto, m.index, 55)
            });
            if (instanciasPlaceholder.length >= 8) break; // limitar a 8 ejemplos
        }
    });

    if (instanciasPlaceholder.length >= 2) {
        const detalle = instanciasPlaceholder.slice(0, 5).map(i =>
            `<span class="rd-item"><span class="rd-linea">Línea ${i.linea}</span> → <span class="rd-campo">${i.etiqueta}</span> <span class="rd-ctx">${i.contexto}</span></span>`
        ).join('');
        const resto = instanciasPlaceholder.length > 5 ? ` <em>(y ${instanciasPlaceholder.length - 5} más)</em>` : '';
        obs.push(`✏️||CAMPOS_VACIOS||${instanciasPlaceholder.length}||${detalle}${resto}`);
    }

    // ── 2. Documento incompleto (oraciones muy cortas) ──
    const oraciones = texto.split(/[.!?;]/);
    const muyCortas = oraciones.filter(o => o.trim().length > 0 && o.trim().length < 8).length;
    if (muyCortas > 5 && texto.length < 400) {
        const ejemplos = oraciones.filter(o => o.trim().length > 0 && o.trim().length < 8).slice(0, 4)
            .map(o => `"${o.trim()}"`).join(', ');
        obs.push(`✏️||INCOMPLETO||${muyCortas}||Fragmentos muy cortos detectados: ${ejemplos}`);
    }

    // ── 3. Texto repetido (plantilla sin personalizar) ──
    const lineas = texto.split(/\n/).map(l => l.trim()).filter(l => l.length > 10);
    const conteo = {};
    lineas.forEach(l => { conteo[l] = (conteo[l] || 0) + 1; });
    const repetidas = Object.entries(conteo).filter(([,c]) => c > 1);
    const totalRep = repetidas.reduce((s,[,c]) => s + (c - 1), 0);
    if (totalRep > 4 && lineas.length > 0 && totalRep / lineas.length > 0.3) {
        const ejemplosRep = repetidas.slice(0, 3).map(([t, c]) =>
            `"${t.slice(0, 55)}${t.length > 55 ? '…' : ''}" (×${c})`
        ).join('; ');
        obs.push(`✏️||REPETICION||${totalRep}||Líneas repetidas: ${ejemplosRep}`);
    }

    // ── 4. Objeto / necesidad ausente ──
    const itemsConObjeto = [2, 3, 4, 5, 7, 8];
    if (itemsConObjeto.includes(numItem) && textoLow.length > 80) {
        const tieneObjeto = /objeto[:\s]|contratar[:\s]|necesidad[:\s]|adquirir|prestar|suministrar/.test(textoLow);
        if (!tieneObjeto) {
            obs.push(`✏️||OBJETO_AUSENTE||0||No se identificó la sección "Objeto" o "Necesidad" que justifique la contratación. Verifique que el documento no sea una versión incompleta o una plantilla base.`);
        }
    }

    // ── 5. Fechas de vigencias anteriores: reportar CADA año y contexto ──
    const ANIO_ACTUAL = new Date().getFullYear();
    const reAniosViejos = /\b(201[0-9]|2020|2021|2022)\b/g;
    reAniosViejos.lastIndex = 0;
    const instanciasFecha = [];
    let mf;
    while ((mf = reAniosViejos.exec(texto)) !== null) {
        instanciasFecha.push({
            anio: mf[1],
            linea: _lineaDePos(texto, mf.index),
            contexto: _fragmentoContexto(texto, mf.index, 60)
        });
    }
    // Agrupar por año único
    const aniosUnicos = [...new Set(instanciasFecha.map(i => i.anio))];
    if (instanciasFecha.length >= 2) {
        const detalles = aniosUnicos.map(anio => {
            const casos = instanciasFecha.filter(i => i.anio === anio);
            const primerCaso = casos[0];
            return `<span class="rd-item"><span class="rd-anio">Año ${anio}</span> (aparece ${casos.length} vez${casos.length > 1 ? 'es' : ''}) — primera ocurrencia línea ${primerCaso.linea}: <span class="rd-ctx">${primerCaso.contexto}</span></span>`;
        }).join('');
        obs.push(`✏️||FECHAS_VIEJAS||${aniosUnicos.join(',')}||${detalles}`);
    }

    return obs;
}

function ejecutarSkillJuridico(numItem, nombreArchivo, contenido) {
    const skill = typeof SKILLS_JURIDICOS !== 'undefined' ? SKILLS_JURIDICOS[numItem] : null;

    if (!skill) {
        return {
            estado: 'ok', puntaje: 100,
            titulo: `Ítem ${numItem}`,
            hallazgos: [], advertencias: [], recomendaciones: [],
            resumen: `✅ Documento "${nombreArchivo}" registrado en el expediente contractual.`,
            normativa: 'Acuerdo 015/2024 – Resolución 0456/2024 HSLV',
            camposPresentes: [], camposAusentes: []
        };
    }

    const texto     = (contenido.tipo === 'texto' ? contenido.data : '') || '';
    const textoLow  = texto.toLowerCase();
    const esBinario = contenido.tipo === 'pdf' || contenido.tipo === 'imagen';

    // ── Extraer y acumular contexto del expediente ──
    if (!esBinario && textoLow.length > 40) {
        _extraerContexto(numItem, nombreArchivo, textoLow);
    }

    // ── Verificar si el documento corresponde al ítem ──
    if (!esBinario && textoLow.length > 40) {
        const matches = skill.palabrasClave.filter(p => textoLow.includes(p)).length;
        const umbral  = Math.max(1, Math.floor(skill.palabrasClave.length * 0.2));
        if (matches < umbral) {
            return {
                estado: 'correccion', puntaje: 0,
                titulo: skill.nombre,
                hallazgos: [
                    `El documento cargado no parece corresponder al ítem "${skill.nombre}".`,
                    `Palabras clave encontradas: ${matches} de ${skill.palabrasClave.length} esperadas.`
                ],
                advertencias: [],
                recomendaciones: [`Verifique que el archivo sea el documento correcto: ${skill.nombre}.`],
                resumen: `🚫 Documento incorrecto para "${skill.nombre}".`,
                normativa: skill.normativa,
                camposPresentes: [], camposAusentes: []
            };
        }
    }

    const hallazgos       = [];
    const advertencias    = [];
    const camposPresentes = [];
    const camposAusentes  = [];

    // ── Evaluar campos obligatorios (normativa) ──
    for (const regla of skill.camposObligatorios) {
        const clave = regla.campo[0];
        if (esBinario) {
            const nomLow     = nombreArchivo.toLowerCase();
            const encontrado = regla.campo.some(c => nomLow.includes(c.split(' ')[0]));
            if (encontrado) camposPresentes.push(clave);
        } else {
            const encontrado = regla.campo.some(c => textoLow.includes(c));
            if (encontrado) camposPresentes.push(clave);
            else { camposAusentes.push(clave); hallazgos.push(regla.msg); }
        }
    }

    // ── Evaluar advertencias normativas ──
    for (const regla of skill.advertencias) {
        const encontrado = esBinario
            ? regla.campo.some(c => nombreArchivo.toLowerCase().includes(c.split(' ')[0]))
            : regla.campo.some(c => textoLow.includes(c));
        if (!encontrado) advertencias.push(regla.msg);
    }

    // ── Análisis de redacción (solo documentos de texto) ──
    const obsRedaccion = (!esBinario && textoLow.length > 40)
        ? _analizarRedaccion(texto, textoLow, numItem)
        : [];

    // ── Concordancia entre documentos del expediente ──
    const obsConcordancia = (!esBinario && textoLow.length > 40)
        ? _verificarConcordancia(numItem, nombreArchivo, textoLow)
        : [];

    // Separar alertas de concordancia por severidad
    const concordanciaErr  = obsConcordancia.filter(a => a.startsWith('🔴'));
    const concordanciaAdv  = obsConcordancia.filter(a => !a.startsWith('🔴'));

    // Agregar a hallazgos o advertencias según severidad
    concordanciaErr.forEach(a => hallazgos.push(a));
    concordanciaAdv.forEach(a => advertencias.push(a));
    obsRedaccion.forEach(a => advertencias.push(a));

    // ── Calcular puntaje (0–100) ──
    const totalReglas  = skill.camposObligatorios.length + skill.advertencias.length;
    const penalizacion = hallazgos.length * 2 + advertencias.length;
    const puntaje = totalReglas > 0
        ? Math.max(0, Math.round(((totalReglas * 2 - penalizacion) / (totalReglas * 2)) * 100))
        : 100;

    // ── Determinar estado ──
    let estado = 'ok';
    if (hallazgos.length > 0)         estado = 'correccion';
    else if (advertencias.length > 0) estado = 'advertencia';
    if (esBinario && estado === 'ok') estado = 'advertencia';

    // ── Resumen ──
    let resumen = '';
    const totalProblemas = hallazgos.length + advertencias.length;
    if (estado === 'ok')
        resumen = `✅ ${skill.nombre}: cumple todos los requisitos normativos, de redacción y concordancia.`;
    else if (estado === 'advertencia')
        resumen = `⚠️ ${skill.nombre}: requisitos principales cumplidos. ${totalProblemas} observación(es) de redacción o concordancia.`;
    else
        resumen = `🔴 ${skill.nombre}: ${hallazgos.length} incumplimiento(s) normativo(s) o de concordancia detectado(s).`;

    const recomendaciones = [];
    if (esBinario) recomendaciones.push('Documento PDF/imagen recibido. Revise manualmente el contenido según la normativa: ' + skill.normativa);

    // Recomendaciones específicas por tipo de observación de redacción
    obsRedaccion.forEach(obs => {
        if (obs.includes('||CAMPOS_VACIOS||')) {
            const n = obs.split('||')[2];
            recomendaciones.push(`🖊️ Complete los ${n} campo(s) sin diligenciar identificados: reemplace cada marcador (corchetes, guiones, "pendiente") con la información real antes de firmar y radicar el documento.`);
        } else if (obs.includes('||INCOMPLETO||')) {
            recomendaciones.push('🖊️ El documento presenta secciones con texto muy breve. Verifique que todos los campos del formulario hayan sido debidamente diligenciados y que no sea una versión preliminar.');
        } else if (obs.includes('||REPETICION||')) {
            recomendaciones.push('🖊️ Se detectaron párrafos duplicados. Revise el documento para asegurarse de que no es una plantilla copiada sin personalizar; elimine las repeticiones innecesarias.');
        } else if (obs.includes('||OBJETO_AUSENTE||')) {
            recomendaciones.push('🖊️ Incluya en el documento una sección clara de "Objeto" o "Necesidad" que describa lo que se va a contratar, conforme al Art. 12 Res. 0456/2024 y Art. 20 Acuerdo 015/2024.');
        } else if (obs.includes('||FECHAS_VIEJAS||')) {
            const anios = obs.split('||')[2];
            recomendaciones.push(`🖊️ Actualice o justifique las fechas de vigencia ${anios} encontradas en el documento. Si corresponden a normas o referencias vigentes, indíquelo expresamente para que no genere confusión sobre la vigencia fiscal del proceso.`);
        }
    });

    if (obsConcordancia.length > 0)   recomendaciones.push('🔗 Verifique la concordancia de datos (objeto, NIT, CDP) entre todos los documentos del expediente antes de continuar con la siguiente etapa del proceso.');
    if (advertencias.length > 0 && obsRedaccion.length === 0 && obsConcordancia.length === 0) recomendaciones.push(...advertencias.slice(0,3));

    return {
        estado, puntaje, resumen,
        titulo: skill.nombre,
        hallazgos,
        advertencias,
        recomendaciones,
        camposPresentes,
        camposAusentes,
        normativa: skill.normativa
    };
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
    let tendencia = '→ Sin cambio';
    if (deltaP > 0)  tendencia = `↑ Mejora de ${deltaP} puntos`;
    if (deltaP < 0)  tendencia = `↓ Retroceso de ${Math.abs(deltaP)} puntos`;

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

        const estadoIcono = {
            ok: '✅', advertencia: '⚠️', correccion: '🔴',
            error: '⚠️', analizando: '⏳'
        }[entrada.estado] || '📄';

        const div = document.createElement('div');
        div.className = 'hist-entrada';
        div.innerHTML = `
            <div class="hist-num ${esPrimera ? 'hist-num-v1' : 'hist-num-vN'}">${entrada.version}</div>
            <div class="hist-info">
                <div class="hist-nombre">
                    ${estadoIcono} ${entrada.nombre}
                    ${esPrimera ? '<span class="hist-tag-v1">v1 · Inicial</span>' : `<span class="hist-tag-vN">v${entrada.version}</span>`}
                    ${esUltima ? '<span class="hist-tag-last">⬆ Actual</span>' : ''}
                </div>
                <div class="hist-meta">
                    📅 ${entrada.fecha} &nbsp;·&nbsp; 🕐 ${entrada.hora} &nbsp;·&nbsp; 💾 ${entrada.tamano}
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
  if (nombre) nombre.innerHTML = '📄 <strong style="color:#1F2937;">' + archivo.name + '</strong> <span style="font-size:10px;color:#6B7280;">(' + tam + ')</span>';
  if (estado) { estado.textContent='✅ Cargado'; estado.style.background='#DCFCE7'; estado.style.color='#166534'; }
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
        '<div class="hist-nombre">📄 '+e.nombre+
          (isPrimera?'<span class="hist-tag-v1">v1 · Inicial</span>':'<span class="hist-tag-vN">v'+e.version+'</span>')+
          (idx===0?'<span class="hist-tag-last">⬆ Actual</span>':'')+
        '</div>'+
        '<div class="hist-meta">📅 '+e.fecha+' · 🕐 '+e.hora+' · 💾 '+e.tamano+'</div>'+
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
    wrap.innerHTML = '<div class="hslv-d3p-fallback-note">✅ Checklist documental habilitado en modo de visualización reforzada. Puede validar cada requisito y cargar su soporte individual.</div>' +
      '<table><thead><tr><th style="width:70px;">#</th><th>Documento Requerido</th><th style="width:130px;">Validación</th><th style="width:330px;">Carga de Documento</th></tr></thead><tbody>' +
      HSLV_D3P_DOCS.map(function(doc, idx){
        var n = idx + 1;
        return '<tr>' +
          '<td><strong>' + n + '</strong></td>' +
          '<td>' + doc + '</td>' +
          '<td><input type="checkbox" id="hslv_d3p_chk_' + n + '" onchange="window.hslvUpdateD3PProgress && window.hslvUpdateD3PProgress()"></td>' +
          '<td>' +
            '<button type="button" class="btn" onclick="document.getElementById(\'hslv_d3p_arch_' + n + '\').click()">📎 Cargar Documento</button>' +
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
      lbl.innerHTML = input.files && input.files[0] ? '📄 <strong style="color:#1F2937;">' + input.files[0].name + '</strong>' : 'Sin archivo cargado';
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
  n.innerHTML = '🔀 &nbsp;<span>Cambiando a <strong>' + nombre + '</strong></span>';
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
        <div class="agente-ia-icon">🤖</div>
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
        <div style="font-size:40px;margin-bottom:10px;">📂</div>
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
      ⓘ El análisis es generado por IA con base en el contenido real de cada documento cargado y la normativa contractual vigente. No reemplaza el criterio jurídico del equipo de contratación.
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
  if (el) el.innerHTML = '✅ <strong style="color:#1F2937;">' + input.files[0].name + '</strong>';
  histU_registrar(input, labelId);
}
function sub_mostrarArchivo(input, labelId) {
  if (!input.files || !input.files[0]) return;
  var el = document.getElementById(labelId);
  if (el) el.innerHTML = '✅ <strong style="color:#1F2937;">' + input.files[0].name + '</strong>';
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
