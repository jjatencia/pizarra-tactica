import React, { useRef, useState } from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { exportSVGToPNG, downloadJSON } from '../lib/exportPng';
import { Team, ObjectType, DrawingMode, TokenSize } from '../types';
import clsx from 'clsx';

interface ToolbarProps {
  svgRef: React.RefObject<SVGSVGElement>;
  onAddToken: (team: Team, size: TokenSize) => void;
  onAddObject: (type: ObjectType, size: TokenSize) => void;
  onShowPresets: () => void;
  onShowFormations: () => void;
  drawColor: string;
  drawingMode: DrawingMode;
  canUndoDraw: boolean;
  canRedoDraw: boolean;
  onSetDrawColor: (color: string) => void;
  onSetDrawingMode: (mode: DrawingMode) => void;
  onUndoDraw: () => void;
  onRedoDraw: () => void;
  onClearCanvas: () => void;
  sizeSettings: Record<Team | 'ball' | 'cone' | 'minigoal', TokenSize>;
  onSizeChange: (key: Team | 'ball' | 'cone' | 'minigoal', size: TokenSize) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onPlayRecording: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  svgRef, 
  onAddToken,
  onAddObject,
  // onShowPresets, // Will be used later
  onShowFormations,
  drawColor,
  // drawLineStyle, // Not used with new mode system
  drawingMode,
  canUndoDraw,
  canRedoDraw,
  onSetDrawColor,
  // onSetDrawLineStyle, // Not used with new mode system
  onSetDrawingMode,
  onUndoDraw,
  onRedoDraw,
  onClearCanvas,
  sizeSettings,
  onSizeChange,
  isRecording,
  onToggleRecording,
  onPlayRecording,
}) => {
  
  const {
    // trajectoryType,
    // gridSnap,
    // showFullField,
    tokens,
    // setTrajectoryType,
    // toggleGridSnap,
    // toggleFullField,
    reset,
    // mirror,
    // undo,
    // redo,
    // canUndo,
    // canRedo,
    exportState,
    importState,
  } = useBoardStore();
  
  const redTokens = tokens.filter(t => t.team === 'red');
  const blueTokens = tokens.filter(t => t.team === 'blue');
  const greenTokens = tokens.filter(t => t.team === 'green');
  const yellowTokens = tokens.filter(t => t.team === 'yellow');

  const [menuTarget, setMenuTarget] = useState<(Team | 'ball' | 'cone' | 'minigoal') | null>(null);
  const longPressTimeout = useRef<number>();

  const startPress = (key: Team | 'ball' | 'cone' | 'minigoal') => {
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = window.setTimeout(() => {
      setMenuTarget(key);
    }, 1000);
  };

  const cancelPress = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = undefined;
    }
  };

  const handlePressEnd = (action: () => void) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = undefined;
      if (!menuTarget) action();
    }
  };

  const handleSizeSelect = (key: Team | 'ball' | 'cone' | 'minigoal', size: TokenSize) => {
    onSizeChange(key, size);
    setMenuTarget(null);
  };
  
  const handleExportPNG = async () => {
    if (svgRef.current) {
      try {
        await exportSVGToPNG(svgRef.current);
      } catch (error) {
        console.error('Error exporting PNG:', error);
      }
    }
  };
  
  const handleExportJSON = () => {
    const data = exportState();
    downloadJSON(data);
  };
  
  // const handleImportJSON = async () => {
  //   try {
  //     const data = await uploadJSON();
  //     importState(data);
  //   } catch (error) {
  //     console.error('Error importing JSON:', error);
  //   }
  // };

  // SVG Icons
  const BallIcon = () => (
    <svg viewBox="0 0 100 100" className="w-6 h-6">
      <circle cx="50" cy="50" r="45" fill="#fff" stroke="#000" strokeWidth="3"/>
      <path d="M50,5 A45,45 0 0,1 50,95 M50,5 A45,45 0 0,0 50,95 M5,50 A45,45 0 0,1 95,50 M5,50 A45,45 0 0,0 95,50" fill="none" stroke="#000" strokeWidth="2"/>
    </svg>
  );

  const ConeIcon = () => (
    <svg viewBox="0 0 100 100" className="w-6 h-6">
      <polygon points="50,10 20,90 80,90" fill="#FF7F50"/>
      <rect x="15" y="90" width="70" height="5" fill="#E65100"/>
    </svg>
  );

  const MiniGoalIcon = () => (
    <svg viewBox="0 0 100 100" className="w-7 h-7">
      <rect x="5" y="20" width="90" height="70" stroke="white" strokeWidth="6" fill="none"/>
      <line x1="5" y1="90" x2="95" y2="90" stroke="white" strokeWidth="6"/>
    </svg>
  );

  const RecordIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <circle cx="12" cy="12" r="8" fill="red" />
    </svg>
  );

  const PlayIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <polygon points="8,5 19,12 8,19" fill="white" />
    </svg>
  );



  const colorOptions = [
    { color: 'white', className: 'bg-white border-2 border-gray-400' },
    { color: '#EF4444', className: 'bg-red-500' },
    { color: '#3B82F6', className: 'bg-blue-500' },
    { color: '#22C55E', className: 'bg-green-500' },
    { color: '#EAB308', className: 'bg-yellow-500' },
    { color: 'transparent', className: 'bg-gray-800 border-2 border-gray-500', title: 'Borrador' },
  ];
  
  return (
    <>
    <header className="w-full bg-gray-900 p-2 shadow-lg flex items-center justify-between flex-wrap gap-2">
      {/* Left Section: Title and Team Buttons */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-green-400 hidden sm:block">Pizarra Táctica</h1>
        <button
          onPointerDown={() => startPress('red')}
          onPointerUp={() => handlePressEnd(() => onAddToken('red', sizeSettings.red))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          disabled={redTokens.length >= 11}
          className={clsx(
            "w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:bg-red-500 transition-colors",
            { 'opacity-50 cursor-not-allowed': redTokens.length >= 11 }
          )}
          title={`Rojas: ${redTokens.length}/11`}
        >
          +
        </button>
        <button
          onPointerDown={() => startPress('blue')}
          onPointerUp={() => handlePressEnd(() => onAddToken('blue', sizeSettings.blue))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          disabled={blueTokens.length >= 11}
          className={clsx(
            "w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:bg-blue-500 transition-colors",
            { 'opacity-50 cursor-not-allowed': blueTokens.length >= 11 }
          )}
          title={`Azules: ${blueTokens.length}/11`}
        >
          +
        </button>
        <button
          onPointerDown={() => startPress('green')}
          onPointerUp={() => handlePressEnd(() => onAddToken('green', sizeSettings.green))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          disabled={greenTokens.length >= 11}
          className={clsx(
            "w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:bg-green-500 transition-colors",
            { 'opacity-50 cursor-not-allowed': greenTokens.length >= 11 }
          )}
          title={`Verdes: ${greenTokens.length}/11`}
        >
          +
        </button>
        <button
          onPointerDown={() => startPress('yellow')}
          onPointerUp={() => handlePressEnd(() => onAddToken('yellow', sizeSettings.yellow))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          disabled={yellowTokens.length >= 11}
          className={clsx(
            "w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:bg-yellow-400 transition-colors",
            { 'opacity-50 cursor-not-allowed': yellowTokens.length >= 11 }
          )}
          title={`Amarillas: ${yellowTokens.length}/11`}
        >
          +
        </button>
      </div>

      {/* Center Section: Objects */}
      <div className="flex items-center gap-2 border-l border-r border-gray-700 px-3">
        <button
          className="control-btn"
          title="Añadir Balón"
          onPointerDown={() => startPress('ball')}
          onPointerUp={() => handlePressEnd(() => onAddObject('ball', sizeSettings.ball))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
        >
          <BallIcon />
        </button>
        <button
          className="control-btn"
          title="Añadir Cono"
          onPointerDown={() => startPress('cone')}
          onPointerUp={() => handlePressEnd(() => onAddObject('cone', sizeSettings.cone))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
        >
          <ConeIcon />
        </button>
        <button
          className="control-btn"
          title="Añadir Mini Portería"
          onPointerDown={() => startPress('minigoal')}
          onPointerUp={() => handlePressEnd(() => onAddObject('minigoal', sizeSettings.minigoal))}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
        >
          <MiniGoalIcon />
        </button>
      </div>

      {/* Drawing Tools */}
      <div className="flex items-center gap-2">
        <button 
          className={clsx('control-btn draw-style-btn', {
            'active': drawingMode === 'move'
          })}
          onClick={() => onSetDrawingMode('move')}
        >
          Mover
        </button>
        <button 
          className={clsx('control-btn draw-style-btn', {
            'active': drawingMode === 'pass'
          })}
          onClick={() => onSetDrawingMode('pass')}
        >
          Pase
        </button>
        <button 
          className={clsx('control-btn draw-style-btn', {
            'active': drawingMode === 'displacement'
          })}
          onClick={() => onSetDrawingMode('displacement')}
        >
          Desplazamiento
        </button>
        <div className="flex items-center gap-1">
          {colorOptions.map((option) => (
            <button
              key={option.color}
              className={clsx(
                `color-picker h-8 w-8 rounded-md ${option.className}`,
                {
                  'ring-2 ring-blue-400': drawColor === option.color
                }
              )}
              onClick={() => onSetDrawColor(option.color)}
              title={option.title}
            />
          ))}
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-2 border-l border-r border-gray-700 px-3">
        <button 
          className={clsx('control-btn', {
            'opacity-50 cursor-not-allowed': !canUndoDraw
          })}
          onClick={onUndoDraw}
          disabled={!canUndoDraw}
        >
          Deshacer
        </button>
        <button 
          className={clsx('control-btn', {
            'opacity-50 cursor-not-allowed': !canRedoDraw
          })}
          onClick={onRedoDraw}
          disabled={!canRedoDraw}
        >
          Rehacer
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        <a
          href="/equipo"
          className="control-btn"
        >
          Equipo
        </a>
        <button
          className="control-btn"
          onClick={onShowFormations}
        >
          Formaciones
        </button>
        <button 
          className="control-btn"
          onClick={handleExportJSON}
        >
          Exportar
        </button>
        <label className="control-btn cursor-pointer">
          Importar
          <input 
            type="file" 
            className="hidden" 
            accept=".json,.tactic"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const data = JSON.parse(event.target?.result as string);
                    importState(data);
                  } catch (error) {
                    console.error('Error importing file:', error);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }
            }}
          />
        </label>
        <button
          className="control-btn"
          onClick={handleExportPNG}
        >
          PNG
        </button>
        <button 
          className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-3 rounded transition-colors text-sm flex items-center justify-center"
          onClick={() => {
            reset(); // Clear tokens and trajectories
            onClearCanvas(); // Clear canvas drawings
          }}
        >
          Limpiar
        </button>
      </div>

      <div className="flex items-center gap-2 border-l border-r border-gray-700 px-3">
        <button
          className={clsx('control-btn', { 'bg-red-700': isRecording })}
          onClick={onToggleRecording}
          title="Grabar"
        >
          <RecordIcon />
        </button>
        <button
          className="control-btn"
          onClick={onPlayRecording}
          title="Play"
        >
          <PlayIcon />
        </button>
      </div>
    </header>
    {menuTarget && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setMenuTarget(null)}>
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-2" onClick={e => e.stopPropagation()}>
          <button className="control-btn" onClick={() => handleSizeSelect(menuTarget, 'large')}>Grande</button>
          <button className="control-btn" onClick={() => handleSizeSelect(menuTarget, 'medium')}>Mediano</button>
          <button className="control-btn" onClick={() => handleSizeSelect(menuTarget, 'small')}>Pequeño</button>
        </div>
      </div>
    )}
    </>
  );
};