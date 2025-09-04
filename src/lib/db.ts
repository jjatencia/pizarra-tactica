import Dexie, { Table } from "dexie";
import { Player, Squad } from "@/types/squad";

export class AppDB extends Dexie {
  players!: Table<Player, string>;
  squads!: Table<Squad, string>;
  constructor() {
    super("tacticaDB");
    // v1: solo jugadores
    this.version(1).stores({
      players: "id, dorsal, nombre"
    });
    // v2: añadimos squads y los índices por squad
    this.version(2)
      .stores({
        squads: "id, nombre",
        players: "id, squadId, dorsal, nombre"
      })
      .upgrade(async (tx: any) => {
        const squads = tx.table("squads") as Table<Squad, string>;
        const players = tx.table("players") as Table<Player, string>;
        const defaultId =
          (globalThis as any).crypto?.randomUUID?.() ??
          (await import("uuid")).v4();
        await squads.add({ id: defaultId, nombre: "Equipo principal" });
        await players.toCollection().modify((p: any) => {
          if (!p.squadId) p.squadId = defaultId;
        });
      });
  }
}

export const db = new AppDB();
