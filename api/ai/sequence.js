// api/ai/sequence.js — Vercel Serverless Function for tactical sequences
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
    
    if (!payload.prompt) {
      return res.status(400).json({ ok: false, error: "Falta el prompt de la situación táctica" });
    }

    const systemPrompt = `Eres un entrenador de fútbol experto. Tu tarea es convertir una descripción táctica en una secuencia animada específica.

INSTRUCCIONES:
1. Analiza la descripción e identifica todos los movimientos, pases y acciones
2. Crea una secuencia temporal detallada con timestamps precisos
3. Especifica posiciones en el campo usando coordenadas normalizadas (0-1)
4. Si hay ambigüedades, formula preguntas específicas para clarificar

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título breve de la jugada",
  "description": "Resumen de la situación táctica",
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
  ],
  "questions": [
    "¿En qué zona del campo inicia la jugada?",
    "¿Cuántos jugadores participan en la presión?"
  ]
}

REGLAS:
- Campo: 105m x 68m, coordenadas normalizadas 0-1
- Timestamps en milisegundos, secuencia realista
- Máximo 15 pasos por secuencia
- Incluye tanto movimientos defensivos como ofensivos
- Si falta información, pregunta específicamente qué necesitas saber

Responde SOLO con el JSON válido:`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("🤖 Generando secuencia táctica...");
    console.log("📝 Descripción:", payload.prompt.substring(0, 100) + "...");

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload.prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
      temperature: 0.7
    });

    console.log("✅ OpenAI respondió correctamente");

    const content = completion?.choices?.[0]?.message?.content;
    
    if (!content) {
      return res.status(502).json({ ok: false, error: "La IA no devolvió contenido" });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("Error parsing JSON:", content);
      return res.status(502).json({ ok: false, error: "La IA no devolvió JSON válido" });
    }

    // Validación básica
    if (!parsed.title || !parsed.steps || !Array.isArray(parsed.steps)) {
      return res.status(502).json({ 
        ok: false, 
        error: "La respuesta de la IA no tiene el formato esperado",
        received: parsed
      });
    }

    // Asegurar que hay una duración
    if (!parsed.duration) {
      parsed.duration = Math.max(8000, parsed.steps.length * 1000);
    }

    console.log("📊 Secuencia generada:", parsed.title, "con", parsed.steps.length, "pasos");

    return res.status(200).json({
      content: JSON.stringify(parsed)
    });

  } catch (err) {
    console.error("Error en sequence API:", err);
    const msg = (err && err.message) ? err.message : "Error desconocido";
    return res.status(500).json({ ok: false, error: msg });
  }
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