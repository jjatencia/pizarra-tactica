export type Foot = "diestro" | "zurdo" | "ambidiestro";
export type Position = "POR"|"LD"|"LI"|"DFC"|"MCD"|"MC"|"MCO"|"ED"|"EI"|"DC"|"SD";

export interface Player {
  id: string;          // uuid v4
  nombre: string;
  dorsal: number;      // entero > 0
  pie: Foot;
  posiciones: Position[]; // al menos 1
  altura_cm?: number;
  velocidad?: number;     // opcional 0..100
  notas?: string;
}

export interface Squad {
  id: string;         // uuid
  nombre: string;     // p.ej. "Senior A 24/25"
  jugadores: Player[]; // (nota: luego players irán en tabla propia)
}
