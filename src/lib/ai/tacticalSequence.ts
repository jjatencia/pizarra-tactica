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
  const prompt = `Eres un entrenador de fútbol experto. Convierte esta descripción táctica en una secuencia animada realista.

DESCRIPCIÓN: "${description}"

CONTEXTO DE CAMPO:
- Campo 105m x 68m, coordenadas 0-1 (equipo azul ataca hacia la derecha, equipo rojo hacia la izquierda)
- X=0 es línea de fondo izquierda (portería azul), X=1 es línea de fondo derecha (portería roja)
- Y=0 es banda inferior, Y=1 es banda superior

POSICIONES TÍPICAS:
- Defensas: X=0.15-0.25 (azul), X=0.75-0.85 (rojo)
- Mediocampistas: X=0.35-0.65 
- Delanteros: X=0.65-0.85 (azul), X=0.15-0.35 (rojo)

INSTRUCCIONES:
1. Crea una secuencia táctica realista con 5-8 pasos máximo
2. Usa coordenadas específicas basadas en posiciones reales de fútbol
3. Timestamps progresivos (0ms, 1000ms, 2000ms, etc.)
4. Movimientos coordinados entre jugadores del mismo equipo
5. Si la descripción es vaga, haz preguntas específicas

FORMATO JSON:
{
  "title": "Título breve",
  "description": "Descripción táctica",
  "duration": 6000,
  "steps": [
    {
      "timestamp": 0,
      "type": "move|pressure|pass|intercept",
      "actor": {
        "team": "blue|red",
        "position": {"x": 0.2, "y": 0.4},
        "role": "central|lateral|delantero|mediocampista"
      },
      "target": {
        "position": {"x": 0.4, "y": 0.5}
      },
      "description": "Acción específica"
    }
  ],
  "questions": ["¿Pregunta específica?"]
}

Para PRESIÓN ALTA específicamente:
- Delanteros del equipo presionante avanzan hacia defensas rivales
- Coordinación entre 2-3 jugadores presionantes
- Movimientos desde posiciones iniciales hacia el área rival
- Reducir espacios y forzar errores

Responde SOLO JSON válido:`;

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