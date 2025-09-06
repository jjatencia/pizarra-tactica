import { AnimationSequence } from '../../types';
import { TacticalSequence } from './tacticalSequence';

interface RefinementResponse {
  questions?: string[];
  refinedSequence?: TacticalSequence;
  clarification?: string;
  needsMoreInfo: boolean;
}

export async function refineSequence(
  originalDescription: string,
  currentSequence: AnimationSequence,
  feedback: string,
  currentBoardState: any
): Promise<RefinementResponse> {
  const payload = {
    originalDescription,
    currentSequence,
    feedback,
    boardState: currentBoardState
  };

  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    res = await fetch("/api/ai/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      throw new Error("La IA tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw new Error(`Fallo de red al refinar la secuencia: ${err.message}`);
  }

  if (!res.ok) {
    let msg = `Fallo en refinamiento (status ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error) {
        msg = errorData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const response = await res.json();
  
  if (!response || !response.content) {
    throw new Error('La IA no devolvió una respuesta válida para el refinamiento.');
  }
  
  try {
    const refinement = JSON.parse(response.content);
    return refinement as RefinementResponse;
  } catch (error) {
    throw new Error('La IA devolvió una respuesta malformada para el refinamiento.');
  }
}

export async function answerQuestions(
  originalDescription: string,
  questions: string[],
  answers: string[],
  currentBoardState: any
): Promise<TacticalSequence> {
  const payload = {
    originalDescription,
    questions,
    answers,
    boardState: currentBoardState
  };

  let res: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    res = await fetch("/api/ai/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
  } catch (e) {
    const err = e as Error;
    if (err.name === 'AbortError') {
      throw new Error("La IA tardó demasiado en responder. Inténtalo de nuevo.");
    }
    throw new Error(`Fallo de red al procesar las respuestas: ${err.message}`);
  }

  if (!res.ok) {
    let msg = `Fallo al procesar respuestas (status ${res.status})`;
    try {
      const errorData = await res.json();
      if (errorData?.error) {
        msg = errorData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const response = await res.json();
  
  if (!response || !response.content) {
    throw new Error('La IA no devolvió una respuesta válida.');
  }
  
  try {
    const sequence = JSON.parse(response.content);
    
    if (!sequence.title || !sequence.steps || !Array.isArray(sequence.steps)) {
      throw new Error('La respuesta de la IA no tiene el formato esperado.');
    }
    
    return sequence as TacticalSequence;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('La IA devolvió una respuesta malformada.');
    }
    throw error;
  }
}