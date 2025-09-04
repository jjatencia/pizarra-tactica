import Dexie, { Table } from "dexie";
import { Player, Squad, OpponentScouting, MatchPlan } from "@/types/squad";

export class AppDB extends Dexie {
  players!: Table<Player, string>;
  squads!: Table<Squad, string>;
  opponents!: Table<OpponentScouting, string>;
  matchPlans!: Table<MatchPlan, string>;
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
        // Asigna squad por defecto a jugadores antiguos si fuera necesario
        let usedTemp = false;
        await players.toCollection().modify((p: any) => {
          if (!p.squadId) { p.squadId = "__DEFAULT_TEMP__"; usedTemp = true; }
        });
        if (usedTemp) {
          const defId = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
          await squads.add({ id: defId, nombre: "Equipo principal" });
          await players.toCollection().modify((p: any) => {
            if (p.squadId === "__DEFAULT_TEMP__") p.squadId = defId;
          });
        }
      });

    // v3: nueva tabla opponents
    this.version(3).stores({
      squads: "id, nombre",
      players: "id, squadId, dorsal, nombre",
      opponents: "id, squadId, rival"
    });

    // v4: matchPlans
    this.version(4).stores({
      squads: "id, nombre",
      players: "id, squadId, dorsal, nombre",
      opponents: "id, squadId, rival",
      matchPlans: "id, squadId, opponentId, fecha"
    });
  }
}

export const db = new AppDB();
