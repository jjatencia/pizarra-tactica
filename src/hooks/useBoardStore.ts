import { create } from 'zustand';
import { BoardState, Token, Arrow, Trajectory, Team, Formation, HistoryState, ObjectType, TokenSize, Point, AnimationSequence, PlaybackState } from '../types';
import { loadFromStorage, saveToStorage } from '../lib/localStorage';

interface PhaseRecording {
  startPositions: Record<string, Point>;
  endPositions: Record<string, Point>;
  trajectories: any[];
  arrows: any[];
  duration: number;
  // Lines present at the START of this phase (not at the end)
  initialTrajectories: any[];
  initialArrows: any[];
  overlayCanvas?: string; // snapshot of drawing canvas at pause
}

interface BoardStore extends BoardState {
  // History
  history: HistoryState;
  recording: boolean;
  recordingPhases: PhaseRecording[];
  currentPhaseStart: Record<string, Point>;
  currentPhaseStartLines: { trajectories: any[], arrows: any[] };
  recordingPaused: boolean;
  tokenPaths: Record<string, Point[]>;
  recordingStartPositions: Record<string, Point>;
  
  // Animation sequences
  playbackState: PlaybackState;
  sequences: AnimationSequence[];
  currentSequence: AnimationSequence | null;
  playbackOverlay?: string | null;
  
  // Token actions
  addToken: (team: Team, x: number, y: number, type?: ObjectType, size?: TokenSize) => void;
  addObject: (type: ObjectType, x: number, y: number, size?: TokenSize) => void;
  updateToken: (id: string, updates: Partial<Token>) => void;
  removeToken: (id: string) => void;
  selectToken: (id: string | null) => void;
  selectTokens: (ids: string[]) => void;
  
  // Arrow actions
  addArrow: (from: { x: number; y: number }, to: { x: number; y: number }) => void;
  updateArrow: (id: string, updates: Partial<Arrow>) => void;
  removeArrow: (id: string) => void;
  selectArrow: (id: string | null) => void;
  
  // Trajectory actions
  addTrajectory: (points: { x: number; y: number }[], type: 'pass' | 'movement') => void;
  updateTrajectory: (id: string, updates: Partial<Trajectory>) => void;
  removeTrajectory: (id: string) => void;
  selectTrajectory: (id: string | null) => void;
  
  // Mode actions
  setMode: (mode: BoardState['mode']) => void;
  setArrowStyle: (style: 'solid' | 'dashed') => void;
  setTrajectoryType: (type: 'pass' | 'movement') => void;
  
  // View actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleGridSnap: () => void;
  toggleFullField: () => void;
  
  // Utility actions
  reset: () => void;
  mirror: () => void;
  applyFormation: (formation: Formation, team: Team, size?: TokenSize) => void;
  applyFormationByName: (formationName: string, team: Team, size?: TokenSize) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Persistence
  save: () => void;
  load: () => void;
  exportState: () => string;
  importState: (data: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  addTokenPathPoint: (id: string, point: Point) => void;
  clearTokenPaths: () => void;
  playTokenPaths: () => void;
  // New phase recording functions
  startPhaseRecording: () => void;
  pausePhaseRecording: (overlayCanvas?: string) => void;
  stopPhaseRecording: () => void;
  checkAutoResume: () => void;
  
  // Animation sequence actions
  addSequence: (sequence: AnimationSequence) => void;
  removeSequence: (sequenceId: string) => void;
  playSequence: (sequenceId: string) => void;
  pauseSequence: () => void;
  resumeSequence: () => void;
  stopSequence: () => void;
  setPlaybackSpeed: (speed: number) => void;
  seekTo: (time: number) => void;
}

const initialState: BoardState = {
  tokens: [],
  arrows: [],
  trajectories: [],
  mode: 'select',
  arrowStyle: 'solid',
  trajectoryType: 'pass',
  gridSnap: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  showFullField: true,
  selectedTokenIds: [],
  selectedArrowId: null,
  selectedTrajectoryId: null,
};

const initialHistory: HistoryState = {
  states: [initialState],
  currentIndex: 0,
};

// Utility function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Utility function to get next available number for a team
const getNextAvailableNumber = (tokens: Token[], team: Team): number => {
  const teamTokens = tokens.filter(t => t.team === team);
  for (let i = 1; i <= 11; i++) {
    if (!teamTokens.some(t => t.number === i)) {
      return i;
    }
  }
  return 1; // fallback
};

// Utility function to add state to history
const addToHistory = (currentState: BoardState, history: HistoryState): HistoryState => {
  const newStates = history.states.slice(0, history.currentIndex + 1);
  newStates.push({ ...currentState });
  
  // Keep only last 50 states
  if (newStates.length > 50) {
    newStates.shift();
  }
  
  return {
    states: newStates,
    currentIndex: newStates.length - 1,
  };
};

// Generate animation sequence from recorded phases
const generateSequenceFromPhases = (phases: PhaseRecording[]): AnimationSequence => {
  const animationSteps: any[] = [];
  let currentTime = 0;
  
  console.log(`Generating sequence from ${phases.length} phases`);
  
  phases.forEach((phase, phaseIndex) => {
    console.log(`Processing phase ${phaseIndex + 1}:`, {
      startPositions: phase.startPositions,
      endPositions: phase.endPositions,
      trajectories: phase.trajectories.length,
      arrows: phase.arrows.length,
      duration: phase.duration
    });
    
    let phaseMovements = 0;
    
    // Add optional canvas overlay for this phase
    if (phase.overlayCanvas) {
      animationSteps.push({
        id: `phase_${phaseIndex}_canvas`,
        timestamp: currentTime,
        type: 'show_canvas',
        duration: phase.duration,
        canvasData: phase.overlayCanvas,
        description: `Phase ${phaseIndex + 1} canvas overlay`
      });
    }

    // Add trajectories and arrows for this phase (show at start of phase)
    phase.trajectories.forEach((trajectory, trajIndex) => {
      animationSteps.push({
        id: `phase_${phaseIndex}_trajectory_${trajIndex}`,
        timestamp: currentTime,
        type: 'show_trajectory',
        trajectoryData: trajectory,
        duration: phase.duration,
        description: `Phase ${phaseIndex + 1} trajectory`
      });
    });
    
    phase.arrows.forEach((arrow, arrowIndex) => {
      animationSteps.push({
        id: `phase_${phaseIndex}_arrow_${arrowIndex}`,
        timestamp: currentTime,
        type: 'show_arrow', 
        arrowData: arrow,
        duration: phase.duration,
        description: `Phase ${phaseIndex + 1} arrow`
      });
    });
    
    console.log(`Phase ${phaseIndex + 1} added ${phase.trajectories.length} trajectories and ${phase.arrows.length} arrows`);
    
    // Create movement steps for each token that moved in this phase
    Object.keys(phase.startPositions).forEach(tokenId => {
      const start = phase.startPositions[tokenId];
      const end = phase.endPositions[tokenId];
      
      // Only create animation if token actually moved
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      console.log(`Token ${tokenId}: distance ${distance.toFixed(2)} from (${start.x}, ${start.y}) to (${end.x}, ${end.y})`);
      
      if (distance > 1) { // Minimum movement threshold
        const step = {
          id: `phase_${phaseIndex}_token_${tokenId}`,
          timestamp: currentTime,
          type: 'move',
          tokenId: tokenId,
          from: { x: start.x / 105, y: start.y / 68 }, // Normalize to 0-1
          to: { x: end.x / 105, y: end.y / 68 },
          duration: phase.duration,
          easing: 'easeInOut',
          description: `Phase ${phaseIndex + 1} movement`
        };
        
        animationSteps.push(step);
        phaseMovements++;
        console.log(`Added animation step for token ${tokenId} in phase ${phaseIndex + 1}`);
      }
    });
    
    console.log(`Phase ${phaseIndex + 1} generated ${phaseMovements} movements`);
    
    // Move to next phase (add transition time)
    currentTime += phase.duration + 500; // 500ms transition between phases
  });
  
  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration + 500, 0) - 500;
  
  return {
    id: `phase_sequence_${Date.now()}`,
    title: `Secuencia por Fases (${phases.length} fases)`,
    description: `Secuencia grabada manualmente con ${phases.length} fases secuenciales`,
    totalDuration,
    steps: animationSteps,
    loop: false
  };
};

// Easing functions for animations
const applyEasing = (t: number, easing: 'linear' | 'easeInOut' | 'easeOut'): number => {
  switch (easing) {
    case 'linear':
      return t;
    case 'easeInOut':
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case 'easeOut':
      return 1 - (1 - t) * (1 - t);
    default:
      return t;
  }
};

const initialPlaybackState: PlaybackState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  sequence: null,
  speed: 1.0,
};

export const useBoardStore = create<BoardStore>((set, get) => ({
    ...initialState,
  history: initialHistory,
  recording: false,
  recordingPhases: [],
  currentPhaseStart: {},
  currentPhaseStartLines: { trajectories: [], arrows: [] },
  recordingPaused: false,
  tokenPaths: {},
  recordingStartPositions: {},
  
  // Animation sequences
  playbackState: initialPlaybackState,
  sequences: [],
  currentSequence: null,
  playbackOverlay: null,
    
    addToken: (team: Team, x: number, y: number, type: ObjectType = 'player', size: TokenSize = 'medium') => {
      const state = get();
      
      if (type === 'player') {
        const teamTokens = state.tokens.filter(t => t.team === team && (t.type === 'player' || !t.type));
        
        if (teamTokens.length >= 11) {
          // TODO: Show toast notification
          console.warn(`Máximo 11 fichas ${team} alcanzado`);
          return;
        }
      }
      
      const number = type === 'player' ? getNextAvailableNumber(state.tokens, team) : 0;
      const newToken: Token = {
        id: generateId(),
        team,
        number,
        x,
        y,
        type,
        size,
      };
      
      const newState = {
        ...state,
        tokens: [...state.tokens, newToken],
        selectedTokenIds: [newToken.id],
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },

    addObject: (type: ObjectType, x: number, y: number, size: TokenSize = 'medium') => {
      const state = get();
      
      const newToken: Token = {
        id: generateId(),
        team: 'red', // Default team for objects (won't be used for non-player objects)
        number: 0, // No number for objects
        x,
        y,
        type,
        size,
      };
      
      const newState = {
        ...state,
        tokens: [...state.tokens, newToken],
        selectedTokenIds: [newToken.id],
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    updateToken: (id: string, updates: Partial<Token>) => {
      const state = get();
      
      let autoResumeUpdate = {};
      
      // Check for auto-resume before updating
      if (state.recordingPaused && (updates.x !== undefined || updates.y !== undefined)) {
        console.log('Token moved while recording paused - auto-resuming');
        
        // Capture current positions as start of new phase
        const newPhaseStart: Record<string, Point> = {};
        state.tokens.forEach(t => {
          newPhaseStart[t.id] = { x: t.x, y: t.y };
        });
        
        console.log('New phase starts with positions:', newPhaseStart);
        console.log('Setting recording=true, recordingPaused=false');
        
        autoResumeUpdate = {
          recording: true, 
          recordingPaused: false,
          currentPhaseStart: newPhaseStart
        };
      }
      
      const newTokens = state.tokens.map(token =>
        token.id === id ? { ...token, ...updates } : token
      );
      
      const newState = {
        ...state,
        tokens: newTokens,
        ...autoResumeUpdate
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    removeToken: (id: string) => {
      const state = get();
      const newState = {
        ...state,
        tokens: state.tokens.filter(t => t.id !== id),
        selectedTokenIds: state.selectedTokenIds.filter(tid => tid !== id),
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    selectToken: (id: string | null) => {
      set({ selectedTokenIds: id ? [id] : [], selectedArrowId: null, selectedTrajectoryId: null });
    },
    selectTokens: (ids: string[]) => {
      set({ selectedTokenIds: ids, selectedArrowId: null, selectedTrajectoryId: null });
    },
    
    addArrow: (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const state = get();
      const newArrow: Arrow = {
        id: generateId(),
        from,
        to,
        style: state.arrowStyle,
        curved: false,
      };
      
      const newState = {
        ...state,
        arrows: [...state.arrows, newArrow],
        selectedArrowId: newArrow.id,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    updateArrow: (id: string, updates: Partial<Arrow>) => {
      const state = get();
      const newArrows = state.arrows.map(arrow =>
        arrow.id === id ? { ...arrow, ...updates } : arrow
      );
      
      const newState = {
        ...state,
        arrows: newArrows,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    removeArrow: (id: string) => {
      const state = get();
      const newState = {
        ...state,
        arrows: state.arrows.filter(a => a.id !== id),
        selectedArrowId: state.selectedArrowId === id ? null : state.selectedArrowId,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    selectArrow: (id: string | null) => {
      set({ selectedArrowId: id, selectedTokenIds: [], selectedTrajectoryId: null });
    },
    
    setMode: (mode: BoardState['mode']) => {
      set({ mode, selectedTokenIds: [], selectedArrowId: null, selectedTrajectoryId: null });
    },
    
    setArrowStyle: (arrowStyle: 'solid' | 'dashed') => {
      set({ arrowStyle });
    },
    
    addTrajectory: (points: { x: number; y: number }[], type: 'pass' | 'movement') => {
      const state = get();
      const newTrajectory: Trajectory = {
        id: generateId(),
        points,
        type,
        style: type === 'pass' ? 'solid' : 'dashed',
      };
      
      const newState = {
        ...state,
        trajectories: [...state.trajectories, newTrajectory],
        selectedTrajectoryId: newTrajectory.id,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    updateTrajectory: (id: string, updates: Partial<Trajectory>) => {
      const state = get();
      const newTrajectories = state.trajectories.map(trajectory =>
        trajectory.id === id ? { ...trajectory, ...updates } : trajectory
      );
      
      const newState = {
        ...state,
        trajectories: newTrajectories,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    removeTrajectory: (id: string) => {
      const state = get();
      const newState = {
        ...state,
        trajectories: state.trajectories.filter(t => t.id !== id),
        selectedTrajectoryId: state.selectedTrajectoryId === id ? null : state.selectedTrajectoryId,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    selectTrajectory: (id: string | null) => {
      set({ selectedTrajectoryId: id, selectedTokenIds: [], selectedArrowId: null });
    },
    
    setTrajectoryType: (trajectoryType: 'pass' | 'movement') => {
      set({ trajectoryType });
    },
    
    setZoom: (zoom: number) => {
      set({ zoom: Math.max(0.5, Math.min(3, zoom)) });
    },
    
    setPan: (pan: { x: number; y: number }) => {
      set({ pan });
    },
    
    toggleGridSnap: () => {
      set(state => ({ gridSnap: !state.gridSnap }));
    },
    
    toggleFullField: () => {
      set(state => ({ showFullField: !state.showFullField }));
    },
    
    reset: () => {
      const newState = {
        ...initialState,
        zoom: get().zoom,
        pan: get().pan,
        showFullField: get().showFullField,
        gridSnap: get().gridSnap,
      };

      set({
        ...newState,
        history: addToHistory(newState, get().history),
        tokenPaths: {},
        recording: false,
      });
    },
    
    mirror: () => {
      const state = get();
      const fieldWidth = 105; // meters
      
      const mirroredTokens = state.tokens.map(token => ({
        ...token,
        x: fieldWidth - token.x,
      }));
      
      const mirroredArrows = state.arrows.map(arrow => ({
        ...arrow,
        from: { ...arrow.from, x: fieldWidth - arrow.from.x },
        to: { ...arrow.to, x: fieldWidth - arrow.to.x },
        control: arrow.control ? { ...arrow.control, x: fieldWidth - arrow.control.x } : undefined,
      }));
      
      const newState = {
        ...state,
        tokens: mirroredTokens,
        arrows: mirroredArrows,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    applyFormation: (formation: Formation, team: Team, size: TokenSize = 'medium') => {
      const state = get();
      const otherTeamTokens = state.tokens.filter(t => t.team !== team);
      const formationTokens = formation.tokens.map(token => ({
        ...token,
        id: generateId(),
        team,
        size,
      }));
      
      const newState = {
        ...state,
        tokens: [...otherTeamTokens, ...formationTokens],
        selectedTokenIds: [],
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },

    applyFormationByName: (formationName: string, team: Team, size: TokenSize = 'medium') => {
      // Formation positions from FormationsModal
      const formations: Record<string, Record<string, number[][]>> = {
        '4-3-3': {
          red: [[10, 50], [25, 20], [25, 40], [25, 60], [25, 80], [45, 30], [45, 50], [45, 70], [65, 25], [65, 50], [65, 75]],
          blue: [[90, 50], [75, 20], [75, 40], [75, 60], [75, 80], [55, 30], [55, 50], [55, 70], [35, 25], [35, 50], [35, 75]]
        },
        '4-4-2': {
          red: [[10, 50], [25, 20], [25, 40], [25, 60], [25, 80], [45, 15], [45, 40], [45, 60], [45, 85], [65, 40], [65, 60]],
          blue: [[90, 50], [75, 20], [75, 40], [75, 60], [75, 80], [55, 15], [55, 40], [55, 60], [55, 85], [35, 40], [35, 60]]
        },
        '3-5-2': {
          red: [[10, 50], [25, 30], [25, 50], [25, 70], [45, 10], [45, 35], [45, 50], [45, 65], [45, 90], [65, 40], [65, 60]],
          blue: [[90, 50], [75, 30], [75, 50], [75, 70], [55, 10], [55, 35], [55, 50], [55, 65], [55, 90], [35, 40], [35, 60]]
        },
        '3-4-3': {
          red: [[10, 50], [25, 30], [25, 50], [25, 70], [45, 20], [45, 40], [45, 60], [45, 80], [65, 25], [65, 50], [65, 75]],
          blue: [[90, 50], [75, 30], [75, 50], [75, 70], [55, 20], [55, 40], [55, 60], [55, 80], [35, 25], [35, 50], [35, 75]]
        },
        '5-3-2': {
          red: [[10, 50], [25, 10], [25, 30], [25, 50], [25, 70], [25, 90], [45, 30], [45, 50], [45, 70], [65, 40], [65, 60]],
          blue: [[90, 50], [75, 10], [75, 30], [75, 50], [75, 70], [75, 90], [55, 30], [55, 50], [55, 70], [35, 40], [35, 60]]
        }
      };

      Object.values(formations).forEach(f => {
        f.green = f.blue;
        f.yellow = f.blue;
      });

      const state = get();
      const fieldWidth = 105;
      const fieldHeight = 68;
      
      // Remove existing team players
      const otherTokens = state.tokens.filter(t => t.team !== team || (t.type && t.type !== 'player'));
      
      // Get formation positions
      const formationPositions = formations[formationName as keyof typeof formations]?.[team];
      if (!formationPositions) return;
      
      // Create new tokens from formation positions
      const formationTokens: Token[] = formationPositions.map((pos, index) => ({
        id: generateId(),
        team,
        number: index + 1,
        x: (pos[0] / 100) * fieldWidth, // Convert percentage to field coordinates
        y: (pos[1] / 100) * fieldHeight,
        type: 'player',
        size,
      }));
      
      const newState = {
        ...state,
        tokens: [...otherTokens, ...formationTokens],
        selectedTokenIds: [],
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    undo: () => {
      const state = get();
      if (state.history.currentIndex > 0) {
        const newIndex = state.history.currentIndex - 1;
        const previousState = state.history.states[newIndex];
        
        set({
          ...previousState,
          history: {
            ...state.history,
            currentIndex: newIndex,
          },
        });
      }
    },
    
    redo: () => {
      const state = get();
      if (state.history.currentIndex < state.history.states.length - 1) {
        const newIndex = state.history.currentIndex + 1;
        const nextState = state.history.states[newIndex];
        
        set({
          ...nextState,
          history: {
            ...state.history,
            currentIndex: newIndex,
          },
        });
      }
    },
    
    canUndo: () => {
      const state = get();
      return state.history.currentIndex > 0;
    },
    
    canRedo: () => {
      const state = get();
      return state.history.currentIndex < state.history.states.length - 1;
    },
    
    save: () => {
      const state = get();
      saveToStorage('boardState', {
        tokens: state.tokens,
        arrows: state.arrows,
        trajectories: state.trajectories,
        mode: state.mode,
        arrowStyle: state.arrowStyle,
        trajectoryType: state.trajectoryType,
        gridSnap: state.gridSnap,
        zoom: state.zoom,
        pan: state.pan,
        showFullField: state.showFullField,
        selectedTokenIds: [], // Don't persist selection
        selectedArrowId: null,
        selectedTrajectoryId: null,
      });
    },
    
    load: () => {
      const savedState = loadFromStorage<Partial<BoardState>>('boardState');
      if (savedState) {
        const newState = {
          ...initialState,
          ...savedState,
          selectedTokenIds: [],
          selectedArrowId: null,
          selectedTrajectoryId: null,
        };
        
        set({
          ...newState,
          history: {
            states: [newState],
            currentIndex: 0,
          },
          tokenPaths: {},
          recording: false,
        });
      }
    },
    
    exportState: () => {
      const state = get();
      return JSON.stringify({
        tokens: state.tokens,
        arrows: state.arrows,
        trajectories: state.trajectories,
        timestamp: new Date().toISOString(),
      }, null, 2);
    },
    
    importState: (data: string) => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.tokens && parsed.arrows) {
          const newState = {
            ...get(),
            tokens: parsed.tokens,
            arrows: parsed.arrows,
            trajectories: parsed.trajectories || [],
            selectedTokenIds: [],
            selectedArrowId: null,
            selectedTrajectoryId: null,
          };

          set({
            ...newState,
            history: addToHistory(newState, get().history),
            tokenPaths: {},
            recording: false,
          });
        }
      } catch (error) {
        console.error('Error importing state:', error);
      }
    },

    startRecording: () => {
      const startPositions: Record<string, Point> = {};
      get().tokens.forEach(t => {
        startPositions[t.id] = { x: t.x, y: t.y };
      });
      set({ recording: true, recordingStartPositions: startPositions, tokenPaths: {} });
    },

    stopRecording: () => {
      const start = get().recordingStartPositions;
      set(state => ({
        recording: false,
        tokens: state.tokens.map(t => start[t.id] ? { ...t, x: start[t.id].x, y: start[t.id].y } : t),
        selectedTokenIds: [],
      }));
    },

    pauseRecording: () => {
      set({ recordingPaused: true });
    },

    resumeRecording: () => {
      set({ recordingPaused: false });
    },

    addTokenPathPoint: (id: string, point: Point) => {
      set(state => {
        const path = state.tokenPaths[id] || [];
        return { tokenPaths: { ...state.tokenPaths, [id]: [...path, point] } };
      });
    },

    clearTokenPaths: () => {
      set({ tokenPaths: {} });
    },

    playTokenPaths: () => {
      const paths = get().tokenPaths;
      const maxSteps = Math.max(0, ...Object.values(paths).map(p => p.length));
      let step = 0;
      set({ selectedTokenIds: [] });
      const animate = () => {
        if (step >= maxSteps) return;
        const updates: Record<string, Point> = {};
        Object.entries(paths).forEach(([id, path]) => {
          const point = path[Math.min(step, path.length - 1)];
          updates[id] = point;
        });
        set(state => ({
          ...state,
          tokens: state.tokens.map(t => updates[t.id] ? { ...t, x: updates[t.id].x, y: updates[t.id].y } : t)
        }));
        step++;
        requestAnimationFrame(animate);
      };
      animate();
    },

    // Phase recording functions
    startPhaseRecording: () => {
      const state = get();
      const startPositions: Record<string, Point> = {};
      
      // Capture current positions of all tokens
      state.tokens.forEach(t => {
        startPositions[t.id] = { x: t.x, y: t.y };
      });
      
      console.log('Starting phase recording with', Object.keys(startPositions).length, 'tokens');
      
      // Capture initial lines for this phase
      const initialLines = {
        trajectories: [...state.trajectories],
        arrows: [...state.arrows]
      };
      console.log('Captured initial lines:', initialLines);
      
      set({ 
        recording: true,
        recordingPaused: false,
        recordingPhases: [],
        currentPhaseStart: startPositions,
        currentPhaseStartLines: initialLines,
        recordingStartPositions: startPositions,
        tokenPaths: {} 
      });
    },

    pausePhaseRecording: (overlayCanvas?: string) => {
      const state = get();
      if (!state.recording || state.recordingPaused) return;
      
      const endPositions: Record<string, Point> = {};
      state.tokens.forEach(t => {
        endPositions[t.id] = { x: t.x, y: t.y };
      });
      
      // Create a phase from current positions
      const phase: PhaseRecording = {
        startPositions: { ...state.currentPhaseStart },
        endPositions,
        trajectories: [...state.trajectories],
        arrows: [...state.arrows], 
        duration: 3000, // 3 seconds as specified
        initialTrajectories: state.currentPhaseStartLines.trajectories,
        initialArrows: state.currentPhaseStartLines.arrows,
        overlayCanvas: overlayCanvas
      };
      
      console.log('Pausing phase recording. Phase', state.recordingPhases.length + 1, 'created');
      
      set({
        recordingPaused: true,
        recordingPhases: [...state.recordingPhases, phase],
        currentPhaseStart: endPositions // Next phase starts where this one ended
      });
    },

    stopPhaseRecording: () => {
      const state = get();
      console.log('stopPhaseRecording called. Current state:', {
        recording: state.recording,
        recordingPaused: state.recordingPaused,
        existingPhases: state.recordingPhases.length,
        currentPhaseStart: state.currentPhaseStart
      });
      
      if (!state.recording) return;
      
      // If recording wasn't paused, create final phase
      let finalPhases = [...state.recordingPhases];
      if (!state.recordingPaused) {
        console.log('Recording not paused, creating final phase');
        const endPositions: Record<string, Point> = {};
        state.tokens.forEach(t => {
          endPositions[t.id] = { x: t.x, y: t.y };
        });
        
        const finalPhase: PhaseRecording = {
          startPositions: { ...state.currentPhaseStart },
          endPositions,
          trajectories: [...state.trajectories],
          arrows: [...state.arrows],
          duration: 3000,
          initialTrajectories: state.currentPhaseStartLines.trajectories,
          initialArrows: state.currentPhaseStartLines.arrows,
        };
        
        console.log('Final phase created:', finalPhase);
        finalPhases.push(finalPhase);
      } else {
        console.log('Recording was paused, not creating final phase');
      }
      
      console.log('Stopping phase recording. Total phases:', finalPhases.length);
      finalPhases.forEach((phase, i) => {
        console.log(`Phase ${i + 1}:`, phase);
      });
      
      // Generate final sequence from phases
      const sequence = generateSequenceFromPhases(finalPhases);
      
      // Reset to original positions
      const start = state.recordingStartPositions;
      set(state => ({
        recording: false,
        recordingPaused: false,
        recordingPhases: [],
        currentPhaseStart: {},
        tokens: state.tokens.map(t => start[t.id] ? { ...t, x: start[t.id].x, y: start[t.id].y } : t),
        selectedTokenIds: [],
        sequences: [...state.sequences, sequence]
      }));
    },

    checkAutoResume: () => {
      const state = get();
      // Auto-resume recording when user moves tokens after pause
      if (state.recordingPaused && !state.recording) {
        console.log('Auto-resuming recording after token movement');
        set({ 
          recording: true, 
          recordingPaused: false 
        });
      }
    },

    // Animation sequence actions
    addSequence: (sequence: AnimationSequence) => {
      const state = get();
      set({
        sequences: [...state.sequences, sequence],
      });
    },

    removeSequence: (sequenceId: string) => {
      const state = get();
      set({
        sequences: state.sequences.filter(s => s.id !== sequenceId),
        currentSequence: state.currentSequence?.id === sequenceId ? null : state.currentSequence,
      });
    },

    playSequence: (sequenceId: string) => {
      const state = get();
      const sequence = state.sequences.find(s => s.id === sequenceId);
      if (!sequence) return;

      set({
        currentSequence: sequence,
        playbackState: {
          ...state.playbackState,
          isPlaying: true,
          isPaused: false,
          currentTime: 0,
          sequence,
        },
      });

      // Start animation loop
      const startTime = Date.now();
      const animationLoop = () => {
        const current = get();
        if (!current.playbackState.isPlaying || current.playbackState.sequence?.id !== sequenceId) {
          return;
        }

        const elapsed = (Date.now() - startTime) * current.playbackState.speed;
        const progress = Math.min(elapsed / sequence.totalDuration, 1);

        // Update token positions based on current time
        const activeSteps = sequence.steps.filter(step => 
          step.timestamp <= elapsed && elapsed <= step.timestamp + step.duration
        );

        const tokenUpdates: Record<string, Partial<Token>> = {};
        const temporaryArrows: any[] = [];
        const temporaryTrajectories: any[] = [];
        let overlay: string | null = null;
        
        activeSteps.forEach(step => {
          if (step.tokenId && step.type === 'move' && step.from && step.to) {
            const stepProgress = (elapsed - step.timestamp) / step.duration;
            const easedProgress = applyEasing(stepProgress, step.easing || 'linear');
            
            const x = step.from.x + (step.to.x - step.from.x) * easedProgress;
            const y = step.from.y + (step.to.y - step.from.y) * easedProgress;
            
            // Convert normalized coordinates to field coordinates
            const fieldWidth = 105;
            const fieldHeight = 68;
            
            tokenUpdates[step.tokenId] = {
              x: x * fieldWidth,
              y: y * fieldHeight,
            };
          } else if (step.type === 'show_arrow' && step.arrowData) {
            // Show arrow during this phase
            temporaryArrows.push(step.arrowData);
          } else if (step.type === 'show_trajectory' && step.trajectoryData) {
            // Show trajectory during this phase  
            temporaryTrajectories.push(step.trajectoryData);
          } else if (step.type === 'show_canvas' && step.canvasData) {
            overlay = step.canvasData;
          }
        });

        // Apply token updates and temporary lines
        set(state => ({
          ...state,
          tokens: Object.keys(tokenUpdates).length > 0 
            ? state.tokens.map(token => 
                tokenUpdates[token.id] 
                  ? { ...token, ...tokenUpdates[token.id] }
                  : token
              )
            : state.tokens,
          // Show phase-specific arrows and trajectories during animation
          arrows: temporaryArrows.length > 0 ? temporaryArrows : state.arrows,
          trajectories: temporaryTrajectories.length > 0 ? temporaryTrajectories : state.trajectories,
          playbackOverlay: overlay,
          playbackState: {
            ...state.playbackState,
            currentTime: elapsed,
          },
        }));

        if (progress < 1) {
          requestAnimationFrame(animationLoop);
        } else {
          // Animation finished
          set(state => ({
            ...state,
            playbackState: {
              ...state.playbackState,
              isPlaying: false,
              currentTime: sequence.totalDuration,
            },
            playbackOverlay: null,
          }));
        }
      };

      requestAnimationFrame(animationLoop);
    },

    pauseSequence: () => {
      set(state => ({
        ...state,
        playbackState: {
          ...state.playbackState,
          isPlaying: false,
          isPaused: true,
        },
      }));
    },

    resumeSequence: () => {
      const state = get();
      if (!state.playbackState.sequence || !state.playbackState.isPaused) return;
      
      set({
        playbackState: {
          ...state.playbackState,
          isPlaying: true,
          isPaused: false,
        },
      });

      // Resume animation from current time
      const startTime = Date.now() - (state.playbackState.currentTime / state.playbackState.speed);
      const sequence = state.playbackState.sequence;
      
      const animationLoop = () => {
        const current = get();
        if (!current.playbackState.isPlaying) return;

        const elapsed = (Date.now() - startTime) * current.playbackState.speed;
        const progress = Math.min(elapsed / sequence.totalDuration, 1);

        // Same animation logic as playSequence
        const activeSteps = sequence.steps.filter(step => 
          step.timestamp <= elapsed && elapsed <= step.timestamp + step.duration
        );

        const tokenUpdates: Record<string, Partial<Token>> = {};
        const temporaryArrows: any[] = [];
        const temporaryTrajectories: any[] = [];
        let overlay: string | null = null;
        
        activeSteps.forEach(step => {
          if (step.tokenId && step.type === 'move' && step.from && step.to) {
            const stepProgress = (elapsed - step.timestamp) / step.duration;
            const easedProgress = applyEasing(stepProgress, step.easing || 'linear');
            
            const x = step.from.x + (step.to.x - step.from.x) * easedProgress;
            const y = step.from.y + (step.to.y - step.from.y) * easedProgress;
            
            const fieldWidth = 105;
            const fieldHeight = 68;
            
            tokenUpdates[step.tokenId] = {
              x: x * fieldWidth,
              y: y * fieldHeight,
            };
          } else if (step.type === 'show_arrow' && step.arrowData) {
            temporaryArrows.push(step.arrowData);
          } else if (step.type === 'show_trajectory' && step.trajectoryData) {
            temporaryTrajectories.push(step.trajectoryData);
          } else if (step.type === 'show_canvas' && step.canvasData) {
            overlay = step.canvasData;
          }
        });

        // Apply token updates and temporary lines
        set(state => ({
          ...state,
          tokens: Object.keys(tokenUpdates).length > 0 
            ? state.tokens.map(token => 
                tokenUpdates[token.id] 
                  ? { ...token, ...tokenUpdates[token.id] }
                  : token
              )
            : state.tokens,
          // Show phase-specific arrows and trajectories during animation
          arrows: temporaryArrows.length > 0 ? temporaryArrows : state.arrows,
          trajectories: temporaryTrajectories.length > 0 ? temporaryTrajectories : state.trajectories,
          playbackOverlay: overlay,
          playbackState: {
            ...state.playbackState,
            currentTime: elapsed,
          },
        }));

        if (progress < 1) {
          requestAnimationFrame(animationLoop);
        } else {
          set(state => ({
            ...state,
            playbackState: {
              ...state.playbackState,
              isPlaying: false,
              currentTime: sequence.totalDuration,
            },
          }));
        }
      };

      requestAnimationFrame(animationLoop);
    },

    stopSequence: () => {
      set(state => ({
        ...state,
        playbackState: {
          ...state.playbackState,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        },
        playbackOverlay: null,
      }));
    },

    setPlaybackSpeed: (speed: number) => {
      set(state => ({
        ...state,
        playbackState: {
          ...state.playbackState,
          speed: Math.max(0.1, Math.min(3, speed)), // Clamp between 0.1x and 3x
        },
      }));
    },

    seekTo: (time: number) => {
      const state = get();
      if (!state.playbackState.sequence) return;
      
      const clampedTime = Math.max(0, Math.min(state.playbackState.sequence.totalDuration, time));
      
      set({
        playbackState: {
          ...state.playbackState,
          currentTime: clampedTime,
        },
      });
    },
  }));

// Auto-save on state changes
let previousState: any = null;
useBoardStore.subscribe((state) => {
  const currentState = {
    tokens: state.tokens,
    arrows: state.arrows,
    trajectories: state.trajectories,
    mode: state.mode,
    arrowStyle: state.arrowStyle,
    trajectoryType: state.trajectoryType,
    gridSnap: state.gridSnap,
    zoom: state.zoom,
    pan: state.pan,
    showFullField: state.showFullField,
  };
  
  if (JSON.stringify(currentState) !== JSON.stringify(previousState)) {
    saveToStorage('boardState', currentState);
    previousState = currentState;
  }
});
