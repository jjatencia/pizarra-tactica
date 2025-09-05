"use client";
import { useState } from "react";
import IAListener from "./tablero/IAListener";
import { CanvasTacticPack } from "@/types/canvas";

export default function TableroPage() {
  const [packs, setPacks] = useState<CanvasTacticPack[]>([]);

  function handlePaint(newPacks: CanvasTacticPack[]) {
    setPacks(newPacks);
    const primera = newPacks[0];
    if (primera) {
      // TODO: replace with real board drawing logic
      console.log("Pintando jugada:", primera.titulo, primera.primitivas);
    }
  }

  return (
    <div className="w-full h-full p-4 text-white">
      {/* Listener que recibe los datos generados por IA */}
      <IAListener onPaint={handlePaint} />
      {packs.length ? (
        <div>
          {packs.map((p, i) => (
            <div key={i} className="mb-4">
              <h2 className="text-lg font-semibold mb-2">{p.titulo}</h2>
              {p.instrucciones?.length > 0 && (
                <ul className="list-disc ml-5 text-sm mb-2">
                  {p.instrucciones.map((ins, idx) => (
                    <li key={idx}>{ins}</li>
                  ))}
                </ul>
              )}
              <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(p.primitivas, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center mt-10">Esperando jugada de IA...</p>
      )}
    </div>
  );
}
