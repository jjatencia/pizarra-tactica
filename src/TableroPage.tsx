"use client";
import { useState } from "react";
import IAListener from "./tablero/IAListener";
import MatchPlanReport from "./components/MatchPlanReport";
import { CanvasTacticPack } from "@/types/canvas";
import { AIResponse } from "@/lib/ai/types";
import { getTacticsCache } from "@/lib/ai/cache";

export default function TableroPage() {
  const [packs, setPacks] = useState<CanvasTacticPack[]>([]);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  const [showReport, setShowReport] = useState(false);
  // Store functions are used via useBoardStore.getState() when needed

  async function handlePaint(newPacks: CanvasTacticPack[]) {
    setPacks(newPacks);
    
    // Get the full AI data from cache
    const ref = sessionStorage.getItem("tactics_to_paint");
    if (ref) {
      try {
        const { id } = JSON.parse(ref);
        const cacheItem = await getTacticsCache(id);
        if (cacheItem && cacheItem.aiRaw) {
          setAiData(cacheItem.aiRaw);
          setShowReport(true);
        }
      } catch (error) {
        console.error("Error loading AI data:", error);
      }
    }
  }

  function handleLoadToBoard(pack: CanvasTacticPack) {
    // Store the tactical pack in sessionStorage for the main board
    sessionStorage.setItem("tactical_pack_to_load", JSON.stringify(pack));
    
    // Navigate to the main tactical board
    window.location.href = "/";
    
    console.log("✅ Navegando a la pizarra principal con:", pack.titulo);
  }

  function handleCloseReport() {
    setShowReport(false);
    // Clear the session storage
    sessionStorage.removeItem("tactics_to_paint");
  }

  return (
    <div className="w-full h-full">
      {/* Listener que recibe los datos generados por IA */}
      <IAListener onPaint={handlePaint} />
      
      {showReport && aiData && packs.length > 0 ? (
        <MatchPlanReport
          aiData={aiData}
          tacticPacks={packs}
          onClose={handleCloseReport}
          onLoadToBoard={handleLoadToBoard}
        />
      ) : (
        <div className="w-full h-full p-4 text-white">
          {packs.length > 0 ? (
            <div className="text-center mt-10">
              <p className="text-gray-400">Cargando informe de plan de partido...</p>
            </div>
          ) : (
            <p className="text-center mt-10 text-gray-400">Esperando jugada de IA...</p>
          )}
        </div>
      )}
    </div>
  );
}
