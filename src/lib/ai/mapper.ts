import { AIResponse } from "@/lib/ai/types";
import { CanvasTacticPack, CanvasPrimitive } from "@/types/canvas";

export function mapAIToCanvas(ai: AIResponse): CanvasTacticPack[] {
  return ai.jugadas.map((j: any) => ({
    titulo: j.titulo,
    instrucciones: j.instrucciones || [],
    primitivas: j.primitivas.map((p: any) => ({
      id: p.id,
      tipo: p.tipo,
      equipo: p.equipo,
      puntos: p.puntos,
      estilo: p.estilo,
      tiempo: p.tiempo,
      targets: p.targets
    }) as CanvasPrimitive)
  }));
}
