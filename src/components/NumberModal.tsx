import React, { useEffect, useRef, useState } from 'react';

interface NumberModalProps {
  isOpen: boolean;
  initialNumber: number;
  onSave: (number: number) => void;
  onClose: () => void;
  validate: (num: number) => string | null;
}

export const NumberModal: React.FC<NumberModalProps> = ({
  isOpen,
  initialNumber,
  onSave,
  onClose,
  validate,
}) => {
  const [value, setValue] = useState(initialNumber.toString());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialNumber.toString());
      setError(null);
    }
  }, [isOpen, initialNumber]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setError('Introduce un número');
      return;
    }
    const validation = validate(num);
    if (validation) {
      setError(validation);
      return;
    }
    onSave(num);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 text-white p-3 rounded-md w-32"
      >
        <label className="block text-center text-sm mb-2" htmlFor="number-input">
          Número
        </label>
        <input
          ref={inputRef}
          id="number-input"
          type="number"
          min={1}
          max={99}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-2 py-1 text-center text-sm mb-2 focus:outline-none"
        />
        {error && <div className="text-red-400 text-xs mb-2 text-center">{error}</div>}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-500 rounded px-2 py-1 text-xs"
          >
            OK
          </button>
        </div>
      </form>
    </div>
  );
};
