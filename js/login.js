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


// ── Al cargar: si ya hay sesión activa y está aprobado,
//    ir directo al dashboard sin mostrar el formulario ──
(async function verificarSesionPrevia() {

    const { data: { session } } = await supabaseClient.auth.getSession();

    // Sin sesión → mostrar el formulario normalmente
    if (!session) return;

    // Hay sesión → verificar si está aprobado
    const { data: perfil } = await supabaseClient
        .from('profiles')
        .select('estado')
        .eq('id', session.user.id)
        .single();

    if (perfil && perfil.estado === 'aprobado') {
        // Ya está autenticado y aprobado → ir al dashboard
        window.location.href = DASHBOARD_URL;
        return;
    }

    // Tiene sesión pero no está aprobado → cerrar sesión
    await supabaseClient.auth.signOut();

})();


// ════════════════════════════════════════════════════
//  Función principal: validar e iniciar sesión
//  Se llama al hacer clic en el botón o presionar Enter
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
        msgError.textContent    = '⚠️ Por favor ingrese su correo y contraseña.';
        return;
    }

    // Deshabilitar botón mientras verifica
    btn.disabled    = true;
    btn.textContent = '⏳ Verificando...';

    // ── Paso 1: autenticar con Supabase ──
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email:    email,
        password: password
    });

    if (error) {
        msgError.style.display  = 'block';
        msgError.textContent    = '❌ Correo o contraseña incorrectos.';
        btn.disabled    = false;
        btn.textContent = '🔐 Iniciar Sesión';
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
        msgError.textContent    = '❌ No se pudo verificar el acceso. Contacte al administrador.';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = '🔐 Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'pendiente') {
        msgPendiente.style.display = 'block';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = '🔐 Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'inactivo') {
        msgError.style.display  = 'block';
        msgError.textContent    = '🚫 Tu cuenta ha sido desactivada. Contacta al administrador.';
        await supabaseClient.auth.signOut();
        btn.disabled    = false;
        btn.textContent = '🔐 Iniciar Sesión';
        return;
    }

    if (perfil.estado === 'aprobado') {
        // Todo en orden → ir al dashboard
        window.location.href = DASHBOARD_URL;
        return;
    }

    // Estado desconocido → bloquear por seguridad
    msgError.style.display  = 'block';
    msgError.textContent    = '❌ Estado de cuenta no reconocido. Contacte al administrador.';
    await supabaseClient.auth.signOut();
    btn.disabled    = false;
    btn.textContent = '🔐 Iniciar Sesión';
}