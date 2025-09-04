import { z } from "zod";

export const PositionEnum = z.enum(["POR","LD","LI","DFC","MCD","MC","MCO","ED","EI","DC","SD"]);
export const FormationEnum = z.enum(["4-3-3","4-4-2","3-5-2","4-2-3-1","3-4-3","5-3-2","personalizada"]);

export const LineupPlayerSchema = z.object({
  playerId: z.string(),
  pos: PositionEnum,
  rol: z.string().optional()
});

export const LineupSuggestionSchema = z.object({
  formation: FormationEnum,
  titularidad: z.array(LineupPlayerSchema).length(11),
  banquillo: z.array(z.string()).default([]),
  instrucciones: z.array(z.string()).default([])
});

export const PointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const TacticPrimitiveSchema = z.object({
  id: z.string(),
  tipo: z.enum(["move","arrow","curve","zone","press","marker"]),
  equipo: z.enum(["propio","rival","mixto"]).default("propio"),
  targets: z.array(z.string()).default([]),
  puntos: z.array(PointSchema).min(1),
  estilo: z.object({
    discontinua: z.boolean().optional(),
    grosor: z.number().optional(),
    etiqueta: z.string().optional()
  }).optional(),
  tiempo: z.number().optional()
});

export const AIStrategySchema = z.object({
  titulo: z.string(),
  objetivo: z.string().default(""),
  instrucciones: z.array(z.string()).default([]),
  primitivas: z.array(TacticPrimitiveSchema)
});

export const AIResponseSchema = z.object({
  alineacion: LineupSuggestionSchema,
  planPartido: z.object({
    faseDefensa: z.array(z.string()).default([]),
    faseAtaque: z.array(z.string()).default([]),
    transicionOf: z.array(z.string()).default([]),
    transicionDef: z.array(z.string()).default([])
  }),
  jugadas: z.array(AIStrategySchema).min(1)
});

export type AIResponse = z.infer<typeof AIResponseSchema>;
