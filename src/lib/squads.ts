import { db } from "./db";
import { Squad } from "@/types/squad";

const CURRENT_SQUAD_KEY = "tactica.currentSquadId";

export async function listSquads(): Promise<Squad[]> {
  return db.squads.toArray();
}

export async function createSquad(nombre: string): Promise<Squad> {
  const s: Squad = { id: genId(), nombre: nombre.trim() };
  if (!s.nombre) throw new Error("El nombre es obligatorio");
  await db.squads.add(s);
  return s;
}

export async function renameSquad(id: string, nombre: string): Promise<void> {
  if (!nombre.trim()) throw new Error("Nombre inválido");
  await db.squads.update(id, { nombre: nombre.trim() });
}

export async function deleteSquad(id: string): Promise<void> {
  const count = await db.players.where("squadId").equals(id).count();
  if (count > 0) throw new Error("No puedes eliminar un equipo con jugadores");
  await db.squads.delete(id);
  const current = getCurrentSquadId();
  if (current === id) localStorage.removeItem(CURRENT_SQUAD_KEY);
}

export function setCurrentSquadId(id: string) {
  localStorage.setItem(CURRENT_SQUAD_KEY, id);
}

export function getCurrentSquadId(): string | null {
  return localStorage.getItem(CURRENT_SQUAD_KEY);
}

export async function ensureCurrentSquad(): Promise<string> {
  let id = getCurrentSquadId();
  if (id) return id;
  const all = await listSquads();
  if (all.length === 0) {
    const s = await createSquad("Equipo principal");
    setCurrentSquadId(s.id);
    return s.id;
  }
  setCurrentSquadId(all[0].id);
  return all[0].id;
}

function genId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2)
  );
}

