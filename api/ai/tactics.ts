import OpenAI from "openai";
import { AIResponseSchema } from "../../src/lib/ai/types";
import { buildSystemPrompt, buildUserPrompt } from "../../src/lib/ai/prompt";

export const config = {
  runtime: "nodejs"
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const payload = await req.json();
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(payload);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message?.content;
    if (!content) {
      return new Response(JSON.stringify({ error: "Empty response from OpenAI" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON from OpenAI" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const parsed = AIResponseSchema.safeParse(data);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(parsed.data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

