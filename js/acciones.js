// ════════════════════════════════════════════════════
//  acciones.js — Delegador de eventos por atributos data-*
//  Sprint 4 (LIMP-05). Reemplaza los atributos on*= del HTML.
// ════════════════════════════════════════════════════
//
//  POR QUÉ EXISTE
//  Los atributos on*= del HTML son el techo de dos protecciones a la vez:
//    1. Obligan a 'unsafe-inline' en el script-src de la CSP, que es
//       justamente lo que la CSP debería impedir.
//    2. Obligan a renameGlobals:false en el ofuscador: el HTML llama a las
//       funciones por su nombre, así que ninguna se puede renombrar. Por eso
//       existe la lista NOMBRES_RESERVADOS de build.js.
//
//  EL DETALLE QUE HACE QUE ESTO SIRVA DE ALGO
//  Un delegador que hiciera `window[el.dataset.accion]()` NO resolvería el
//  problema 2: seguiría buscando la función por su nombre, y el ofuscador
//  seguiría sin poder renombrarla. Por eso aquí hay un REGISTRO: el HTML
//  guarda una etiqueta de texto y el JS asocia esa etiqueta a la función
//  pasándola por referencia.
//
//      registrarAccion('supLimpiar', supLimpiar);
//
//  La cadena 'supLimpiar' sobrevive a la ofuscación (es un dato); el
//  identificador supLimpiar se puede renombrar libremente. Eso es lo que
//  permitirá poner renameGlobals:true al terminar el Sprint 4.
//
//  CÓMO SE USA DESDE EL HTML
//      <button data-accion="supLimpiar">Limpiar</button>
//      <input  data-accion="supActualizarBarra" data-evento="input"
//              data-args='["@valor"]'>
//      <button data-accion="openModal" data-args='["modalProceso"]'>
//
//    data-accion  nombre registrado de la acción (obligatorio)
//    data-evento  'click' (por defecto), 'input', 'change' o 'submit'
//    data-args    array JSON de argumentos. Comodines:
//                   "@el"     → el elemento que disparó el evento
//                   "@valor"  → el.value
//                   "@evento" → el objeto Event
//
//  Dentro de la función, `this` es el elemento — igual que en un on*=.
//
//  ⚠️ Este archivo tiene que cargar ANTES que los que registran acciones.
//     En los HTML va primero de los <script> del final de <body>.
// ════════════════════════════════════════════════════

(function (global) {

    var _registro = {};

    // Los eventos que se delegan. Son los que burbujean hasta document;
    // focus/blur NO burbujean y a propósito no están: los efectos de foco
    // de este proyecto se resuelven con :focus en css/styles.css, que es
    // más barato y no necesita JavaScript.
    var _EVENTOS = ['click', 'input', 'change', 'submit'];

    // Para no llenar la consola si una acción falta: se avisa una sola vez.
    var _yaAvisadas = {};

    function registrarAccion(nombre, fn) {
        if (typeof fn !== 'function') {
            console.error('registrarAccion("' + nombre + '"): no es una función.');
            return;
        }
        if (_registro[nombre]) {
            console.warn('registrarAccion("' + nombre + '"): ya estaba registrada, se reemplaza.');
        }
        _registro[nombre] = fn;
    }

    // Azúcar para registrar varias de una vez:
    //   registrarAcciones({ supLimpiar: supLimpiar, ... });
    function registrarAcciones(mapa) {
        for (var nombre in mapa) {
            if (Object.prototype.hasOwnProperty.call(mapa, nombre)) {
                registrarAccion(nombre, mapa[nombre]);
            }
        }
    }

    function _resolverArgs(el, evento) {
        var crudo = el.getAttribute('data-args');
        if (!crudo) return [];

        var lista;
        try {
            lista = JSON.parse(crudo);
        } catch (e) {
            console.error('data-args no es JSON válido: ' + crudo, el);
            return [];
        }
        if (!(lista instanceof Array)) lista = [lista];

        return lista.map(function (v) {
            if (v === '@el')     return el;
            if (v === '@valor')  return el.value;
            if (v === '@evento') return evento;
            return v;
        });
    }

    function _manejar(evento) {
        var destino = evento.target;
        if (!destino || typeof destino.closest !== 'function') return;

        var el = destino.closest('[data-accion]');
        if (!el) return;

        // Un elemento declara UN evento. Sin esto, un <input data-evento="input">
        // dispararía también al hacerle clic.
        var esperado = el.getAttribute('data-evento') || 'click';
        if (esperado !== evento.type) return;

        var nombre = el.getAttribute('data-accion');
        var fn = _registro[nombre];

        if (typeof fn !== 'function') {
            if (!_yaAvisadas[nombre]) {
                _yaAvisadas[nombre] = true;
                console.error('Acción "' + nombre + '" no registrada. ' +
                    'Falta un registrarAccion() para ella.', el);
            }
            return;
        }

        try {
            fn.apply(el, _resolverArgs(el, evento));
        } catch (err) {
            console.error('Error ejecutando la acción "' + nombre + '":', err);
        }
    }

    for (var i = 0; i < _EVENTOS.length; i++) {
        document.addEventListener(_EVENTOS[i], _manejar, false);
    }

    // ── Acciones genéricas, disponibles en todas las páginas ──
    // Navegación simple, que antes se escribía
    // onclick="window.location.href='/dashboard'".
    registrarAccion('navegar', function (url) {
        if (url) window.location.href = url;
    });

    // Abrir el <input type="file"> oculto que acompaña a cada botón
    // "Cargar Documento", que antes se escribía
    // onclick="document.getElementById('i3_arch_1').click()".
    // Vive aquí y no en cada página porque son 68 botones repartidos por
    // las 4 páginas de checklist (contratación, directa-3p, convocatoria
    // y subasta) y el comportamiento es idéntico en todos.
    registrarAccion('abrirSelectorArchivo', function (id) {
        var input = document.getElementById(id);
        if (input) input.click();
        else console.error('abrirSelectorArchivo: no existe #' + id);
    });

    // Contador "N/1000 caracteres" bajo el textarea de observaciones. Antes
    // era una EXPRESIÓN suelta dentro del atributo (no una llamada a una
    // función), que leía el textContent del contador a mano.
    // Vive aquí y no en script.js por lo mismo que abrirSelectorArchivo: no
    // usa nada del aplicativo —es solo DOM— y el mismo contador está en
    // convocatoria y en subasta, más el que js/script.js genera con
    // innerHTML para directa-3p.
    // El tope se lee del maxlength del propio campo, así que el 1000 no
    // queda escrito dos veces en sitios que se pueden desincronizar.
    registrarAccion('contarCaracteres', function (el, idContador) {
        var destino = document.getElementById(idContador);
        if (!destino) {
            console.error('contarCaracteres: no existe #' + idContador);
            return;
        }
        var tope = el.getAttribute('maxlength');
        destino.textContent = tope
            ? el.value.length + '/' + tope + ' caracteres'
            : el.value.length + ' caracteres';
    });

    // Textarea que crece con su contenido, sin barra de scroll. Antes era una
    // expresión suelta dentro de un oninput= que js/script.js y
    // js/proceso-detalle.js escribían con innerHTML (la caja de comentarios
    // del checklist). Vive aquí por el mismo criterio que contarCaracteres:
    // no usa nada del aplicativo, es solo DOM, y estaba duplicada en los dos
    // archivos.
    // Ojo: hay que poner la altura en 'auto' antes de leer scrollHeight, o al
    // borrar texto la caja nunca se encogería.
    registrarAccion('autoAjustarAlto', function (el) {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    });

    global.registrarAccion   = registrarAccion;
    global.registrarAcciones = registrarAcciones;

})(window);
