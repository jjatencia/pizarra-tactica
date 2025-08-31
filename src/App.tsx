import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './hooks/useBoardStore';
import { usePointerInteractions } from './hooks/usePointerInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import { useCanvasDrawing } from './hooks/useCanvasDrawing';
import { Pitch } from './components/Pitch';
import { Token } from './components/Token';
import { ArrowsLayer } from './components/ArrowsLayer';
import { TrajectoriesLayer } from './components/TrajectoriesLayer';
import { Toolbar } from './components/Toolbar';
import { PresetsPanel } from './components/PresetsPanel';
import { FormationsModal } from './components/FormationsModal';
import { Team, ObjectType } from './types';
import { clampToField, snapToGrid } from './lib/geometry';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPresets, setShowPresets] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
  const lastCanvasTapRef = useRef<number>(0);
  
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
    applyFormationByName,
    selectArrow,
    updateArrow,
    selectTrajectory,
    updateTrajectory,
    load,
  } = useBoardStore();
  
  // Field dimensions
  const fieldWidth = 105;
  const fieldHeight = 68;
  const viewBoxWidth = showFullField ? fieldWidth : fieldWidth / 2;
  
  // Calculate SVG dimensions to maintain aspect ratio
  const aspectRatio = viewBoxWidth / fieldHeight;
  const toolbarHeight = 60; // Approximate toolbar height
  const availableHeight = containerSize.height - toolbarHeight;
  const availableWidth = containerSize.width;
  
  let svgWidth = availableWidth;
  let svgHeight = availableWidth / aspectRatio;
  
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
  } = usePointerInteractions(svgRef, viewBoxWidth, fieldHeight);

  // Canvas drawing
  const {
    isDrawing,
    color: drawColor,
    lineStyle: drawLineStyle,
    canUndo: canUndoDraw,
    canRedo: canRedoDraw,
    startDrawing,
    draw,
    endDrawing,
    undo: undoDraw,
    redo: redoDraw,
    setColor: setDrawColor,
    setLineStyle: setDrawLineStyle,
    // clearCanvas, // Commented out as not used yet
    resizeCanvas,
    saveHistory,
    handleDoubleTapClear,
  } = useCanvasDrawing(canvasRef);
  
  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
      resizeCanvas();
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, [resizeCanvas]);

  // Initialize canvas
  useEffect(() => {
    resizeCanvas();
    saveHistory(); // Save initial blank state
  }, [resizeCanvas, saveHistory]);
  
  // Load saved state on mount
  useEffect(() => {
    load();
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
  const handleAddToken = useCallback((team: Team) => {
    // Add token at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addToken(team, position.x, position.y);
  }, [addToken, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap]);

  // Handle formation application
  const handleApplyFormation = useCallback((team: Team, formation: string) => {
    applyFormationByName(formation, team);
  }, [applyFormationByName]);

  // Handle adding objects
  const handleAddObject = useCallback((type: ObjectType) => {
    // Add object at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addObject(type, position.x, position.y);
  }, [addObject, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap]);

  // Handle canvas double tap for clearing last drawing
  const handleCanvasPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const now = Date.now();
    const timeDiff = now - lastCanvasTapRef.current;
    
    if (timeDiff < 300) {
      // Double tap detected - undo last drawing
      handleDoubleTapClear(e);
      return;
    }
    
    lastCanvasTapRef.current = now;
    startDrawing(e);
  }, [handleDoubleTapClear, startDrawing]);
  
  // Calculate transform for zoom and pan
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
  return (
    <div 
      ref={containerRef}
      className="bg-gray-800 text-white overflow-hidden h-screen flex flex-col"
    >
      {/* Toolbar */}
      <Toolbar
        svgRef={svgRef}
        onAddToken={handleAddToken}
        onAddObject={handleAddObject}
        onShowPresets={() => setShowPresets(true)}
        onShowFormations={() => setShowFormations(true)}
        drawColor={drawColor}
        drawLineStyle={drawLineStyle}
        canUndoDraw={canUndoDraw}
        canRedoDraw={canRedoDraw}
        onSetDrawColor={setDrawColor}
        onSetDrawLineStyle={setDrawLineStyle}
        onUndoDraw={undoDraw}
        onRedoDraw={redoDraw}
      />
      
      {/* Main Content: Pitch */}
      <main className="flex-1 flex items-center justify-center p-2">
        <div id="board" className="w-full h-full aspect-[105/68] max-w-full max-h-full mx-auto shadow-2xl rounded-lg relative bg-gray-900 p-1">
          <div id="pitch" className="pitch w-full h-full rounded-md relative">
            {/* Drawing Canvas */}
            <canvas 
              ref={canvasRef}
              className="drawing-canvas"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={draw}
              onPointerUp={endDrawing}
              onPointerLeave={endDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const pointerEvent = new PointerEvent('pointerdown', {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  pointerId: 1,
                  pointerType: 'touch'
                });
                handleCanvasPointerDown(pointerEvent as any);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const pointerEvent = new PointerEvent('pointermove', {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  pointerId: 1,
                  pointerType: 'touch'
                });
                draw(pointerEvent as any);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                endDrawing();
              }}
            />
            
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${viewBoxWidth} ${fieldHeight}`}
              className="w-full h-full select-none absolute top-0 left-0"
              style={{
                touchAction: 'none', // Disable all touch actions including pinch-zoom
                cursor: mode === 'trajectory' ? 'crosshair' : 'default',
                pointerEvents: isDrawing ? 'none' : 'auto',
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
              
              {/* Tokens */}
              {tokens.map((token) => (
                <Token
                  key={token.id}
                  token={token}
                  fieldWidth={viewBoxWidth}
                  fieldHeight={fieldHeight}
                  onPointerDown={handleTokenPointerDown}
                />
              ))}
            </g>
            </svg>
            
            {/* Zoom indicator */}
            {zoom !== 1 && (
              <div className="absolute top-4 right-4 bg-slate-800 text-white px-2 py-1 rounded text-sm">
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
      />
    </div>
  );
}

export default App;