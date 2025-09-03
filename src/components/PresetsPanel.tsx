import React from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { formations, getFormationForTeam } from '../lib/formations';
import { Team } from '../types';
import clsx from 'clsx';

interface PresetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ isOpen, onClose }) => {
  const { applyFormation, tokens } = useBoardStore();

  const redTokens = tokens.filter(t => t.team === 'red');
  const blueTokens = tokens.filter(t => t.team === 'blue');
  const greenTokens = tokens.filter(t => t.team === 'green');
  const yellowTokens = tokens.filter(t => t.team === 'yellow');
  
  const handleApplyFormation = (formationName: string, team: Team) => {
    const formation = formations.find(f => f.name === formationName);
    if (formation) {
      const teamFormation = getFormationForTeam(formation, team);
      applyFormation(teamFormation, team);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Formaciones</h2>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          {formations.map((formation) => (
            <div key={formation.name} className="border border-slate-700 rounded-lg p-4">
              <h3 className="font-semibold mb-3">{formation.name}</h3>
              
              <div className="flex gap-2 flex-wrap mb-2">
                <button
                  className={clsx('btn btn-team-blue text-sm flex-1', {
                    'opacity-50 cursor-not-allowed': blueTokens.length > 0
                  })}
                  onClick={() => handleApplyFormation(formation.name, 'blue')}
                  disabled={blueTokens.length > 0}
                >
                  Aplicar Azules
                </button>
                <button
                  className={clsx('btn btn-team-red text-sm flex-1', {
                    'opacity-50 cursor-not-allowed': redTokens.length > 0
                  })}
                  onClick={() => handleApplyFormation(formation.name, 'red')}
                  disabled={redTokens.length > 0}
                >
                  Aplicar Rojas
                </button>
                <button
                  className={clsx('btn btn-team-green text-sm flex-1', {
                    'opacity-50 cursor-not-allowed': greenTokens.length > 0
                  })}
                  onClick={() => handleApplyFormation(formation.name, 'green')}
                  disabled={greenTokens.length > 0}
                >
                  Aplicar Verdes
                </button>
                <button
                  className={clsx('btn btn-team-yellow text-sm flex-1', {
                    'opacity-50 cursor-not-allowed': yellowTokens.length > 0
                  })}
                  onClick={() => handleApplyFormation(formation.name, 'yellow')}
                  disabled={yellowTokens.length > 0}
                >
                  Aplicar Amarillas
                </button>
              </div>

              {(blueTokens.length > 0 || redTokens.length > 0 || greenTokens.length > 0 || yellowTokens.length > 0) && (
                <p className="text-xs text-slate-400">
                  Elimina las fichas existentes antes de aplicar una formación
                </p>
              )}
              
              {/* Mini field preview */}
              <div className="mt-3 bg-slate-900 rounded p-2">
                <svg
                  viewBox="0 0 105 68"
                  className="w-full h-16 border border-slate-600 rounded"
                >
                  {/* Field */}
                  <rect width="105" height="68" fill="#1B5E20" stroke="white" strokeWidth="0.5" />
                  <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="white" strokeWidth="0.3" />
                  <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="white" strokeWidth="0.3" />
                  
                  {/* Formation tokens */}
                  {formation.tokens.map((token, index) => (
                    <circle
                      key={index}
                      cx={token.x}
                      cy={token.y}
                      r="1.5"
                      fill="#3B82F6"
                      stroke="white"
                      strokeWidth="0.2"
                    />
                  ))}
                </svg>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-700">
          <h3 className="font-semibold mb-2">Instrucciones</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• Las formaciones se aplican desde la perspectiva del equipo azul</li>
            <li>• Los equipos verde y amarillo usan la misma orientación que el azul</li>
            <li>• El equipo rojo se coloca automáticamente en posición espejo</li>
            <li>• Limpia el campo antes de aplicar una nueva formación</li>
          </ul>
        </div>
      </div>
    </div>
  );
};