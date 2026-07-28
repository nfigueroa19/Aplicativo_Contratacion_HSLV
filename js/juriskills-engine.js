// ════════════════════════════════════════════════════
//  js/juriskills-engine.js
//  Motor de análisis JURISKILLS IA (OCR + Groq + reglas locales), extraído
//  de js/script.js el 2026-07-27 para que otras páginas (proceso-detalle.js)
//  puedan reanalizar documentos con las MISMAS reglas sin duplicar código —
//  ver _Segundo_Cerebro/Flujo_Analisis_IA_JURISKILLS.md.
//
//  Qué vive aquí: constantes del checklist (ITEMS_CHECKLIST, SKILLS_JURIDICOS,
//  _MODO_ANALISIS_CD1P, _REGLA_FECHA_LOCAL...), la lectura de archivos
//  (leerArchivo: pdf.js + Tesseract.js OCR con filtros de ruido), el motor de
//  reglas locales (ejecutarSkillJuridico/ejecutarAnalisisLocalReglas) y la
//  llamada a Groq (analizarConGroq/analizarConIA vía la Edge Function
//  "analizar-documento").
//
//  Qué NO vive aquí (se queda como "glue" propio de cada página, en
//  js/script.js o js/proceso-detalle.js): la inyección de la columna
//  "🤖 Análisis JURISKILLS" en el HTML, el modal de detalle, el panel
//  "iaResumenGlobal/iaContadorDocs/iaEstadoBadge", y los botones
//  "🔎 Analizar"/"⟳ Actualizar análisis" — cada página los renderiza a su
//  propia manera porque cada una tiene su propio checklist/DOM.
//
//  Requiere que ya estén cargados ANTES que este archivo:
//    js/supabase.js  (expone `supabaseClient`, usado por analizarConGroq)
//    js/db.js        (expone `ITEMS_RESTRINGIDOS_GLOBAL`)
//
//  `estadoDocumentos` y `EXPEDIENTE_CONTEXTO` son estado en memoria, con
//  vida de una sola carga de página (no se persisten) — cada página que
//  carga este archivo tiene su propia copia aislada, no hay colisión entre
//  pestañas ni entre contratacion.html/directa-3p.html/proceso-detalle.html.
// ════════════════════════════════════════════════════

// Mapa de ítems: número → nombre y criterios jurídicos de validación
const ITEMS_CHECKLIST = {
  1:  { nombre: "Certificado PAA", criterios: "Verifica inclusión del proceso en el Plan Anual de Adquisiciones vigente, código UNSPSC, valor estimado coherente con el contrato, firma del responsable. Aplica Decreto 1082/2015 art 2.2.1.1.1.3.1." },
  2:  { nombre: "Solicitud de Certificado de Disponibilidad Presupuestal", criterios: "Verifica que contenga: área solicitante, objeto, valor estimado, justificación de la necesidad, rubro presupuestal, firma del jefe de área. Aplica Manual Interno de Contratación HSLV, Decreto 1082/2015 art 2.2.1.1.1.3." },
  3:  { nombre: "Certificado de Disponibilidad Presupuestal (CDP)", criterios: "Verifica número CDP, fecha de expedición (no puede ser posterior a la firma del contrato), valor, rubro presupuestal correcto, vigencia, firma del jefe de presupuesto. Aplica Ley 38/1989, Decreto 111/1996." },
  4:  { nombre: "Solicitud para contratar", criterios: "Verifica que la justificación de la necesidad esté alineada con el PAA y el Plan de Desarrollo. Debe incluir: objeto, modalidad de selección propuesta, valor estimado, área requirente, firma. Aplica Decreto 1082/2015 art 2.2.1.1.1.6." },
  5:  { nombre: "Estudios previos", criterios: "Verifica: descripción de la necesidad, forma de satisfacer la necesidad, fundamento legal, modalidad de selección y justificación, objeto del contrato, especificaciones técnicas, plazo y lugar de ejecución, estimación del valor, forma de pago, obligaciones del contratista y del contratante, riesgo previsible, garantías, análisis del sector, estudio de mercado con mínimo 2 cotizaciones. Aplica Decreto 1082/2015 art 2.2.1.1.1.6.1 y Art. 20.2 Acuerdo 015/2024." },
  6:  { nombre: "Matriz de riesgo", criterios: "Verifica: identificación de riesgos, probabilidad, impacto, mitigación por cada riesgo previsible. Aplica Decreto 1082/2015 art 2.2.1.1.1.6.3." },
  7:  { nombre: "Anexo IO Presentación de la Propuesta", criterios: "Verifica: formato de presentación de propuesta debidamente diligenciado, datos del proponente, objeto, valor ofertado, plazo, firma del representante legal. Aplica Ley 80/1993 y pliego de condiciones." },
  8:  { nombre: "Propuesta", criterios: "Verifica: oferta económica firmada, propuesta técnica, documentos habilitantes (cámara de comercio, RUT, estados financieros), vigencia de la oferta. Aplica Ley 80/1993 art 25." },
  9:  { nombre: "Estudio de mercado", criterios: "Verifica: mínimo 2 cotizaciones escritas de establecimientos matriculados en Cámara de Comercio (o, si no se obtuvieron cotizaciones adecuadas, análisis de precios históricos o de mínimo 3 procesos similares en SECOP del año anterior), análisis comparativo de precios, valor de mercado resultante, fuentes consultadas, fecha de consulta reciente. Aplica Art. 20.5 Acuerdo 015/2024 y Decreto 1082/2015 art 2.2.1.1.1.6.1." },
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



// ══════════════════════════════════════════════════════════════
// ENRUTAMIENTO DEL ANÁLISIS POR ÍTEM (CD1P)
// 'ia'      → siempre Groq, con respaldo local automático si falla
//             (ítems 4, 5 y 23: los documentos más extensos; prioridad
//             normativa en el ítem 5 "Estudios previos").
// 'local'   → siempre el motor local de reglas (nunca gasta cuota de Groq).
//             Alcance reducido a las reglas puntuales pedidas por el
//             usuario (fecha de vigencia, objeto, cámara de comercio,
//             distribuidor exclusivo según el ítem — ver
//             ejecutarAnalisisLocalReglas()); ya no se generan
//             advertencias genéricas de redacción ni de concordancia
//             entre documentos, salvo en el ítem 6 (se mantiene igual).
// 'ninguno' → no se analiza, solo se registra el archivo cargado
//             (ítems 12 y 13: documentos de identificación personal).
// ══════════════════════════════════════════════════════════════
const _MODO_ANALISIS_CD1P = {
    1:'local', 2:'local', 3:'local', 4:'ia', 5:'ia', 6:'local', 7:'local', 8:'local',
    9:'local', 10:'local', 11:'local', 12:'ninguno', 13:'ninguno', 14:'local',
    15:'local', 16:'local', 17:'local', 18:'local', 19:'local', 20:'local', 21:'local',
    22:'local', 23:'ia'
};

// Sub-casillas puntuales sin análisis dentro de ítems con sub-documentos:
// Cédula (20a) y Tarjeta Profesional (20c) del Revisor Fiscal — documentos
// de identificación personal — y Certificación de pago de seguridad social
// (21a), aún sin confirmar por el usuario. El segundo documento del ítem 21
// (21b, Planillas de seguridad social) SÍ se analiza (regla de vigencia de
// fecha).
const _SUBDOC_SIN_ANALISIS = ['20a', '20c', '21a'];

function _modoAnalisisPorSufijo(sufijo) {
    if (_SUBDOC_SIN_ANALISIS.indexOf(sufijo) !== -1) return 'ninguno';
    const num = parseInt(sufijo);
    return _MODO_ANALISIS_CD1P[num] || 'local';
}

function _analisisSinRequerir(numItem) {
    return {
        estado: 'ok', puntaje: 100,
        titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
        hallazgos: [], advertencias: [], recomendaciones: [],
        resumen: 'Documento de identificación — no requiere análisis.',
        normativa: '', camposPresentes: [], camposAusentes: [],
        sinAnalisis: true
    };
}

// ── Calidad global del texto extraído por OCR ──────────────────────────
// Un OCR de mala calidad no siempre produce CERO texto: a veces produce
// bastante texto, pero mayormente ruido (letras sueltas, símbolos
// mezclados con dígitos erráticos, restos de sellos/bordes de tabla mal
// leídos). Si ese ruido se deja pasar como "texto legible" termina
// alimentando tanto las reglas locales (coincidencias de palabras clave
// falsas por ruido con pinta de palabra) como el prompt que se envía a
// Groq — y al mismo tiempo, palabras reales que el OCR deformó dejan de
// coincidir con las reglas (`includes()` literal) y se reportan como
// ausentes aunque sí estaban. Este chequeo se aplica SOLO a la salida de
// Tesseract (motorTexto:'ocr'), no al texto real extraído con pdf.js, que
// viene de la capa de texto del PDF y es confiable por definición.
function _calidadTextoOCR(texto) {
    const limpio = (texto || '').trim();
    const sinEspacios = limpio.replace(/\s/g, '');
    if (sinEspacios.length < 40) return null;

    const fragmentos = limpio.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+/).filter(Boolean);
    if (fragmentos.length === 0) return null;

    // Fragmentos "ruido": una sola letra o dígito aislado — el ruido de OCR
    // sobre sellos, bordes de tabla y marcas de agua produce muchos de estos.
    const ratioRuido = fragmentos.filter(f => f.length === 1).length / fragmentos.length;

    // Proporción de letras sobre el total de caracteres (sin espacios).
    const letras = (sinEspacios.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]/g) || []).length;
    const ratioLetras = letras / sinEspacios.length;

    // Proporción de fragmentos que son palabras reales (3+ letras seguidas,
    // sin dígitos mezclados) — un documento legítimo, aunque tenga números
    // de NIT/CDP/cédula, sigue teniendo prosa real entre esos números.
    const ratioPalabra = fragmentos.filter(f => /^[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}$/.test(f)).length / fragmentos.length;

    return { ratioRuido, ratioLetras, ratioPalabra };
}

// ── Limpieza de ruido LOCALIZADO en el texto OCR (marcas de agua, sellos,
// firmas) ────────────────────────────────────────────────────────────────
// _calidadTextoOCR()/_textoOCREsConfiable() evalúan el documento COMPLETO y
// descartan solo si casi todo es ruido — pero una marca de agua diagonal,
// un sello o una firma escaneada suelen ensuciar solo UNA o pocas líneas
// dentro de un documento por lo demás legible, y ese ruido puntual no baja
// el promedio global lo suficiente como para activar esa compuerta. Aun
// así puede colarse en las reglas locales (palabra clave que "por
// casualidad" aparece en el ruido) o en lo que se le manda a Groq. Por eso
// se limpia línea por línea ANTES de evaluar la calidad global: toda línea
// que en sí misma parezca ruido de OCR se descarta, el resto se deja
// intacto. Se aplica siempre sobre la salida de Tesseract, antes de
// _textoOCREsConfiable().
function _limpiarRuidoLocalizadoOCR(texto) {
    if (!texto) return texto;
    return texto.split('\n').map(linea => {
        const t = linea.trim();
        const sinEsp = t.replace(/\s/g, '');
        // Líneas cortas: no hay suficiente señal para juzgarlas con esta
        // heurística (podría ser un título, un número de folio, etc.) — se
        // dejan igual en vez de arriesgar un falso positivo.
        if (sinEsp.length < 10) return linea;

        const fragmentos = t.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+/).filter(Boolean);
        if (fragmentos.length === 0) return linea;

        const ratioRuido   = fragmentos.filter(f => f.length === 1).length / fragmentos.length;
        const letras       = (sinEsp.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]/g) || []).length;
        const ratioLetras  = letras / sinEsp.length;
        const ratioPalabra = fragmentos.filter(f => /^[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}$/.test(f)).length / fragmentos.length;

        const esRuido = ratioRuido > 0.4 && ratioLetras < 0.5 && ratioPalabra < 0.3;
        return esRuido ? '' : linea;
    }).join('\n');
}

// Umbral deliberadamente permisivo: preferimos dejar pasar un documento
// dudoso a bloquear uno legítimo con muchos números (CDP, NIT, cédulas).
// Solo se descarta cuando el texto es predominantemente ruido en varios
// indicadores a la vez. Ajustar estos números si en la práctica se filtran
// documentos válidos o se dejan pasar demasiados escaneos malos.
function _textoOCREsConfiable(texto) {
    const c = _calidadTextoOCR(texto);
    if (!c) return false;
    return !(c.ratioRuido > 0.35 && c.ratioLetras < 0.45 && c.ratioPalabra < 0.35);
}

// Leer el archivo como texto o base64. `onProgress(mensaje)` es opcional —
// se usa para avisar el avance del OCR en documentos escaneados, que puede
// tardar bastante (varios segundos por página) al no tener tope de páginas.
async function leerArchivo(archivo, onProgress) {
    const tipo = archivo.type || '';
    const nombre = archivo.name.toLowerCase();

    if (tipo === 'application/pdf' || nombre.endsWith('.pdf')) {
        // PDF: primero se intenta extraer el texto real con pdf.js (si el PDF tiene
        // capa de texto, p.ej. exportado desde Word). Si no se logra (documento
        // escaneado), se aplica OCR con Tesseract.js sobre cada página renderizada
        // como imagen. Solo si el OCR también falla o no rinde texto suficiente,
        // se cae al comportamiento anterior de enviar el base64 sin analizar —
        // guardando el MOTIVO exacto (red vs. documento realmente sin texto) para
        // que el mensaje que ve el usuario no diga "parece un escaneo" cuando en
        // realidad fue, por ejemplo, un fallo de red cargando el lector.
        let motivoSinTexto = 'El documento no tiene texto legible (parece un PDF escaneado o una imagen), y no fue posible extraerlo con OCR.';
        try {
            const textoExtraido = await _pdfATextoConTablas(archivo);
            if (textoExtraido && textoExtraido.replace(/\s/g, '').length > 40) {
                // Tope de seguridad muy alto (no es un recorte real de contenido legal,
                // solo evita que un archivo corrupto/gigante congele el navegador).
                // La IA sí analiza el documento completo dividiéndolo en partes,
                // ver analizarConGroq().
                return { tipo: 'texto', data: textoExtraido.slice(0, 300000) };
            }
            const chars = textoExtraido ? textoExtraido.replace(/\s/g, '').length : 0;
            console.warn(`PDF procesado pero con muy poco texto extraído (${chars} caracteres) — probablemente es un PDF escaneado, se intentará OCR: ${archivo.name}`);
        } catch (e) {
            console.warn('No se pudo extraer texto del PDF con pdf.js (fallo técnico, no necesariamente un escaneo), se intentará OCR:', e);
        }

        try {
            if (onProgress) onProgress('🔎 Extrayendo texto con OCR (puede tardar varios minutos en documentos largos)…');
            const textoOCRcrudo = await _pdfEscaneadoAOcr(archivo, onProgress);
            const textoOCR = _limpiarRuidoLocalizadoOCR(textoOCRcrudo);
            if (textoOCR && textoOCR.replace(/\s/g, '').length > 40) {
                if (_textoOCREsConfiable(textoOCR)) {
                    return { tipo: 'texto', data: textoOCR.slice(0, 300000), motorTexto: 'ocr' };
                }
                motivoSinTexto = 'El OCR extrajo texto de este PDF, pero de muy baja calidad (mayormente ruido o caracteres sueltos), probablemente por la resolución del escaneo. No se usó ese texto para el análisis automático — revise el documento manualmente.';
                console.warn(`OCR del PDF con calidad insuficiente (mucho ruido), se descarta: ${archivo.name}`);
            } else {
                console.warn(`OCR aplicado pero con muy poco texto extraído del PDF: ${archivo.name}`);
            }
        } catch (e) {
            motivoSinTexto = 'No se pudo cargar o procesar el OCR (posible problema de conexión). Intente analizar de nuevo.';
            console.warn('Falló el OCR del PDF escaneado con Tesseract.js:', e);
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer el archivo PDF'));
            reader.onload = () => resolve({
                tipo: 'pdf',
                data: reader.result.split(',')[1],
                mimeType: 'application/pdf',
                motivoSinTexto
            });
            reader.readAsDataURL(archivo);
        });

    } else if (tipo.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/.test(nombre)) {
        // Imagen: se intenta OCR con Tesseract.js primero (fotos de cédulas,
        // capturas de pantalla de certificados, etc. suelen tener texto legible).
        // Si no rinde texto suficiente (ej. una firma o un logo), se cae al
        // comportamiento anterior de enviar el base64 sin analizar.
        try {
            if (onProgress) onProgress('🔎 Extrayendo texto de la imagen con OCR…');
            const canvasImagen = await _archivoACanvas(archivo);
            _preprocesarCanvasOCR(canvasImagen);
            const textoOCRcrudo = await _ocrImagen(canvasImagen, (pct) => {
                if (onProgress) onProgress(`🔎 Extrayendo texto de la imagen con OCR… ${pct}%`);
            });
            const textoOCR = _limpiarRuidoLocalizadoOCR(textoOCRcrudo);
            if (textoOCR && textoOCR.replace(/\s/g, '').length > 40) {
                if (_textoOCREsConfiable(textoOCR)) {
                    return { tipo: 'texto', data: textoOCR.slice(0, 300000), motorTexto: 'ocr' };
                }
                console.warn(`OCR de la imagen con calidad insuficiente (mucho ruido), se descarta: ${archivo.name}`);
            } else {
                console.warn(`OCR aplicado pero con muy poco texto extraído de la imagen: ${archivo.name}`);
            }
        } catch (e) {
            console.warn('Falló el OCR de la imagen con Tesseract.js:', e);
        }

        return new Promise((resolve, reject) => {
            const mimeType = tipo || 'image/png';
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
            reader.onload = () => resolve({
                tipo: 'imagen',
                data: reader.result.split(',')[1],
                mimeType,
                motivoSinTexto: 'La imagen no tiene texto legible detectable por OCR (o el texto extraído era de muy baja calidad).'
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

// Carga un <script> externo con tiempo límite (evita que una conexión lenta
// o bloqueada al CDN se quede colgada en silencio sin avisar nunca del error).
function _cargarScriptConTimeout(src, timeoutMs) {
    return new Promise((res, rej) => {
        const s = document.createElement('script');
        let resuelto = false;
        const temporizador = setTimeout(() => {
            if (resuelto) return;
            resuelto = true;
            s.remove();
            rej(new Error('Tiempo de espera agotado cargando ' + src));
        }, timeoutMs);
        s.src = src;
        s.onload = () => { if (resuelto) return; resuelto = true; clearTimeout(temporizador); res(); };
        s.onerror = () => { if (resuelto) return; resuelto = true; clearTimeout(temporizador); s.remove(); rej(new Error('No se pudo cargar ' + src)); };
        document.head.appendChild(s);
    });
}

// ---- pdf.js: carga perezosa desde CDN (mismo patrón que mammoth.js arriba) ----
// Con un reintento único: en una red de hospital con proxy/firewall, un fallo
// de red al primer intento es más probable que un problema real del PDF —
// antes, si el CDN fallaba una sola vez, el documento quedaba marcado como
// "sin texto legible" (dando a entender que era un escaneo) sin serlo.
async function _cargarPdfJs() {
    if (typeof pdfjsLib !== 'undefined') return;
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    try {
        await _cargarScriptConTimeout(src, 10000);
    } catch (e) {
        console.warn('Primer intento de cargar pdf.js falló, reintentando una vez:', e);
        await _cargarScriptConTimeout(src, 10000);
    }
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
    // Sin tope de páginas: se procesa el PDF completo sin importar cuántas
    // páginas tenga (a petición del usuario — el documento nunca debe quedar
    // recortado, ni siquiera en expedientes muy extensos).
    const maxPaginas = pdf.numPages;
    let texto = '';
    let paginasConError = 0;
    for (let p = 1; p <= maxPaginas; p++) {
        // Cada página se procesa en su propio try/catch: si UNA página tiene un
        // problema puntual (fuente rara, contenido corrupto), antes se perdía
        // TODO el documento (el error abortaba el ciclo completo) aunque las
        // demás páginas sí tuvieran texto perfectamente legible.
        try {
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
        } catch (errPagina) {
            paginasConError++;
            console.warn(`No se pudo leer la página ${p} del PDF (se continúa con el resto):`, errPagina);
        }
    }
    if (paginasConError > 0) {
        console.warn(`${paginasConError} de ${maxPaginas} página(s) del PDF no se pudieron procesar.`);
    }
    return texto.trim();
}

// ---- Tesseract.js: carga perezosa desde CDN (mismo patrón que mammoth.js/pdf.js) ----
async function _cargarTesseract() {
    if (typeof Tesseract !== 'undefined') return;
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js';
    try {
        await _cargarScriptConTimeout(src, 15000);
    } catch (e) {
        console.warn('Primer intento de cargar Tesseract.js falló, reintentando una vez:', e);
        await _cargarScriptConTimeout(src, 15000);
    }
}

// Avisa en la insignia "Analizando…" de la fila del documento qué está
// haciendo el OCR en este momento (puede tardar bastante en documentos
// largos, así que sin este aviso el usuario podría pensar que se colgó).
function _reportarProgresoOCR(clave, mensaje) {
    if (typeof estadoDocumentos === 'undefined' || !estadoDocumentos[clave]) return;
    estadoDocumentos[clave].progreso = mensaje;
    if (typeof actualizarPanelAgente === 'function') actualizarPanelAgente();
}

// ── Preprocesamiento de imagen para mejorar la precisión del OCR ──
// Escala de grises + binarización automática (umbral de Otsu): el mismo tipo
// de paso que aplican los pipelines de OCR en Python (ej. OpenCV) antes de
// reconocer texto. Reduce muchísimo el "ruido" que Tesseract suele confundir
// con caracteres — sombras de escaneo, sellos, logos, fondos de color — al
// dejar cada píxel en blanco o negro puro según qué tan probable es que sea
// fondo o texto.
function _preprocesarCanvasOCR(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return canvas;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const total = w * h;

    // 1) Escala de grises (luminancia perceptual) + histograma para Otsu.
    const gris = new Uint8ClampedArray(total);
    const histograma = new Array(256).fill(0);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        gris[p] = g;
        histograma[g]++;
    }

    // 2) Umbral óptimo de Otsu: el que maximiza la separación entre el grupo
    // de píxeles "claros" (fondo) y "oscuros" (texto) del histograma.
    let sumaTotal = 0;
    for (let i = 0; i < 256; i++) sumaTotal += i * histograma[i];
    let sumaFondo = 0, pesoFondo = 0, mejorVarianza = -1, umbral = 128;
    for (let t = 0; t < 256; t++) {
        pesoFondo += histograma[t];
        if (pesoFondo === 0) continue;
        const pesoTexto = total - pesoFondo;
        if (pesoTexto === 0) break;
        sumaFondo += t * histograma[t];
        const mediaFondo = sumaFondo / pesoFondo;
        const mediaTexto = (sumaTotal - sumaFondo) / pesoTexto;
        const varianza = pesoFondo * pesoTexto * (mediaFondo - mediaTexto) * (mediaFondo - mediaTexto);
        if (varianza > mejorVarianza) { mejorVarianza = varianza; umbral = t; }
    }

    // 3) Binarizar: cada píxel queda blanco o negro puro según el umbral.
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const v = gris[p] >= umbral ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

// Carga un File/Blob de imagen en un <canvas>, escalando hacia arriba si es
// pequeña (fotos de celular en baja resolución) — Tesseract reconoce mucho
// mejor cuando la altura de cada letra tiene más píxeles.
function _archivoACanvas(archivo) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(archivo);
        img.onload = () => {
            const escala = img.width < 1200 ? Math.ceil(1600 / img.width) : 1;
            const canvas = document.createElement('canvas');
            canvas.width = img.width * escala;
            canvas.height = img.height * escala;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo cargar la imagen para preprocesarla antes del OCR.'));
        };
        img.src = url;
    });
}

// OCR de una sola imagen (blob, canvas o el propio File) con Tesseract.js,
// en español. Sin tope de tamaño ni de resolución — se procesa tal cual se
// cargó el archivo.
async function _ocrImagen(fuente, onProgress) {
    await _cargarTesseract();
    const { data } = await Tesseract.recognize(fuente, 'spa', {
        logger: onProgress ? (m) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
                onProgress(Math.round(m.progress * 100));
            }
        } : undefined
    });
    return (data && data.text) || '';
}

// OCR de un PDF escaneado (sin capa de texto real): renderiza CADA página a
// un canvas con pdf.js y le aplica OCR con Tesseract, página por página, sin
// límite de páginas (a petición del usuario — nunca se recorta el documento,
// aunque tarde más en expedientes largos).
async function _pdfEscaneadoAOcr(archivo, onProgress) {
    await _cargarPdfJs();
    await _cargarTesseract();
    const arrayBuffer = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPaginas = pdf.numPages;

    let texto = '';
    let paginasConError = 0;
    for (let p = 1; p <= totalPaginas; p++) {
        try {
            if (onProgress) onProgress(`🔎 página ${p}/${totalPaginas}…`);
            const page = await pdf.getPage(p);
            // Escala 3x: mejora notablemente la precisión del OCR frente al
            // tamaño de render por defecto de pdf.js (útil en escaneos con
            // texto pequeño o de baja calidad).
            const viewport = page.getViewport({ scale: 3 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            _preprocesarCanvasOCR(canvas);

            const textoPagina = await _ocrImagen(canvas, (pct) => {
                if (onProgress) onProgress(`🔎 página ${p}/${totalPaginas}… ${pct}%`);
            });
            texto += textoPagina + '\n\n';
            canvas.width = 0; canvas.height = 0; // libera memoria del canvas cuanto antes
        } catch (errPagina) {
            paginasConError++;
            console.warn(`No se pudo aplicar OCR a la página ${p} del PDF (se continúa con el resto):`, errPagina);
        }
    }
    if (paginasConError > 0) {
        console.warn(`${paginasConError} de ${totalPaginas} página(s) no se pudieron procesar con OCR.`);
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
// A partir de 2026-07-22, por decisión del usuario, JURISKILLS solo debe
// producir las advertencias/hallazgos descritos en el listado de reglas
// vigente (ver _Segundo_Cerebro/Flujo_Analisis_IA_JURISKILLS.md). Los ítems
// que antes tenían aquí una lista de "camposObligatorios" por palabras clave
// y que ahora se limitan a una regla de fecha/objeto/palabra puntual
// (1, 2, 3, 7, 8, 9, 10, 11, 17 y 22) ya NO tienen entrada en este objeto:
// caen al camino "sin skill" de ejecutarSkillJuridico(), que ahora es un
// simple "ok" sin observaciones, y su única regla real vive en
// ejecutarAnalisisLocalReglas() (_REGLA_FECHA_LOCAL, _verificarObjetoContractual,
// el chequeo de Cámara de Comercio del ítem 11 o la lógica de distribuidor
// exclusivo del ítem 9). Los ítems 4, 5 y 23 SÍ conservan su checklist
// completo porque van por Groq (ítem 5 = prioridad normativa explícita del
// usuario; 4 y 23 se dejaron igual de estrictos a petición del usuario). El
// ítem 6 se mantiene intacto tal cual estaba (forzado a "sin skill" con solo
// redacción, ver ejecutarSkillJuridico).
const SKILLS_JURIDICOS = {

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
        const motivo = contenido.motivoSinTexto || 'Este archivo no tiene texto legible por la IA (imagen o documento escaneado sin texto).';
        return _marcarComoLocal(
            ejecutarSkillJuridico(numItem, nombreArchivo, contenido),
            motivo + ' Se muestra una validación básica local.'
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
// Repositorio amplio de palabras que anteceden una cita normativa colombiana
// ("Ley 1150 DE 2007", "Resolución No. 5185 DE 2013", "Decreto 1082 DE 2015"…).
// Un año que aparece justo después de una de estas palabras (con "de" de por
// medio) es la fecha de EXPEDICIÓN DE LA NORMA CITADA, no una fecha de
// vigencia del documento analizado — por diseño, un manual o estudio previo
// SIEMPRE va a citar normas antiguas, así que no debe marcarse como alerta.
// Se mantiene como lista amplia y fácil de ampliar a futuro si aparecen
// nuevos tipos de instrumento normativo que generen falsos positivos.
const _PALABRAS_CITA_NORMATIVA = [
    'ley', 'decreto', 'decreto ley', 'decreto-ley', 'decreto único', 'decreto unico',
    'decreto reglamentario', 'decreto legislativo',
    'resolución', 'resolucion', 'resolución no', 'resolucion no',
    'acuerdo', 'ordenanza', 'circular', 'circular externa', 'circular interna',
    'circular reglamentaria', 'directiva', 'directiva presidencial',
    'sentencia', 'auto', 'concepto', 'providencia', 'fallo',
    'estatuto', 'estatuto tributario', 'estatuto anticorrupción', 'estatuto anticorrupcion',
    'código', 'codigo', 'reglamento', 'instructivo', 'memorando', 'oficio',
    'conpes', 'convenio', 'tratado', 'protocolo', 'jurisprudencia',
    'constitución política', 'constitucion politica', 'plan de desarrollo',
    'lineamiento', 'instrucción administrativa', 'instruccion administrativa'
];

// ¿El año encontrado en `texto` en la posición `indexAnio` es en realidad
// parte de una cita normativa ("Ley XXX DE <año>") y no una fecha de
// vigencia real del documento? Se revisa una ventana de texto justo antes
// del año: debe terminar en "de" y contener alguna de las palabras del
// repositorio de arriba.
function _esCitaNormativa(texto, indexAnio) {
    const inicio = Math.max(0, indexAnio - 60);
    const ventana = texto.slice(inicio, indexAnio);
    if (!/\bde\s*$/i.test(ventana)) return false;
    const ventanaLow = _normalizarTexto(ventana);
    return _PALABRAS_CITA_NORMATIVA.some(p => ventanaLow.includes(_normalizarTexto(p)));
}

// ¿El contenido capturado dentro de un posible marcador de plantilla
// ([...], {...}, guiones bajos) parece texto legible y coherente, o es en
// realidad ruido de OCR? Un escaneo de mala calidad genera basura con pinta
// de "[CEE CAR 9 A 06 TIE VIGIADO : 5: AA Le]" al leer sellos, marcas de
// agua o bordes de tabla — eso NO es un campo de plantilla sin diligenciar,
// es ruido visual mal interpretado por el OCR.
//
// La sola proporción de letras no alcanza: ese tipo de ruido suele estar
// hecho casi enteramente de letras (o de fragmentos que PARECEN palabras,
// como "VIGIADO" o "MAN"), solo que sueltas y sin formar texto real. Por eso
// además se exige que la MAYORÍA de los fragmentos separados por espacios o
// símbolos sean "palabras" de verdad: 3+ letras seguidas sin dígitos
// mezclados. El ruido de OCR típicamente produce muchos fragmentos de 1-2
// caracteres o con dígitos intercalados de forma errática ("9", "06", "5",
// "AA", "Le") que rara vez aparecen así en un campo de plantilla real
// ("Nombre del Contratista", "Fecha de expedición", "pendiente").
function _pareceTextoCoherente(contenido) {
    const limpio = (contenido || '').trim();
    if (!limpio) return false;
    const sinEspacios = limpio.replace(/\s/g, '');
    if (sinEspacios.length === 0) return false;

    // Un mismo carácter repetido ("XXXX", "____", "----") sigue siendo un
    // placeholder válido, aunque no sean letras.
    if (sinEspacios.length >= 3 && /^(.)\1*$/.test(sinEspacios)) return true;

    // Rachas de 3+ símbolos sueltos seguidos (guiones, comillas, %, #, ~...)
    // son la firma típica del ruido de OCR sobre sellos/marcas de agua.
    if (/[^\w\sÀ-ÖØ-öø-ÿ]{3,}/.test(limpio)) return false;

    const letras = (sinEspacios.match(/[a-zA-ZÀ-ÖØ-öø-ÿ]/g) || []).length;
    if ((letras / sinEspacios.length) < 0.55) return false;

    // Dividir en fragmentos alfanuméricos (cualquier símbolo/espacio separa)
    // y exigir que la mayoría sean palabras reales de 3+ letras, sin dígitos.
    const fragmentos = limpio.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+/).filter(Boolean);
    if (fragmentos.length === 0) return false;
    const fragmentosPalabra = fragmentos.filter(f => /^[a-zA-ZÀ-ÖØ-öø-ÿ]{3,}$/.test(f));
    return (fragmentosPalabra.length / fragmentos.length) >= 0.6;
}

function _analizarRedaccion(texto, textoLow, numItem) {
    const obs = [];
    if (!texto || texto.length < 30) return obs;

    // ── 1. Campos sin diligenciar: reportar CADA instancia con su fragmento ──
    // Los tipos 'corchete', 'llave' y 'guión' se filtran además por
    // _pareceTextoCoherente(), porque son los más propensos a "atrapar" ruido
    // de OCR con forma de corchete/guion en vez de un campo real sin llenar.
    // Los demás tipos están anclados a frases literales en español (no a
    // símbolos sueltos) y no necesitan ese filtro.
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
    patronesPlaceholder.forEach(({ re, tipo, label }) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(texto)) !== null) {
            if (tipo === 'corchete' || tipo === 'llave' || tipo === 'guión') {
                const contenidoCapturado = tipo === 'guión' ? m[0] : m[1];
                if (!_pareceTextoCoherente(contenidoCapturado)) continue;
                // Una URL o dominio entre corchetes/llaves (pie de página,
                // marca de agua "www.hosusanagov.eo", enlace de referencia)
                // es texto real y coherente, pero no es un campo de plantilla
                // sin diligenciar — se descarta aparte.
                if ((tipo === 'corchete' || tipo === 'llave') &&
                    /https?:\/\/|www\.[a-z0-9-]+\.[a-z]{2,}/i.test(contenidoCapturado)) continue;
            }
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
        if (_esCitaNormativa(texto, mf.index)) continue; // "Ley/Decreto/Resolución... de <año>": cita normativa, no vigencia
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
            return `<span class="rd-item"><span class="rd-anio">Año ${anio}</span> (aparece ${casos.length} ${casos.length > 1 ? 'veces' : 'vez'}) — primera ocurrencia línea ${primerCaso.linea}: <span class="rd-ctx">${primerCaso.contexto}</span></span>`;
        }).join('');
        obs.push(`✏️||FECHAS_VIEJAS||${aniosUnicos.join(',')}||${detalles}`);
    }

    return obs;
}

// Recomendaciones específicas según el tipo de observación de redacción
// detectada por _analizarRedaccion() — compartida entre el ítem con reglas
// normativas (SKILLS_JURIDICOS) y el camino "sin reglas específicas" de abajo,
// para no duplicar este bloque dos veces.
function _recomendacionesRedaccion(obsRedaccion) {
    const recomendaciones = [];
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
    return recomendaciones;
}

function ejecutarSkillJuridico(numItem, nombreArchivo, contenido) {
    // El ítem 6 (Matriz de riesgo) se revisa deliberadamente SOLO por redacción
    // (repeticiones, campos sin diligenciar, fechas viejas, etc.) — sin el
    // chequeo normativo de palabras clave que sí aplica a los demás ítems.
    const skill = (numItem === 6)
        ? null
        : (typeof SKILLS_JURIDICOS !== 'undefined' ? SKILLS_JURIDICOS[numItem] : null);

    const texto     = (contenido.tipo === 'texto' ? contenido.data : '') || '';
    const textoLow  = texto.toLowerCase();
    const esBinario = contenido.tipo === 'pdf' || contenido.tipo === 'imagen';

    if (!skill && numItem === 6) {
        // Ítem 6 (Matriz de riesgo): se mantiene EXACTAMENTE como estaba —
        // única excepción que sigue revisando redacción/repetición y
        // concordancia entre documentos del expediente, por decisión
        // explícita del usuario ("ítem 6 se mantiene como ya está").
        if (!esBinario && textoLow.length > 40) _extraerContexto(numItem, nombreArchivo, textoLow);

        const obsRedaccion    = (!esBinario && textoLow.length > 40) ? _analizarRedaccion(texto, textoLow, numItem) : [];
        const obsConcordancia = (!esBinario && textoLow.length > 40) ? _verificarConcordancia(numItem, nombreArchivo, textoLow) : [];
        const concordanciaErr = obsConcordancia.filter(a => a.startsWith('🔴'));
        const concordanciaAdv = obsConcordancia.filter(a => !a.startsWith('🔴'));

        const hallazgos    = [...concordanciaErr];
        const advertencias = [...obsRedaccion, ...concordanciaAdv];

        let estado = 'ok';
        if (hallazgos.length > 0)         estado = 'correccion';
        else if (advertencias.length > 0) estado = 'advertencia';
        if (esBinario && estado === 'ok') estado = 'advertencia';

        const recomendaciones = _recomendacionesRedaccion(obsRedaccion);
        if (esBinario) recomendaciones.push('Documento PDF/imagen recibido. Revise manualmente el contenido.');
        if (obsConcordancia.length > 0) recomendaciones.push('🔗 Verifique la concordancia de datos (objeto, NIT, CDP) entre todos los documentos del expediente antes de continuar con la siguiente etapa del proceso.');

        let resumen;
        if (estado === 'ok')               resumen = `✅ Documento "${nombreArchivo}" registrado en el expediente, sin observaciones de redacción.`;
        else if (estado === 'advertencia') resumen = `⚠️ ${advertencias.length} observación(es) de redacción o concordancia.`;
        else                                resumen = `🔴 ${hallazgos.length} inconsistencia(s) detectada(s) frente a otros documentos del expediente.`;

        return {
            estado, puntaje: estado === 'ok' ? 100 : estado === 'advertencia' ? 70 : 40,
            titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
            hallazgos, advertencias, recomendaciones, resumen,
            normativa: 'Acuerdo 015/2024 – Resolución 0456/2024 HSLV',
            camposPresentes: [], camposAusentes: []
        };
    }

    if (!skill) {
        // Ítems sin reglas normativas de palabras clave (todos salvo 4, 5, 6
        // y 23): ya NO se generan advertencias genéricas de redacción ni de
        // concordancia entre documentos — la única regla real de estos
        // ítems (fecha de vigencia, objeto, Cámara de Comercio, distribuidor
        // exclusivo, cruce de fechas 7↔8, etc.) se agrega aparte en
        // ejecutarAnalisisLocalReglas() según corresponda al ítem.
        return {
            estado: 'ok', puntaje: 100,
            titulo: ITEMS_CHECKLIST[numItem]?.nombre || `Ítem ${numItem}`,
            hallazgos: [], advertencias: [], recomendaciones: [],
            resumen: `✅ Documento "${nombreArchivo}" registrado en el expediente.`,
            normativa: 'Acuerdo 015/2024 – Resolución 0456/2024 HSLV',
            camposPresentes: [], camposAusentes: []
        };
    }

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

    const recomendaciones = _recomendacionesRedaccion(obsRedaccion);
    if (esBinario) recomendaciones.push('Documento PDF/imagen recibido. Revise manualmente el contenido según la normativa: ' + skill.normativa);
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

// ══════════════════════════════════════════════════════════════
// MOTOR LOCAL DE REGLAS DE VIGENCIA — ítems que NUNCA pasan por IA
// (ver _MODO_ANALISIS_CD1P más abajo). Reglas simples pedidas por el
// usuario: la mayoría de estos ítems son documentos cortos donde solo
// importa que la fecha de expedición (o similar) esté dentro de la
// ventana de vigencia exigida — comparada siempre contra la fecha real
// del sistema en el momento de analizar, no una fecha guardada aparte.
// ══════════════════════════════════════════════════════════════

// ── Normalización de texto para búsqueda de fechas/frases, INDEPENDIENTE
// del formato original del documento (tabla, celda de Excel/Word volcada a
// texto, OCR de imagen, PDF con texto real) ──
// Un documento en tabla parte una frase o una fecha en pedazos separados por
// saltos de línea, tabs o bordes ASCII ("Cámara\n|\nde\n|\nComercio",
// "Fecha:\n\n15/07/2026"); el texto de OCR además suele insertar dobles
// espacios y separadores de celda sueltos (|, +, guiones/guiones bajos como
// líneas de tabla). Esta función no borra información: solo colapsa todo
// ese "ruido de layout" a un solo espacio, para que las expresiones
// regulares (que ya usan \s+ entre palabras) encuentren la fecha o la frase
// sin importar en qué fila/columna cayó cada palabra.
function _normalizarParaBusqueda(texto) {
    if (!texto) return '';
    return texto
        .replace(/[|+]+/g, ' ')      // separadores de celda de tabla ASCII
        .replace(/[_\-]{3,}/g, ' ')  // líneas de tabla / subrayados largos
        .replace(/\s+/g, ' ')        // cualquier salto de línea/tab/espacio repetido → un solo espacio
        .trim();
}

const _MESES_ES = {
    enero:1, ene:1, febrero:2, feb:2, marzo:3, mar:3, abril:4, abr:4,
    mayo:5, may:5, junio:6, jun:6, julio:7, jul:7, agosto:8, ago:8,
    septiembre:9, setiembre:9, sept:9, sep:9, octubre:10, oct:10,
    noviembre:11, nov:11, diciembre:12, dic:12
};

// Extrae TODAS las fechas reconocibles de un texto, en cualquiera de los
// formatos habituales en documentos colombianos: "dd/mm/yyyy", "dd-mm-yyyy",
// "dd.mm.yyyy", ISO "yyyy-mm-dd" / "yyyy/mm/dd", y la forma textual
// "dd de <mes o abreviatura> de yyyy". Siempre debe recibir el texto ya
// pasado por _normalizarParaBusqueda() para que una fecha partida entre
// líneas/celdas de una tabla igual se reconozca como una sola. Devuelve, por
// cada fecha, también la POSICIÓN donde se encontró en el texto (`index`),
// necesaria para poder mostrar después el contexto (palabras antes/después)
// y así confirmar que la fecha no vino de un lugar equivocado del documento
// (una cita legal, una fecha de otro trámite, etc.).
function _extraerFechasTexto(texto) {
    const fechas = [];
    if (!texto) return fechas;

    // Espacios opcionales alrededor de los separadores (\s*): el OCR de una
    // fecha en una casilla de tabla frecuentemente separa cada número con un
    // espacio de más ("15 / 07 / 2026"), y sin este margen la fecha completa
    // no se reconocía aunque los tres números estuvieran perfectamente
    // legibles.
    const reNum = /\b(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(20\d{2})\b/g;
    let m;
    while ((m = reNum.exec(texto)) !== null) {
        const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) fechas.push({ fecha: new Date(y, mo - 1, d), index: m.index });
    }

    const reISO = /\b(20\d{2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})\b/g;
    while ((m = reISO.exec(texto)) !== null) {
        const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
        if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) fechas.push({ fecha: new Date(y, mo - 1, d), index: m.index });
    }

    const nombresMes = Object.keys(_MESES_ES).join('|');
    const reTexto = new RegExp('\\b(\\d{1,2})\\s+de\\s+(' + nombresMes + ')\\.?\\s+de\\s+(20\\d{2})\\b', 'gi');
    while ((m = reTexto.exec(texto)) !== null) {
        const d  = parseInt(m[1], 10);
        const mo = _MESES_ES[m[2].toLowerCase()];
        const y  = parseInt(m[3], 10);
        if (d >= 1 && d <= 31 && mo) fechas.push({ fecha: new Date(y, mo - 1, d), index: m.index });
    }

    return fechas;
}

// ¿Aparece el año vigente como número suelto en el texto (sin fecha
// completa)? Solo se usa como respaldo de la regla 'anio' — items 1, 2, 3 y
// 14, donde el usuario pidió explícitamente que baste con que el año
// aparezca en cualquier parte del documento (p. ej. "Vigencia fiscal 2026"
// en el encabezado del PAA, sin día ni mes). Devuelve la POSICIÓN del primer
// match (o -1 si no aparece) para poder mostrar contexto también en ese caso.
function _indiceAnioVigente(texto) {
    if (!texto) return -1;
    const anioActual = new Date().getFullYear();
    const m = new RegExp('\\b' + anioActual + '\\b').exec(texto);
    return m ? m.index : -1;
}

// Regla de vigencia por ítem: 'anio' (mismo año, o el año suelto si no hay
// fecha completa — ver _indiceAnioVigente), 'mes' (mismo mes Y año),
// 'dias30' (máx. 30 días de antigüedad), 'meses3' (máx. ~3 meses).
const _REGLA_FECHA_LOCAL = {
    1:'anio', 2:'anio', 3:'anio', 7:'anio', 8:'anio', 14:'anio',
    11:'dias30',
    15:'mes', 16:'mes', 17:'mes', 18:'mes', 20:'mes', 21:'mes', 22:'mes',
    19:'meses3'
};

// Mensaje de revisión manual ESPECÍFICO por regla — se usa tanto cuando no
// se encontró ninguna fecha en el texto como cuando el documento es un
// binario sin texto legible (OCR falló o imagen escaneada). Nombrar la
// regla concreta ("mismo mes", "≤30 días", etc.) en vez de un genérico
// "verifique la vigencia" es lo que le dice al usuario EXACTAMENTE qué
// validar a mano según el ítem que está revisando.
function _mensajeRevisionManualFecha(regla) {
    const hoy = new Date();
    switch (regla) {
        case 'anio':   return `que el documento sea del año vigente (${hoy.getFullYear()})`;
        case 'mes':    return `que el documento tenga fecha del mes y año vigente (${hoy.toLocaleDateString('es-CO', { month:'long', year:'numeric' })}, o no mayor a 31 días)`;
        case 'dias30': return 'que la fecha de expedición no tenga más de 30 días de antigüedad';
        case 'meses3': return 'que la vigencia no supere los 3 meses';
        default:       return 'la vigencia de este documento';
    }
}

// Une un mensaje con su fragmento de contexto (si existe), para que el
// usuario pueda confirmar de un vistazo que la fecha/frase encontrada
// realmente corresponde a lo que se está evaluando y no a otra parte del
// documento (una cita legal, un trámite distinto, un pie de página, etc.).
function _conContexto(mensaje, contexto) {
    return contexto ? `${mensaje} — contexto: "${contexto}"` : mensaje;
}

function _verificarVigenciaFecha(numItem, texto) {
    const regla = _REGLA_FECHA_LOCAL[numItem];
    if (!regla) return null;

    const textoBusqueda = _normalizarParaBusqueda(texto);
    const hoy    = new Date();
    const fechas = _extraerFechasTexto(textoBusqueda);

    function _cumpleRegla(fecha) {
        if (regla === 'anio')   return fecha.getFullYear() === hoy.getFullYear();
        if (regla === 'mes')    return fecha.getFullYear() === hoy.getFullYear() && fecha.getMonth() === hoy.getMonth();
        if (regla === 'dias30') { const d = Math.round((hoy - fecha) / 86400000); return d >= 0 && d <= 30; }
        if (regla === 'meses3') { const d = Math.round((hoy - fecha) / 86400000); return d >= 0 && d <= 92; }
        return false;
    }

    // 1) Si CUALQUIERA de las fechas encontradas en el documento cumple la
    //    regla, se da por vigente — más robusto que quedarse con "la fecha
    //    más reciente" cuando el documento trae varias fechas dispersas
    //    (tablas, encabezados, pies de página, fechas de otros trámites).
    const fechaValida = fechas.find(f => _cumpleRegla(f.fecha));
    if (fechaValida) {
        return {
            ok: true, fechaDetectada: fechaValida.fecha,
            contexto: _fragmentoContexto(textoBusqueda, fechaValida.index, 45),
            hallazgos: [], advertencias: []
        };
    }

    // 2) Respaldo exclusivo de la regla 'anio': aunque no haya una fecha
    //    completa reconocible, si el año vigente aparece suelto en el
    //    documento (encabezados tipo "Vigencia 2026"), se acepta igual.
    if (regla === 'anio') {
        const idxAnio = _indiceAnioVigente(textoBusqueda);
        if (idxAnio !== -1) {
            return {
                ok: true, fechaDetectada: null,
                contexto: _fragmentoContexto(textoBusqueda, idxAnio, 45),
                hallazgos: [], advertencias: []
            };
        }
    }

    const mensajeRegla = _mensajeRevisionManualFecha(regla);

    // 3a) No se encontró ninguna fecha (ni año suelto, si aplica): el
    //     documento podría estar vigente igual, solo que el texto no lo dejó
    //     ver — se marca como ADVERTENCIA (revisión manual), no como
    //     incumplimiento normativo confirmado.
    if (fechas.length === 0) {
        return {
            ok: false, fechaDetectada: null, contexto: null,
            hallazgos: [],
            advertencias: [`🗓️ No se identificó en el documento una fecha reconocible. Independientemente del resultado, revise siempre manualmente ${mensajeRegla}.`]
        };
    }

    // 3b) Sí se encontraron fechas, pero NINGUNA cumple la regla: esto es un
    //     incumplimiento confirmado (hallazgo), reportado con la fecha más
    //     reciente de las encontradas (y su contexto) como referencia.
    const masReciente = fechas.reduce((a, b) => (b.fecha > a.fecha ? b : a));
    const contextoMasReciente = _fragmentoContexto(textoBusqueda, masReciente.index, 45);
    return {
        ok: false, fechaDetectada: masReciente.fecha, contexto: contextoMasReciente,
        hallazgos: [_conContexto(`🗓️ Ninguna de las fechas identificadas en el documento cumple ${mensajeRegla}. Fecha más reciente detectada: ${masReciente.fecha.toLocaleDateString('es-CO')}.`, contextoMasReciente)],
        advertencias: []
    };
}

// Ítem 10 (Experiencia): que el objeto declarado en el formulario aparezca,
// aunque sea parcialmente, en el texto del documento cargado.
function _verificarObjetoContractual(texto) {
    const campo  = document.getElementById('mp_objeto');
    const objeto = campo ? (campo.value || '').trim() : '';
    if (!objeto || objeto.length < 6) return null;

    const textoBusqueda = _normalizarParaBusqueda(texto);
    const objNorm   = _normalizarTexto(objeto);
    const textoNorm = _normalizarTexto(textoBusqueda);
    const palabras  = objNorm.split(/\s+/).filter(p => p.length >= 4);
    if (palabras.length === 0) return null;

    const coincididas = palabras.filter(p => textoNorm.includes(p));
    const ok = coincididas.length >= Math.max(2, Math.ceil(palabras.length * 0.5));

    // Contexto: se ubica en el texto ORIGINAL (con tildes) la primera
    // palabra del objeto que haya hecho match, buscándola tal cual aparece
    // escrita en el objeto declarado — es un rastreo best-effort solo para
    // mostrar contexto legible; si no se encuentra por diferencias de
    // acentuación entre el formulario y el documento, se omite sin afectar
    // el resultado ok/no-ok (que sí es tolerante a acentos).
    let contexto = null;
    if (ok) {
        const textoLow = textoBusqueda.toLowerCase();
        const palabrasOriginales = objeto.toLowerCase().split(/\s+/).filter(p => p.replace(/[^a-zà-ÿ0-9]/gi, '').length >= 4);
        for (const p of palabrasOriginales) {
            const idx = textoLow.indexOf(p.replace(/[^a-zà-ÿ0-9]/gi, ''));
            if (idx !== -1) { contexto = _fragmentoContexto(textoBusqueda, idx, 45); break; }
        }
    }

    return {
        ok, contexto,
        hallazgos: ok ? [] : [`🔎 No se encontró en el documento un texto similar al Objeto Contractual declarado ("${objeto.slice(0, 80)}${objeto.length > 80 ? '…' : ''}"). Independientemente del resultado, revise siempre manualmente que corresponda al mismo proceso.`],
        advertencias: []
    };
}

// Cruce ítem 7 (Anexo IO – Presentación de la Propuesta) vs ítem 8 (Propuesta):
// la fecha del ítem 7 no puede ser anterior a la fecha del ítem 8. Se aplica
// después de analizar cualquiera de los dos, cuando ambos ya tienen una fecha
// detectada — y se retira sola si un re-análisis deja de contradecirla.
function _aplicarCruceFechas7y8() {
    const entrada7 = Object.values(estadoDocumentos).find(v => v.numItem === 7 && v.analisis && v.analisis._fechaDetectadaISO);
    const entrada8 = Object.values(estadoDocumentos).find(v => v.numItem === 8 && v.analisis && v.analisis._fechaDetectadaISO);
    if (!entrada7 || !entrada8) return;

    const fecha7 = new Date(entrada7.analisis._fechaDetectadaISO);
    const fecha8 = new Date(entrada8.analisis._fechaDetectadaISO);
    const prefijoAlerta = '🔗 La fecha detectada en el Anexo IO – Presentación de la Propuesta (ítem 7:';
    const alerta = `${prefijoAlerta} ${fecha7.toLocaleDateString('es-CO')}) es anterior a la fecha detectada en la Propuesta (ítem 8: ${fecha8.toLocaleDateString('es-CO')}). Verifique el orden de estos documentos.`;

    const yaEstaba = entrada7.analisis.hallazgos.some(h => h.startsWith(prefijoAlerta));

    if (fecha7 < fecha8) {
        if (!yaEstaba) {
            entrada7.analisis.hallazgos.push(alerta);
            entrada7.analisis.estado  = 'correccion';
            entrada7.estado           = 'correccion';
            entrada7.analisis.puntaje = Math.max(0, (entrada7.analisis.puntaje || 0) - 20);
        }
    } else if (yaEstaba) {
        entrada7.analisis.hallazgos = entrada7.analisis.hallazgos.filter(h => !h.startsWith(prefijoAlerta));
        if (entrada7.analisis.hallazgos.length === 0) {
            entrada7.analisis.estado = entrada7.analisis.advertencias.length ? 'advertencia' : 'ok';
            entrada7.estado          = entrada7.analisis.estado;
        }
    }
    // actualizarPanelAgente es una función de UI específica de contratacion.html/
    // directa-3p.html (glue de página) — no existe en toda página que cargue este
    // motor (ej. proceso-detalle.html), de ahí el guard en vez de llamarla directo.
    if (typeof actualizarPanelAgente === 'function') actualizarPanelAgente();
}

// Ítem 11 (Certificado de existencia y representación): que en alguna parte
// del documento se mencione "Cámara de Comercio" / "Certificado de
// existencia" (o sinónimos como "registro mercantil", "existencia y
// representación") — regla puntual pedida por el usuario, aparte de la
// fecha de expedición (máx. 30 días, ver _REGLA_FECHA_LOCAL).
function _verificarCamaraDeComercio(texto) {
    const textoBusqueda = _normalizarParaBusqueda(texto);
    const m = /c[aá]mara\s+de\s+comercio|certificado\s+de\s+existencia|registro\s+mercantil|existencia\s+y\s+representaci[oó]n|matr[ií]cula\s+mercantil/i.exec(textoBusqueda);
    return {
        ok: !!m,
        contexto: m ? _fragmentoContexto(textoBusqueda, m.index, 45) : null,
        hallazgos: m ? [] : ['🏢 No se identificó en el documento una mención a "Cámara de Comercio" o "Certificado de existencia" (o sinónimos). Independientemente del resultado, revise siempre manualmente que corresponda al documento correcto.'],
        advertencias: []
    };
}

// Ítem 9 (Estudio de mercado / distribuidor exclusivo): según la opción
// marcada en el radio "sub_distribuidor" del formulario —
//  · "si" (Es distribuidor o proveedor exclusivo): la Carta de Distribuidor
//    cargada debe mencionar expresamente esa condición.
//  · "no" (No es distribuidor exclusivo): no se valida contenido, solo se
//    deja la advertencia pedida por el usuario para revisión manual.
function _verificarDistribuidorExclusivo(texto) {
    const radio = document.querySelector('input[name="sub_distribuidor"]:checked');
    const esDistribuidor = !!radio && radio.value === 'si';

    if (esDistribuidor) {
        const textoBusqueda = _normalizarParaBusqueda(texto);
        const m = /distribuidor\s+(exclusivo|[uú]nico)|proveedor\s+exclusivo|[uú]nico\s+distribuidor|representante\s+exclusivo/i.exec(textoBusqueda);
        return {
            contexto: m ? _fragmentoContexto(textoBusqueda, m.index, 45) : null,
            hallazgos: m ? [] : ['🏢 No se identificó en el documento una mención explícita de distribuidor o proveedor exclusivo (o único distribuidor). Independientemente del resultado, revise siempre manualmente que la Carta de Distribuidor certifique expresamente esta condición.'],
            advertencias: []
        };
    }

    return {
        hallazgos: [],
        advertencias: ['🔎 Revise manualmente que las propuestas presentadas concuerden con las que aparecen en el Estudio de Mercado.']
    };
}

// Describe en una frase corta, para el resumen del análisis, QUÉ fecha se
// encontró y por qué cumple la regla del ítem — así un resultado al 100%
// también dice explícitamente qué criterio y qué dato tomó en cuenta, en vez
// de un genérico "documento registrado".
function _mensajeCriterioFechaOk(regla, fecha, contexto) {
    const fechaTxt = fecha ? fecha.toLocaleDateString('es-CO') : null;
    let base;
    if (!fechaTxt) {
        base = `se encontró el año vigente (${new Date().getFullYear()}) en el documento`;
    } else {
        switch (regla) {
            case 'anio':   base = `fecha detectada ${fechaTxt}, del año vigente`; break;
            case 'mes':    base = `fecha detectada ${fechaTxt}, del mismo mes y año vigente`; break;
            case 'dias30': base = `fecha de expedición detectada ${fechaTxt}, dentro de los últimos 30 días`; break;
            case 'meses3': base = `fecha detectada ${fechaTxt}, dentro de los últimos 3 meses`; break;
            default:       base = `fecha detectada ${fechaTxt}`;
        }
    }
    return _conContexto(base, contexto);
}

// Advertencias de "no se pudo verificar automáticamente" cuando no hay texto
// utilizable (documento binario sin OCR legible, o texto extraído demasiado
// corto para confiar en él) — misma redacción específica por ítem en ambos
// casos, factorizada aquí para no duplicarla.
function _advertenciasSinTextoUtilizable(numItem, tieneReglaFecha, motivo) {
    const advertencias = [];
    if (tieneReglaFecha) {
        const mensajeRegla = _mensajeRevisionManualFecha(_REGLA_FECHA_LOCAL[numItem]);
        advertencias.push(`🗓️ ${motivo} No fue posible verificar automáticamente ${mensajeRegla}. Revise manualmente.`);
    } else if (numItem === 10) {
        advertencias.push(`🔎 ${motivo} No fue posible verificar automáticamente que el objeto contractual coincida con este documento. Revise manualmente.`);
    }
    if (numItem === 11) {
        advertencias.push(`🏢 ${motivo} No fue posible verificar automáticamente la mención a Cámara de Comercio / Certificado de existencia. Revise manualmente.`);
    }
    if (numItem === 9) {
        const radio = document.querySelector('input[name="sub_distribuidor"]:checked');
        advertencias.push(radio && radio.value === 'si'
            ? `🏢 ${motivo} No fue posible verificar la mención de distribuidor o proveedor exclusivo. Revise manualmente.`
            : '🔎 Revise manualmente que las propuestas presentadas concuerden con las que aparecen en el Estudio de Mercado.');
    }
    return advertencias;
}

// Motor local completo para los ítems que NUNCA pasan por IA: reutiliza
// ejecutarSkillJuridico() (ya reducido a "sin observaciones", salvo el ítem
// 6) como base y le suma, según el ítem, la única regla puntual pedida por
// el usuario: vigencia de fecha, objeto contractual, Cámara de Comercio o
// distribuidor exclusivo.
function ejecutarAnalisisLocalReglas(numItem, nombreArchivo, contenido) {
    const base      = ejecutarSkillJuridico(numItem, nombreArchivo, contenido);
    const esBinario = contenido.tipo === 'pdf' || contenido.tipo === 'imagen';
    const texto     = contenido.tipo === 'texto' ? (contenido.data || '') : '';
    const tieneReglaFecha = !!_REGLA_FECHA_LOCAL[numItem];

    const hallazgosExtra    = [];
    const advertenciasExtra = [];
    // Frases de lo que SÍ se verificó y cumplió — arman el resumen cuando el
    // resultado queda en 100% ("ok"), para que ese caso también diga
    // explícitamente qué criterio y qué dato (fecha, objeto, frase) tomó en
    // cuenta, en vez del genérico "documento registrado en el expediente".
    const criteriosOk = [];
    let fechaDetectadaISO = null;

    if (esBinario) {
        const motivo = contenido.motivoSinTexto || 'Documento sin texto legible (imagen o PDF escaneado).';
        advertenciasExtra.push(..._advertenciasSinTextoUtilizable(numItem, tieneReglaFecha, motivo));
    } else if (texto.length > 15) {
        const resFecha = _verificarVigenciaFecha(numItem, texto);
        if (resFecha) {
            hallazgosExtra.push(...resFecha.hallazgos);
            advertenciasExtra.push(...resFecha.advertencias);
            if (resFecha.fechaDetectada) fechaDetectadaISO = resFecha.fechaDetectada.toISOString();
            if (resFecha.ok) criteriosOk.push(_mensajeCriterioFechaOk(_REGLA_FECHA_LOCAL[numItem], resFecha.fechaDetectada, resFecha.contexto));
            // Ítems 7 y 8: el cruce de fechas (_aplicarCruceFechas7y8) necesita
            // el día exacto de cada documento. Si el año vigente se aceptó por
            // el respaldo de año suelto (sin fecha completa reconocible), no
            // hay día que comparar — se avisa para que se revise a mano.
            if ((numItem === 7 || numItem === 8) && resFecha.ok && !resFecha.fechaDetectada) {
                advertenciasExtra.push('🔗 Se identificó el año vigente en el documento, pero no una fecha completa (día y mes) que permita cruzar automáticamente el orden con el otro documento (ítem 7 vs. ítem 8). Revise manualmente que las fechas sean coherentes.');
            }
        }

        if (numItem === 10) {
            const resObjeto = _verificarObjetoContractual(texto);
            if (resObjeto) {
                hallazgosExtra.push(...resObjeto.hallazgos);
                advertenciasExtra.push(...resObjeto.advertencias);
                if (resObjeto.ok) criteriosOk.push(_conContexto('el texto del documento coincide con el Objeto Contractual declarado en el proceso', resObjeto.contexto));
            }
        }

        if (numItem === 11) {
            const resCamara = _verificarCamaraDeComercio(texto);
            hallazgosExtra.push(...resCamara.hallazgos);
            advertenciasExtra.push(...resCamara.advertencias);
            if (resCamara.ok) criteriosOk.push(_conContexto('se encontró mención a "Cámara de Comercio" / "Certificado de existencia" en el documento', resCamara.contexto));
        }

        if (numItem === 9) {
            const resDistribuidor = _verificarDistribuidorExclusivo(texto);
            hallazgosExtra.push(...resDistribuidor.hallazgos);
            advertenciasExtra.push(...resDistribuidor.advertencias);
            const radio = document.querySelector('input[name="sub_distribuidor"]:checked');
            if (radio && radio.value === 'si' && resDistribuidor.hallazgos.length === 0) {
                criteriosOk.push(_conContexto('se encontró mención explícita de distribuidor o proveedor exclusivo en el documento', resDistribuidor.contexto));
            }
        }
    } else {
        // Texto extraído pero demasiado corto para confiar en él (posible
        // falla parcial de OCR) — mismo tratamiento informativo que un
        // documento binario sin texto legible.
        advertenciasExtra.push(..._advertenciasSinTextoUtilizable(numItem, tieneReglaFecha, 'El documento tiene muy poco texto legible.'));
    }

    const hallazgos    = [...base.hallazgos, ...hallazgosExtra];
    const advertencias = [...base.advertencias, ...advertenciasExtra];

    let estado = 'ok';
    if (hallazgos.length > 0)         estado = 'correccion';
    else if (advertencias.length > 0) estado = 'advertencia';

    const puntaje = (hallazgosExtra.length + advertenciasExtra.length) === 0
        ? base.puntaje
        : Math.max(0, (base.puntaje ?? 100) - hallazgosExtra.length * 25 - advertenciasExtra.length * 10);

    let resumen = base.resumen;
    if (hallazgosExtra.length > 0 || advertenciasExtra.length > 0) {
        resumen = estado === 'correccion'
            ? `🔴 ${base.titulo}: ${hallazgos.length} incumplimiento(s) detectado(s) (incluye vigencia/fecha).`
            : `⚠️ ${base.titulo}: revise ${advertencias.length} observación(es) (incluye vigencia/fecha).`;
    } else if (criteriosOk.length > 0) {
        resumen = `✅ ${base.titulo}: ${criteriosOk.join('; ')}.`;
    }

    return {
        estado, puntaje, resumen,
        titulo: base.titulo,
        hallazgos, advertencias,
        recomendaciones: base.recomendaciones,
        camposPresentes: base.camposPresentes,
        camposAusentes: base.camposAusentes,
        normativa: base.normativa,
        motor: 'local_reglas',
        _fechaDetectadaISO: fechaDetectadaISO
    };
}
