"use client";
import IAListener from "./tablero/IAListener";
import { CanvasTacticPack } from "@/types/canvas";

export default function TableroPage() {
  function handlePaint(packs: CanvasTacticPack[]) {
    const primera = packs[0];
    if (primera) {
      // TODO: replace with real board drawing logic
      console.log("Pintando jugada:", primera.titulo, primera.primitivas);
    }
  }

  return (
    <div className="w-full h-full">
      {/* Aquí iría tu componente de tablero */}
      <IAListener onPaint={handlePaint} />
    </div>
  );
}
