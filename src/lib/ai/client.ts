import { AIResponse } from "./types";

export async function fetchAIResponse(payload: any): Promise<AIResponse> {
  const res = await fetch("/api/ai/tactics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:"Error"}));
    const msg = err.error || `Fallo en IA (status ${res.status})`;
    throw new Error(msg);
  }
  return await res.json();
}
