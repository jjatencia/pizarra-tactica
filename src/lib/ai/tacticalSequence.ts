import { fetchAIResponse } from './client';
import { AIPayload } from './payload';
import { CanvasTacticPack, CanvasPrimitive, CanvasTeam, CanvasPrimitiveType } from '../../types/canvas';


interface TacticalStep {
  timestamp: number; // milliseconds from start
  type: 'move' | 'pass' | 'pressure' | 'intercept';
  actor: {
    team: 'blue' | 'red';
    position?: { x: number; y: number }; // normalized 0-1
    role?: string;
  };
  target?: {
    position: { x: number; y: number }; // normalized 0-1
    team?: 'blue' | 'red';
  };
  description: string;
}

export interface TacticalSequence {
  title: string;
  description: string;
  duration: number; // total duration in ms
  steps: TacticalStep[];
  questions?: string[]; // AI questions for clarification
}

export async function generateTacticalSequence(description: string): Promise<TacticalSequence> {
  const prompt = `Eres un entrenador de fútbol experto. Tu tarea es convertir una descripción táctica en una secuencia animada específica.

DESCRIPCIÓN DEL USUARIO:
"${description}"

INSTRUCCIONES:
1. Analiza la descripción e identifica todos los movimientos, pases y acciones
2. Crea una secuencia temporal detallada con timestamps precisos
3. Especifica posiciones en el campo usando coordenadas normalizadas (0-1)
4. Si hay ambigüedades, formula preguntas específicas para clarificar

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título breve de la jugada",
  "description": "Resumen de la situación táctica",
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
  ],
  "questions": [
    "¿En qué zona del campo inicia la jugada?",
    "¿Cuántos jugadores participan en la presión?"
  ]
}

REGLAS:
- Campo: 105m x 68m, coordenadas normalizadas 0-1
- Timestamps en milisegundos, secuencia realista
- Máximo 15 pasos por secuencia
- Incluye tanto movimientos defensivos como ofensivos
- Si falta información, pregunta específicamente qué necesitas saber

Responde SOLO con el JSON válido:`;

  const payload: Partial<AIPayload> = {
    prompt,
    boardState: {
      tokens: [],
      arrows: [],
      trajectories: []
    }
  };

  const response = await fetchAIResponse(payload);
  
  // Debug logging
  console.log('AI Response:', response);
  
  if (!response || !response.content) {
    throw new Error('La IA no devolvió una respuesta válida. Verifica tu configuración de API key.');
  }
  
  try {
    const sequence = JSON.parse(response.content);
    
    // Validate that we got a proper tactical sequence
    if (!sequence.title || !sequence.steps || !Array.isArray(sequence.steps)) {
      throw new Error('La respuesta de la IA no tiene el formato esperado. Intenta con una descripción más específica.');
    }
    
    return sequence as TacticalSequence;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('La IA devolvió una respuesta malformada. Intenta de nuevo con una descripción más clara.');
    }
    throw error;
  }
}

export function convertSequenceToCanvasPack(sequence: TacticalSequence): CanvasTacticPack {
  const primitives: CanvasPrimitive[] = sequence.steps.map((step, index) => {
    const id = `step_${index}`;
    
    if (step.type === 'pass') {
      return {
        id,
        tipo: 'arrow' as CanvasPrimitiveType,
        equipo: (step.actor.team === 'blue' ? 'propio' : 'rival') as CanvasTeam,
        puntos: [
          step.actor.position || { x: 0.5, y: 0.5 },
          step.target?.position || { x: 0.6, y: 0.5 }
        ],
        tiempo: step.timestamp,
        targets: []
      };
    } else {
      return {
        id,
        tipo: 'move' as CanvasPrimitiveType,
        equipo: (step.actor.team === 'blue' ? 'propio' : 'rival') as CanvasTeam,
        puntos: [
          step.actor.position || { x: 0.5, y: 0.5 },
          step.target?.position || { x: 0.6, y: 0.5 }
        ],
        tiempo: step.timestamp,
        targets: []
      };
    }
  });

  // Add marker positions from initial positions
  const markerPositions = new Set<string>();
  sequence.steps.forEach(step => {
    if (step.actor.position) {
      const key = `${step.actor.team}_${step.actor.position.x}_${step.actor.position.y}`;
      if (!markerPositions.has(key)) {
        markerPositions.add(key);
        primitives.push({
          id: `marker_${primitives.length}`,
          tipo: 'marker' as CanvasPrimitiveType,
          equipo: (step.actor.team === 'blue' ? 'propio' : 'rival') as CanvasTeam,
          puntos: [step.actor.position],
          tiempo: 0,
          targets: []
        });
      }
    }
  });

  return {
    titulo: sequence.title,
    instrucciones: [sequence.description],
    primitivas: primitives
  };
}