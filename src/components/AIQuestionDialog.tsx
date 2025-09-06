import { useState } from 'react';
import { answerQuestions } from '../lib/ai/refinement';
import { useBoardStore } from '../hooks/useBoardStore';

interface AIQuestionDialogProps {
  isOpen: boolean;
  originalDescription: string;
  questions: string[];
  onSequenceGenerated?: (sequence: any, originalDescription: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export function AIQuestionDialog({ 
  isOpen, 
  originalDescription, 
  questions, 
  onSequenceGenerated, 
  onError, 
  onClose 
}: AIQuestionDialogProps) {
  const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''));
  const [isProcessing, setIsProcessing] = useState(false);
  const { tokens } = useBoardStore();

  const handleSubmitAnswers = async () => {
    const hasAllAnswers = answers.every(answer => answer.trim());
    if (!hasAllAnswers) {
      onError?.('Por favor responde todas las preguntas');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('📝 Enviando respuestas a la IA:', { originalDescription, questions, answers });
      
      const tacticalSequence = await answerQuestions(
        originalDescription,
        questions,
        answers,
        { tokens, fieldWidth: 105, fieldHeight: 68 }
      );

      console.log('✅ IA generó secuencia final:', tacticalSequence);

      onSequenceGenerated?.(tacticalSequence, originalDescription);
      onClose();
    } catch (error) {
      console.error('❌ Error creating sequence from answers:', error);
      onError?.(error instanceof Error ? error.message : 'Error creando la secuencia con las respuestas');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-400">AI</span>
            <span className="text-white font-medium text-lg">La IA necesita más información</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-slate-700 rounded-md">
          <div className="text-sm text-gray-300 font-medium mb-2">Tu descripción original:</div>
          <div className="text-gray-400 italic">"{originalDescription}"</div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-sm text-gray-300 font-medium">
            Responde estas preguntas para que la IA pueda generar la secuencia perfecta:
          </div>
          
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm text-white font-medium flex items-start gap-2">
                <span className="text-blue-400 mt-1">{index + 1}:</span>
                <span>{question}</span>
              </label>
              <textarea
                value={answers[index]}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full h-20 bg-slate-700 border border-slate-600 rounded-md p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors text-sm"
                disabled={isProcessing}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-600">
          <div className="text-xs text-gray-400">
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Generando secuencia...
              </span>
            ) : (
              <span>
                {answers.filter(a => a.trim()).length} de {questions.length} preguntas respondidas
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              disabled={isProcessing}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitAnswers}
              disabled={isProcessing || !answers.every(a => a.trim())}
              className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-gray-400 text-white rounded transition-colors flex items-center gap-2"
            >
              {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Generar Secuencia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}