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

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Falta configurar la variable OPENAI_API_KEY" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const payload = await req.json();
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(payload);

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: text || aiRes.statusText }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const json = await aiRes.json();
    const content = json.choices?.[0]?.message?.content;
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

