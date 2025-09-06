// api/ai/refine.js — Vercel Serverless Function for sequence refinement
import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok: false, error: "Falta OPENAI_API_KEY en entorno" });
    }

    const payload = await readJson(req);

    // Determine if this is a refinement or Q&A request
    if (payload.questions && payload.answers) {
      return handleQuestionAnswering(payload, res);
    } else {
      return handleRefinement(payload, res);
    }

  } catch (err) {
    console.error("Error en refine API:", err);
    const msg = (err && err.message) ? err.message : "Error desconocido";
    return res.status(500).json({ ok: false, error: msg });
  }
}

async function handleRefinement(payload, res) {
  if (!payload.originalDescription || !payload.feedback) {
    return res.status(400).json({ 
      ok: false, 
      error: "Faltan originalDescription y feedback para el refinamiento" 
    });
  }

  const systemPrompt = `Eres un entrenador de fútbol experto. El usuario te pidió crear una secuencia táctica pero no está satisfecho con el resultado.

Tu tarea es:
1. Analizar el feedback del usuario
2. Identificar qué aspectos de la secuencia no son correctos
3. Si necesitas más información, haz preguntas específicas
4. Si tienes información suficiente, crea una secuencia mejorada

FORMATO DE RESPUESTA (JSON):
{
  "needsMoreInfo": true/false,
  "questions": [
    "¿Los jugadores deben moverse más rápido o más lento?",
    "¿En qué posición específica debe estar cada jugador?"
  ],
  "clarification": "Explicación de lo que entendiste del feedback",
  "refinedSequence": {
    // Solo incluir si needsMoreInfo es false
    "title": "Título mejorado",
    "description": "Descripción mejorada",
    "duration": 8000,
    "steps": [
      // Pasos mejorados basados en el feedback
    ]
  }
}

IMPORTANTE:
- Si el feedback es vago ("no me gusta", "está mal"), haz preguntas específicas
- Si el feedback es específico ("los jugadores van muy lentos", "falta presión"), mejora la secuencia directamente
- Mantén la estructura táctica coherente
- Asegúrate de que los movimientos sean realistas

Responde SOLO con el JSON válido:`;

  const userPrompt = `DESCRIPCIÓN ORIGINAL:
"${payload.originalDescription}"

SECUENCIA ACTUAL:
${JSON.stringify({
  title: payload.currentSequence?.title,
  description: payload.currentSequence?.description,
  steps: payload.currentSequence?.steps?.map(s => ({
    timestamp: s.timestamp,
    type: s.type,
    description: s.description,
    from: s.from,
    to: s.to
  }))
}, null, 2)}

FEEDBACK DEL USUARIO:
"${payload.feedback}"`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("🔄 Refinando secuencia táctica...");
  console.log("💬 Feedback:", payload.feedback.substring(0, 100) + "...");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.7
  });

  const content = completion?.choices?.[0]?.message?.content;
  
  if (!content) {
    return res.status(502).json({ ok: false, error: "La IA no devolvió contenido" });
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("Error parsing refinement JSON:", content);
    return res.status(502).json({ ok: false, error: "La IA no devolvió JSON válido" });
  }

  console.log("✅ Refinamiento completado:", parsed.needsMoreInfo ? "Necesita más info" : "Secuencia refinada");

  return res.status(200).json({
    content: JSON.stringify(parsed)
  });
}

async function handleQuestionAnswering(payload, res) {
  if (!payload.originalDescription || !payload.questions || !payload.answers) {
    return res.status(400).json({ 
      ok: false, 
      error: "Faltan originalDescription, questions y answers" 
    });
  }

  const systemPrompt = `Eres un entrenador de fútbol experto. Has hecho preguntas sobre una secuencia táctica y el usuario ha respondido.

Ahora crea la secuencia táctica definitiva basada en la información completa.

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título de la jugada",
  "description": "Descripción de la situación táctica",
  "duration": 8000,
  "steps": [
    {
      "timestamp": 0,
      "type": "move|pass|pressure|intercept",
      "actor": {
        "team": "blue|red",
        "position": {"x": 0.3, "y": 0.5},
        "role": "central|delantero|mediocampista|lateral"
      },
      "target": {
        "position": {"x": 0.7, "y": 0.3},
        "team": "blue|red"
      },
      "description": "Descripción específica de la acción"
    }
  ]
}

Responde SOLO con el JSON válido:`;

  const userPrompt = `DESCRIPCIÓN ORIGINAL:
"${payload.originalDescription}"

PREGUNTAS Y RESPUESTAS:
${payload.questions.map((q, i) => `P: ${q}\nR: ${payload.answers[i] || 'Sin respuesta'}`).join('\n\n')}`;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("❓ Procesando respuestas a preguntas...");

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.7
  });

  const content = completion?.choices?.[0]?.message?.content;
  
  if (!content) {
    return res.status(502).json({ ok: false, error: "La IA no devolvió contenido" });
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error("Error parsing Q&A JSON:", content);
    return res.status(502).json({ ok: false, error: "La IA no devolvió JSON válido" });
  }

  // Validate sequence structure
  if (!parsed.title || !parsed.steps || !Array.isArray(parsed.steps)) {
    return res.status(502).json({ 
      ok: false, 
      error: "La respuesta de la IA no tiene el formato esperado"
    });
  }

  console.log("✅ Secuencia final generada:", parsed.title);

  return res.status(200).json({
    content: JSON.stringify(parsed)
  });
}

// Helper para leer JSON en Vercel/Node
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => raw += chunk);
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}