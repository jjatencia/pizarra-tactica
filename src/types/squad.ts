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
