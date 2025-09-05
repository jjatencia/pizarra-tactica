import { AIResponse } from "./types";

export async function fetchAIResponse(payload: any): Promise<AIResponse> {
  const res = await fetch("/api/ai/tactics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = `Fallo en IA (status ${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {
      /* ignore json parse errors */
    }
    if (msg === `Fallo en IA (status ${res.status})` && res.status === 405) {
      msg = "Método HTTP no permitido al invocar la IA";
    }

    throw new Error(msg);
  }
  return await res.json();
}
