import { fetchAIResponse } from './client';
import { AIPayload } from './payload';
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
  const prompt = `Eres un entrenador de fútbol experto. El usuario te pidió crear una secuencia táctica pero no está satisfecho con el resultado.

DESCRIPCIÓN ORIGINAL:
"${originalDescription}"

SECUENCIA ACTUAL:
${JSON.stringify({
  title: currentSequence.title,
  description: currentSequence.description,
  steps: currentSequence.steps.map(s => ({
    timestamp: s.timestamp,
    type: s.type,
    description: s.description,
    from: s.from,
    to: s.to
  }))
}, null, 2)}

FEEDBACK DEL USUARIO:
"${feedback}"

Tu tarea es:
1. Analizar el feedback del usuario
2. Identificar qué aspectos de la secuencia no son correctos
3. Si necesitas más información, haz preguntas específicas
4. Si tienes información suficiente, crea una secuencia mejorada

FORMATO DE RESPUESTA (JSON):
{
  "needsMoreInfo": true/false,
  "questions": [
    "¿Los jugadores deben moverse más rápido o más lento?",
    "¿En qué posición específica debe estar cada jugador?"
  ],
  "clarification": "Explicación de lo que entendiste del feedback",
  "refinedSequence": {
    // Solo incluir si needsMoreInfo es false
    "title": "Título mejorado",
    "description": "Descripción mejorada",
    "duration": 8000,
    "steps": [
      // Pasos mejorados basados en el feedback
    ]
  }
}

IMPORTANTE:
- Si el feedback es vago ("no me gusta", "está mal"), haz preguntas específicas
- Si el feedback es específico ("los jugadores van muy lentos", "falta presión"), mejora la secuencia directamente
- Mantén la estructura táctica coherente
- Asegúrate de que los movimientos sean realistas

Responde SOLO con el JSON válido:`;

  const payload: Partial<AIPayload> = {
    prompt,
    boardState: currentBoardState
  };

  const response = await fetchAIResponse(payload);
  
  try {
    const refinement = JSON.parse(response.content);
    return refinement as RefinementResponse;
  } catch (error) {
    throw new Error('Error parsing AI refinement response: ' + response.content);
  }
}

export async function answerQuestions(
  originalDescription: string,
  questions: string[],
  answers: string[],
  currentBoardState: any
): Promise<TacticalSequence> {
  const prompt = `Eres un entrenador de fútbol experto. Has hecho preguntas sobre una secuencia táctica y el usuario ha respondido.

DESCRIPCIÓN ORIGINAL:
"${originalDescription}"

PREGUNTAS Y RESPUESTAS:
${questions.map((q, i) => `P: ${q}\nR: ${answers[i] || 'Sin respuesta'}`).join('\n\n')}

Ahora crea la secuencia táctica definitiva basada en la información completa.

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título de la jugada",
  "description": "Descripción de la situación táctica",
  "duration": 8000,
  "steps": [
    {
      "timestamp": 0,
      "type": "move|pass|pressure|intercept",
      "actor": {
        "team": "blue|red",
        "position": {"x": 0.3, "y": 0.5},
        "role": "central|delantero|mediocampista|lateral"
      },
      "target": {
        "position": {"x": 0.7, "y": 0.3},
        "team": "blue|red"
      },
      "description": "Descripción específica de la acción"
    }
  ]
}

Responde SOLO con el JSON válido:`;

  const payload: Partial<AIPayload> = {
    prompt,
    boardState: currentBoardState
  };

  const response = await fetchAIResponse(payload);
  
  try {
    const sequence = JSON.parse(response.content);
    return sequence as TacticalSequence;
  } catch (error) {
    throw new Error('Error parsing AI sequence response: ' + response.content);
  }
}