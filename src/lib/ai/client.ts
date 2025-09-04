import { AIResponse } from "./types";

export async function fetchAIResponse(payload: any): Promise<AIResponse> {
  const res = await fetch("/api/ai/tactics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({error:"Error"}));
    throw new Error(err.error || "Fallo en IA");
  }
  return await res.json();
}
