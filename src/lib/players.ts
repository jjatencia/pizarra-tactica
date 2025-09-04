import { db } from "./db";
import { Player } from "@/types/squad";
import { v4 as uuid } from "uuid";

export async function listPlayers(squadId: string): Promise<Player[]> {
  return db.players.where("squadId").equals(squadId).toArray();
}

export async function createPlayer(
  squadId: string,
  p: Omit<Player, "id" | "squadId">
): Promise<Player> {
  if (!p.nombre?.trim()) throw new Error("El nombre es obligatorio");
  if (!Number.isInteger(p.dorsal) || p.dorsal <= 0) throw new Error("Dorsal inválido");
  if (!p.posiciones?.length) throw new Error("Debe incluir al menos una posición");

  const existing = await db.players
    .where("squadId")
    .equals(squadId)
    .and((pl: Player) => pl.dorsal === p.dorsal)
    .first();
  if (existing) throw new Error(`El dorsal ${p.dorsal} ya está en uso en este equipo`);

  const nuevo: Player = { id: uuid(), squadId, ...p };
  await db.players.add(nuevo);
  return nuevo;
}

export async function updatePlayer(
  id: string,
  changes: Partial<Player>
): Promise<void> {
  await db.players.update(id, changes);
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
}
