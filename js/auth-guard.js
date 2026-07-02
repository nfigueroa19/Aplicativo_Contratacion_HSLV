// ════════════════════════════════════════════════════
//  js/auth-guard.js
//  Guardia de autenticación + cierre por inactividad
// ════════════════════════════════════════════════════

// Detectar entorno para usar la URL correcta
var LOGIN_URL = (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1')
                ? '/login.html'
                : '/login';

// ── Guardián principal ──
(async function verificarAcceso() {

    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.replace(LOGIN_URL);
        return;
    }

    const { data: perfil, error } = await supabaseClient
        .from('profiles')
        .select('estado')
        .eq('id', session.user.id)
        .single();

    if (error || !perfil || perfil.estado !== 'aprobado') {
        await supabaseClient.auth.signOut();
        window.location.replace(LOGIN_URL);
        return;
    }

    if (window.location.pathname === '/' || 
    window.location.pathname === '/index.html') {
    history.replaceState(null, '', '/dashboard');
    }

    // Sesión válida — iniciar el monitor de inactividad
    iniciarMonitorInactividad();

})();


// ════════════════════════════════════════════════════
//  MONITOR DE INACTIVIDAD
//  Cierra sesión tras 10 minutos sin actividad
// ════════════════════════════════════════════════════

var _timerInactividad   = null;
var _timerAviso         = null;
var _MINUTOS_LIMITE     = 10;
var _MINUTOS_AVISO      = 8;    // aviso 2 minutos antes de cerrar
var _MS_LIMITE          = _MINUTOS_LIMITE * 60 * 1000;
var _MS_AVISO           = _MINUTOS_AVISO  * 60 * 1000;

function iniciarMonitorInactividad() {

    // Eventos que cuentan como actividad del usuario
    var eventosActividad = [
        'mousemove',
        'mousedown',
        'keydown',
        'touchstart',
        'scroll',
        'click'
    ];

    // Reiniciar el contador con cada actividad
    eventosActividad.forEach(function(evento) {
        document.addEventListener(evento, reiniciarContador, { passive: true });
    });

    // Arrancar el contador por primera vez
    reiniciarContador();
}

function reiniciarContador() {

    // Cancelar temporizadores anteriores
    clearTimeout(_timerInactividad);
    clearTimeout(_timerAviso);

    // Ocultar el aviso si estaba visible
    ocultarAvisoInactividad();

    // Programar el aviso a los 8 minutos
    _timerAviso = setTimeout(function() {
        mostrarAvisoInactividad();
    }, _MS_AVISO);

    // Programar el cierre a los 10 minutos
    _timerInactividad = setTimeout(function() {
        cerrarSesionPorInactividad();
    }, _MS_LIMITE);
}

async function cerrarSesionPorInactividad() {
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
}

// ── Aviso visual 2 minutos antes de cerrar ──
function mostrarAvisoInactividad() {
    var aviso = document.getElementById('_avisoInactividad');
    if (!aviso) {
        aviso = document.createElement('div');
        aviso.id = '_avisoInactividad';
        aviso.innerHTML =
            '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
                '<span style="font-size:20px;">⏰</span>' +
                '<div>' +
                    '<div style="font-weight:700;font-size:14px;">Sesión por vencer</div>' +
                    '<div style="font-size:12px;opacity:.9;margin-top:2px;">' +
                        'Tu sesión se cerrará en 2 minutos por inactividad.' +
                    '</div>' +
                '</div>' +
                '<button onclick="reiniciarContador()" ' +
                    'style="margin-left:auto;background:white;color:#92400E;' +
                           'border:none;border-radius:8px;padding:7px 14px;' +
                           'font-weight:700;font-size:12px;cursor:pointer;' +
                           'white-space:nowrap;">' +
                    'Seguir conectado' +
                '</button>' +
            '</div>';

        aviso.style.cssText =
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
            'background:linear-gradient(90deg,#D97706,#92400E);' +
            'color:white;border-radius:14px;padding:14px 20px;' +
            'box-shadow:0 8px 24px rgba(0,0,0,.3);z-index:999999;' +
            'max-width:480px;width:calc(100% - 40px);' +
            'animation:fadeInUp .3s ease;';

        document.body.appendChild(aviso);
    }
    aviso.style.display = 'block';
}

function ocultarAvisoInactividad() {
    var aviso = document.getElementById('_avisoInactividad');
    if (aviso) aviso.style.display = 'none';
}


// ════════════════════════════════════════════════════
//  Función para cerrar sesión manualmente
//  Se llama desde el botón "Cerrar Sesión" en index.html
// ════════════════════════════════════════════════════

async function cerrarSesion() {
    if (!confirm('¿Confirma que desea cerrar sesión?')) return;
    clearTimeout(_timerInactividad);
    clearTimeout(_timerAviso);
    await cerrarSesionConLimpieza();
}