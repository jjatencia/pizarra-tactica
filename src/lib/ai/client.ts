import { AIResponse } from "./types";
import { AIPayload } from "./payload";


export async function fetchAIResponse(payload: Partial<AIPayload>): Promise<AIResponse> {
  let res: Response;
  try {
    // Crear AbortController con timeout de 60 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    res = await fetch("/api/ai/tactics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      throw new Error("La IA tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw new Error(`Fallo de red al invocar la IA: ${err.message}`);
  }
  if (!res.ok) {
    let msg = `Fallo en IA (status ${res.status})`;
    let text = "";
    try {
      text = await res.text();
    } catch {
      /* ignore */
    }
    if (text) {
      try {
        const err = JSON.parse(text);
        if (err?.error) {
          msg = typeof err.error === "string" ? err.error : JSON.stringify(err.error);
        } else {
          msg = text;
        }
      } catch {
        msg = text;
      }
    }
    if (msg === `Fallo en IA (status ${res.status})` && res.status === 405) {
      msg = "Método HTTP no permitido al invocar la IA";
    }

    throw new Error(msg);
  }
  return await res.json();
}
