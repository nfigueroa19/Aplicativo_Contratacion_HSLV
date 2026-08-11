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
//     La app llama funciones globales desde atributos onclick= del HTML.
//     El HTML no se ofusca, así que si el ofuscador renombra estas
//     funciones, el HTML llama a un nombre que ya no existe y la app deja
//     de responder — sin ningún error en consola. Esta lista se generó
//     leyendo todos los on*= de los .html y de los innerHTML de los .js.
//     Si agregas una función nueva llamada desde un onclick, AGRÉGALA AQUÍ.
//     Y si eliminas una, quítala: una entrada sobrante no rompe nada
//     (reservedNames protege nombres que no hace falta que existan), pero
//     esta lista es la documentación de qué cruza la frontera HTML↔JS.
//     Comprobar siempre con _Segundo_Cerebro/verificar-nombres-reservados.js
//
//     Sprint 3 (2026-08-07): salieron diez, junto con la UI fantasma de
//     index.html que era lo único que las llamaba —
//     de las 4 pestañas `#tab-*`: 'exportarObservacion',
//     'guardarObservacion', 'lexconAnalizar', 'switchSubTab',
//     'tabFileLoaded', 'tabUpdateProgress';
//     de las 5 secciones inalcanzables: 'actualizarOpcionesConv',
//     'd3p_guardarCDP', 'd3p_guardarPAA', 'd3p_mostrarArchivo'.
//     Ojo con los nombres parecidos: 'mostrarArchivo' SÍ sigue vivo y
//     tiene que quedarse. ('conv_mostrarArchivo' también seguía vivo
//     entonces; sale ahora con la migración de convocatoria.html, ver
//     abajo.)
//
//     Sprint 4 (2026-08-08): con login.html, proceso-detalle.html e
//     historial.html migradas a data-accion salieron dos —
//     'validarLogin' y 'pd_juriskillsCerrarModal'—, que eran las únicas
//     de esas páginas que no las llamara nadie más.
//     Se QUEDAN a propósito, aunque su página ya esté migrada:
//       · 'reAnalizarTodo'      — contratacion.html y directa-3p.html
//                                 todavía lo llaman con onclick=.
//       · 'hist_renderTabla' y 'hist_exportarExcel' — index.html todavía
//                                 los llama con on*=, y además
//                                 'hist_renderTabla' se llama por su
//                                 nombre desde el <script> en línea del
//                                 final de historial.html.
//
//     directa-3p.html (2026-08-08): migrada entera, y aun así NO sale
//     ningún nombre de esta lista. Sus 6 funciones las siguen llamando
//     otras páginas sin migrar (contratacion, convocatoria, subasta) y,
//     en el caso de 'histU_toggle', el propio js/script.js, que genera
//     ese botón con innerHTML en dos sitios. Migrar una página ya no
//     basta para liberar un nombre: hay que mirar también los on*= que
//     los .js escriben en tiempo de ejecución.
//
//     convocatoria.html (2026-08-08): sale UNO, 'conv_mostrarArchivo'.
//     Es el primero que se libera desde las páginas de checklist, y se
//     libera porque las tres poblaciones dan cero: ningún otro .html lo
//     llama, ningún innerHTML de los .js lo genera y no aparece en el
//     <script> en línea de historial.html. Sus otras cinco funciones
//     ('_fmt_formatearValorInput', '_fmt_actualizarValorLetras',
//     'guardarProcesoHistorial', 'histU_toggle', 'mostrarArchivo') se
//     quedan: contratacion.html y subasta.html las siguen llamando.
//
//     subasta.html (2026-08-08): sale 'sub_mostrarArchivo', por lo mismo
//     y comprobado igual. De las demás que llamaba, al migrar la última
//     página de checklist (contratacion.html) solo se liberará
//     'mostrarArchivo'. Las otras cuatro se quedan aunque no las llame ya
//     ningún .html, y cada una por un motivo distinto:
//       · 'histU_toggle'             — js/script.js lo escribe con
//                                      innerHTML (líneas 150 y 3214).
//       · '_fmt_formatearValorInput' y '_fmt_actualizarValorLetras'
//                                    — igual, en js/proceso-detalle.js:491.
//       · 'guardarProcesoHistorial'  — NO es innerHTML: js/script.js lo
//                                      envuelve accediendo a
//                                      window.guardarProcesoHistorial
//                                      (parche del dashboard, ~línea 585).
//                                      Un acceso por nombre a través de
//                                      window rompe igual con
//                                      renameGlobals que un onclick=.
//     Vale la pena el recordatorio: para decidir si un nombre sale hay que
//     mirar CUATRO cosas, no tres — los .html, los innerHTML de los .js, el
//     <script> en línea de historial.html, y los accesos window['nombre'].
// ════════════════════════════════════════════════════
const NOMBRES_RESERVADOS = [
    '_cd1pToggleForzarDuplicado', '_fmt_actualizarValorLetras', '_fmt_formatearValorInput',
    '_hist_marcarCambioResponsable', '_pd_marcarCambioResponsable', '_pd_marcarCambioValor',
    'actualizarJustif13', 'analizarDocumentoCD1P',
    'cerrarSesion', 'checklistComentario_borrar',
    'checklistComentario_confirmar', 'checklistComentario_editar',
    'dash_abrirHistorial', 'eliminarProceso',
    'guardarProceso', 'guardarProcesoHistorial', 'histU_quitarVersion', 'histU_toggle',
    'hist_asignarResponsable', 'hist_eliminar', 'hist_renderTabla',
    'hist_verDetalle', 'hslvD3PFallbackFile', 'hslvUpdateD3PProgress',
    'juriskillsAbrirModal', 'juriskillsCerrarModal', 'mostrarArchivo',
    'mostrarArchivoSub', 'openModal',
    'panel_abrirSeguimientoConocimiento', 'pd_actualizarValor', 'pd_analizarDocumento',
    'pd_archivoElegido', 'pd_asignarResponsable', 'pd_borrarComentarioPendiente',
    'pd_confirmarComentario', 'pd_descargar', 'pd_editarComentarioPendiente',
    'pd_elegirArchivo', 'pd_finalizar', 'pd_guardar', 'pd_juriskillsAbrirModal',
    'pd_quitarPendiente', 'pd_toggleHistorial',
    'pd_toggleHistorialAnalisis', 'pd_verAnalisisHistorial',
    'radioClicConDeseleccion', 'radioPermitirDeseleccion',
    'reAnalizarTodo',
    'reiniciarContador', 'seg_renderTabla',
    'toggleHistorial', 'verDetalleProceso', 'verificarObjetoContractual',
    // ── Salieron con index.html (2026-08-08) ──
    // 'closeModal', 'hist_exportarExcel', 'publicarSecop',
    // 'mostrarModalApiKey', 'cerrarModalApiKey': las cinco daban CERO en las
    // cuatro poblaciones y no se usan fuera de js/script.js.
    //
    // Las cuatro de index.html que NO salieron, y por qué — cada una cae en
    // una población distinta, que es justo el motivo de mirar las cuatro:
    //   dash_abrirHistorial  → js/script.js:1045 lo genera con innerHTML
    //                          dentro de _alertaCard() (población 2).
    //   hist_renderTabla     → el <script> en línea de historial.html lo
    //                          llama por su nombre (población 3).
    //   seg_renderTabla      → window.seg_renderTabla (población 4).
    //   panel_abrirSeguimiento… → window.<nombre> (población 4).
    // Globales compartidos entre archivos (no son onclick, pero cruzan
    // fronteras de archivo y el ofuscador los ve como locales de cada uno).
    'supabaseClient', 'HIST_BD', 'CHECKLIST_LABELS_POR_TIPO', 'ITEMS_CHECKLIST',
    'SKILLS_JURIDICOS', 'ITEMS_RESTRINGIDOS_GLOBAL', 'MAX_TAMANO_ARCHIVO_BYTES',
    'pausarMonitorInactividad', 'reanudarMonitorInactividad', 'cerrarSesionConLimpieza',
    'escaparHTML', 'escapeHTML', '_perfilCache', '_dbListo',
    // El delegador del Sprint 4. Lo publica js/acciones.js y lo llaman los
    // demás archivos, así que cruza frontera de archivo igual que
    // supabaseClient. Estos dos SÍ seguirán aquí cuando el sprint termine.
    'registrarAccion', 'registrarAcciones',

    // ════════════════════════════════════════════════
    //  Cierre del Sprint 4 (2026-08-10): los 43 que faltaban
    //
    //  Al ir a poner renameGlobals:true se censaron con acorn TODOS los
    //  nombres declarados en el nivel superior de un archivo y llamados a
    //  pelo desde otro. Salieron 43 que no estaban en esta lista — entre
    //  ellos la capa de datos entera. Con renameGlobals:true y sin ellos,
    //  la app se queda muerta sin un solo error de red: exactamente el
    //  fallo que describe el comentario del punto 2 de arriba.
    //
    //  Nada de esto viene de un on*=: son globales que cruzan de archivo a
    //  archivo, la misma familia que supabaseClient. No salen nunca.
    //
    //  Esta lista escrita a mano es el SUELO. Encima, censarCompartidos()
    //  (más abajo) la recalcula en cada build, así que una función nueva
    //  que cruce archivos queda protegida sin tocar este archivo. La lista
    //  se conserva igual por dos motivos: documenta qué cruza la frontera,
    //  y si algún día acorn no está disponible el build sigue siendo
    //  correcto.
    // ════════════════════════════════════════════════

    // ── js/db.js → script.js, proceso-detalle.js, notificaciones.js ──
    'db_actualizarPlazoProceso', 'db_actualizarValorProceso', 'db_asignarResponsable',
    'db_cargarComentarios', 'db_cargarDocumentos', 'db_cargarHistorialAnalisis',
    'db_cargarNotificaciones', 'db_cargarSeguimientoConocimiento',
    'db_cargarUsuariosJuridicos', 'db_construirEntradaHIST', 'db_contarNotificaciones',
    'db_descargarDocumento', 'db_eliminarProceso', 'db_finalizarProceso',
    'db_guardarAnalisisJuriskills', 'db_guardarComentario', 'db_guardarProceso',
    'db_inicializar', 'db_marcarActividadProceso', 'db_marcarLeida',
    'db_marcarProcesoVisto', 'db_marcarTodasLeidas', 'db_obtenerProcesoPorCodigo',
    'db_perfil', 'db_subirDocumento', 'db_verificarObjetoSimilar',

    // ── js/juriskills-engine.js → script.js, proceso-detalle.js ──
    'EXPEDIENTE_CONTEXTO', '_MODO_ANALISIS_CD1P', '_SUBDOC_SIN_ANALISIS',
    '_analisisSinRequerir', '_aplicarCruceFechas7y8', '_extraerPlazoVigencia',
    '_lexconRegistrar', '_modoAnalisisPorSufijo', '_reportarProgresoOCR',
    'analizarConIA', 'ejecutarAnalisisLocalReglas', 'ejecutarSkillJuridico',
    'estadoDocumentos', 'leerArchivo',

    // ── js/script.js → db.js, juriskills-engine.js ──
    // 'dash_actualizar' era la decisión que 6.16 dejaba pendiente. Queda
    // resuelta por medición, no por criterio: js/db.js:1479 lo llama por su
    // nombre, así que cruza frontera de archivo y se queda aquí aunque se
    // quitara el parche de window.dash_actualizar de js/script.js:1101.
    'dash_actualizar', 'ITEMS_POR_TIPO_NO_CONTIGUOS', 'actualizarPanelAgente',

    // ── js/proceso-detalle.js ↔ js/script.js (cada uno declara el suyo,
    //    pero se llaman cruzados) ──
    '_fmt_valorARaw', 'numeroALetras',

    // ── login.html ↔ auth-guard: los tres que el censo automático encontró
    //    y esta lista no tenía. Se anotan aquí para que el aviso "nuevos, no
    //    listados a mano" del build vuelva a salir vacío: mientras salga
    //    vacío, nadie ha introducido un global compartido nuevo. ──
    'LOGIN_URL', '_CLAVE_ACTIVIDAD', 'validarLogin'
];

// ════════════════════════════════════════════════════
//  2 bis. CENSO AUTOMÁTICO DE LO QUE CRUZA DE ARCHIVO A ARCHIVO
//
//  Por qué existe: la lista de arriba se escribe a mano y se desincroniza.
//  Ya pasó — el censo de la población 4 del informe daba 5 nombres y los
//  reales eran 48. Con renameGlobals:true una lista incompleta no da un
//  error de build ni un error de red: la app simplemente deja de responder
//  en producción.
//
//  Qué hace: los 9 archivos se cargan como <script> clásicos y comparten un
//  solo ámbito global, pero el ofuscador procesa cada archivo POR SEPARADO.
//  Así que un nombre declarado en el nivel superior de A y llamado desde B
//  se rompe al renombrarlo en A. Eso es justo lo que se busca aquí:
//  declaraciones de nivel superior de A ∩ identificadores usados en B.
//
//  Un nombre de más no rompe nada (reservedNames solo protege), uno de
//  menos sí — así que ante la duda, se incluye.
// ════════════════════════════════════════════════════
function recorrerAST(nodo, visita, padre) {
    if (!nodo || typeof nodo.type !== 'string') return;
    visita(nodo, padre);
    for (const clave in nodo) {
        if (clave === 'loc') continue;
        const valor = nodo[clave];
        if (Array.isArray(valor)) {
            for (const hijo of valor) {
                if (hijo && typeof hijo.type === 'string') recorrerAST(hijo, visita, nodo);
            }
        } else if (valor && typeof valor.type === 'string') {
            recorrerAST(valor, visita, nodo);
        }
    }
}

function censarCompartidos(archivos) {
    let acorn;
    try {
        acorn = require('acorn');
    } catch (e) {
        console.warn('  AVISO  acorn no disponible: se usa solo la lista manual de ' +
                     'NOMBRES_RESERVADOS. Revísala a mano antes de desplegar.');
        return [];
    }

    const declara = {};   // archivo → nombres declarados en el nivel superior
    const usa     = {};   // archivo → identificadores que aparecen en el archivo

    for (const archivo of archivos) {
        const codigo = fs.readFileSync(path.join(RAIZ, archivo), 'utf8');
        let ast;
        try {
            ast = acorn.parse(codigo, { ecmaVersion: 'latest' });
        } catch (e) {
            console.error('\n  ABORTADO: no se pudo analizar ' + archivo + ': ' + e.message);
            process.exit(1);
        }

        declara[archivo] = new Set();
        usa[archivo]     = new Set();

        for (const nodo of ast.body) {
            if ((nodo.type === 'FunctionDeclaration' || nodo.type === 'ClassDeclaration') && nodo.id) {
                declara[archivo].add(nodo.id.name);
            }
            if (nodo.type === 'VariableDeclaration') {
                for (const d of nodo.declarations) {
                    if (d.id.type === 'Identifier') declara[archivo].add(d.id.name);
                }
            }
        }

        recorrerAST(ast, (nodo, padre) => {
            if (nodo.type !== 'Identifier') return;
            // obj.prop y { prop: … } no son referencias al global 'prop'.
            if (padre && padre.type === 'MemberExpression' && padre.property === nodo && !padre.computed) return;
            if (padre && padre.type === 'Property' && padre.key === nodo && !padre.computed) return;
            usa[archivo].add(nodo.name);
        });
    }

    const compartidos = new Set();
    for (const a of archivos) {
        for (const nombre of declara[a]) {
            for (const b of archivos) {
                if (a !== b && usa[b].has(nombre)) { compartidos.add(nombre); break; }
            }
        }
    }
    return [...compartidos].sort();
}

// Se rellena al arrancar el build (ver build()); hasta entonces, la lista
// manual sola. perfilBase() lee esta variable, no la constante.
let RESERVADOS_EFECTIVOS = NOMBRES_RESERVADOS;

// ⚠️ Sobre "vaciar NOMBRES_RESERVADOS al terminar el Sprint 4": no se puede
// del todo. Los nombres que están aquí por venir de un on*= sí se van
// (`supLimpiar`, `registrarSupervision`… ya salieron con supervision.html).
// Pero los globales que cruzan de un archivo a otro —`supabaseClient`,
// `HIST_BD`, `ITEMS_CHECKLIST`, `registrarAccion`…— tienen que quedarse:
// el ofuscador procesa cada archivo por separado y renombrarlos rompería la
// referencia igual que rompía los onclick.
//
// Cerrado el 2026-08-10: al medirlo con acorn resultó que la mayor parte de
// la lista es de esa segunda clase, no de la primera. Por eso ahora la
// calcula censarCompartidos() en cada build y no depende de que alguien se
// acuerde de actualizarla.

// ════════════════════════════════════════════════════
//  3. PERFILES DE OFUSCACIÓN
// ════════════════════════════════════════════════════

// Base común.
//
// renameGlobals: true desde el 2026-08-10 (cierre del Sprint 4). Se pudo
// activar porque el HTML ya no llama a ninguna función por su nombre: las
// tres poblaciones de on*= están a cero y el delegador de js/acciones.js
// pasa las funciones por referencia. Lo único que sigue cruzando por nombre
// son los globales compartidos entre archivos, y de esos se encarga
// reservedNames (lista manual ∪ censarCompartidos()).
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
        renameGlobals: true,               // ← ver el bloque de arriba
        reservedNames: RESERVADOS_EFECTIVOS,
        identifierNamesGenerator: 'mangled',
        identifiersPrefix: '_hslv_' + slug + '_',
        selfDefending: false,              // rompe si Netlify post-procesa el JS
        debugProtection: false,            // haría inusable la consola en soporte

        // SEC-10, corregido el 2026-08-10. Estuvo en true y la matriz de
        // deuda daba SEC-10 por resuelto, pero NO surtía efecto: dist/js/db.js
        // conservaba sus 54 console.* y la consola seguía nativa en el bundle
        // (medido en el informe, 6.17). Se pone en false a propósito, y la
        // fila de la matriz pasa a "descartado", por el mismo motivo que
        // debugProtection: silenciar la consola no protege nada —el código ya
        // está ofuscado— y el diagnóstico de esta app depende de leerla. El
        // delegador de js/acciones.js avisa por consola cuando una acción no
        // está registrada, y el guion de pruebas de producción se apoya en
        // eso y en los avisos de la CSP.
        disableConsoleOutput: false,
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

// js/vendor/ — librerías de terceros auto-hospedadas (Sprint 2, SEC-05/SEC-06).
// Se copian TAL CUAL a dist/, sin ofuscar y sin tocar:
//   · No son nuestra propiedad intelectual: ofuscarlas no protege nada nuestro.
//   · Ya vienen minificadas; ofuscar sobre minificado infla el peso sin ganancia.
//   · El ofuscador puede romperlas (usan eval, workers y detección de entorno).
//   · Mantenerlas byte a byte idénticas al original permite comparar su SHA-384
//     contra el del proveedor. Ver js/vendor/LEEME.md.
// El paso de JS de abajo lee js/ sin recursión, así que esta carpeta necesita
// su propio paso de copia: sin él, dist/ se quedaría sin supabase-js y la app
// no arrancaría.
const DIR_VENDOR = 'vendor';

// ════════════════════════════════════════════════════
//  4. CABECERAS DE SEGURIDAD (dist/_headers)
//
//     script-src ya NO lleva 'unsafe-inline' (2026-08-10, cierre del
//     Sprint 4). Se pudo quitar porque las tres poblaciones de JavaScript
//     en línea están a cero: ni un atributo de evento en los 9 .html, ni
//     uno generado por los .js, ni un bloque suelto. A partir de aquí, el
//     navegador se NIEGA a ejecutar cualquier JavaScript que venga dentro
//     del HTML — que es justo lo que convertiría un XSS en ejecución de
//     código. Es la segunda mitad del arreglo de SEC-04.
//
//     ⚠️ Esto NO se puede comprobar con el servidor de pruebas: `serve` no
//     lee dist/_headers (informe 6.17). Solo se ve en Netlify. Si algo se
//     hubiera quedado atrás, el síntoma en producción es un error de
//     consola que empieza por "Refused to execute inline script" y ESE
//     control deja de funcionar, sin romper el resto de la página. Ver el
//     bloque C de [[Guion_De_Pruebas]].
//
//     Los dos dominios de CDN se quedan: el OCR del punto 20 todavía carga
//     de cdnjs (ver 6.3). Quitarlos es otro frente.
// ════════════════════════════════════════════════════
const CABECERAS = `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://gaikgihkeysulpvjrhom.supabase.co wss://gaikgihkeysulpvjrhom.supabase.co https://cdnjs.cloudflare.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
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

    // Con renameGlobals:true, esto es lo que evita que la app se quede muda
    // en producción. Se calcula antes de ofuscar nada: perfilBase() lo lee.
    const compartidos = censarCompartidos(archivosJS);
    const nuevos = compartidos.filter(n => !NOMBRES_RESERVADOS.includes(n));
    RESERVADOS_EFECTIVOS = [...new Set(NOMBRES_RESERVADOS.concat(compartidos))];
    console.log('  Globales ' + compartidos.length + ' cruzan de archivo a archivo · ' +
                RESERVADOS_EFECTIVOS.length + ' nombres protegidos' +
                (nuevos.length ? '   (nuevos, no listados a mano: ' + nuevos.join(', ') + ')' : ''));

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

    // ── Librerías de terceros (js/vendor/) tal cual ──
    // Solo los .js: el LEEME.md es documentación interna y no se publica.
    const dirVendor = path.join(RAIZ, 'js', DIR_VENDOR);
    if (await fs.pathExists(dirVendor)) {
        let nVendor = 0, pesoVendor = 0;
        for (const nombre of (await fs.readdir(dirVendor)).filter(f => f.endsWith('.js'))) {
            const origen = path.join(dirVendor, nombre);
            await fs.copy(origen, path.join(DIST, 'js', DIR_VENDOR, nombre));
            pesoVendor += (await fs.stat(origen)).size;
            nVendor++;
        }
        console.log('  Vendor   ' + nVendor + ' librerías · ' + kb(pesoVendor) +
                    '   (sin ofuscar — código de terceros)');
    }

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
