import { useState } from 'react';
import { AnimationSequence } from '../types';
import { refineSequence, answerQuestions } from '../lib/ai/refinement';
import { convertTacticalToAnimationSequence } from '../lib/ai/sequenceConverter';
import { useBoardStore } from '../hooks/useBoardStore';

interface SequenceRefinementProps {
  sequence: AnimationSequence;
  originalDescription: string;
  onSequenceRefined?: (newSequence: AnimationSequence) => void;
  onError?: (error: string) => void;
}

export function SequenceRefinement({ 
  sequence, 
  originalDescription, 
  onSequenceRefined, 
  onError 
}: SequenceRefinementProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  
  const { tokens } = useBoardStore();

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      onError?.('Describe qué te gustaría cambiar en la secuencia');
      return;
    }

    setIsProcessing(true);
    try {
      const refinement = await refineSequence(
        originalDescription,
        sequence,
        feedback,
        { tokens, fieldWidth: 105, fieldHeight: 68 }
      );

      if (refinement.needsMoreInfo && refinement.questions) {
        setQuestions(refinement.questions);
        setAnswers(new Array(refinement.questions.length).fill(''));
        setShowQuestions(true);
      } else if (refinement.refinedSequence) {
        const newAnimationSequence = convertTacticalToAnimationSequence(
          refinement.refinedSequence,
          tokens
        );
        onSequenceRefined?.(newAnimationSequence);
        setIsOpen(false);
        setFeedback('');
      }
    } catch (error) {
      console.error('Error refining sequence:', error);
      onError?.(error instanceof Error ? error.message : 'Error refinando la secuencia');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitAnswers = async () => {
    const hasAllAnswers = answers.every(answer => answer.trim());
    if (!hasAllAnswers) {
      onError?.('Responde todas las preguntas');
      return;
    }

    setIsProcessing(true);
    try {
      const refinedTacticalSequence = await answerQuestions(
        originalDescription,
        questions,
        answers,
        { tokens, fieldWidth: 105, fieldHeight: 68 }
      );

      const newAnimationSequence = convertTacticalToAnimationSequence(
        refinedTacticalSequence,
        tokens
      );

      onSequenceRefined?.(newAnimationSequence);
      setIsOpen(false);
      setFeedback('');
      setShowQuestions(false);
      setQuestions([]);
      setAnswers([]);
    } catch (error) {
      console.error('Error creating refined sequence:', error);
      onError?.(error instanceof Error ? error.message : 'Error creando la secuencia refinada');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors flex items-center gap-1"
        title="Mejorar secuencia con IA"
      >
        🔄 Refinar
      </button>
    );
  }

  if (showQuestions) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">❓</span>
            <span className="text-white font-medium">La IA necesita más información</span>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowQuestions(false);
              setQuestions([]);
              setAnswers([]);
            }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm text-gray-300 font-medium">
                {index + 1}. {question}
              </label>
              <input
                type="text"
                value={answers[index]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[index] = e.target.value;
                  setAnswers(newAnswers);
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                placeholder="Escribe tu respuesta..."
                disabled={isProcessing}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setShowQuestions(false);
              setQuestions([]);
              setAnswers([]);
            }}
            className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            Volver
          </button>
          <button
            onClick={handleSubmitAnswers}
            disabled={isProcessing || !answers.every(a => a.trim())}
            className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:text-gray-400 text-white rounded transition-colors flex items-center gap-2"
          >
            {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Crear Secuencia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">🔄</span>
          <span className="text-white font-medium">Refinar Secuencia</span>
        </div>
        <button
          onClick={() => {
            setIsOpen(false);
            setFeedback('');
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="text-sm text-gray-300">
        <div className="font-medium mb-1">Secuencia actual:</div>
        <div className="text-gray-400">{sequence.title}</div>
        <div className="text-xs text-gray-500">{sequence.description}</div>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-300 font-medium">
          ¿Qué te gustaría cambiar?
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Ejemplo: Los jugadores se mueven muy lento, quiero que la presión sea más agresiva, el balón debe ir por el otro lado..."
          className="w-full h-20 bg-slate-700 border border-slate-600 rounded-md p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 transition-colors text-sm"
          disabled={isProcessing}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setIsOpen(false);
            setFeedback('');
          }}
          className="px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
          disabled={isProcessing}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmitFeedback}
          disabled={isProcessing || !feedback.trim()}
          className="px-4 py-1 text-sm bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 disabled:text-gray-400 text-white rounded transition-colors flex items-center gap-2"
        >
          {isProcessing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          Refinar
        </button>
      </div>
    </div>
  );
}