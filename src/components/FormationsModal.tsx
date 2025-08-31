import React, { useState } from 'react';
import { Team } from '../types';

interface FormationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFormation: (team: Team, formation: string) => void;
}

const formations = {
  '4-3-3': {
    red: [[10, 50], [25, 20], [25, 40], [25, 60], [25, 80], [45, 30], [45, 50], [45, 70], [65, 25], [65, 50], [65, 75]],
    blue: [[90, 50], [75, 20], [75, 40], [75, 60], [75, 80], [55, 30], [55, 50], [55, 70], [35, 25], [35, 50], [35, 75]]
  },
  '4-4-2': {
    red: [[10, 50], [25, 20], [25, 40], [25, 60], [25, 80], [45, 15], [45, 40], [45, 60], [45, 85], [65, 40], [65, 60]],
    blue: [[90, 50], [75, 20], [75, 40], [75, 60], [75, 80], [55, 15], [55, 40], [55, 60], [55, 85], [35, 40], [35, 60]]
  },
  '3-5-2': {
    red: [[10, 50], [25, 30], [25, 50], [25, 70], [45, 10], [45, 35], [45, 50], [45, 65], [45, 90], [65, 40], [65, 60]],
    blue: [[90, 50], [75, 30], [75, 50], [75, 70], [55, 10], [55, 35], [55, 50], [55, 65], [55, 90], [35, 40], [35, 60]]
  },
  '3-4-3': {
    red: [[10, 50], [25, 30], [25, 50], [25, 70], [45, 20], [45, 40], [45, 60], [45, 80], [65, 25], [65, 50], [65, 75]],
    blue: [[90, 50], [75, 30], [75, 50], [75, 70], [55, 20], [55, 40], [55, 60], [55, 80], [35, 25], [35, 50], [35, 75]]
  },
  '5-3-2': {
    red: [[10, 50], [25, 10], [25, 30], [25, 50], [25, 70], [25, 90], [45, 30], [45, 50], [45, 70], [65, 40], [65, 60]],
    blue: [[90, 50], [75, 10], [75, 30], [75, 50], [75, 70], [75, 90], [55, 30], [55, 50], [55, 70], [35, 40], [35, 60]]
  }
};

export const FormationsModal: React.FC<FormationsModalProps> = ({
  isOpen,
  onClose,
  onApplyFormation
}) => {
  const [selectedTeam, setSelectedTeam] = useState<Team>('red');
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');

  const handleApply = () => {
    onApplyFormation(selectedTeam, selectedFormation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 ${isOpen ? 'modal-active' : 'modal-inactive'}`}>
      <div className="modal-content bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Seleccionar Formación</h2>
        
        <div className="mb-4">
          <label htmlFor="team-select" className="block mb-2">Equipo:</label>
          <select 
            id="team-select" 
            className="w-full bg-gray-700 rounded p-2"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value as Team)}
          >
            <option value="red">Equipo Rojo</option>
            <option value="blue">Equipo Azul</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label htmlFor="formation-select" className="block mb-2">Formación:</label>
          <select 
            id="formation-select" 
            className="w-full bg-gray-700 rounded p-2"
            value={selectedFormation}
            onChange={(e) => setSelectedFormation(e.target.value)}
          >
            <option value="4-3-3">4-3-3</option>
            <option value="4-4-2">4-4-2</option>
            <option value="3-5-2">3-5-2</option>
            <option value="3-4-3">3-4-3</option>
            <option value="5-3-2">5-3-2</option>
          </select>
        </div>
        
        <div className="flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 py-2 px-4 rounded transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleApply}
            className="bg-green-600 hover:bg-green-500 py-2 px-4 rounded transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

export { formations };