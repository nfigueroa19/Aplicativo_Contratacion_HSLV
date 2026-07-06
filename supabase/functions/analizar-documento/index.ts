// Función Edge de Supabase: recibe el texto ya extraído de un documento (en el
// navegador, con mammoth.js/pdf.js) y lo envía a Groq (IA gratuita) para un
// análisis normativo real. Si esta función falla, el navegador cae solo a un
// motor local de respaldo (ver analizarConGroq() en js/script.js) — por eso
// aquí no hace falta un manejo de errores exagerado, basta con no romper nunca
// el formato JSON de salida.
//
// Dos modos (campo "modo" en el body):
// - "parte" (o ausente): analiza UN fragmento de texto del documento. Si el
//   documento se dividió en varias partes, este modo NUNCA declara algo
//   "ausente" — solo confirma qué SÍ encontró en ese fragmento. La decisión
//   final de qué falta se toma en el modo "sintesis".
// - "sintesis": no recibe texto del documento, sino la lista ya combinada de
//   todo lo que se confirmó como presente en TODAS las partes, y da el
//   veredicto final (qué falta de verdad, estado, puntaje, recomendaciones).
//   Este paso evita el falso "no encontrado" que pasaría si una parte no vio
//   algo que sí estaba en otra parte del mismo documento.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const ESTADOS_VALIDOS = ['ok', 'advertencia', 'correccion'];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      modo, numItem, nombreArchivo, itemNombre, criterios,
      normativaSkill, esRestringido, texto, contextoExpediente,
      parteActual, totalPartes, camposPresentesConocidos, observacionesCandidatas,
      otrosItemsChecklist
    } = body;

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY no configurada en el servidor.');

    const esSintesis = modo === 'sintesis';
    const contextoTxt = _resumirContexto(contextoExpediente);
    const esDocumentoDividido = !esSintesis && totalPartes && totalPartes > 1;

    // Lista de los OTROS ítems del mismo checklist (23 documentos en total en
    // CD1P) — para que la IA sepa que si un requisito es responsabilidad de
    // OTRO documento del expediente (ej. las cotizaciones del "Estudio de
    // Mercado", que es un ítem aparte), no debe exigirlo aquí.
    const otrosItemsTxt = (otrosItemsChecklist || []).length
      ? (otrosItemsChecklist as { num: number; nombre: string }[])
          .map((it) => `${it.num}. ${it.nombre}`).join('; ')
      : '';
    const bloqueOtrosItems = otrosItemsTxt
      ? `\nEste documento es el ítem ${numItem} de un checklist de ${((otrosItemsChecklist || []).length) + 1} ` +
        `documentos que conforman el expediente completo de contratación. Los DEMÁS ítems del mismo checklist ` +
        `(documentos separados, que se revisan cada uno por su cuenta) son: ${otrosItemsTxt}. Si un criterio de ` +
        `ESTE ítem menciona algo que en realidad es responsabilidad de OTRO ítem de esa lista (por ejemplo, ` +
        `cotizaciones que ya se piden en el ítem "Estudio de mercado" aparte), NO lo reportes como ausente ni ` +
        `como incumplimiento aquí — asume que ese contenido se revisará en su propio ítem del checklist.\n`
      : '';

    const reglasComunes =
      'Responde EXCLUSIVAMENTE con un objeto JSON (sin texto fuera del JSON) con EXACTAMENTE estas claves: ' +
      '{"estado":"ok|advertencia|correccion","puntaje":0-100,"resumen":"string breve",' +
      '"titulo":"string","hallazgos":["..."],"advertencias":["..."],"recomendaciones":["..."],' +
      '"camposPresentes":["..."],"camposAusentes":["..."],"normativa":"string"}. ' +
      'estado="correccion" si falta algo obligatorio grave; "advertencia" si hay observaciones ' +
      'menores o de redacción; "ok" solo si cumple todo. No inventes hechos que no estén en el texto. ' +
      'IMPORTANTE — separación estricta de campos: "hallazgos" y "camposAusentes" son EXCLUSIVAMENTE para ' +
      'problemas reales o requisitos que faltan; "camposPresentes" es para lo que SÍ está bien. Nunca pongas ' +
      'una observación positiva (algo que sí cumple) dentro de "hallazgos" — si algo cumple, va únicamente en ' +
      '"camposPresentes". ' +
      'IMPORTANTE: nunca cites una ley, decreto o número de artículo que no se te haya dado explícitamente ' +
      'en "Normativa de referencia". Si no tienes una cita específica para este ítem, escribe textualmente ' +
      '"Verificar fundamento normativo específico con el área jurídica" en el campo "normativa" en vez de ' +
      'inventar una cita.';

    let systemPrompt: string;
    let userPrompt: string;

    if (esSintesis) {
      systemPrompt =
        'Eres un abogado revisor de contratación pública colombiana (Hospital Susana López de Valencia, ' +
        'Acuerdo 015/2024, Resolución 0456/2024, Ley 80/1993, Decreto 1082/2015). Un documento muy largo ya ' +
        'fue revisado en varias partes por separado. Ahora te dan la lista CONSOLIDADA de todo lo que se ' +
        'confirmó presente en el documento completo (sumando todas las partes), y una lista de observaciones ' +
        'candidatas detectadas en fragmentos individuales. Tu tarea es dar el VEREDICTO FINAL sobre el ' +
        'documento completo: ' +
        '1) Compara los criterios exigidos contra la lista de "elementos confirmados como presentes" — solo ' +
        'incluye en "camposAusentes" lo que de verdad NO aparece en esa lista. ' +
        '2) Revisa la lista de "observaciones candidatas": si una observación dice que algo falta pero ese ' +
        'mismo elemento SÍ aparece en la lista de presentes, DESCÁRTALA (ya quedó resuelta por otra parte del ' +
        'documento) — no la incluyas en tu resultado final. ' +
        '3) No pidas ver el documento de nuevo, trabaja solo con estas listas. ' +
        reglasComunes + bloqueOtrosItems;

      const presentesTxt = (camposPresentesConocidos || []).length
        ? (camposPresentesConocidos as string[]).map((c) => `- ${c}`).join('\n')
        : '(ninguno confirmado)';
      const candidatasTxt = (observacionesCandidatas || []).length
        ? (observacionesCandidatas as string[]).map((c) => `- ${c}`).join('\n')
        : '(ninguna)';

      userPrompt =
        `Ítem del checklist: ${itemNombre} (N° ${numItem})${esRestringido ? ' [ítem restringido — solo Jurídica]' : ''}\n` +
        `Criterios a verificar: ${criterios}\n` +
        (normativaSkill ? `Normativa de referencia: ${normativaSkill}\n` : '') +
        (contextoTxt ? `Datos ya vistos en otros documentos de este mismo expediente: ${contextoTxt}\n` : '') +
        `Nombre del archivo: ${nombreArchivo}\n\n` +
        `ELEMENTOS CONFIRMADOS COMO PRESENTES EN EL DOCUMENTO COMPLETO:\n${presentesTxt}\n\n` +
        `OBSERVACIONES CANDIDATAS DETECTADAS EN FRAGMENTOS INDIVIDUALES (revisa cuáles siguen aplicando):\n${candidatasTxt}`;

    } else {
      systemPrompt =
        'Eres un abogado revisor de contratación pública colombiana (Hospital Susana López de Valencia, ' +
        'Acuerdo 015/2024, Resolución 0456/2024, Ley 80/1993, Decreto 1082/2015). Revisas UN documento de un ' +
        'expediente de Contratación Directa (1 propuesta) contra los criterios normativos dados. ' +
        reglasComunes + bloqueOtrosItems +
        (esDocumentoDividido
          ? ' ESTE DOCUMENTO ES MUY LARGO Y SE DIVIDIÓ EN VARIAS PARTES PARA QUE PUEDAS LEERLO COMPLETO. ' +
            'Solo estás viendo UNA parte. Un requisito que no aparece en esta parte podría estar en otra ' +
            'parte del mismo documento — por lo tanto, en este modo NUNCA declares algo en "camposAusentes" ' +
            '(debe quedar SIEMPRE como un arreglo vacío []); la decisión de qué falta de verdad se toma después, ' +
            'con el documento completo. Solo reporta en "hallazgos"/"advertencias" problemas que sean evidentes ' +
            'dentro de ESTE fragmento (ej. una fecha vencida, un valor incoherente) — nunca "no encontré X" ' +
            'simplemente porque X no aparece en este fragmento.'
          : '');

      userPrompt =
        `Ítem del checklist: ${itemNombre} (N° ${numItem})${esRestringido ? ' [ítem restringido — solo Jurídica]' : ''}\n` +
        (esDocumentoDividido ? `⚠️ Estás leyendo la parte ${parteActual} de ${totalPartes} de este mismo documento.\n` : '') +
        `Criterios a verificar: ${criterios}\n` +
        (normativaSkill ? `Normativa de referencia: ${normativaSkill}\n` : '') +
        (contextoTxt ? `Datos ya vistos en otros documentos de este mismo expediente: ${contextoTxt}\n` : '') +
        `Nombre del archivo: ${nombreArchivo}\n\n` +
        `TEXTO DEL DOCUMENTO (puede incluir tablas representadas como "celda | celda"):\n${texto}`;
    }

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const detalle = await groqRes.text();
      throw new Error(`Groq respondió ${groqRes.status}: ${detalle.slice(0, 300)}`);
    }

    const groqData = await groqRes.json();
    const contenido = groqData?.choices?.[0]?.message?.content;
    if (!contenido) throw new Error('Groq no devolvió contenido.');

    let parsed;
    try { parsed = JSON.parse(contenido); }
    catch { throw new Error('La respuesta de la IA no fue JSON válido.'); }

    const resultado = _normalizar(parsed, itemNombre, normativaSkill);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function _resumirContexto(ctx: any): string {
  if (!ctx) return '';
  const partes: string[] = [];
  if (ctx.objeto?.length) partes.push(`objeto declarado: "${ctx.objeto[0].valor}"`);
  if (ctx.nit?.length) partes.push(`NIT/cédula: ${ctx.nit[0].valor}`);
  if (ctx.contratista?.length) partes.push(`contratista: ${ctx.contratista[0].valor}`);
  if (ctx.cdp?.length) partes.push(`CDP N°: ${ctx.cdp[0].valor}`);
  return partes.join('; ');
}

function _normalizar(p: any, itemNombre: string, normativaSkill: string | null) {
  return {
    estado: ESTADOS_VALIDOS.includes(p.estado) ? p.estado : 'advertencia',
    puntaje: typeof p.puntaje === 'number' ? Math.max(0, Math.min(100, p.puntaje)) : 60,
    resumen: typeof p.resumen === 'string' ? p.resumen : '',
    titulo: typeof p.titulo === 'string' ? p.titulo : itemNombre,
    hallazgos: Array.isArray(p.hallazgos) ? p.hallazgos : [],
    advertencias: Array.isArray(p.advertencias) ? p.advertencias : [],
    recomendaciones: Array.isArray(p.recomendaciones) ? p.recomendaciones : [],
    camposPresentes: Array.isArray(p.camposPresentes) ? p.camposPresentes : [],
    camposAusentes: Array.isArray(p.camposAusentes) ? p.camposAusentes : [],
    normativa: typeof p.normativa === 'string' ? p.normativa : (normativaSkill || 'Verificar fundamento normativo específico con el área jurídica')
  };
}
