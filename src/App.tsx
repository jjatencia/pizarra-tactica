import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './hooks/useBoardStore';
import { usePointerInteractions } from './hooks/usePointerInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import { useSimpleDrawing } from './hooks/useSimpleDrawing';
import { Pitch } from './components/Pitch';
import { Token } from './components/Token';
import { ArrowsLayer } from './components/ArrowsLayer';
import { TrajectoriesLayer } from './components/TrajectoriesLayer';
import { Toolbar } from './components/Toolbar';
import { PresetsPanel } from './components/PresetsPanel';
import { FormationsModal } from './components/FormationsModal';
import { TokenNumberModal } from './components/TokenNumberModal';
import { Team, ObjectType, TokenSize, Token as TokenType, Formation } from './types';
import { clampToField, snapToGrid } from './lib/geometry';
import clsx from 'clsx';
import { CanvasTacticPack, CanvasPrimitive } from './types/canvas';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPresets, setShowPresets] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenType | null>(null);
  const [sizeSettings, setSizeSettings] = useState<Record<Team | 'ball' | 'cone' | 'minigoal', TokenSize>>({
    red: 'medium',
    blue: 'medium',
    green: 'medium',
    yellow: 'medium',
    ball: 'medium',
    cone: 'medium',
    minigoal: 'medium',
  });
  // Removed canvas tap refs as double tap is not used for lines anymore
  
  const {
    tokens,
    arrows,
    trajectories,
    mode,
    zoom,
    pan,
    showFullField,
    gridSnap,

    addToken,
    addObject,
    applyFormation,
    applyFormationByName,
    selectArrow,
    updateArrow,
    selectTrajectory,
    updateTrajectory,
    updateToken,
    load,
    recording,
    startRecording,
    stopRecording,
    playTokenPaths,
  } = useBoardStore();
  
  // Field dimensions
  const fieldWidth = 105;
  const fieldHeight = 68;
  const viewBoxWidth = showFullField ? fieldWidth : fieldWidth / 2;
  
  // Calculate SVG dimensions to maintain aspect ratio
  const aspectRatio = viewBoxWidth / fieldHeight;
  
  // More accurate toolbar height calculation for PWA
  const toolbarHeight = 80; // Increased for PWA safe areas
  const safeAreaBottom = 34; // Typical safe area bottom on iPad
  const extraPadding = 20; // Extra padding for comfort
  
  const availableHeight = containerSize.height - toolbarHeight - safeAreaBottom - extraPadding;
  const availableWidth = containerSize.width - 32; // Account for container padding
  
  let svgWidth = availableWidth;
  let svgHeight = availableWidth / aspectRatio;
  
  // Ensure the field fits in available height with extra margin
  if (svgHeight > availableHeight) {
    svgHeight = availableHeight;
    svgWidth = availableHeight * aspectRatio;
  }
  
  // Zoom and pan setup
  const { attachWheelListener, attachTouchListeners } = useZoomPan(svgRef);
  
  // Pointer interactions
  const {
    handleTokenPointerDown,
    handleSVGPointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    // isDragging, // Not used with new canvas drawing
    isDrawingTrajectory,
    trajectoryPreview,
    selectionRect,
  } = usePointerInteractions(svgRef, viewBoxWidth, fieldHeight);

  // Canvas drawing
  const {
    // isDrawing, // Not used in current implementation
    color: drawColor,
    // lineStyle: drawLineStyle, // Not used with new mode system
    drawingMode,
    canUndo: canUndoDraw,
    canRedo: canRedoDraw,
    startDrawing,
    draw,
    endDrawing,
    undo: undoDraw,
    redo: redoDraw,
    setColor: setDrawColor,
    // setLineStyle: setDrawLineStyle, // Not used with new mode system
    setDrawingMode,
    clearCanvas,
  } = useSimpleDrawing(canvasRef);

  // Selector de jugadas IA en la pizarra
  const [aiPacks, setAiPacks] = useState<CanvasTacticPack[] | null>(null);
  const [showAIPackSelector, setShowAIPackSelector] = useState(false);
  const [selectedAIPackIdx, setSelectedAIPackIdx] = useState(0);
  
    // Handle container resize with PWA detection
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        // Detect if we're in PWA mode
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        
        let adjustedHeight = rect.height;
        
        if (isPWA) {
          // In PWA mode, account for safe areas and ensure field is fully visible
          const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0');
          const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
          
          // Use visual viewport if available (better for PWA)
          if (window.visualViewport) {
            adjustedHeight = window.visualViewport.height - safeAreaTop - safeAreaBottom;
          } else {
            adjustedHeight = window.innerHeight - safeAreaTop - safeAreaBottom;
          }
          
          console.log('📱 PWA Mode - Adjusted height:', adjustedHeight, 'Original:', rect.height);
        }
        
        setContainerSize({ width: rect.width, height: adjustedHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Listen for visual viewport changes (PWA specific)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
        window.visualViewport?.removeEventListener('resize', updateSize);
      };
    }
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    // Canvas initialization is handled by the useSimpleDrawing hook
  }, []);
  
  // Load saved state on mount
  useEffect(() => {
    load();
    
    // Check if there's a tactical pack to load from the AI report
    const tacticalPackData = sessionStorage.getItem("tactical_pack_to_load");
    if (tacticalPackData) {
      try {
        const pack = JSON.parse(tacticalPackData);
        loadTacticalPackToBoard(pack);
        // Reproducir animación basada en primitivas si existen
        try { playAISequence(pack); } catch (e) { console.warn('No se pudo reproducir la secuencia IA', e); }
        sessionStorage.removeItem("tactical_pack_to_load");
      } catch (error) {
        console.error("Error loading tactical pack:", error);
      }
    }

    // Cargar último set de jugadas para selector
    try {
      const packsRaw = sessionStorage.getItem('last_ai_packs');
      if (packsRaw) setAiPacks(JSON.parse(packsRaw));
    } catch {}
  }, [load]);
  
  // Setup zoom/pan event listeners
  useEffect(() => {
    if (!svgRef.current) return;
    
    const cleanupWheel = attachWheelListener(svgRef.current);
    const cleanupTouch = attachTouchListeners(svgRef.current);
    
    return () => {
      cleanupWheel();
      cleanupTouch();
    };
  }, [attachWheelListener, attachTouchListeners]);
  
  // Handle adding tokens
  const handleAddToken = useCallback((team: Team, size: TokenSize) => {
    // Add token at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addToken(team, position.x, position.y, 'player', size);
    
    // Automatically switch to move mode after adding a token
    setDrawingMode('move');
  }, [addToken, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap, setDrawingMode]);

  // Handle formation application from modal
  const handleApplyFormation = useCallback((team: Team, formation: string) => {
    applyFormationByName(formation, team, sizeSettings[team]);

    // Automatically switch to move mode after applying formation
    setDrawingMode('move');
  }, [applyFormationByName, setDrawingMode, sizeSettings]);

  // Handle formation application from presets panel
  const handlePresetFormation = useCallback((formation: Formation, team: Team) => {
    applyFormation(formation, team, sizeSettings[team]);
    setDrawingMode('move');
  }, [applyFormation, setDrawingMode, sizeSettings]);

  const handleEditNumber = useCallback((token: TokenType) => {
    setEditingToken(token);
  }, []);

  const handleSaveNumber = useCallback((newNumber: number) => {
    if (!editingToken) return;
    if (Number.isNaN(newNumber) || newNumber < 1 || newNumber > 99) {
      alert('Número inválido');
      return;
    }
    const teamTokens = tokens.filter(t => t.team === editingToken.team && t.id !== editingToken.id);
    if (teamTokens.some(t => t.number === newNumber)) {
      alert('Número ya utilizado en este equipo');
      return;
    }
    updateToken(editingToken.id, { number: newNumber });
    setEditingToken(null);
  }, [editingToken, tokens, updateToken]);

  const handleCloseEdit = useCallback(() => setEditingToken(null), []);

  // Handle adding objects
  const handleAddObject = useCallback((type: ObjectType, size: TokenSize) => {
    // Add object at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addObject(type, position.x, position.y, size);

    // Automatically switch to move mode after adding an object
    setDrawingMode('move');
  }, [addObject, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap, setDrawingMode]);

  const handleToggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const handlePlayRecording = useCallback(() => {
    playTokenPaths();
  }, [playTokenPaths]);

  // Function to load tactical pack to board
  const loadTacticalPackToBoard = useCallback((pack: CanvasTacticPack) => {
    console.log("🎯 Cargando situación táctica:", pack.titulo);
    
    // Clear the current board
    const { reset, addToken, addArrow, addTrajectory } = useBoardStore.getState();
    reset();
    
    // Load the tactical situation to the board
    pack.primitivas.forEach((primitive: CanvasPrimitive) => {
      const { tipo, puntos, equipo } = primitive;
      
      if (!puntos || puntos.length === 0) return;
      
      // Convert relative coordinates (0-1) to field coordinates
      const fieldWidth = 105; // meters
      const fieldHeight = 68; // meters
      
      const fieldPoints = puntos.map((p: any) => ({
        x: p.x * fieldWidth,
        y: p.y * fieldHeight
      }));
      
      switch (tipo) {
        case 'move':
        case 'arrow':
          if (fieldPoints.length >= 2) {
            addArrow(fieldPoints[0], fieldPoints[fieldPoints.length - 1]);
          }
          break;
          
        case 'marker':
          if (fieldPoints.length >= 1) {
            // Add a token at the marker position
            const team = equipo === 'propio' ? 'blue' : 'red';
            addToken(team, fieldPoints[0].x, fieldPoints[0].y, 'player', 'medium');
          }
          break;
          
        case 'curve':
          if (fieldPoints.length >= 2) {
            addTrajectory(fieldPoints, 'movement');
          }
          break;
      }
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Situación táctica "${pack.titulo}" cargada correctamente`);
    }, 500);
  }, []);

  // Reproducir animación IA: mueve fichas y balón siguiendo primitivas y tiempos
  const playAISequence = useCallback((pack: CanvasTacticPack) => {
    const store = useBoardStore.getState();
    store.clearTokenPaths();

    const fieldWidth = 105;
    const fieldHeight = 68;

    // Helper: encontrar ficha más cercana de un equipo a un punto
    const findNearestTokenId = (team: 'blue' | 'red', point: { x: number; y: number }) => {
      let minD = Infinity; let id: string | null = null;
      useBoardStore.getState().tokens
        .filter(t => t.type === 'player' && t.team === team)
        .forEach(t => {
          const d = Math.hypot(t.x - point.x, t.y - point.y);
          if (d < minD) { minD = d; id = t.id; }
        });
      return id;
    };

    // Asegurar balón
    let ballId: string | null = null;
    const ensureBallAt = (p: { x: number; y: number }) => {
      const existing = useBoardStore.getState().tokens.find(t => t.type === 'ball');
      if (existing) { ballId = existing.id; store.updateToken(existing.id, { x: p.x, y: p.y }); return existing.id; }
      store.addObject('ball', p.x, p.y, 'small');
      ballId = useBoardStore.getState().tokens.find(t => t.type === 'ball')?.id || null;
      return ballId;
    };

    // Crear fichas iniciales desde markers si no existen
    const markers = pack.primitivas.filter(p => p.tipo === 'marker');
    markers.forEach(m => {
      const pt = { x: m.puntos[0].x * fieldWidth, y: m.puntos[0].y * fieldHeight };
      const team = m.equipo === 'propio' ? 'blue' : 'red';
      // Evitar duplicar si ya hay una muy cerca
      const nearest = findNearestTokenId(team, pt);
      if (!nearest || (nearest && Math.hypot((useBoardStore.getState().tokens.find(t => t.id===nearest)!.x - pt.x), (useBoardStore.getState().tokens.find(t => t.id===nearest)!.y - pt.y)) > 5)) {
        store.addToken(team, pt.x, pt.y, 'player', 'medium');
      }
    });

    // Posición inicial del balón: inicio de la primera flecha
    const firstArrow = pack.primitivas.filter(p => p.tipo === 'arrow').sort((a,b)=>(a.tiempo||0)-(b.tiempo||0))[0];
    if (firstArrow) {
      const p0 = { x: firstArrow.puntos[0].x * fieldWidth, y: firstArrow.puntos[0].y * fieldHeight };
      ensureBallAt(p0);
    }

    // Construir paths por id
    const addPath = (id: string, from: {x:number;y:number}, to: {x:number;y:number}, steps = 30) => {
      for (let i=0;i<=steps;i++) {
        const t = i/steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        store.addTokenPathPoint(id, { x, y });
      }
    };

    const sorted = [...pack.primitivas].sort((a,b)=>(a.tiempo||0)-(b.tiempo||0));
    sorted.forEach(pr => {
      if (!pr.puntos || pr.puntos.length < 2) return;
      const from = { x: pr.puntos[0].x * fieldWidth, y: pr.puntos[0].y * fieldHeight };
      const to = { x: pr.puntos[1].x * fieldWidth, y: pr.puntos[1].y * fieldHeight };
      if (pr.tipo === 'move') {
        const team = pr.equipo === 'propio' ? 'blue' : 'red';
        const id = findNearestTokenId(team, from);
        if (id) addPath(id, from, to, 24);
      } else if (pr.tipo === 'arrow') {
        // Tratar flecha como pase: mueve el balón
        if (!ballId) ensureBallAt(from);
        if (ballId) addPath(ballId, from, to, 24);
      }
    });

    // Reproducir
    setTimeout(() => store.playTokenPaths(), 200);
  }, []);

  // Handle canvas pointer down - no double tap for lines
  const handleCanvasPointerDown = useCallback((e: any) => {
    if (drawingMode === 'move') return; // Don't handle canvas events in move mode
    
    console.log('🎨 Canvas tap - starting drawing');
    startDrawing(e);
  }, [startDrawing, drawingMode]);
  
  // Calculate transform for zoom and pan
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
  return (
    <div 
      ref={containerRef}
      className="bg-gray-800 text-white overflow-hidden"
      style={{ 
        height: '100dvh',
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: '"toolbar" "content"'
      }}
    >
      {/* Toolbar */}
      <div style={{ gridArea: 'toolbar', flexShrink: 0 }}>
        <Toolbar
        svgRef={svgRef}
        onAddToken={handleAddToken}
        onAddObject={handleAddObject}
        onShowPresets={() => setShowPresets(true)}
        onShowFormations={() => setShowFormations(true)}
        onOpenAIPackSelector={() => setShowAIPackSelector(true)}
        drawColor={drawColor}
        drawingMode={drawingMode}
        canUndoDraw={canUndoDraw}
        canRedoDraw={canRedoDraw}
        onSetDrawColor={setDrawColor}
        onSetDrawingMode={setDrawingMode}
        onUndoDraw={undoDraw}
        onRedoDraw={redoDraw}
        onClearCanvas={clearCanvas}
        sizeSettings={sizeSettings}
        onSizeChange={(key, size) => setSizeSettings(prev => ({ ...prev, [key]: size }))}
        isRecording={recording}
        onToggleRecording={handleToggleRecording}
        onPlayRecording={handlePlayRecording}
        />
      </div>
      
      {/* Main Content: Pitch */}
      <main 
        className="flex items-center justify-center p-2"
        style={{ 
          gridArea: 'content',
          minHeight: 0,
          height: '100%',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
      >
        <div id="board" className={clsx("shadow-2xl rounded-lg relative bg-gray-900 p-1", {
          'erase-mode': mode === 'erase'
        })} style={{ 
          touchAction: 'none',
          aspectRatio: '105/68',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}>
          <div id="pitch" className="pitch w-full h-full rounded-md relative">
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${viewBoxWidth} ${fieldHeight}`}
              className="w-full h-full select-none absolute top-0 left-0"
              style={{
                touchAction: 'none',
                cursor: mode === 'trajectory' ? 'crosshair' : 'default',
                pointerEvents: 'auto',
                zIndex: 1,
              }}
              onPointerDown={handleSVGPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
            <g transform={transform}>
              {/* Pitch */}
              <Pitch
                width={viewBoxWidth}
                height={fieldHeight}
                showFullField={showFullField}
              />
              
              {/* Arrows Layer */}
              <ArrowsLayer
                arrows={arrows}
                onArrowSelect={selectArrow}
                onArrowUpdate={updateArrow}
              />
              
              {/* Trajectories Layer */}
              <TrajectoriesLayer
                trajectories={trajectories}
                onTrajectorySelect={selectTrajectory}
                onTrajectoryUpdate={updateTrajectory}
              />
              

              
              {/* Trajectory preview while drawing */}
              {isDrawingTrajectory && trajectoryPreview.length > 1 && (
                <path
                  d={trajectoryPreview.reduce((path, point, index) => {
                    if (index === 0) return `M ${point.x} ${point.y}`;
                    return `${path} L ${point.x} ${point.y}`;
                  }, '')}
                  stroke="white"
                  strokeWidth="1.2"
                  strokeDasharray="3,2"
                  fill="none"
                  opacity="0.7"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {selectionRect && (
                <rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(251,191,36,0.1)"
                  stroke="#FBBF24"
                  strokeWidth={0.5}
                  strokeDasharray="4"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Tokens */}
              {tokens.map((token) => (
                <Token
                  key={token.id}
                  token={token}
                  fieldWidth={viewBoxWidth}
                  fieldHeight={fieldHeight}
                  onPointerDown={handleTokenPointerDown}
                  onEditNumber={handleEditNumber}
                />
              ))}
            </g>
            </svg>
            
            {/* Drawing Canvas - Above SVG */}
            <canvas 
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ 
                touchAction: 'none',
                zIndex: drawingMode === 'move' ? 1 : 10,
                pointerEvents: drawingMode === 'move' ? 'none' : 'auto',
                backgroundColor: 'transparent',
                cursor: drawColor === 'transparent' ? 'crosshair' : 'default'
              }}
              onMouseDown={(e) => {
                console.log('🖱️ Mouse down on canvas');
                handleCanvasPointerDown(e);
              }}
              onMouseMove={(e) => {
                draw(e);
              }}
              onMouseUp={() => {
                endDrawing();
              }}
              onTouchStart={(e) => {
                console.log('👆 Touch start on canvas');
                e.preventDefault();
                handleCanvasPointerDown(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                draw(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                endDrawing();
              }}
            />
            
            {/* Zoom indicator */}
            {zoom !== 1 && (
              <div className="absolute top-4 right-4 bg-slate-800 text-white px-2 py-1 rounded text-sm" style={{ zIndex: 3 }}>
                {Math.round(zoom * 100)}%
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Formations Modal */}
      <FormationsModal
        isOpen={showFormations}
        onClose={() => setShowFormations(false)}
        onApplyFormation={handleApplyFormation}
      />
      
      {/* Presets Panel */}
      <PresetsPanel
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        onApplyFormation={handlePresetFormation}
      />

      <TokenNumberModal
        isOpen={!!editingToken}
        currentNumber={editingToken?.number ?? 0}
        onClose={handleCloseEdit}
        onSave={handleSaveNumber}
      />

      {/* Selector de jugadas IA (dentro de la pizarra) */}
      {showAIPackSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAIPackSelector(false)} />
          <div className="relative z-10 bg-white text-black rounded-xl shadow-xl w-full max-w-xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Elegir jugada IA</h2>
              <button onClick={() => setShowAIPackSelector(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(aiPacks || []).map((p, idx) => (
                <label key={idx} className="flex items-start gap-3 p-3 rounded border hover:bg-gray-50">
                  <input
                    type="radio"
                    name="board-ia-pack"
                    className="mt-1"
                    checked={selectedAIPackIdx === idx}
                    onChange={() => setSelectedAIPackIdx(idx)}
                  />
                  <div>
                    <div className="font-medium">{p.titulo}</div>
                    <div className="text-sm text-gray-600">{p.instrucciones?.join(' • ')}</div>
                    <div className="text-xs text-gray-500">{p.primitivas.length} movimientos</div>
                  </div>
                </label>
              ))}
              {(!aiPacks || aiPacks.length === 0) && (
                <div className="text-sm text-gray-600">No hay jugadas recientes. Genera un informe en Planes.</div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowAIPackSelector(false)}>Cancelar</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  if (!aiPacks || aiPacks.length === 0) return;
                  const pack = aiPacks[selectedAIPackIdx];
                  loadTacticalPackToBoard(pack);
                  try { playAISequence(pack); } catch {}
                  setShowAIPackSelector(false);
                }}
              >
                Pintar y reproducir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
