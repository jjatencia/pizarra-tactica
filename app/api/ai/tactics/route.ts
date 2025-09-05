import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIResponseSchema } from "@/lib/ai/types";
import { simpleHash } from "@/lib/ai/hash";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompt";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

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

    const aiRaw = await callAIReal(system, user);

    const validated = AIResponseSchema.parse(aiRaw);

    cache.set(key, validated);
    return NextResponse.json(validated, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Error" }, { status: 400 });
  }
}

async function callAIReal(system: string, user: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY en variables de entorno");
  }

  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: { type: "json_object" }
  });

  const content = res.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}
