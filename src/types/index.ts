export type Team = 'red' | 'blue';
export type ObjectType = 'player' | 'ball' | 'cone' | 'minigoal';

export interface Token {
  id: string;
  team: Team;
  number: number;
  x: number;
  y: number;
  type?: ObjectType; // Optional for backward compatibility
}

export interface Arrow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  style: 'solid' | 'dashed';
  curved?: boolean;
  control?: { x: number; y: number };
}

export type Mode = 'select' | 'arrow' | 'trajectory';

export interface BoardState {
  tokens: Token[];
  arrows: Arrow[];
  trajectories: Trajectory[];
  mode: Mode;
  arrowStyle: 'solid' | 'dashed';
  trajectoryType: 'pass' | 'movement';
  gridSnap: boolean;
  zoom: number;
  pan: { x: number; y: number };
  showFullField: boolean;
  selectedTokenId: string | null;
  selectedArrowId: string | null;
  selectedTrajectoryId: string | null;
}

export interface HistoryState {
  states: BoardState[];
  currentIndex: number;
}

export interface Formation {
  name: string;
  tokens: Omit<Token, 'id'>[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Trajectory {
  id: string;
  points: Point[];
  type: 'pass' | 'movement';
  style: 'solid' | 'dashed';
}

export interface PitchDimensions {
  width: number;
  height: number;
  scale: number;
}