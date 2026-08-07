// ════════════════════════════════════════════════════
//  build.js — Compilador de producción para Netlify
//  HSLV Contratación
// ════════════════════════════════════════════════════
//
//  Qué hace:
//   1. Crea dist/ desde cero con SOLO los archivos que deben ser públicos.
//   2. Ofusca cada js/*.js (protege el conocimiento jurídico de JURISKILLS).
//   3. Deja los source maps FUERA de dist/, en .build-maps/ (nunca se suben).
//   4. Minifica el CSS.
//   5. Escribe dist/_headers con las cabeceras de seguridad.
//
//  Qué NO toca: la raíz del proyecto. `serve .` sigue sirviendo el código
//  original sin ofuscar, con la consola y el depurador funcionando igual
//  que siempre. Ver _Segundo_Cerebro/Auditoria_360_Y_Blindaje.md.
//
//  Uso:  npm run build
// ════════════════════════════════════════════════════

const fs        = require('fs-extra');
const path      = require('path');
const CleanCSS  = require('clean-css');
const Obfuscator = require('javascript-obfuscator');

const RAIZ   = __dirname;
const DIST   = path.join(RAIZ, 'dist');
const MAPAS  = path.join(RAIZ, '.build-maps');

// ════════════════════════════════════════════════════
//  1. QUÉ SE PUBLICA Y QUÉ NO
//
//  Antes, Netlify publicaba la raíz del repositorio y por eso
//  https://<sitio>/supabase/functions/analizar-documento/index.ts
//  devolvía el código con TODOS los prompts del motor jurídico
//  (verificado contra el sitio en vivo el 2026-08-07).
//
//  Los .html de la raíz y las carpetas de PUBLICAR_DIRS se copian solos
//  — así no hay que tocar este archivo cada vez que se agrega una página.
//  Todo lo que no esté en ninguna de las dos listas hace ABORTAR el build:
//  es deliberado. Si mañana aparece una carpeta nueva con algo sensible,
//  prefiero que el build falle a que se publique en silencio.
// ════════════════════════════════════════════════════
const PUBLICAR_DIRS = ['css', 'js', 'assets', 'img', 'fonts'];
const OTROS_PUBLICOS = ['_redirects'];

const NUNCA_PUBLICAR = [
    'sql',                  // esquema y políticas RLS
    'supabase',             // ← los prompts del motor jurídico
    '_Segundo_Cerebro',     // documentación interna
    '.claude', '.obsidian', '.github', '.vscode', '.git',
    'node_modules', 'dist', '.build-maps',

    // La crea el propio Netlify dentro del repo al compilar (estado interno
    // del build). No existe en local, así que solo aparece en el servidor:
    // el primer despliegue abortó por esto. Ver el log del 2026-08-06.
    '.netlify',

    'CLAUDE.md', 'build.js', 'netlify.toml', 'serve.json',
    'package.json', 'package-lock.json', '.gitignore', '.env',

    // Versión monolítica anterior a la separación en páginas (junio 2026).
    // Solo existe en el repositorio real, no en Prueba2, pero se declara en
    // las dos copias de build.js para que no se pierda al copiar de una a
    // otra. Son 756 KB con el criterio jurídico en texto plano: 62 menciones
    // de "Acuerdo 015", 31 de "Decreto 1082" y los bloques SKILLS_JURIDICOS e
    // ITEMS_CHECKLIST completos. El HTML no se ofusca nunca, así que
    // publicarlo dejaría legible justo lo que el perfil ALTO protege en
    // js/juriskills-engine.js. Ninguna ruta de _redirects ni de serve.json
    // apunta aquí: no se pierde nada al no publicarlo.
    'aplicativo_contratacion_hslv.html'
];

// ════════════════════════════════════════════════════
//  2. NOMBRES QUE NO SE PUEDEN RENOMBRAR
//     La app llama 79 funciones globales desde atributos onclick= del
//     HTML (271 sitios). El HTML no se ofusca, así que si el ofuscador
//     renombra estas funciones, el HTML llama a un nombre que ya no
//     existe y la app deja de responder. Esta lista se generó leyendo
//     todos los on*= de los .html y de los innerHTML de los .js.
//     Si agregas una función nueva llamada desde un onclick, AGRÉGALA AQUÍ.
// ════════════════════════════════════════════════════
const NOMBRES_RESERVADOS = [
    '_cd1pToggleForzarDuplicado', '_fmt_actualizarValorLetras', '_fmt_formatearValorInput',
    '_hist_marcarCambioResponsable', '_pd_marcarCambioResponsable', '_pd_marcarCambioValor',
    'actualizarJustif13', 'actualizarOpcionesConv', 'analizarDocumentoCD1P',
    'cerrarModalApiKey', 'cerrarSesion', 'checklistComentario_borrar',
    'checklistComentario_confirmar', 'checklistComentario_editar', 'closeModal',
    'conv_mostrarArchivo', 'd3p_guardarCDP', 'd3p_guardarPAA', 'd3p_mostrarArchivo',
    'dash_abrirHistorial', 'eliminarProceso', 'exportarObservacion', 'guardarObservacion',
    'guardarProceso', 'guardarProcesoHistorial', 'histU_quitarVersion', 'histU_toggle',
    'hist_asignarResponsable', 'hist_eliminar', 'hist_exportarExcel', 'hist_renderTabla',
    'hist_verDetalle', 'hslvD3PFallbackFile', 'hslvUpdateD3PProgress',
    'juriskillsAbrirModal', 'juriskillsCerrarModal', 'lexconAnalizar', 'mostrarArchivo',
    'mostrarArchivoSub', 'mostrarModalApiKey', 'openModal',
    'panel_abrirSeguimientoConocimiento', 'pd_actualizarValor', 'pd_analizarDocumento',
    'pd_archivoElegido', 'pd_asignarResponsable', 'pd_borrarComentarioPendiente',
    'pd_confirmarComentario', 'pd_descargar', 'pd_editarComentarioPendiente',
    'pd_elegirArchivo', 'pd_finalizar', 'pd_guardar', 'pd_juriskillsAbrirModal',
    'pd_juriskillsCerrarModal', 'pd_quitarPendiente', 'pd_toggleHistorial',
    'pd_toggleHistorialAnalisis', 'pd_verAnalisisHistorial', 'publicarSecop',
    'radioClicConDeseleccion', 'reAnalizarTodo', 'registrarSupervision',
    'reiniciarContador', 'seg_renderTabla', 'sub_mostrarArchivo', 'supActualizarBarra',
    'supLimpiar', 'switchSubTab', 'tabFileLoaded', 'tabUpdateProgress',
    'toggleHistorial', 'validarLogin', 'verDetalleProceso', 'verificarObjetoContractual',
    // Globales compartidos entre archivos (no son onclick, pero cruzan
    // fronteras de archivo y el ofuscador los ve como locales de cada uno).
    'supabaseClient', 'HIST_BD', 'CHECKLIST_LABELS_POR_TIPO', 'ITEMS_CHECKLIST',
    'SKILLS_JURIDICOS', 'ITEMS_RESTRINGIDOS_GLOBAL', 'MAX_TAMANO_ARCHIVO_BYTES',
    'pausarMonitorInactividad', 'reanudarMonitorInactividad', 'cerrarSesionConLimpieza',
    'escaparHTML', 'escapeHTML', '_perfilCache', '_dbListo'
];

// ════════════════════════════════════════════════════
//  3. PERFILES DE OFUSCACIÓN
// ════════════════════════════════════════════════════

// Base común: renameGlobals SIEMPRE en false (ver punto 2).
//
// ⚠️ identifiersPrefix ES OBLIGATORIO Y NO SE PUEDE QUITAR.
// Los 9 archivos se cargan como <script> clásicos: comparten UN SOLO scope
// global. Aunque renameGlobals sea false, el ofuscador sí renombra los
// `const`/`let`/`var` de nivel superior a nombres cortos del mismo alfabeto
// ('s', 'D', 'F'…) en cada archivo por separado. Sin prefijo, dos archivos
// eligen el mismo nombre y el navegador lanza
//     Uncaught SyntaxError: Identifier 's' has already been declared
// que aborta el archivo COMPLETO — la app queda muerta sin ningún error de
// red visible. Verificado en el navegador el 2026-08-06 con js/login.js +
// js/juriskills-engine.js. Un prefijo distinto por archivo lo elimina.
function perfilBase(nombreArchivo) {
    const slug = path.basename(nombreArchivo, '.js').replace(/[^a-zA-Z0-9]/g, '_');
    return {
        compact: true,
        renameGlobals: false,              // ← innegociable: rompería los onclick
        reservedNames: NOMBRES_RESERVADOS,
        identifierNamesGenerator: 'mangled',
        identifiersPrefix: '_hslv_' + slug + '_',
        selfDefending: false,              // rompe si Netlify post-procesa el JS
        debugProtection: false,            // haría inusable la consola en soporte
        disableConsoleOutput: true,        // borra los 71 console.* residuales
        sourceMap: true,
        sourceMapMode: 'separate',
        sourceMapFileName: path.basename(nombreArchivo) + '.map',
        target: 'browser'
    };
}

// ALTO — solo para juriskills-engine.js. Es el activo de propiedad
// intelectual: ITEMS_CHECKLIST, SKILLS_JURIDICOS, NORMATIVA y
// CRITERIOS_CRUZADOS_IA contienen el criterio jurídico del hospital en
// texto plano. stringArray + rc4 hace que ese texto ya no sea legible
// con Ctrl+U ni buscable en el bundle.
function perfilAlto(nombreArchivo) {
    return Object.assign(perfilBase(nombreArchivo), {
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 1,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayIndexShift: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersType: 'function',
        splitStrings: true,
        splitStringsChunkLength: 8,
        numbersToExpressions: true,
        simplify: true,
        transformObjectKeys: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5
    });
}

// MEDIO — resto de archivos. Sin controlFlowFlattening: cuesta ~1.5x de
// CPU y aquí no hay IP que justifique pagarlo.
function perfilMedio(nombreArchivo) {
    return Object.assign(perfilBase(nombreArchivo), {
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.8,
        stringArrayRotate: true,
        simplify: true,
        controlFlowFlattening: false
    });
}

// supabase.js NO se ofusca: son 5 líneas con la URL y la anon key, que
// por diseño de Supabase son públicas. Ofuscarlo no protege nada y
// complica depurar el arranque de la app.
const SIN_OFUSCAR = ['js/supabase.js'];
const PERFIL_ALTO = ['js/juriskills-engine.js'];

// ════════════════════════════════════════════════════
//  4. CABECERAS DE SEGURIDAD (dist/_headers)
//     NOTA: script-src incluye 'unsafe-inline' porque la app tiene 271
//     atributos onclick= en el HTML. Quitarlo requiere el Sprint 4
//     (migrar onclick → addEventListener). El resto de directivas SÍ
//     aporta protección real desde ya.
// ════════════════════════════════════════════════════
const CABECERAS = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://gaikgihkeysulpvjrhom.supabase.co wss://gaikgihkeysulpvjrhom.supabase.co https://cdnjs.cloudflare.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin

/*.map
  X-Robots-Tag: noindex
`;

// ════════════════════════════════════════════════════
//  5. EJECUCIÓN
// ════════════════════════════════════════════════════
function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

async function build() {
    console.log('\n  HSLV Contratación — build de producción\n');

    await fs.remove(DIST);
    await fs.remove(MAPAS);
    await fs.ensureDir(DIST);
    await fs.ensureDir(MAPAS);

    // ── Control de inventario: nada sin clasificar ──
    // Si aparece algo en la raíz que no está ni en publicar ni en la lista
    // de prohibidos, el build se detiene y pide una decisión explícita.
    const raizEntradas = await fs.readdir(RAIZ);
    const sinClasificar = raizEntradas.filter(e =>
        !e.endsWith('.html') &&
        !PUBLICAR_DIRS.includes(e) &&
        !OTROS_PUBLICOS.includes(e) &&
        !NUNCA_PUBLICAR.includes(e));
    if (sinClasificar.length) {
        console.error('\n  ABORTADO: hay archivos sin clasificar en la raíz:\n    ' +
            sinClasificar.join('\n    ') +
            '\n\n  Agrégalos a PUBLICAR_DIRS/OTROS_PUBLICOS (si son públicos)' +
            '\n  o a NUNCA_PUBLICAR (si no deben salir de tu equipo).\n');
        process.exit(1);
    }

    // ── HTML (los .html de la raíz, salvo los prohibidos) ──
    // El filtro de arriba deja pasar cualquier .html sin pedir clasificación,
    // para no tener que tocar este archivo al crear una página nueva. Pero un
    // .html en NUNCA_PUBLICAR sí tiene que respetarse: sin este segundo
    // filtro se copiaba igual y solo lo detectaba la red de seguridad del
    // final, abortando el build entero.
    const htmlPublicos = raizEntradas.filter(e =>
        e.endsWith('.html') && !NUNCA_PUBLICAR.includes(e));
    for (const archivo of htmlPublicos) {
        await fs.copy(path.join(RAIZ, archivo), path.join(DIST, archivo));
    }
    console.log('  HTML     ' + htmlPublicos.length + ' páginas copiadas');

    // ── CSS (minificado) ──
    let cssAntes = 0, cssDespues = 0, nCss = 0;
    const dirCss = path.join(RAIZ, 'css');
    if (await fs.pathExists(dirCss)) {
        for (const nombre of (await fs.readdir(dirCss)).filter(f => f.endsWith('.css'))) {
            const codigo = await fs.readFile(path.join(dirCss, nombre), 'utf8');
            const out = new CleanCSS({ level: 2 }).minify(codigo);
            cssAntes += codigo.length;
            cssDespues += out.styles.length;
            nCss++;
            await fs.outputFile(path.join(DIST, 'css', nombre), out.styles);
        }
    }
    console.log('  CSS      ' + nCss + ' archivos · ' + kb(cssAntes) + ' → ' + kb(cssDespues));

    // ── Estáticos (assets/, img/, fonts/) tal cual ──
    for (const dir of PUBLICAR_DIRS) {
        if (dir === 'css' || dir === 'js') continue;   // tienen su propio paso
        const origen = path.join(RAIZ, dir);
        if (await fs.pathExists(origen)) {
            await fs.copy(origen, path.join(DIST, dir));
            console.log('  Estático ' + dir + '/ copiado');
        }
    }

    // ── JS ──
    const archivosJS = (await fs.readdir(path.join(RAIZ, 'js')))
        .filter(f => f.endsWith('.js'))
        .map(f => 'js/' + f);

    let jsAntes = 0, jsDespues = 0;

    for (const archivo of archivosJS) {
        const codigo = await fs.readFile(path.join(RAIZ, archivo), 'utf8');
        jsAntes += codigo.length;

        if (SIN_OFUSCAR.includes(archivo)) {
            await fs.outputFile(path.join(DIST, archivo), codigo);
            jsDespues += codigo.length;
            console.log('    ' + archivo.padEnd(30) + kb(codigo.length).padStart(10) +
                        '   (sin ofuscar — claves públicas por diseño)');
            continue;
        }

        const esAlto = PERFIL_ALTO.includes(archivo);
        const opciones = esAlto ? perfilAlto(archivo) : perfilMedio(archivo);

        const resultado = Obfuscator.obfuscate(codigo, opciones);
        const salida = resultado.getObfuscatedCode();

        await fs.outputFile(path.join(DIST, archivo), salida);
        jsDespues += salida.length;

        // El source map va a .build-maps/, NUNCA a dist/. Un .map publicado
        // deshace el 100% de la ofuscación con un clic en DevTools.
        const mapa = resultado.getSourceMap();
        if (mapa) {
            await fs.outputFile(
                path.join(MAPAS, path.basename(archivo) + '.map'), mapa);
        }

        console.log('    ' + archivo.padEnd(30) + kb(salida.length).padStart(10) +
                    '   perfil ' + (esAlto ? 'ALTO (IP jurídica)' : 'medio'));
    }
    console.log('  JS       ' + kb(jsAntes) + ' → ' + kb(jsDespues));

    // ── Otros + cabeceras ──
    for (const archivo of OTROS_PUBLICOS) {
        if (await fs.pathExists(path.join(RAIZ, archivo))) {
            await fs.copy(path.join(RAIZ, archivo), path.join(DIST, archivo));
        }
    }
    await fs.outputFile(path.join(DIST, '_headers'), CABECERAS);

    // ── Red de seguridad: que no se cuele nada privado ──
    const filtrados = [];
    for (const p of NUNCA_PUBLICAR) {
        if (await fs.pathExists(path.join(DIST, p))) filtrados.push(p);
    }
    if (filtrados.length) {
        console.error('\n  ABORTADO: dist/ contiene archivos privados: ' +
                      filtrados.join(', '));
        process.exit(1);
    }
    const mapasEnDist = (await fs.readdir(path.join(DIST, 'js')))
        .filter(f => f.endsWith('.map'));
    if (mapasEnDist.length) {
        console.error('\n  ABORTADO: hay source maps en dist/: ' + mapasEnDist.join(', '));
        process.exit(1);
    }

    console.log('\n  OK  dist/ listo para Netlify');
    console.log('      source maps en .build-maps/ (no se publican)\n');
}

build().catch(err => { console.error(err); process.exit(1); });
