// ════════════════════════════════════════════════════
//  js/login.js
//  Lógica de la pantalla de inicio de sesión
//  Funciona tanto en local (VS Code) como en Netlify
// ════════════════════════════════════════════════════

// Detectar entorno para usar la URL correcta
var DASHBOARD_URL = '/';
var LOGIN_URL = (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1')
                ? '/login.html'
                : '/login';


// Misma clave que usa js/auth-guard.js para registrar la última actividad real
var _CLAVE_ACTIVIDAD = 'hslv_ultima_actividad';
var _MS_LIMITE_SESION = 10 * 60 * 1000; // 10 minutos

// ── Al cargar: si ya hay sesión activa y está aprobado,
//    ir directo al dashboard sin mostrar el formulario ──
(async function verificarSesionPrevia() {

    const { data: { session } } = await supabaseClient.auth.getSession();

    // Sin sesión → mostrar el formulario normalmente
    if (!session) return;

    // Sesión "viva" según Supabase, pero si ya pasaron 10+ minutos desde
    // la última actividad real (p. ej. se cerró la pestaña sin cerrar sesión),
    // se fuerza el cierre en vez de dejar entrar en automático.
    const ultimaActividad = localStorage.getItem(_CLAVE_ACTIVIDAD);
    if (!ultimaActividad || (Date.now() - Number(ultimaActividad) > _MS_LIMITE_SESION)) {
        localStorage.removeItem(_CLAVE_ACTIVIDAD);
        await supabaseClient.auth.signOut();
        return;
    }

    // Hay sesión → verificar si está aprobado
    const { data: perfil } = await supabaseClient
        .from('profiles')
        .select('estado')
        .eq('id', session.user.id)
        .single();

    if (perfil && perfil.estado === 'aprobado') {
        // Ya está autenticado y aprobado → ir al dashboard
        sessionStorage.setItem('hslv_splash_desde_login', '1');
        window.location.href = DASHBOARD_URL;
        return;
    }

    // Tiene sesión pero no está aprobado → cerrar sesión
    await supabaseClient.auth.signOut();

})();


// ════════════════════════════════════════════════════
//  Función principal: validar e iniciar sesión
//  Se llama al enviar el formulario: con el botón "Iniciar Sesión"
//  o pulsando Enter dentro de cualquiera de los dos campos
//  (envío implícito del formulario, que el navegador ya hace solo).
// ════════════════════════════════════════════════════

async function validarLogin() {

    const email        = document.getElementById('loginEmail').value.trim();
    const password     = document.getElementById('loginPassword').value;
    const btn          = document.getElementById('btnLogin');
    const msgError     = document.getElementById('msgError');
    const msgPendiente = document.getElementById('msgPendiente');

    // Ocultar mensajes anteriores
    msgError.style.display     = 'none';
    msgPendiente.style.display = 'none';

    // Validar que los campos no estén vacíos
    if (!email || !password) {
        msgError.style.display  = 'block';
        msgError.textContent    = 'Por favor ingrese su correo y contraseña.';
        return;
    }

    // Deshabilitar botón mientras verifica
    btn.disabled    = true;
    btn.textContent = 'Verificando...';

    // ── Paso 1: autenticar con Supabase ──
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email:    email,
        password: password
    });

    if (error) {
        msgError.style.display  = 'block';
        msgError.textContent    = 'Correo o contraseña incorrectos.';
        btn.disabled    = false;
        btn.textContent = 'Iniciar Sesión';
        return;
    }

    // ── Paso 2: verificar estado del perfil ──
    const { data: perfil, error: errorPerfil } = await supabaseClient
        .from('profiles')
        .select('estado')
        .eq('id', data.user.id)
        .single();

    if (errorPerfil || !perfil) {
        msgError.style.display  = 'block';
        msgError.textContent    = 'No se pudo verificar el acceso. Contacte al administrador.';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = 'Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'pendiente') {
        msgPendiente.style.display = 'block';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = 'Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'inactivo') {
        msgError.style.display  = 'block';
        msgError.textContent    = 'Tu cuenta ha sido desactivada. Contacta al administrador.';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = 'Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'aprobado') {
        // Todo en orden → registrar el inicio de la actividad e ir al dashboard
        localStorage.setItem(_CLAVE_ACTIVIDAD, Date.now().toString());
        // Le avisa al splash de index.html que este ingreso viene de login,
        // para que muestre la secuencia larga (imagen, luego barra, mínimo 3s)
        sessionStorage.setItem('hslv_splash_desde_login', '1');
        window.location.href = DASHBOARD_URL;
        return;
    }

    // Estado desconocido → bloquear por seguridad
    msgError.style.display  = 'block';
    msgError.textContent    = 'Estado de cuenta no reconocido. Contacte al administrador.';
    await supabaseClient.auth.signOut();
    btn.disabled    = false;
    btn.textContent = 'Iniciar Sesión';
}


// ════════════════════════════════════════════════════
//  REGISTRO DE ACCIONES (Sprint 4 — ver js/acciones.js)
//  Sustituye al atributo onsubmit del formulario, que hacía
//  preventDefault y llamaba a la validación.
//
//  (Ojo al editar este comentario: si se escribe un on*= con comillas,
//   verificar-nombres-reservados.js lo lee como una llamada real.)
// ════════════════════════════════════════════════════
function enviarLogin(evento) {
    if (evento) evento.preventDefault();
    validarLogin();
}

if (typeof registrarAcciones === 'function') {
    registrarAcciones({
        // login.html
        enviarLogin: enviarLogin
    });
} else {
    console.error('js/acciones.js no está cargado: el formulario de login no ' +
                  'responderá. Revisa el orden de los <script>.');
}


// ── Enter dentro de un campo ──
// Sustituye a los dos atributos onkeydown que tenían los campos. No se
// delega en acciones.js a propósito: keydown no está entre los eventos
// del delegador, y colgarlo de document costaría un closest() por cada
// tecla de toda la app para algo que solo necesita esta página.
//
// El navegador ya envía el formulario solo al pulsar Enter (tiene un
// botón type="submit"), pero eso NO se pudo comprobar en el panel de la
// sesión donde se hizo el cambio, así que aquí se hace explícito:
//   · preventDefault() cancela ese envío implícito,
//   · requestSubmit() dispara UNO.
// Resultado: exactamente una validación por Enter. Los onkeydown
// originales provocaban DOS —una del keydown y otra del envío que ese
// mismo Enter causaba— porque no cancelaban nada.
var _formLogin = document.getElementById('loginForm');
if (_formLogin) {
    _formLogin.addEventListener('keydown', function (evento) {
        if (evento.key !== 'Enter') return;
        evento.preventDefault();
        // requestSubmit existe desde Chrome 76 / Safari 16. En algo más
        // viejo se llama a la validación directamente antes que dejar el
        // Enter muerto.
        if (typeof _formLogin.requestSubmit === 'function') {
            _formLogin.requestSubmit();
        } else {
            validarLogin();
        }
    });
}