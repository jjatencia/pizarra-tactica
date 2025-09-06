import { useState, useRef, useEffect } from 'react';
import { generateTacticalSequence } from '../lib/ai/tacticalSequence';
import { AIQuestionDialog } from './AIQuestionDialog';

interface TacticalDescriptionInputProps {
  onSequenceGenerated?: (sequence: any, originalDescription: string) => void;
  onError?: (error: string) => void;
}

export function TacticalDescriptionInput({ onSequenceGenerated, onError }: TacticalDescriptionInputProps) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [originalDescription, setOriginalDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!description.trim()) {
      onError?.('Describe la situación táctica que quieres ver');
      return;
    }

    console.log('🚀 Iniciando generación de secuencia para:', description);
    setIsGenerating(true);
    
    try {
      const sequence = await generateTacticalSequence(description);
      console.log('✅ Secuencia recibida del generador:', sequence);
      
      // Validate sequence structure
      if (!sequence) {
        throw new Error('El generador devolvió una secuencia vacía');
      }
      
      // Check if AI returned questions (with or without steps)
      if (sequence.questions && sequence.questions.length > 0) {
        console.log('❓ IA devolvió preguntas, mostrando diálogo:', sequence.questions);
        console.log('ℹ️ Steps también incluidos:', sequence.steps ? sequence.steps.length : 0);
        
        // Store questions and show dialog
        setAiQuestions(sequence.questions);
        setOriginalDescription(description);
        setShowQuestions(true);
        setIsExpanded(false); // Collapse the input
        return;
      }
      
      // Validate that we have steps
      if (!sequence.steps || sequence.steps.length === 0) {
        throw new Error('La secuencia no contiene pasos de animación');
      }
      
      console.log('🎯 Enviando secuencia válida al componente padre...');
      const currentDescription = description; // Store the original
      onSequenceGenerated?.(sequence, currentDescription);
      setDescription(''); // Clear after successful generation
      setIsExpanded(false);
      console.log('✅ Secuencia enviada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en handleGenerate:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido generando la secuencia';
      onError?.(errorMessage);
    } finally {
      setIsGenerating(false);
      console.log('🏁 Generación completada (éxito o error)');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Auto-focus when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const placeholderText = `Describe la situación táctica que quieres ver:

Ejemplo: "Equipo azul realiza presión alta a equipo rojo. Los centrales rojos tienen la posesión del balón, los delanteros azules salen a presionar, uno presiona al jugador con balón mientras los otros tapan posibles pases para interceptar, los mediocampistas azules hacen lo propio con los jugadores rivales cercanos."`;

  if (!isExpanded) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 mb-3">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full text-left text-gray-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🤖</span>
            <span>Describe una situación táctica para generar secuencia animada...</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-blue-400">🤖</span>
          <span className="text-white font-medium">Generador de Secuencias IA</span>
        </div>
        <button
          onClick={() => {
            setIsExpanded(false);
            setDescription('');
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        className="w-full h-32 bg-slate-700 border border-slate-600 rounded-md p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors"
        disabled={isGenerating}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {isGenerating ? (
            <span>Generando secuencia...</span>
          ) : (
            <span>Ctrl/Cmd + Enter para generar</span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsExpanded(false);
              setDescription('');
            }}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            disabled={isGenerating}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-gray-400 text-white rounded transition-colors flex items-center gap-2"
          >
            {isGenerating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Generar Secuencia
          </button>
        </div>
      </div>

      {/* AI Questions Dialog */}
      <AIQuestionDialog
        isOpen={showQuestions}
        originalDescription={originalDescription}
        questions={aiQuestions}
        onSequenceGenerated={onSequenceGenerated}
        onError={onError}
        onClose={() => {
          setShowQuestions(false);
          setAiQuestions([]);
          setOriginalDescription('');
        }}
      />
    </div>
  );
}