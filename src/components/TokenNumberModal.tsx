import React, { useState, useEffect } from 'react';

interface TokenNumberModalProps {
  isOpen: boolean;
  currentNumber: number;
  onClose: () => void;
  onSave: (newNumber: number) => void;
}

export const TokenNumberModal: React.FC<TokenNumberModalProps> = ({
  isOpen,
  currentNumber,
  onClose,
  onSave
}) => {
  const [value, setValue] = useState(currentNumber.toString());

  useEffect(() => {
    setValue(currentNumber.toString());
  }, [currentNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    onSave(num);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-xs"
      >
        <h2 className="text-xl font-bold mb-4">Editar número</h2>
        <input
          type="number"
          min={1}
          max={99}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-gray-700 text-white p-2 rounded mb-4"
        />
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 py-2 px-4 rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-500 py-2 px-4 rounded"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};
