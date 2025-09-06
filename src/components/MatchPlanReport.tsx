"use client";
import { useState, useRef, useEffect } from "react";
import { CanvasTacticPack } from "@/types/canvas";
import { AIResponse } from "@/lib/ai/types";

interface MatchPlanReportProps {
  aiData: AIResponse;
  tacticPacks: CanvasTacticPack[];
  onClose: () => void;
  onLoadToBoard: (pack: CanvasTacticPack) => void;
}

export default function MatchPlanReport({ aiData, tacticPacks, onClose, onLoadToBoard }: MatchPlanReportProps) {
  const [selectedPlay, setSelectedPlay] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 overflow-y-auto">
      <div className="min-h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold">📋 Plan de Partido Generado por IA</h1>
              <p className="text-gray-400">Análisis táctico completo y situaciones de juego</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* Formation & Lineup */}
          <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              ⚽ Alineación Recomendada - {aiData.alineacion.formation}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3 text-green-400">🟢 Titulares</h3>
                <div className="space-y-2">
                  {aiData.alineacion.titularidad.map((player: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                      <span className="font-medium">{player.playerId}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-600 text-xs rounded font-medium">{player.pos}</span>
                        {player.rol && <span className="text-xs text-gray-400">{player.rol}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 text-orange-400">🟠 Banquillo</h3>
                <div className="space-y-2">
                  {aiData.alineacion.banquillo.map((playerId: string, idx: number) => (
                    <div key={idx} className="bg-gray-700/30 rounded-lg p-3">
                      <span className="text-gray-300">{playerId}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {aiData.alineacion.instrucciones.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium mb-3 text-purple-400">📋 Instrucciones Generales</h3>
                <ul className="space-y-2">
                  {aiData.alineacion.instrucciones.map((instruction: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span className="text-gray-200">{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Game Phases */}
          <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              🎯 Fases del Juego
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "🛡️ Defensa", items: aiData.planPartido.faseDefensa, color: "red" },
                { title: "⚔️ Ataque", items: aiData.planPartido.faseAtaque, color: "green" },
                { title: "🔄 Trans. Ofensiva", items: aiData.planPartido.transicionOf, color: "blue" },
                { title: "🔄 Trans. Defensiva", items: aiData.planPartido.transicionDef, color: "orange" }
              ].map((phase, idx) => (
                <div key={idx} className={`bg-${phase.color}-900/20 border border-${phase.color}-700/50 rounded-lg p-4`}>
                  <h3 className={`font-medium mb-3 text-${phase.color}-400`}>{phase.title}</h3>
                  <ul className="space-y-1 text-sm">
                    {phase.items.map((item: string, itemIdx: number) => (
                      <li key={itemIdx} className="text-gray-300">• {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Tactical Situations */}
          <section className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              🎮 Situaciones Tácticas Interactivas
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Situation List */}
              <div className="space-y-3">
                {tacticPacks.map((pack, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPlay(idx)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedPlay === idx
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-700/50 border-gray-600 text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium mb-1">{pack.titulo}</div>
                    <div className="text-sm text-gray-400">
                      {pack.primitivas.length} movimientos tácticos
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Play Details */}
              {tacticPacks[selectedPlay] && (
                <div className="lg:col-span-2">
                  <TacticalSituationViewer
                    pack={tacticPacks[selectedPlay]}
                    onLoadToBoard={() => onLoadToBoard(tacticPacks[selectedPlay])}
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TacticalSituationViewer({ pack, onLoadToBoard }: { pack: CanvasTacticPack; onLoadToBoard: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas setup
    const width = 400;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Draw field
    drawTacticalField(ctx, width, height);
    
    // Draw tactical primitives
    drawTacticalPrimitives(ctx, pack.primitivas, width, height);
    
  }, [pack]);

  return (
    <div className="bg-gray-700/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">{pack.titulo}</h3>
        <button
          onClick={onLoadToBoard}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium flex items-center gap-2"
        >
          🎯 Cargar en Pizarra
        </button>
      </div>

      {/* Tactical Preview */}
      <div className="relative mb-4">
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-600 rounded-lg bg-green-800/20"
        />
        <div className="absolute top-2 right-2 bg-black/50 rounded px-2 py-1 text-xs">
          Vista previa
        </div>
      </div>

      {/* Instructions */}
      {pack.instrucciones.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 text-blue-400">📝 Instrucciones:</h4>
          <ul className="space-y-1">
            {pack.instrucciones.map((instruction, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function drawTacticalField(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Field background
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, width, height);

  // Field lines
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  
  // Outer boundary
  ctx.strokeRect(10, 10, width - 20, height - 20);
  
  // Center line
  ctx.beginPath();
  ctx.moveTo(width / 2, 10);
  ctx.lineTo(width / 2, height - 10);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 30, 0, 2 * Math.PI);
  ctx.stroke();

  // Goal areas (simplified)
  const goalHeight = 20;
  
  // Left goal area
  ctx.strokeRect(10, height / 2 - goalHeight / 2, 20, goalHeight);
  
  // Right goal area  
  ctx.strokeRect(width - 30, height / 2 - goalHeight / 2, 20, goalHeight);
}

function drawTacticalPrimitives(ctx: CanvasRenderingContext2D, primitives: any[], width: number, height: number) {
  primitives.forEach((primitive) => {
    const { tipo, puntos, equipo, estilo } = primitive;
    
    if (!puntos || puntos.length === 0) return;
    
    // Convert relative coordinates to canvas coordinates
    const canvasPoints = puntos.map((p: any) => ({
      x: (p.x * (width - 20)) + 10,
      y: (p.y * (height - 20)) + 10
    }));

    // Set colors based on team
    const color = equipo === 'propio' ? '#3b82f6' : equipo === 'rival' ? '#ef4444' : '#8b5cf6';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    
    switch (tipo) {
      case 'move':
      case 'arrow':
        drawArrow(ctx, canvasPoints, estilo?.discontinua);
        break;
      case 'zone':
        drawZone(ctx, canvasPoints);
        break;
      case 'marker':
        drawMarker(ctx, canvasPoints[0]);
        break;
    }
  });
}

function drawArrow(ctx: CanvasRenderingContext2D, points: any[], dashed = false) {
  if (points.length < 2) return;
  
  ctx.lineWidth = 3;
  if (dashed) {
    ctx.setLineDash([5, 5]);
  } else {
    ctx.setLineDash([]);
  }
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.stroke();
  
  // Draw arrowhead at the end
  const lastPoint = points[points.length - 1];
  const secondLastPoint = points[points.length - 2] || points[0];
  
  const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
  const arrowLength = 10;
  
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(
    lastPoint.x - arrowLength * Math.cos(angle - Math.PI / 6),
    lastPoint.y - arrowLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(
    lastPoint.x - arrowLength * Math.cos(angle + Math.PI / 6),
    lastPoint.y - arrowLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawZone(ctx: CanvasRenderingContext2D, points: any[]) {
  if (points.length < 3) return;
  
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
}

function drawMarker(ctx: CanvasRenderingContext2D, point: any) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}