import React, { useState } from 'react';
import { useBoardStore } from '../hooks/useBoardStore';
import { formations, getFormationForTeam } from '../lib/formations';
import { Team } from '../types';

interface PresetsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ isOpen, onClose }) => {
  const { applyFormation } = useBoardStore();
  const [team, setTeam] = useState<Team>('blue');
  const [formationName, setFormationName] = useState<string>(formations[0]?.name || '4-3-3');

  if (!isOpen) return null;

  const handleApply = () => {
    const formation = formations.find(f => f.name === formationName);
    if (!formation) return;
    const teamFormation = getFormationForTeam(formation, team);
    applyFormation(teamFormation, team);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Seleccionar Formación</h2>
        <div className="mb-4">
          <label className="block mb-2">Equipo:</label>
          <select value={team} onChange={(e) => setTeam(e.target.value as Team)} className="w-full bg-gray-700 rounded p-2">
            <option value="red">Equipo Rojo</option>
            <option value="blue">Equipo Azul</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block mb-2">Formación:</label>
          <select value={formationName} onChange={(e) => setFormationName(e.target.value)} className="w-full bg-gray-700 rounded p-2">
            {formations.map(f => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-4">
          <button className="bg-gray-600 hover:bg-gray-500 py-2 px-4 rounded" onClick={onClose}>Cancelar</button>
          <button className="bg-green-600 hover:bg-green-500 py-2 px-4 rounded" onClick={handleApply}>Aplicar</button>
        </div>
      </div>
    </div>
  );
};