import Dexie, { Table } from "dexie";
import { Player } from "@/types/squad";

export class AppDB extends Dexie {
  players!: Table<Player, string>;
  constructor() {
    super("tacticaDB");
    this.version(1).stores({
      players: "id, dorsal, nombre" // índice por dorsal para comprobar duplicados
    });
  }
}

export const db = new AppDB();
