export type Team = 'red' | 'blue' | 'green' | 'yellow';
export type ObjectType = 'player' | 'ball' | 'cone' | 'minigoal';
export type TokenSize = 'large' | 'medium' | 'small';

export interface Token {
  id: string;
  team: Team;
  number: number;
  x: number;
  y: number;
  type?: ObjectType; // Optional for backward compatibility
  size?: TokenSize;
}

export interface Arrow {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  style: 'solid' | 'dashed';
  curved?: boolean;
  control?: { x: number; y: number };
}

export type Mode = 'select' | 'arrow' | 'trajectory' | 'erase';
export type DrawingMode = 'move' | 'pass' | 'displacement';

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
  selectedTokenIds: string[];
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
  durationMs?: number; // optional: recorded draw duration
}

export interface PitchDimensions {
  width: number;
  height: number;
  scale: number;
}

// Animation sequence types
export interface AnimationStep {
  id: string;
  timestamp: number; // milliseconds from sequence start
  type: 'move' | 'pass' | 'pressure' | 'intercept' | 'show_arrow' | 'show_trajectory' | 'show_canvas';
  tokenId?: string; // token that performs the action
  from?: Point;
  to?: Point;
  duration: number; // milliseconds
  easing?: 'linear' | 'easeInOut' | 'easeOut';
  description?: string;
  // Additional data for line rendering
  arrowData?: any;
  trajectoryData?: any;
  // Additional data for raster overlay
  canvasData?: string; // dataURL for canvas overlay
  // If present, move token along this polyline path (normalized 0..1 coords)
  pathPoints?: Point[];
}

export interface AnimationSequence {
  id: string;
  title: string;
  description: string;
  totalDuration: number; // milliseconds
  steps: AnimationStep[];
  loop?: boolean;
  questions?: string[]; // AI clarification questions
}

export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number; // current position in milliseconds
  sequence: AnimationSequence | null;
  speed: number; // playback speed multiplier (1.0 = normal)
}
