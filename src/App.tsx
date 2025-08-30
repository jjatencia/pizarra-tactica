import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './hooks/useBoardStore';
import { usePointerInteractions } from './hooks/usePointerInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import { Pitch } from './components/Pitch';
import { Token } from './components/Token';
import { ArrowsLayer } from './components/ArrowsLayer';
import { TrajectoriesLayer } from './components/TrajectoriesLayer';
import { Toolbar } from './components/Toolbar';
import { PresetsPanel } from './components/PresetsPanel';
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
    zoom,
    pan,
    showFullField,
    gridSnap,

    addToken,
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
    isDragging,
    isCreatingArrow,
    isDrawingTrajectory,
    trajectoryPreview,
    arrowPreview,
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
  
  // Calculate transform for zoom and pan
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
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
              touchAction: isDragging || isDrawingTrajectory ? 'none' : 'pan-x pan-y pinch-zoom',
              cursor: mode === 'arrow' ? 'crosshair' : mode === 'trajectory' ? 'crosshair' : 'default',
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
              
              {/* Arrow preview while creating */}
              {isCreatingArrow && arrowPreview && (
                <line
                  x1={arrowPreview.from.x}
                  y1={arrowPreview.from.y}
                  x2={arrowPreview.to.x}
                  y2={arrowPreview.to.y}
                  stroke="white"
                  strokeWidth="1"
                  strokeDasharray="4,2"
                  opacity="0.7"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              
              {/* Trajectory preview while drawing */}
              {isDrawingTrajectory && trajectoryPreview.length > 1 && (
                <path
                  d={trajectoryPreview.reduce((path, point, index) => {
                    if (index === 0) return `M ${point.x} ${point.y}`;
                    return `${path} L ${point.x} ${point.y}`;
                  }, '')}
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="4,2"
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
      
      {/* Presets Panel */}
      <PresetsPanel
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
      />
      
      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-sm text-slate-400 flex justify-between items-center">
        <div className="flex gap-4">
          <span>Modo: {mode === 'select' ? 'Selección' : mode === 'arrow' ? 'Flecha' : 'Trayectoria'}</span>
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