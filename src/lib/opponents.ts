import { db } from "./db";
import { OpponentScouting } from "@/types/squad";

export async function listOpponents(squadId: string): Promise<OpponentScouting[]> {
  return db.opponents.where("squadId").equals(squadId).toArray();
}

export async function createOpponent(squadId: string, rival: string): Promise<OpponentScouting> {
  if (!rival || !rival.trim()) throw new Error("Nombre del rival obligatorio");
  const o: OpponentScouting = {
    id: genId(),
    squadId,
    rival: rival.trim(),
    sistemaHabitual: "",
    fortalezas: [],
    debilidades: [],
    jugadoresClave: [],
    patrones: [],
    notas: ""
  };
  await db.opponents.add(o);
  return o;
}

export async function updateOpponent(id: string, changes: Partial<OpponentScouting>): Promise<void> {
  await db.opponents.update(id, changes);
}

export async function deleteOpponent(id: string): Promise<void> {
  await db.opponents.delete(id);
}

function genId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2)
  );
}
