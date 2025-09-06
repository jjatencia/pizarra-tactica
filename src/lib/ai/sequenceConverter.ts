import { AnimationSequence, AnimationStep, Token, Point } from '../../types';
import { TacticalSequence } from './tacticalSequence';

interface TokenMapping {
  [key: string]: string; // team_role -> tokenId
}

export function convertTacticalToAnimationSequence(
  tacticalSequence: TacticalSequence,
  boardTokens: Token[]
): AnimationSequence {
  // Handle case where IA returned ONLY questions without steps (needs clarification)
  if (tacticalSequence.questions && tacticalSequence.questions.length > 0 && (!tacticalSequence.steps || tacticalSequence.steps.length === 0)) {
    console.log('🔄 Converter: IA devolvió solo preguntas, creando secuencia placeholder');
    // Return a placeholder sequence that indicates questions need to be answered
    return {
      id: `questions_${Date.now()}`,
      title: 'La IA necesita más información',
      description: 'Responde las preguntas para generar la secuencia',
      totalDuration: 1000,
      steps: [],
      loop: false,
      questions: tacticalSequence.questions,
    };
  }
  
  // If AI returned questions WITH steps, log but proceed normally
  if (tacticalSequence.questions && tacticalSequence.questions.length > 0 && tacticalSequence.steps && tacticalSequence.steps.length > 0) {
    console.log('🔄 Converter: IA devolvió secuencia válida con preguntas opcionales, procesando normalmente');
  }
  
  console.log('🔄 Converter: Iniciando conversión de pasos IA:', tacticalSequence.steps);
  console.log('🔄 Converter: Fichas disponibles en el tablero:', boardTokens);
  
  const animationSteps: AnimationStep[] = [];
  const tokenMapping: TokenMapping = {};

  // First pass: create tokens for each unique team-role combination
  const uniqueActors = new Set<string>();
  tacticalSequence.steps.forEach(step => {
    const key = `${step.actor.team}_${step.actor.role || 'player'}`;
    uniqueActors.add(key);
  });

  // Map existing tokens or create new ones as needed
  const fieldWidth = 105;
  const fieldHeight = 68;
  
  // Find or assign tokens for each unique actor
  Array.from(uniqueActors).forEach((actorKey, index) => {
    const [team] = actorKey.split('_');
    
    // Find the best matching token for this actor
    const teamTokens = boardTokens.filter(t => t.team === team && t.type === 'player');
    
    if (teamTokens.length > 0) {
      // Use existing token (prefer one not already assigned)
      const availableToken = teamTokens.find(t => 
        !Object.values(tokenMapping).includes(t.id)
      ) || teamTokens[0];
      
      tokenMapping[actorKey] = availableToken.id;
    } else {
      // Create a virtual token ID when no board tokens exist
      tokenMapping[actorKey] = `virtual_${team}_${index}`;
      console.log(`🔄 Converter: Created virtual token for ${actorKey}: virtual_${team}_${index}`);
    }
  });

  // Second pass: create animation steps
  tacticalSequence.steps.forEach((step, index) => {
    const actorKey = `${step.actor.team}_${step.actor.role || 'player'}`;
    const tokenId = tokenMapping[actorKey];
    
    if (!tokenId) return; // Skip if no token found
    
    // Calculate duration based on step type and distance
    const distance = step.target ? Math.hypot(
      (step.target.position.x - step.actor.position!.x) * fieldWidth,
      (step.target.position.y - step.actor.position!.y) * fieldHeight
    ) : 0;
    
    let duration = 1000; // Default 1 second
    switch (step.type) {
      case 'move':
        duration = Math.max(800, Math.min(2500, distance * 50)); // Speed-based duration
        break;
      case 'pass':
        duration = Math.max(300, Math.min(1200, distance * 20)); // Faster for passes
        break;
      case 'pressure':
        duration = Math.max(600, Math.min(1500, distance * 40)); // Medium speed for pressure
        break;
      case 'intercept':
        duration = Math.max(400, Math.min(1000, distance * 30)); // Fast for intercepts
        break;
    }

    const animationStep: AnimationStep = {
      id: `step_${index}`,
      timestamp: step.timestamp,
      type: step.type,
      tokenId,
      from: step.actor.position || { x: 0.5, y: 0.5 },
      to: step.target?.position || step.actor.position || { x: 0.5, y: 0.5 },
      duration,
      easing: step.type === 'pass' ? 'linear' : 'easeInOut',
      description: step.description,
    };

    animationSteps.push(animationStep);
  });

  const finalSequence = {
    id: `seq_${Date.now()}`,
    title: tacticalSequence.title,
    description: tacticalSequence.description,
    totalDuration: tacticalSequence.duration,
    steps: animationSteps,
    loop: false,
    questions: tacticalSequence.questions,
  };
  
  console.log('✅ Converter: Secuencia de animación creada:', finalSequence);
  console.log('✅ Converter: Pasos de animación generados:', animationSteps.length);
  console.log('✅ Converter: Mapeo de tokens:', tokenMapping);
  
  return finalSequence;
}

export function createInitialFormation(
  tacticalSequence: TacticalSequence,
  fieldWidth: number,
  fieldHeight: number
): { team: 'red' | 'blue'; positions: Point[] }[] {
  const formations: { team: 'red' | 'blue'; positions: Point[] }[] = [];
  const teamPositions: { [team: string]: Point[] } = {
    red: [],
    blue: [],
  };

  // Extract initial positions from the tactical sequence
  tacticalSequence.steps.forEach(step => {
    if (step.actor.position && step.actor.team) {
      const position = {
        x: step.actor.position.x * fieldWidth,
        y: step.actor.position.y * fieldHeight,
      };
      
      // Avoid duplicates (same position)
      const existing = teamPositions[step.actor.team].find(p =>
        Math.abs(p.x - position.x) < 2 && Math.abs(p.y - position.y) < 2
      );
      
      if (!existing) {
        teamPositions[step.actor.team].push(position);
      }
    }
  });

  // Convert to the expected format
  Object.entries(teamPositions).forEach(([team, positions]) => {
    if (positions.length > 0) {
      formations.push({
        team: team as 'red' | 'blue',
        positions,
      });
    }
  });

  return formations;
}

export function setupTokensFromSequence(
  sequence: AnimationSequence,
  addToken: (team: 'red' | 'blue', x: number, y: number) => void,
  reset: () => void
): void {
  // Clear the board first
  reset();

  console.log('🏁 Setting up tokens from sequence with', sequence.steps.length, 'steps');
  
  // Always create a full formation (11 players per team) regardless of sequence
  // This ensures both teams are visible on the field
  
  // Default 4-3-3 formation for blue team (left side)
  const blueFormation = [
    { x: 15, y: 34 },   // GK
    { x: 25, y: 15 },   // RB  
    { x: 25, y: 25 },   // CB
    { x: 25, y: 43 },   // CB
    { x: 25, y: 53 },   // LB
    { x: 40, y: 20 },   // CM
    { x: 40, y: 34 },   // CM
    { x: 40, y: 48 },   // CM
    { x: 60, y: 18 },   // RW
    { x: 60, y: 34 },   // ST
    { x: 60, y: 50 },   // LW
  ];
  
  // Default 4-3-3 formation for red team (right side)  
  const redFormation = [
    { x: 90, y: 34 },   // GK
    { x: 80, y: 15 },   // RB
    { x: 80, y: 25 },   // CB  
    { x: 80, y: 43 },   // CB
    { x: 80, y: 53 },   // LB
    { x: 65, y: 20 },   // CM
    { x: 65, y: 34 },   // CM
    { x: 65, y: 48 },   // CM
    { x: 45, y: 18 },   // RW
    { x: 45, y: 34 },   // ST
    { x: 45, y: 50 },   // LW
  ];
  
  // Create blue team players
  blueFormation.forEach((pos, index) => {
    console.log(`🔵 Creating blue player ${index + 1} at (${pos.x}, ${pos.y})`);
    addToken('blue', pos.x, pos.y);
  });
  
  // Create red team players  
  redFormation.forEach((pos, index) => {
    console.log(`🔴 Creating red player ${index + 1} at (${pos.x}, ${pos.y})`);
    addToken('red', pos.x, pos.y);
  });
  
  console.log('✅ Full formation created: 22 players (11 blue + 11 red)');
}

export function updateSequenceWithRealTokenIds(
  sequence: AnimationSequence,
  boardTokens: Token[]
): AnimationSequence {
  console.log('🔄 Updating sequence with real token IDs...');
  console.log('🔍 Board tokens:', boardTokens);
  console.log('🔍 Sequence steps before update:', sequence.steps);
  
  const updatedSteps = sequence.steps.map(step => {
    // If token ID is virtual, replace with real token ID
    if (step.tokenId?.startsWith('virtual_')) {
      const [, team] = step.tokenId.split('_'); // Extract team from virtual_blue_0
      
      // Find available token for this team (prefer one not already used)
      const teamTokens = boardTokens.filter(t => t.team === team && t.type === 'player');
      const usedTokenIds = new Set(
        sequence.steps
          .filter(s => s.tokenId && !s.tokenId.startsWith('virtual_'))
          .map(s => s.tokenId)
      );
      
      const availableToken = teamTokens.find(t => !usedTokenIds.has(t.id)) || teamTokens[0];
      
      if (availableToken) {
        console.log(`🔄 Mapping ${step.tokenId} -> ${availableToken.id}`);
        return {
          ...step,
          tokenId: availableToken.id,
        };
      }
    }
    
    return step;
  });
  
  const updatedSequence = {
    ...sequence,
    steps: updatedSteps,
  };
  
  console.log('✅ Sequence updated with real token IDs:', updatedSequence.steps);
  return updatedSequence;
}