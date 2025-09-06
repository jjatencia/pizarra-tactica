import { Player, OpponentScouting, MatchPlan } from "@/types/squad";

export interface AIPayloadContext {
  objetivos: string[];
  recursos: string[];
  formacionesPermitidas: ("4-3-3"|"4-4-2"|"3-5-2"|"4-2-3-1"|"3-4-3"|"5-3-2"|"personalizada")[];
}

export interface AIPayloadConstraints {
  minutosMaxJugadores?: Record<string, number>;
  lesionados?: string[];
  evitarPosiciones?: { playerId: string; pos: string }[];
}

export interface AIPayload {
  squadId: string;
  players: Player[];
  opponent: OpponentScouting;
  plan: MatchPlan;
  context: AIPayloadContext;
  constraints?: AIPayloadConstraints;
  prompt?: string; // For tactical sequence generation
  boardState?: any; // For board state context
}
