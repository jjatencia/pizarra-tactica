import { db } from "@/lib/db";
import { AIResponse } from "@/lib/ai/types";
import { CanvasTacticPack } from "@/types/canvas";

export interface TacticsCacheItem {
  id: string;
  createdAt: number;
  aiRaw: AIResponse;
  mapped: CanvasTacticPack[];
}

export async function putTacticsCache(item: TacticsCacheItem) {
  await (db as any).tactics_cache.put(item);
}

export async function getTacticsCache(id: string): Promise<TacticsCacheItem | undefined> {
  return (db as any).tactics_cache.get(id);
}
