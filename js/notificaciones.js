// ════════════════════════════════════════════════════
//  js/notificaciones.js
//  Campana de notificaciones flotante — compartida en las 8 páginas
//  protegidas (incluyendo /proceso/CODIGO, que no incluye script.js).
//  Solo usa las funciones ya existentes en js/db.js:
//  db_contarNotificaciones, db_cargarNotificaciones,
//  db_marcarLeida, db_marcarTodasLeidas.
// ════════════════════════════════════════════════════

(function () {

    var _INTERVALO_REVISION = 20000; // 20 segundos, a pedido del usuario

    function _notif_escaparHTML(texto) {
        var div = document.createElement('div');
        div.textContent = texto == null ? '' : String(texto);
        return div.innerHTML;
    }

    function _notif_formatearFecha(fechaISO) {
        if (!fechaISO) return '';
        var d = new Date(fechaISO);
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
               ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }

    function _notif_construirUI() {

        var boton = document.createElement('div');
        boton.id = 'btnNotificaciones';
        boton.title = 'Notificaciones';
        // z-index 9000: por debajo de los modales (.modal usa 9999) para que,
        // si algún modal se abre encima, la campana quede oculta detrás sin
        // necesidad de lógica adicional para ocultarla (mismo motivo por el
        // que el botón de JURISKILLS sí necesitó ese ajuste aparte).
        boton.style.cssText =
            'position:fixed;top:16px;right:24px;z-index:9000;' +
            'background:#123C7B;color:white;width:44px;height:44px;' +
            'border-radius:50%;display:flex;align-items:center;justify-content:center;' +
            'font-size:20px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);' +
            'user-select:none;';
        boton.innerHTML =
            '🔔' +
            '<span id="notifBadge" style="display:none;position:absolute;' +
            'top:-4px;right:-4px;background:#DC2626;color:white;border-radius:50%;' +
            'min-width:18px;height:18px;font-size:11px;font-weight:700;' +
            'align-items:center;justify-content:center;padding:0 4px;">0</span>';

        var panel = document.createElement('div');
        panel.id = 'panelNotificaciones';
        panel.style.cssText =
            'display:none;position:fixed;top:66px;right:24px;z-index:9000;' +
            'background:white;width:320px;max-width:calc(100vw - 32px);' +
            'max-height:420px;overflow-y:auto;border-radius:14px;' +
            'box-shadow:0 10px 30px rgba(0,0,0,.25);padding:14px;';
        panel.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
                '<strong style="color:#123C7B;font-size:14px;">Notificaciones</strong>' +
                '<span id="notifMarcarTodas" style="font-size:12px;color:#0B7A43;cursor:pointer;font-weight:600;">Marcar todas leídas</span>' +
            '</div>' +
            '<div id="notifLista" style="display:flex;flex-direction:column;gap:8px;"></div>';

        document.body.appendChild(boton);
        document.body.appendChild(panel);

        boton.addEventListener('click', function (e) {
            e.stopPropagation();
            var visible = panel.style.display === 'block';
            panel.style.display = visible ? 'none' : 'block';
            if (!visible) _notif_cargarLista();
        });

        panel.querySelector('#notifMarcarTodas').addEventListener('click', async function (e) {
            e.stopPropagation();
            await db_marcarTodasLeidas();
            await _notif_cargarLista();
            await _notif_actualizarContador();
        });

        // Cerrar el panel al hacer clic fuera de él
        document.addEventListener('click', function (e) {
            if (panel.style.display === 'block' &&
                !panel.contains(e.target) && e.target !== boton) {
                panel.style.display = 'none';
            }
        });
    }

    async function _notif_actualizarContador() {
        var badge = document.getElementById('notifBadge');
        if (!badge) return;
        var total = await db_contarNotificaciones();
        if (total > 0) {
            badge.style.display = 'flex';
            badge.textContent = total > 9 ? '9+' : String(total);
        } else {
            badge.style.display = 'none';
        }
    }

    async function _notif_marcarUnaLeida(id) {
        await db_marcarLeida(id);
        await _notif_cargarLista();
        await _notif_actualizarContador();
    }

    async function _notif_cargarLista() {
        var lista = document.getElementById('notifLista');
        if (!lista) return;
        lista.innerHTML = '<div style="text-align:center;color:#9CA3AF;font-size:13px;padding:16px 0;">Cargando...</div>';

        var notifs = await db_cargarNotificaciones();

        if (!notifs || !notifs.length) {
            lista.innerHTML = '<div style="text-align:center;color:#9CA3AF;font-size:13px;padding:16px 0;">Sin notificaciones.</div>';
            return;
        }

        lista.innerHTML = '';
        notifs.forEach(function (n) {
            var fondo = n.leida ? '#F9FAFB' : '#EFF6FF';
            var borde = n.leida ? '#E5E7EB' : '#BFDBFE';

            var item = document.createElement('div');
            item.style.cssText =
                'background:' + fondo + ';border:1px solid ' + borde + ';' +
                'border-radius:10px;padding:10px 12px;cursor:pointer;font-size:13px;';
            item.innerHTML =
                '<div style="color:#111827;' + (n.leida ? '' : 'font-weight:600;') + '">' +
                    _notif_escaparHTML(n.mensaje) +
                '</div>' +
                '<div style="color:#9CA3AF;font-size:11px;margin-top:4px;display:flex;justify-content:space-between;align-items:center;">' +
                    '<span>' + _notif_formatearFecha(n.fecha) + '</span>' +
                    (n.proceso_codigo
                        ? '<span style="color:#123C7B;font-weight:700;">Ver proceso →</span>'
                        : '') +
                '</div>';

            item.addEventListener('click', async function (e) {
                e.stopPropagation();
                if (!n.leida) await _notif_marcarUnaLeida(n.id);
                if (n.proceso_codigo) {
                    window.location.href = '/proceso/' + encodeURIComponent(n.proceso_codigo);
                }
            });

            lista.appendChild(item);
        });
    }

    function _notif_iniciar() {
        _notif_construirUI();
        _notif_actualizarContador();
        setInterval(_notif_actualizarContador, _INTERVALO_REVISION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _notif_iniciar);
    } else {
        _notif_iniciar();
    }

})();
