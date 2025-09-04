export type CanvasTeam = "propio" | "rival" | "mixto";
export type CanvasPrimitiveType = "move" | "arrow" | "curve" | "zone" | "press" | "marker";

export interface CanvasPoint { x: number; y: number; }

export interface CanvasStyle {
  discontinua?: boolean;
  grosor?: number;
  etiqueta?: string;
}

export interface CanvasPrimitiveBase {
  id: string;
  tipo: CanvasPrimitiveType;
  equipo: CanvasTeam;
  puntos: CanvasPoint[];
  estilo?: CanvasStyle;
  tiempo?: number;
}

export interface CanvasPrimitive extends CanvasPrimitiveBase {
  targets?: string[];
}

export interface CanvasTacticPack {
  titulo: string;
  instrucciones: string[];
  primitivas: CanvasPrimitive[];
}
