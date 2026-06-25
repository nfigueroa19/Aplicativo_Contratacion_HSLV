// ════════════════════════════════════════════════════
//  js/auth-guard.js
//  Guardia de autenticación para index.html
//  Funciona tanto en local (VS Code) como en Netlify
// ════════════════════════════════════════════════════

// Detectar si estamos en local o en producción
// y usar la URL de login correcta en cada caso
var LOGIN_URL = (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1')
                ? '/login.html'   // local: VS Code Live Server
                : '/login';       // producción: Netlify

// ── Guardián principal ──
(async function verificarAcceso() {

    // 1. Verificar si hay sesión activa
    const { data: { session } } = await supabaseClient.auth.getSession();

    // Sin sesión → redirigir al login de inmediato
    if (!session) {
        window.location.replace(LOGIN_URL);
        return;
    }

    // 2. Verificar que el usuario esté aprobado en la tabla profiles
    const { data: perfil, error } = await supabaseClient
        .from('profiles')
        .select('estado')
        .eq('id', session.user.id)
        .single();

    // Si no tiene perfil o no está aprobado → cerrar sesión y redirigir
    if (error || !perfil || perfil.estado !== 'aprobado') {
        await supabaseClient.auth.signOut();
        window.location.replace(LOGIN_URL);
        return;
    }

    // 3. Todo en orden — la página carga normalmente

})();


// ── Función para cerrar sesión ──
// Se llama desde el botón "Cerrar Sesión" en index.html
async function cerrarSesion() {
    if (!confirm('¿Confirma que desea cerrar sesión?')) return;
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
}