import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './hooks/useBoardStore';
import { usePointerInteractions } from './hooks/usePointerInteractions';
// import { useZoomPan } from './hooks/useZoomPan'; // DISABLED
import { Pitch } from './components/Pitch';
import { Token } from './components/Token';
import { ArrowsLayer } from './components/ArrowsLayer';
import { TrajectoriesLayer } from './components/TrajectoriesLayer';
import { Toolbar } from './components/Toolbar';
import { PresetsPanel } from './components/PresetsPanel';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { PWADebugInfo } from './components/PWADebugInfo';
import { Team } from './types';
import { clampToField, snapToGrid } from './lib/geometry';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPresets, setShowPresets] = useState(false);
  
  const {
    tokens,
    arrows,
    trajectories,
    mode,
    trajectoryType,
    showFullField,
    gridSnap,
    selectedTokenId,

    addToken,
    selectArrow,
    updateArrow,
    selectTrajectory,
    updateTrajectory,
    resetView,
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
  
  // Zoom and pan setup - DISABLED to prevent accidental movement
  // const { attachWheelListener, attachTouchListeners } = useZoomPan(svgRef);
  
  // Pointer interactions
  const {
    handleTokenPointerDown,
    handleSVGPointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    isDragging,
    isDrawingTrajectory,
    trajectoryPreview,
  } = usePointerInteractions(svgRef, viewBoxWidth, fieldHeight);
  
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
  
  // Load saved state on mount and reset view
  useEffect(() => {
    load();
    resetView(); // Reset zoom and pan to initial position
  }, [load, resetView]);
  
  // Setup zoom/pan event listeners - DISABLED
  // useEffect(() => {
  //   if (!svgRef.current) return;
  //   
  //   const cleanupWheel = attachWheelListener(svgRef.current);
  //   const cleanupTouch = attachTouchListeners(svgRef.current);
  //   
  //   return () => {
  //     cleanupWheel();
  //     cleanupTouch();
  //   };
  // }, [attachWheelListener, attachTouchListeners]);
  
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
  
  // Calculate transform for zoom and pan - FIXED to prevent movement
  const transform = `translate(0, 0) scale(1)`;
  
  return (
    <div 
      ref={containerRef}
      className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden"
    >
      {/* Toolbar */}
      <Toolbar
        svgRef={svgRef}
        onAddToken={handleAddToken}
        onShowPresets={() => setShowPresets(true)}
      />
      
      {/* Main Board */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative">
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${viewBoxWidth} ${fieldHeight}`}
            className="border border-slate-700 rounded-lg bg-pitch-grass select-none"
            style={{
              touchAction: 'none', // Disable all touch gestures including zoom and pan
              cursor: mode === 'trajectory' ? 'crosshair' : 'default',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitTapHighlightColor: 'transparent'
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
                  stroke={trajectoryType === 'pass' ? '#8B5CF6' : '#F59E0B'}
                  strokeWidth="1.2"
                  strokeDasharray={trajectoryType === 'movement' ? '1.5,1' : undefined}

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
                  isDragging={isDragging && token.id === selectedTokenId}
                  isInteractionDisabled={mode === 'trajectory'}
                />
              ))}
            </g>
          </svg>
          
          {/* Zoom indicator - REMOVED since zoom is disabled */}
        </div>
      </div>
      
      {/* Presets Panel */}
      <PresetsPanel
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
      />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
      
      {/* PWA Debug Info */}
      <PWADebugInfo />
      
      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-sm text-slate-400 flex justify-between items-center">
        <div className="flex gap-4">
          <span>Modo: {mode === 'select' ? 'Mover Fichas' : `Trayectoria (${trajectoryType === 'pass' ? 'Pase' : 'Movimiento'})`}</span>
          <span>Fichas: {tokens.filter(t => t.team === 'red').length}R / {tokens.filter(t => t.team === 'blue').length}A</span>
          <span>Flechas: {arrows.length}</span>
          <span>Trayectorias: {trajectories.length}</span>
        </div>
        <div className="flex gap-4">
          {gridSnap && <span>📐 Rejilla</span>}
          <span>{showFullField ? '🏟️ Campo completo' : '⚽ Medio campo'}</span>
        </div>
      </div>
    </div>
  );
}

export default App;