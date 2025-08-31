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
import { Team, ObjectType } from './types';
import { clampToField, snapToGrid } from './lib/geometry';
import clsx from 'clsx';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPresets, setShowPresets] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
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
    eraseAtPoint,
    clearCanvas,
  } = useSimpleDrawing(canvasRef);
  
  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    // Canvas initialization is handled by the useSimpleDrawing hook
  }, []);
  
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

  // Handle canvas pointer down - no double tap for lines
  const handleCanvasPointerDown = useCallback((e: any) => {
    if (drawingMode === 'move') return; // Don't handle canvas events in move mode
    
    // In erase mode, erase at the touched point
    if (mode === 'erase') {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      let clientX, clientY;
      
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      console.log('🗑️ Canvas erase at:', x, y);
      eraseAtPoint(x, y);
      return;
    }
    
    console.log('🎨 Canvas tap - starting drawing');
    startDrawing(e);
  }, [startDrawing, drawingMode, mode, eraseAtPoint, canvasRef]);
  
  // Calculate transform for zoom and pan
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
  return (
    <div 
      ref={containerRef}
      className="bg-gray-800 text-white overflow-hidden flex flex-col"
      style={{ 
        height: '100dvh',
        minHeight: '100dvh'
      }}
    >
      {/* Toolbar */}
      <Toolbar
        svgRef={svgRef}
        onAddToken={handleAddToken}
        onAddObject={handleAddObject}
        onShowPresets={() => setShowPresets(true)}
        onShowFormations={() => setShowFormations(true)}
        drawColor={drawColor}
        drawingMode={drawingMode}
        canUndoDraw={canUndoDraw}
        canRedoDraw={canRedoDraw}
        onSetDrawColor={setDrawColor}
        onSetDrawingMode={setDrawingMode}
        onUndoDraw={undoDraw}
        onRedoDraw={redoDraw}
        onClearCanvas={clearCanvas}
      />
      
      {/* Main Content: Pitch */}
      <main className="flex-1 flex items-center justify-center p-2">
        <div id="board" className={clsx("w-full mx-auto shadow-2xl rounded-lg relative bg-gray-900 p-1", {
          'erase-mode': mode === 'erase'
        })} style={{ 
          touchAction: 'none',
          aspectRatio: '105/68',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: 'calc(100% - env(safe-area-inset-bottom) - 1rem)'
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
            
            {/* Drawing Canvas - Above SVG */}
            <canvas 
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ 
                touchAction: 'none',
                zIndex: drawingMode === 'move' ? 1 : 10,
                pointerEvents: drawingMode === 'move' ? 'none' : 'auto',
                backgroundColor: 'transparent',
                cursor: mode === 'erase' ? 'crosshair' : 'default'
              }}
              onMouseDown={(e) => {
                console.log('🖱️ Mouse down on canvas');
                handleCanvasPointerDown(e);
              }}
              onMouseMove={(e) => {
                if (mode !== 'erase') draw(e);
              }}
              onMouseUp={() => {
                if (mode !== 'erase') endDrawing();
              }}
              onTouchStart={(e) => {
                console.log('👆 Touch start on canvas');
                e.preventDefault();
                handleCanvasPointerDown(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (mode !== 'erase') draw(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (mode !== 'erase') endDrawing();
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
      />
    </div>
  );
}

export default App;