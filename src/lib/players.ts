import { db } from "./db";
import { Player } from "@/types/squad";
import { v4 as uuid } from "uuid";

export async function listPlayers(): Promise<Player[]> {
  return db.players.toArray();
}

export async function createPlayer(p: Omit<Player,"id">): Promise<Player> {
  if (!p.nombre?.trim()) throw new Error("El nombre es obligatorio");
  if (!Number.isInteger(p.dorsal) || p.dorsal <= 0) throw new Error("Dorsal inválido");
  if (!p.posiciones?.length) throw new Error("Debe incluir al menos una posición");

  const existing = await db.players.where("dorsal").equals(p.dorsal).first();
  if (existing) throw new Error(`El dorsal ${p.dorsal} ya está en uso`);

  const nuevo: Player = { id: uuid(), ...p };
  await db.players.add(nuevo);
  return nuevo;
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
}
