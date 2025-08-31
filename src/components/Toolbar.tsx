import React from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { exportSVGToPNG, downloadJSON, uploadJSON } from '../lib/exportPng';
import { Team } from '../types';
import clsx from 'clsx';

interface ToolbarProps {
  svgRef: React.RefObject<SVGSVGElement>;
  onAddToken: (team: Team) => void;
  onShowPresets: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ svgRef, onAddToken, onShowPresets }) => {
  const {
    trajectoryType,
    gridSnap,
    showFullField,
    tokens,
    setMode,
    setTrajectoryType,
    toggleGridSnap,
    toggleFullField,
    reset,
    mirror,
    undo,
    redo,
    canUndo,
    canRedo,
    exportState,
    importState,
    addDecoration,
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
  
  const handleImportJSON = async () => {
    try {
      const data = await uploadJSON();
      importState(data);
    } catch (error) {
      console.error('Error importing JSON:', error);
    }
  };
  
  return (
    <div className="toolbar">
      {/* Title + Add Tokens */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-emerald-400 hidden sm:block">Pizarra Táctica</h1>
        <button
          className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md transition-colors',
            redTokens.length >= 11 ? 'bg-red-600 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500')}
          onClick={() => onAddToken('red')}
          disabled={redTokens.length >= 11}
          title={`Añadir Roja (${redTokens.length}/11)`}
        >
          +
        </button>
        <button
          className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md transition-colors',
            blueTokens.length >= 11 ? 'bg-blue-600 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500')}
          onClick={() => onAddToken('blue')}
          disabled={blueTokens.length >= 11}
          title={`Añadir Azul (${blueTokens.length}/11)`}
        >
          +
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* Ball/Cone/MiniGoal */}
      <div className="flex items-center gap-2">
        <button className="control-btn" title="Añadir Balón" onClick={() => {
          if (!svgRef.current) return; const rect = svgRef.current.viewBox.baseVal; addDecoration('ball', rect.width / 2, rect.height / 2);
        }}>⚽</button>
        <button className="control-btn" title="Añadir Cono" onClick={() => {
          if (!svgRef.current) return; const rect = svgRef.current.viewBox.baseVal; addDecoration('cone', rect.width / 2, rect.height / 2);
        }}>▲</button>
        <button className="control-btn" title="Añadir Mini Portería" onClick={() => {
          if (!svgRef.current) return; const rect = svgRef.current.viewBox.baseVal; addDecoration('minigoal', rect.width / 2, rect.height / 2);
        }}>▭</button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />

      {/* Trajectory Type - always visible, switches to trajectory mode */}
      <div className="flex items-center gap-1">
        <button
          className={clsx('draw-style-btn text-sm', {
            'active': trajectoryType === 'pass'
          })}
          onClick={() => {
            setMode('trajectory');
            setTrajectoryType('pass');
          }}
        >
          Pase
        </button>
        <button
          className={clsx('draw-style-btn text-sm', {
            'active': trajectoryType === 'movement'
          })}
          onClick={() => {
            setMode('trajectory');
            setTrajectoryType('movement');
          }}
        >
          Movimiento
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* View Options */}
      <div className="flex gap-1">
        <button
          className={clsx('btn btn-secondary text-sm', {
            'btn-active': showFullField
          })}
          onClick={toggleFullField}
        >
          {showFullField ? '🏟️ Campo' : '⚽ Medio'}
        </button>
        <button
          className={clsx('btn btn-secondary text-sm', {
            'btn-active': gridSnap
          })}
          onClick={toggleGridSnap}
        >
          📐 Rejilla
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* Actions */}
      <div className="flex gap-1">
        <button
          className="btn btn-secondary text-sm"
          onClick={onShowPresets}
        >
          📋 Formaciones
        </button>
        <button
          className="btn btn-secondary text-sm"
          onClick={mirror}
          disabled={tokens.length === 0}
        >
          🔄 Espejar
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          className={clsx('btn btn-secondary text-sm', {
            'opacity-50 cursor-not-allowed': !canUndo()
          })}
          onClick={undo}
          disabled={!canUndo()}
        >
          ↶ Deshacer
        </button>
        <button
          className={clsx('btn btn-secondary text-sm', {
            'opacity-50 cursor-not-allowed': !canRedo()
          })}
          onClick={redo}
          disabled={!canRedo()}
        >
          ↷ Rehacer
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* File Operations */}
      <div className="flex gap-1">
        <button
          className="btn btn-secondary text-sm"
          onClick={handleExportPNG}
        >
          📷 PNG
        </button>
        <button
          className="btn btn-secondary text-sm"
          onClick={handleExportJSON}
        >
          💾 Exportar
        </button>
        <button
          className="btn btn-secondary text-sm"
          onClick={handleImportJSON}
        >
          📂 Importar
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* Reset */}
      <button
        className="btn bg-red-600 hover:bg-red-700 text-white text-sm"
        onClick={reset}
      >
        🗑️ Limpiar
      </button>
    </div>
  );
};