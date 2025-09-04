import { db } from "./db";
import { MatchPlan } from "@/types/squad";

export async function listPlans(squadId: string, opponentId: string): Promise<MatchPlan[]> {
  return db.matchPlans.where({ squadId, opponentId }).toArray();
}

export async function createPlan(
  squadId: string,
  opponentId: string,
  fecha: string
): Promise<MatchPlan> {
  const p: MatchPlan = {
    id: genId(),
    squadId,
    opponentId,
    fecha,
    objetivos: [],
    recursos: [],
    notas: ""
  };
  await db.matchPlans.add(p);
  return p;
}

export async function updatePlan(id: string, changes: Partial<MatchPlan>): Promise<void> {
  await db.matchPlans.update(id, changes);
}

export async function deletePlan(id: string): Promise<void> {
  await db.matchPlans.delete(id);
}

function genId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2)
  );
}
