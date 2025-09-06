import { AnimationSequence, AnimationStep, Token, Point } from '../../types';
import { TacticalSequence } from './tacticalSequence';

interface TokenMapping {
  [key: string]: string; // team_role -> tokenId
}

export function convertTacticalToAnimationSequence(
  tacticalSequence: TacticalSequence,
  boardTokens: Token[]
): AnimationSequence {
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
  Array.from(uniqueActors).forEach(actorKey => {
    const [team] = actorKey.split('_');
    
    // Find the best matching token for this actor
    const teamTokens = boardTokens.filter(t => t.team === team && t.type === 'player');
    
    if (teamTokens.length > 0) {
      // Use existing token (prefer one not already assigned)
      const availableToken = teamTokens.find(t => 
        !Object.values(tokenMapping).includes(t.id)
      ) || teamTokens[0];
      
      tokenMapping[actorKey] = availableToken.id;
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

  return {
    id: `seq_${Date.now()}`,
    title: tacticalSequence.title,
    description: tacticalSequence.description,
    totalDuration: tacticalSequence.duration,
    steps: animationSteps,
    loop: false,
    questions: tacticalSequence.questions,
  };
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

  const fieldWidth = 105;
  const fieldHeight = 68;
  
  // Get initial positions from first steps
  const initialPositions = new Map<string, { team: 'red' | 'blue'; position: Point }>();
  
  sequence.steps.forEach(step => {
    if (step.tokenId && !initialPositions.has(step.tokenId)) {
      // Determine team from the step (you might need to store this info differently)
      const team = step.tokenId.includes('red') ? 'red' : 'blue'; // Fallback logic
      
      initialPositions.set(step.tokenId, {
        team,
        position: {
          x: step.from.x * fieldWidth,
          y: step.from.y * fieldHeight,
        },
      });
    }
  });

  // Create tokens at initial positions
  initialPositions.forEach(({ team, position }) => {
    addToken(team, position.x, position.y);
  });
}