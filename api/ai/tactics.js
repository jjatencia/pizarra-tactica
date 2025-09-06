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

    // Sistema de prompt mejorado para generar situaciones tácticas
    const system = `Eres un entrenador de fútbol profesional. Analiza el equipo y rival para crear un plan táctico completo.

DEBES responder SOLO con JSON válido siguiendo EXACTAMENTE esta estructura:

{
  "alineacion": {
    "formation": "4-3-3",
    "titularidad": [
      {"playerId": "García", "pos": "POR", "rol": "Portero"},
      {"playerId": "Martínez", "pos": "DFC", "rol": "Defensa Central"},
      {"playerId": "López", "pos": "DFC", "rol": "Defensa Central"},
      {"playerId": "Rodríguez", "pos": "LD", "rol": "Lateral Derecho"},
      {"playerId": "Fernández", "pos": "LI", "rol": "Lateral Izquierdo"},
      {"playerId": "González", "pos": "MCD", "rol": "Mediocentro Defensivo"},
      {"playerId": "Sánchez", "pos": "MC", "rol": "Mediocentro"},
      {"playerId": "Pérez", "pos": "MCO", "rol": "Mediocentro Ofensivo"},
      {"playerId": "Díaz", "pos": "ED", "rol": "Extremo Derecho"},
      {"playerId": "Moreno", "pos": "EI", "rol": "Extremo Izquierdo"},
      {"playerId": "Jiménez", "pos": "DC", "rol": "Delantero Centro"}
    ],
    "banquillo": ["Ruiz", "Herrera"],
    "instrucciones": ["Presión alta tras pérdida", "Juego combinativo"]
  },
  "planPartido": {
    "faseDefensa": ["Bloque medio-alto", "Pressing coordinado"],
    "faseAtaque": ["Juego por bandas", "Remates desde fuera del área"],
    "transicionOf": ["Salida rápida por bandas"],
    "transicionDef": ["Repliegue inmediato"]
  },
  "jugadas": [
    {
      "titulo": "Ataque por banda derecha",
      "objetivo": "Crear superioridad numérica",
      "instrucciones": ["Lateral sube", "Extremo se abre", "Mediocampista apoya"],
      "primitivas": [
        {
          "id": "move1",
          "tipo": "marker",
          "equipo": "propio",
          "targets": [],
          "puntos": [{"x": 0.8, "y": 0.2}],
          "estilo": {"etiqueta": "LD"}
        },
        {
          "id": "arrow1",
          "tipo": "arrow",
          "equipo": "propio", 
          "targets": [],
          "puntos": [{"x": 0.8, "y": 0.2}, {"x": 0.9, "y": 0.1}],
          "estilo": {"discontinua": false}
        }
      ]
    }
  ]
}`;

    const allPlayers = payload?.players || [];
    const contextInfo = {
      squad: payload?.squadId || "Equipo",
      players: allPlayers.map(p => p.nombre || p.id),
      opponent: payload?.opponent?.rival || "Rival",
      objectives: payload?.plan?.objetivos || ["ganar"],
      resources: payload?.plan?.recursos || ["presión alta"],
      formations: payload?.context?.formacionesPermitidas || ["4-3-3", "4-4-2"]
    };

    const user = `Crea un plan táctico para:
- Equipo: ${contextInfo.squad}
- Jugadores disponibles: ${contextInfo.players.join(', ')}
- Rival: ${contextInfo.opponent}
- Objetivos: ${contextInfo.objectives.join(', ')}
- Recursos: ${contextInfo.resources.join(', ')}
- Formaciones permitidas: ${contextInfo.formations.join(', ')}

IMPORTANTE: Usa los nombres reales de los jugadores disponibles en la alineación titular y banquillo. 
NO uses nombres genéricos como "Jugador1", "Jugador2", etc.

Genera 3 situaciones tácticas diferentes con primitivas gráficas (coordenadas entre 0 y 1).`;

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

    // Validación básica de la respuesta
    if (!parsed.alineacion || !parsed.planPartido || !parsed.jugadas) {
      return res.status(502).json({ ok: false, error: "La IA no devolvió el formato esperado" });
    }

    // Asegurar que titularidad tenga 11 jugadores
    if (!parsed.alineacion.titularidad || parsed.alineacion.titularidad.length !== 11) {
      // Completar la alineación si está incompleta usando jugadores disponibles
      const currentPlayers = parsed.alineacion.titularidad || [];
      const missingCount = 11 - currentPlayers.length;
      const positions = ["POR","DFC","DFC","LD","LI","MCD","MC","MCO","ED","EI","DC"];
      const availablePlayers = allPlayers.slice(0); // Copia de jugadores disponibles
      
      for (let i = 0; i < missingCount && i < positions.length; i++) {
        const playerIndex = currentPlayers.length;
        const playerName = availablePlayers[playerIndex]?.nombre || `Jugador${playerIndex + 1}`;
        currentPlayers.push({
          playerId: playerName,
          pos: positions[playerIndex] || "MC",
          rol: "Jugador"
        });
      }
      
      parsed.alineacion.titularidad = currentPlayers.slice(0, 11);
    }

    // Asegurar que hay al menos una jugada
    if (!parsed.jugadas || parsed.jugadas.length === 0) {
      parsed.jugadas = [{
        titulo: "Jugada táctica básica",
        objetivo: "Mantener posesión",
        instrucciones: ["Pases cortos", "Mantener formación"],
        primitivas: [{
          id: "basic1",
          tipo: "marker",
          equipo: "propio",
          targets: [],
          puntos: [{ x: 0.5, y: 0.5 }],
          estilo: { etiqueta: "Centro" }
        }]
      }];
    }

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

