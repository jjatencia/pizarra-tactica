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
import { Team, ObjectType, TokenSize } from './types';
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

  // Handle formation application
  const handleApplyFormation = useCallback((team: Team, formation: string) => {
    applyFormationByName(formation, team);
    
    // Automatically switch to move mode after applying formation
    setDrawingMode('move');
  }, [applyFormationByName, setDrawingMode]);

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
      />
    </div>
  );
}

export default App;