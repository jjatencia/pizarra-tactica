import { AIPayload } from "./payload";

export function buildSystemPrompt(): string {
  return (
    "Eres un asistente táctico de fútbol. Devuelve SOLO JSON válido que cumpla el esquema. " +
    "Si faltan datos, asume de forma conservadora y explica suposiciones en 'instrucciones'."
  );
}

export function buildUserPrompt(payload: AIPayload): string {
  const minimal = {
    squadId: payload.squadId,
    players: payload.players.map(p => ({
      id: p.id, nombre: p.nombre, dorsal: p.dorsal, pie: p.pie,
      posiciones: p.posiciones, velocidad: p.velocidad, resistencia: p.resistencia,
      pase: p.pase, regate: p.regate, tiro: p.tiro, defensa: p.defensa, estadoFisico: p.estadoFisico
    })),
    opponent: payload.opponent,
    plan: { fecha: payload.plan.fecha, objetivos: payload.plan.objetivos, recursos: payload.plan.recursos, notas: payload.plan.notas },
    context: payload.context,
    constraints: payload.constraints || {}
  };
  return JSON.stringify(minimal);
}
