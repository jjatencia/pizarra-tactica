export type Foot = "diestro" | "zurdo" | "ambidiestro";
export type Position = "POR"|"LD"|"LI"|"DFC"|"MCD"|"MC"|"MCO"|"ED"|"EI"|"DC"|"SD";

export interface Player {
  id: string;
  squadId: string;
  nombre: string;
  dorsal: number;
  pie: Foot;
  posiciones: Position[];
  altura_cm?: number;
  velocidad?: number;
  resistencia?: number;
  pase?: number;
  regate?: number;
  tiro?: number;
  defensa?: number;
  estadoFisico?: number;
  notas?: string;
}

export interface Squad {
  id: string;
  nombre: string;
  categoria?: string;
  temporada?: string;
}

export interface OpponentScouting {
  id: string;
  squadId: string;
  rival: string;
  sistemaHabitual?: string;
  fortalezas: string[];
  debilidades: string[];
  jugadoresClave: string[];
  patrones: string[];
  notas?: string;
}

export interface MatchPlan {
  id: string;
  squadId: string;
  opponentId: string;
  fecha: string;
  objetivos: string[];
  recursos: string[];
  notas?: string;
  aiReportId?: string; // ID del informe generado por IA
  aiGeneratedAt?: number; // Timestamp de cuándo se generó
}
