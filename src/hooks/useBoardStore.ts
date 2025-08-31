import { create } from 'zustand';
import { BoardState, Token, Arrow, Trajectory, Team, Formation, HistoryState, Decoration, DecorationType } from '../types';
import { loadFromStorage, saveToStorage } from '../lib/localStorage';

interface BoardStore extends BoardState {
  // History
  history: HistoryState;
  
  // Token actions
  addToken: (team: Team, x: number, y: number) => void;
  updateToken: (id: string, updates: Partial<Token>) => void;
  removeToken: (id: string) => void;
  selectToken: (id: string | null) => void;
  
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
  
  // Decoration actions
  addDecoration: (type: DecorationType, x: number, y: number) => void;
  updateDecoration: (id: string, updates: Partial<Decoration>) => void;
  removeDecoration: (id: string) => void;
  selectDecoration: (id: string | null) => void;
  
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
  applyFormation: (formation: Formation, team: Team) => void;
  
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
}

const initialState: BoardState = {
  tokens: [],
  arrows: [],
  trajectories: [],
  decorations: [],
  mode: 'select',
  arrowStyle: 'solid',
  trajectoryType: 'pass',
  gridSnap: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  showFullField: true,
  selectedTokenId: null,
  selectedArrowId: null,
  selectedTrajectoryId: null,
  selectedDecorationId: null,
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

export const useBoardStore = create<BoardStore>((set, get) => ({
    ...initialState,
    history: initialHistory,
    
    addToken: (team: Team, x: number, y: number) => {
      const state = get();
      const teamTokens = state.tokens.filter(t => t.team === team);
      
      if (teamTokens.length >= 11) {
        // TODO: Show toast notification
        console.warn(`Máximo 11 fichas ${team} alcanzado`);
        return;
      }
      
      const number = getNextAvailableNumber(state.tokens, team);
      const newToken: Token = {
        id: generateId(),
        team,
        number,
        x,
        y,
      };
      
      const newState = {
        ...state,
        tokens: [...state.tokens, newToken],
        selectedTokenId: newToken.id,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    updateToken: (id: string, updates: Partial<Token>) => {
      const state = get();
      const newTokens = state.tokens.map(token =>
        token.id === id ? { ...token, ...updates } : token
      );
      
      const newState = {
        ...state,
        tokens: newTokens,
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
        selectedTokenId: state.selectedTokenId === id ? null : state.selectedTokenId,
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    selectToken: (id: string | null) => {
      set({ selectedTokenId: id, selectedArrowId: null, selectedTrajectoryId: null, selectedDecorationId: null });
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
      set({ selectedArrowId: id, selectedTokenId: null, selectedTrajectoryId: null, selectedDecorationId: null });
    },
    
    setMode: (mode: BoardState['mode']) => {
      set({ mode, selectedTokenId: null, selectedArrowId: null, selectedTrajectoryId: null, selectedDecorationId: null });
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
      set({ selectedTrajectoryId: id, selectedTokenId: null, selectedArrowId: null, selectedDecorationId: null });
    },
    
    setTrajectoryType: (trajectoryType: 'pass' | 'movement') => {
      set({ trajectoryType });
    },

    // Decorations
    addDecoration: (type: DecorationType, x: number, y: number) => {
      const state = get();
      const newDecoration: Decoration = {
        id: generateId(),
        type,
        x,
        y,
      };
      const newState = {
        ...state,
        decorations: [...state.decorations, newDecoration],
        selectedDecorationId: newDecoration.id,
      };
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    updateDecoration: (id: string, updates: Partial<Decoration>) => {
      const state = get();
      const newDecorations = state.decorations.map(d => d.id === id ? { ...d, ...updates } : d);
      const newState = { ...state, decorations: newDecorations };
      set({ ...newState, history: addToHistory(newState, state.history) });
    },
    removeDecoration: (id: string) => {
      const state = get();
      const newState = {
        ...state,
        decorations: state.decorations.filter(d => d.id !== id),
        selectedDecorationId: state.selectedDecorationId === id ? null : state.selectedDecorationId,
      };
      set({ ...newState, history: addToHistory(newState, state.history) });
    },
    selectDecoration: (id: string | null) => {
      set({ selectedDecorationId: id, selectedTokenId: null, selectedArrowId: null, selectedTrajectoryId: null });
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
        decorations: [],
      };
      
      set({
        ...newState,
        history: addToHistory(newState, get().history),
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
        decorations: state.decorations.map(d => ({ ...d, x: fieldWidth - d.x })),
      };
      
      set({
        ...newState,
        history: addToHistory(newState, state.history),
      });
    },
    
    applyFormation: (formation: Formation, team: Team) => {
      const state = get();
      const otherTeamTokens = state.tokens.filter(t => t.team !== team);
      const formationTokens = formation.tokens.map(token => ({
        ...token,
        id: generateId(),
        team,
      }));
      
      const newState = {
        ...state,
        tokens: [...otherTeamTokens, ...formationTokens],
        selectedTokenId: null,
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
        decorations: state.decorations,
        mode: state.mode,
        arrowStyle: state.arrowStyle,
        trajectoryType: state.trajectoryType,
        gridSnap: state.gridSnap,
        zoom: state.zoom,
        pan: state.pan,
        showFullField: state.showFullField,
        selectedTokenId: null, // Don't persist selection
        selectedArrowId: null,
        selectedTrajectoryId: null,
        selectedDecorationId: null,
      });
    },
    
    load: () => {
      const savedState = loadFromStorage<Partial<BoardState>>('boardState');
      if (savedState) {
        const newState = {
          ...initialState,
          ...savedState,
          selectedTokenId: null,
          selectedArrowId: null,
          selectedTrajectoryId: null,
          selectedDecorationId: null,
        };
        
        set({
          ...newState,
          history: {
            states: [newState],
            currentIndex: 0,
          },
        });
      }
    },
    
    exportState: () => {
      const state = get();
      return JSON.stringify({
        tokens: state.tokens,
        arrows: state.arrows,
        trajectories: state.trajectories,
        decorations: state.decorations,
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
            decorations: parsed.decorations || [],
            selectedTokenId: null,
            selectedArrowId: null,
            selectedTrajectoryId: null,
            selectedDecorationId: null,
          };
          
          set({
            ...newState,
            history: addToHistory(newState, get().history),
          });
        }
      } catch (error) {
        console.error('Error importing state:', error);
      }
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