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
  console.log('🔍 AI Response raw:', response);
  console.log('🔍 AI Response content type:', typeof response?.content);
  console.log('🔍 AI Response content:', response?.content);
  
  if (!response) {
    throw new Error('La IA no devolvió ninguna respuesta.');
  }
  
  if (!response.content) {
    console.error('❌ Response object:', response);
    throw new Error('La IA no devolvió contenido. Respuesta recibida: ' + JSON.stringify(response));
  }
  
  let sequence;
  try {
    console.log('🔍 Intentando parsear JSON:', response.content);
    sequence = JSON.parse(response.content);
    console.log('✅ JSON parseado exitosamente:', sequence);
  } catch (error) {
    console.error('❌ Error parsing JSON:', error);
    console.error('❌ Content that failed to parse:', response.content);
    throw new Error('La IA devolvió JSON inválido: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  }
  
  // Validate sequence structure
  console.log('🔍 Validando estructura de secuencia...');
  console.log('- title:', sequence?.title);
  console.log('- steps:', sequence?.steps);
  console.log('- questions:', sequence?.questions);
  
  if (!sequence.title) {
    throw new Error('La secuencia no tiene título. Estructura recibida: ' + JSON.stringify(sequence));
  }
  
  if (!sequence.steps && !sequence.questions) {
    throw new Error('La secuencia no tiene pasos ni preguntas. Estructura recibida: ' + JSON.stringify(sequence));
  }
  
  if (sequence.steps && !Array.isArray(sequence.steps)) {
    throw new Error('Los pasos de la secuencia no son un array válido.');
  }
  
  console.log('✅ Secuencia validada exitosamente');
  return sequence as TacticalSequence;
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