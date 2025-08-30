import { Formation } from '../types';

// Formations are positioned for a 105x68 field
// Positions are in meters from bottom-left corner
export const formations: Formation[] = [
  {
    name: '4-3-3',
    tokens: [
      // Goalkeeper
      { team: 'blue', number: 1, x: 10, y: 34 },
      
      // Defense (4)
      { team: 'blue', number: 2, x: 25, y: 15 },
      { team: 'blue', number: 3, x: 25, y: 25 },
      { team: 'blue', number: 4, x: 25, y: 43 },
      { team: 'blue', number: 5, x: 25, y: 53 },
      
      // Midfield (3)
      { team: 'blue', number: 6, x: 45, y: 22 },
      { team: 'blue', number: 8, x: 45, y: 34 },
      { team: 'blue', number: 10, x: 45, y: 46 },
      
      // Attack (3)
      { team: 'blue', number: 7, x: 65, y: 20 },
      { team: 'blue', number: 9, x: 65, y: 34 },
      { team: 'blue', number: 11, x: 65, y: 48 },
    ],
  },
  {
    name: '4-4-2',
    tokens: [
      // Goalkeeper
      { team: 'blue', number: 1, x: 10, y: 34 },
      
      // Defense (4)
      { team: 'blue', number: 2, x: 25, y: 15 },
      { team: 'blue', number: 3, x: 25, y: 25 },
      { team: 'blue', number: 4, x: 25, y: 43 },
      { team: 'blue', number: 5, x: 25, y: 53 },
      
      // Midfield (4)
      { team: 'blue', number: 6, x: 45, y: 18 },
      { team: 'blue', number: 7, x: 45, y: 28 },
      { team: 'blue', number: 8, x: 45, y: 40 },
      { team: 'blue', number: 11, x: 45, y: 50 },
      
      // Attack (2)
      { team: 'blue', number: 9, x: 65, y: 26 },
      { team: 'blue', number: 10, x: 65, y: 42 },
    ],
  },
  {
    name: '3-5-2',
    tokens: [
      // Goalkeeper
      { team: 'blue', number: 1, x: 10, y: 34 },
      
      // Defense (3)
      { team: 'blue', number: 2, x: 25, y: 20 },
      { team: 'blue', number: 3, x: 25, y: 34 },
      { team: 'blue', number: 4, x: 25, y: 48 },
      
      // Midfield (5)
      { team: 'blue', number: 5, x: 40, y: 12 },
      { team: 'blue', number: 6, x: 40, y: 24 },
      { team: 'blue', number: 8, x: 40, y: 34 },
      { team: 'blue', number: 10, x: 40, y: 44 },
      { team: 'blue', number: 11, x: 40, y: 56 },
      
      // Attack (2)
      { team: 'blue', number: 7, x: 60, y: 28 },
      { team: 'blue', number: 9, x: 60, y: 40 },
    ],
  },
];

// Mirror formation for red team (attacking from right to left)
export const getFormationForTeam = (formation: Formation, team: 'red' | 'blue'): Formation => {
  if (team === 'blue') {
    return formation;
  }
  
  // Mirror for red team
  const fieldWidth = 105;
  return {
    ...formation,
    tokens: formation.tokens.map(token => ({
      ...token,
      team: 'red',
      x: fieldWidth - token.x,
    })),
  };
};