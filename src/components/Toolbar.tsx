import React from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { exportSVGToPNG, downloadJSON } from '../lib/exportPng';
import { Team, ObjectType, DrawingMode } from '../types';
import clsx from 'clsx';

interface ToolbarProps {
  svgRef: React.RefObject<SVGSVGElement>;
  onAddToken: (team: Team) => void;
  onAddObject: (type: ObjectType) => void;
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
  onClearCanvas
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



  const colorOptions = [
    { color: 'white', className: 'bg-white border-2 border-gray-400' },
    { color: '#FBBF24', className: 'bg-yellow-400' },
    { color: '#EF4444', className: 'bg-red-500' },
    { color: '#3B82F6', className: 'bg-blue-500' },
    { color: 'transparent', className: 'bg-gray-800 border-2 border-gray-500', title: 'Borrador' },
  ];
  
  return (
    <header className="w-full bg-gray-900 p-2 shadow-lg flex items-center justify-between flex-wrap gap-2">
      {/* Left Section: Title and Team Buttons */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-green-400 hidden sm:block">Pizarra Táctica</h1>
        <button 
          onClick={() => onAddToken('red')}
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
          onClick={() => onAddToken('blue')}
          disabled={blueTokens.length >= 11}
          className={clsx(
            "w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md hover:bg-blue-500 transition-colors",
            { 'opacity-50 cursor-not-allowed': blueTokens.length >= 11 }
          )}
          title={`Azules: ${blueTokens.length}/11`}
        >
          +
        </button>
      </div>
      
      {/* Center Section: Objects */}
      <div className="flex items-center gap-2 border-l border-r border-gray-700 px-3">
        <button 
          className="control-btn"
          title="Añadir Balón"
          onClick={() => onAddObject('ball')}
        >
          <BallIcon />
        </button>
        <button 
          className="control-btn"
          title="Añadir Cono"
          onClick={() => onAddObject('cone')}
        >
          <ConeIcon />
        </button>
        <button 
          className="control-btn"
          title="Añadir Mini Portería"
          onClick={() => onAddObject('minigoal')}
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
    </header>
  );
};