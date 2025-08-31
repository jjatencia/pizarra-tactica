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
    mode,
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
      {/* Mode Selection */}
      <div className="flex gap-1">
        <button
          className={clsx('btn btn-secondary text-sm', {
            'btn-active': mode === 'select'
          })}
          onClick={() => setMode('select')}
        >
          ✋ Seleccionar
        </button>
        <button
          className={clsx('btn btn-secondary text-sm', {
            'btn-active': mode === 'trajectory'
          })}
          onClick={() => setMode('trajectory')}
        >
          ✏️ Trayectoria
        </button>
      </div>
      
      {/* Divider */}
      <div className="w-px h-6 bg-slate-600" />
      
      {/* Add Tokens */}
      <div className="flex gap-1">
        <button
          className={clsx('btn btn-team-red text-sm', {
            'opacity-50 cursor-not-allowed': redTokens.length >= 11
          })}
          onClick={() => onAddToken('red')}
          disabled={redTokens.length >= 11}
          title={`Rojas: ${redTokens.length}/11`}
        >
          🔴 ({redTokens.length}/11)
        </button>
        <button
          className={clsx('btn btn-team-blue text-sm', {
            'opacity-50 cursor-not-allowed': blueTokens.length >= 11
          })}
          onClick={() => onAddToken('blue')}
          disabled={blueTokens.length >= 11}
          title={`Azules: ${blueTokens.length}/11`}
        >
          🔵 ({blueTokens.length}/11)
        </button>
      </div>
      
      {/* Trajectory Type (only show in trajectory mode) */}
      {mode === 'trajectory' && (
        <>
          <div className="w-px h-6 bg-slate-600" />
          <div className="flex gap-1">
            <button
              className={clsx('btn btn-secondary text-sm', {
                'btn-active': trajectoryType === 'pass'
              })}
              onClick={() => setTrajectoryType('pass')}
            >
              ┅ Pase
            </button>
            <button
              className={clsx('btn btn-secondary text-sm', {
                'btn-active': trajectoryType === 'movement'
              })}
              onClick={() => setTrajectoryType('movement')}
            >
              ━ Movimiento
            </button>
          </div>
        </>
      )}
      
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