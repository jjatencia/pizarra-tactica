"use client";
import { useEffect } from "react";
import { getTacticsCache } from "@/lib/ai/cache";
import { CanvasTacticPack } from "@/types/canvas";

export default function IAListener({ onPaint }: { onPaint: (packs: CanvasTacticPack[]) => void }) {
  useEffect(() => {
    (async () => {
      const ref = sessionStorage.getItem("tactics_to_paint");
      if (!ref) return;
      try {
        const { id } = JSON.parse(ref);
        const item = await getTacticsCache(id);
        if (item) {
          onPaint(item.mapped);
        }
      } catch {
        // ignore
      }
    })();
  }, [onPaint]);

  return null;
}
