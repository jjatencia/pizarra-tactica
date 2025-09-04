import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIResponseSchema } from "@/lib/ai/types";
import { simpleHash } from "@/lib/ai/hash";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";

const AIPayloadSchema = z.object({
  squadId: z.string(),
  players: z.array(z.any()).min(1),
  opponent: z.any(),
  plan: z.object({ fecha: z.string(), objetivos: z.array(z.string()), recursos: z.array(z.string()), notas: z.string().optional() }),
  context: z.object({
    objetivos: z.array(z.string()),
    recursos: z.array(z.string()),
    formacionesPermitidas: z.array(z.enum(["4-3-3","4-4-2","3-5-2","4-2-3-1","3-4-3","5-3-2","personalizada"]))
  }),
  constraints: z.any().optional()
});

const cache = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = AIPayloadSchema.parse(json);

    const key = simpleHash(JSON.stringify(parsed));
    if (cache.has(key)) {
      return NextResponse.json(cache.get(key), { status: 200 });
    }

    const system = buildSystemPrompt();
    const user = buildUserPrompt(parsed);

    const aiRaw = await callAIStub(system, user);

    const validated = AIResponseSchema.parse(aiRaw);

    cache.set(key, validated);
    return NextResponse.json(validated, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Error" }, { status: 400 });
  }
}

async function callAIStub(system: string, user: string) {
  const payload = JSON.parse(user);
  const titulares = payload.players.slice(0, 11).map((p: any, i: number) => ({ playerId: p.id, pos: i===0? "POR" : (i<5? "DFC" : i<9? "MC" : "DC") }));
  const banquillo = payload.players.slice(11).map((p: any) => p.id);
  return {
    alineacion: {
      formation: "4-2-3-1",
      titularidad: titulares,
      banquillo,
      instrucciones: ["Stub: sustituye por IA real"]
    },
    planPartido: {
      faseDefensa: ["Bloque medio"],
      faseAtaque: ["Progresión por bandas"],
      transicionOf: ["Contragolpe"],
      transicionDef: ["Repliegue"]
    },
    jugadas: [
      {
        titulo: "Salida básica",
        objetivo: "Superar primera línea",
        instrucciones: ["Pivote entre centrales"],
        primitivas: [
          { id: "a1", tipo: "arrow", equipo: "propio", targets: [titulares[1]?.playerId], puntos: [{x:0.2,y:0.8},{x:0.4,y:0.8}] }
        ]
      }
    ]
  };
}
