// api/ai/tactics.js — Vercel Serverless Function (Node.js runtime, ESM)
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

    // Lee el payload recibido (usa el que ya probaste con curl)
    const payload = await readJson(req);

    // Construye prompts mínimos (versión simple de prueba)
    const system = "Eres un asistente táctico de fútbol. Devuelve SOLO JSON válido con {alineacion:{}, planPartido:{}, jugadas:[]}.";

    const minimal = {
      squadId: payload?.squadId,
      players: (payload?.players || []).map(p => ({
        id: p.id, nombre: p.nombre, dorsal: p.dorsal, pie: p.pie, posiciones: p.posiciones
      })),
      opponent: payload?.opponent,
      plan: { fecha: payload?.plan?.fecha, objetivos: payload?.plan?.objetivos || [], recursos: payload?.plan?.recursos || [] },
      context: payload?.context || {}
    };
    const user = JSON.stringify(minimal);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Timeout de 25s para no colgar la función
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" }
    }, { signal: controller.signal });

    clearTimeout(timer);

    const content = completion?.choices?.[0]?.message?.content ?? "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({ ok: false, error: "La IA no devolvió JSON válido" });
    }

    // Respuesta al cliente (más adelante puedes validar con Zod)
    return res.status(200).json(parsed);

  } catch (err) {
    // Errores típicos: insufficient_quota, network, abort, etc.
    const msg = (err && err.message) ? err.message : "Error";
    return res.status(400).json({ ok: false, error: msg });
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

