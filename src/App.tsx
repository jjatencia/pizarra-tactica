import { useRef, useEffect, useState, useCallback } from 'react';
import { useBoardStore } from './hooks/useBoardStore';
import { usePointerInteractions } from './hooks/usePointerInteractions';
import { useZoomPan } from './hooks/useZoomPan';
import { useSimpleDrawing } from './hooks/useSimpleDrawing';
import { Pitch } from './components/Pitch';
import { Token } from './components/Token';
import { ArrowsLayer } from './components/ArrowsLayer';
import { TrajectoriesLayer } from './components/TrajectoriesLayer';
import { Toolbar } from './components/Toolbar';
import { PresetsPanel } from './components/PresetsPanel';
import { FormationsModal } from './components/FormationsModal';
import { TokenNumberModal } from './components/TokenNumberModal';
import { TacticalDescriptionInput } from './components/TacticalDescriptionInput';
import { PlaybackControls } from './components/PlaybackControls';
import { Team, ObjectType, TokenSize, Token as TokenType, Formation } from './types';
import { clampToField, snapToGrid } from './lib/geometry';
import { convertTacticalToAnimationSequence, setupTokensFromSequence } from './lib/ai/sequenceConverter';
import clsx from 'clsx';
import { CanvasTacticPack } from './types/canvas';

function App() {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [showPresets, setShowPresets] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenType | null>(null);
  const [sizeSettings, setSizeSettings] = useState<Record<Team | 'ball' | 'cone' | 'minigoal', TokenSize>>({
    red: 'medium',
    blue: 'medium',
    green: 'medium',
    yellow: 'medium',
    ball: 'medium',
    cone: 'medium',
    minigoal: 'medium',
  });
  const [error, setError] = useState<string | null>(null);
  // Removed canvas tap refs as double tap is not used for lines anymore
  
  const {
    tokens,
    arrows,
    trajectories,
    mode,
    zoom,
    pan,
    showFullField,
    gridSnap,

    addToken,
    addObject,
    applyFormation,
    applyFormationByName,
    selectArrow,
    updateArrow,
    selectTrajectory,
    updateTrajectory,
    updateToken,
    load,
    recording,
    startRecording,
    stopRecording,
    playTokenPaths,
    reset,
    addSequence,
  } = useBoardStore();
  
  // Field dimensions
  const fieldWidth = 105;
  const fieldHeight = 68;
  const viewBoxWidth = showFullField ? fieldWidth : fieldWidth / 2;
  
  // Calculate SVG dimensions to maintain aspect ratio
  const aspectRatio = viewBoxWidth / fieldHeight;
  
  // More accurate toolbar height calculation for PWA
  const toolbarHeight = 80; // Increased for PWA safe areas
  const safeAreaBottom = 34; // Typical safe area bottom on iPad
  const extraPadding = 20; // Extra padding for comfort
  
  const availableHeight = containerSize.height - toolbarHeight - safeAreaBottom - extraPadding;
  const availableWidth = containerSize.width - 32; // Account for container padding
  
  let svgWidth = availableWidth;
  let svgHeight = availableWidth / aspectRatio;
  
  // Ensure the field fits in available height with extra margin
  if (svgHeight > availableHeight) {
    svgHeight = availableHeight;
    svgWidth = availableHeight * aspectRatio;
  }
  
  // Zoom and pan setup
  const { attachWheelListener, attachTouchListeners } = useZoomPan(svgRef);
  
  // Pointer interactions
  const {
    handleTokenPointerDown,
    handleSVGPointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    // isDragging, // Not used with new canvas drawing
    isDrawingTrajectory,
    trajectoryPreview,
    selectionRect,
  } = usePointerInteractions(svgRef, viewBoxWidth, fieldHeight);

  // Canvas drawing
  const {
    // isDrawing, // Not used in current implementation
    color: drawColor,
    // lineStyle: drawLineStyle, // Not used with new mode system
    drawingMode,
    canUndo: canUndoDraw,
    canRedo: canRedoDraw,
    startDrawing,
    draw,
    endDrawing,
    undo: undoDraw,
    redo: redoDraw,
    setColor: setDrawColor,
    // setLineStyle: setDrawLineStyle, // Not used with new mode system
    setDrawingMode,
    clearCanvas,
  } = useSimpleDrawing(canvasRef);

  // Selector de jugadas IA en la pizarra
  const [aiPacks, setAiPacks] = useState<CanvasTacticPack[] | null>(null);
  const [showAIPackSelector, setShowAIPackSelector] = useState(false);
  const [selectedAIPackIdx, setSelectedAIPackIdx] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  
    // Handle container resize with PWA detection
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        
        // Detect if we're in PWA mode
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        
        let adjustedHeight = rect.height;
        
        if (isPWA) {
          // In PWA mode, account for safe areas and ensure field is fully visible
          const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0');
          const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0');
          
          // Use visual viewport if available (better for PWA)
          if (window.visualViewport) {
            adjustedHeight = window.visualViewport.height - safeAreaTop - safeAreaBottom;
          } else {
            adjustedHeight = window.innerHeight - safeAreaTop - safeAreaBottom;
          }
          
          console.log('📱 PWA Mode - Adjusted height:', adjustedHeight, 'Original:', rect.height);
        }
        
        setContainerSize({ width: rect.width, height: adjustedHeight });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Listen for visual viewport changes (PWA specific)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
        window.visualViewport?.removeEventListener('resize', updateSize);
      };
    }
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Initialize canvas
  useEffect(() => {
    // Canvas initialization is handled by the useSimpleDrawing hook
  }, []);
  
  // Load saved state on mount
  useEffect(() => {
    load();
    
    // Check if there's a tactical pack to load from the AI report
    const tacticalPackData = sessionStorage.getItem("tactical_pack_to_load");
    if (tacticalPackData) {
      try {
        const pack = JSON.parse(tacticalPackData);
        loadTacticalPackToBoard(pack);
        // Reproducir animación basada en primitivas si existen
        try { playAISequence(pack); } catch (e) { console.warn('No se pudo reproducir la secuencia IA', e); }
        sessionStorage.removeItem("tactical_pack_to_load");
      } catch (error) {
        console.error("Error loading tactical pack:", error);
      }
    }

    // Cargar último set de jugadas para selector
    try {
      const packsRaw = sessionStorage.getItem('last_ai_packs');
      if (packsRaw) setAiPacks(JSON.parse(packsRaw));
    } catch {}
  }, [load]);
  
  // Setup zoom/pan event listeners
  useEffect(() => {
    if (!svgRef.current) return;
    
    const cleanupWheel = attachWheelListener(svgRef.current);
    const cleanupTouch = attachTouchListeners(svgRef.current);
    
    return () => {
      cleanupWheel();
      cleanupTouch();
    };
  }, [attachWheelListener, attachTouchListeners]);
  
  // Handle adding tokens
  const handleAddToken = useCallback((team: Team, size: TokenSize) => {
    // Add token at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addToken(team, position.x, position.y, 'player', size);
    
    // Automatically switch to move mode after adding a token
    setDrawingMode('move');
  }, [addToken, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap, setDrawingMode]);

  // Handle formation application from modal
  const handleApplyFormation = useCallback((team: Team, formation: string) => {
    applyFormationByName(formation, team, sizeSettings[team]);

    // Automatically switch to move mode after applying formation
    setDrawingMode('move');
  }, [applyFormationByName, setDrawingMode, sizeSettings]);

  // Handle formation application from presets panel
  const handlePresetFormation = useCallback((formation: Formation, team: Team) => {
    applyFormation(formation, team, sizeSettings[team]);
    setDrawingMode('move');
  }, [applyFormation, setDrawingMode, sizeSettings]);

  const handleEditNumber = useCallback((token: TokenType) => {
    setEditingToken(token);
  }, []);

  const handleSaveNumber = useCallback((newNumber: number) => {
    if (!editingToken) return;
    if (Number.isNaN(newNumber) || newNumber < 1 || newNumber > 99) {
      alert('Número inválido');
      return;
    }
    const teamTokens = tokens.filter(t => t.team === editingToken.team && t.id !== editingToken.id);
    if (teamTokens.some(t => t.number === newNumber)) {
      alert('Número ya utilizado en este equipo');
      return;
    }
    updateToken(editingToken.id, { number: newNumber });
    setEditingToken(null);
  }, [editingToken, tokens, updateToken]);

  const handleCloseEdit = useCallback(() => setEditingToken(null), []);

  // Handle adding objects
  const handleAddObject = useCallback((type: ObjectType, size: TokenSize) => {
    // Add object at center of visible area
    const centerX = showFullField ? fieldWidth / 2 : viewBoxWidth / 2;
    const centerY = fieldHeight / 2;
    
    let position = { x: centerX, y: centerY };
    
    if (gridSnap) {
      position = snapToGrid(position);
    }
    
    position = clampToField(position, viewBoxWidth, fieldHeight);
    
    addObject(type, position.x, position.y, size);

    // Automatically switch to move mode after adding an object
    setDrawingMode('move');
  }, [addObject, showFullField, fieldWidth, fieldHeight, viewBoxWidth, gridSnap, setDrawingMode]);

  const handleToggleRecording = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const handlePlayRecording = useCallback(() => {
    playTokenPaths();
  }, [playTokenPaths]);

  // Handle tactical sequence generation
  const handleSequenceGenerated = useCallback(async (tacticalSequence: any, originalDescription: string) => {
    console.log('🎬 App.tsx: Recibiendo secuencia táctica:', tacticalSequence);
    console.log('🎬 App.tsx: Descripción original:', originalDescription);
    
    try {
      // Check if sequence has questions - these should be handled by the question dialog, not processed directly
      if (tacticalSequence.questions && tacticalSequence.questions.length > 0) {
        console.warn('⚠️ App.tsx: Sequence with questions received - this should be handled by TacticalDescriptionInput dialog');
        console.log('⚠️ Questions:', tacticalSequence.questions);
        console.log('⚠️ This sequence should not reach App.tsx - questions should be answered first');
        return;
      }
      
      console.log('🔄 App.tsx: Convirtiendo secuencia táctica a secuencia de animación...');
      console.log('🔍 App.tsx: Tactical sequence steps:', tacticalSequence.steps);
      console.log('🔍 App.tsx: Available tokens:', tokens);
      
      // Convert tactical sequence to animation sequence
      const animationSequence = convertTacticalToAnimationSequence(tacticalSequence, tokens);
      console.log('✅ App.tsx: Secuencia de animación creada:', animationSequence);
      
      console.log('🔍 App.tsx: Validating animation sequence...');
      console.log('🔍 App.tsx: Animation sequence steps count:', animationSequence.steps?.length || 0);
      
      // Validate animation sequence
      if (!animationSequence.steps || animationSequence.steps.length === 0) {
        console.error('❌ App.tsx: Animation sequence has no valid steps:', animationSequence);
        throw new Error('La secuencia de animación no tiene pasos válidos');
      }
      
      console.log('📝 App.tsx: Añadiendo secuencia al store...');
      // Add sequence to store
      addSequence(animationSequence);
      console.log('✅ App.tsx: Sequence added to store successfully');
      
      console.log('🎭 App.tsx: Configurando fichas iniciales si es necesario...');
      console.log('🔍 App.tsx: Current tokens count:', tokens.length);
      // Set up initial formation if needed
      if (tokens.length === 0) {
        console.log('🎭 App.tsx: No tokens found, setting up from sequence...');
        setupTokensFromSequence(animationSequence, (team: Team, x: number, y: number) => addToken(team, x, y, 'player', 'medium'), reset);
        console.log('✅ App.tsx: Initial formation set up');
      } else {
        console.log('ℹ️ App.tsx: Tokens already exist, skipping initial setup');
      }
      
      console.log('🎉 App.tsx: Mostrando notificación de éxito...');
      setNotice(`✅ Secuencia creada: ${animationSequence.title}`);
      setTimeout(() => setNotice(null), 2000);
      console.log('🎉 App.tsx: Process completed successfully!');
      
      // Clear any error
      setError(null);
      console.log('✅ App.tsx: Procesamiento completado exitosamente');
      
    } catch (err) {
      console.error('❌ App.tsx: Error processing sequence:', err);
      console.error('❌ App.tsx: Stack trace:', err instanceof Error ? err.stack : 'No stack');
      const errorMsg = 'Error procesando la secuencia generada: ' + (err instanceof Error ? err.message : 'Error desconocido');
      setError(errorMsg);
    }
  }, [tokens, addSequence, addToken, reset]);

  const handleSequenceError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  }, []);

  // Function to load tactical pack to board
  const loadTacticalPackToBoard = useCallback((pack: CanvasTacticPack) => {
    console.log("🎯 Cargando situación táctica:", pack.titulo);
    
    // Clear the current board
    const { reset, addToken } = useBoardStore.getState();
    reset();
    
    // Place only player tokens (markers). Lines are handled by animation.
    pack.primitivas
      .filter((pr) => pr.tipo === 'marker' && pr.puntos && pr.puntos.length > 0)
      .forEach((m) => {
        const fieldWidth = 105;
        const fieldHeight = 68;
        const pt = { x: m.puntos[0].x * fieldWidth, y: m.puntos[0].y * fieldHeight };
        const team = m.equipo === 'propio' ? 'blue' : 'red';
        addToken(team, pt.x, pt.y, 'player', 'medium');
      });
    
    // Mensaje no bloqueante
    setNotice(`✅ ${pack.titulo}`);
    setTimeout(() => setNotice(null), 1800);
  }, []);

  // Reproducir animación IA: mueve fichas y balón siguiendo primitivas y tiempos
  const playAISequence = useCallback((pack: CanvasTacticPack) => {
    const store = useBoardStore.getState();
    store.clearTokenPaths();

    const fieldWidth = 105;
    const fieldHeight = 68;

    // Parámetros de tiempo (ms) y velocidades realistas
    const FRAME_MS = 33; // ~30fps
    const PLAYER_SPEED_MPS = 4.2; // velocidad media de desplazamiento
    const BALL_SPEED_MPS = 16; // velocidad media del pase raso
    const MIN_MOVE_MS = 300;
    const MAX_MOVE_MS = 2500;
    const MIN_PASS_MS = 200;
    const MAX_PASS_MS = 1500;
    const RECEIVER_LEAD_FRAC = 0.35; // el receptor empieza ~35% antes del pase

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const dist = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x - b.x, a.y - b.y);
    const easeLinear = (t: number) => t;
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
    const moveDuration = (from: {x:number;y:number}, to: {x:number;y:number}) => {
      const d = dist(from, to);
      return clamp((d / PLAYER_SPEED_MPS) * 1000, MIN_MOVE_MS, MAX_MOVE_MS);
    };
    const passDuration = (from: {x:number;y:number}, to: {x:number;y:number}) => {
      const d = dist(from, to);
      return clamp((d / BALL_SPEED_MPS) * 1000, MIN_PASS_MS, MAX_PASS_MS);
    };

    // Helper: encontrar ficha más cercana de un equipo a un punto (prioriza fichas derivadas de markers IA)
    const findNearestTokenId = (team: 'blue' | 'red', point: { x: number; y: number }, preferMarkerLinked = true) => {
      const stateTokens = useBoardStore.getState().tokens.filter(t => t.type === 'player' && t.team === team);
      const markerIds = new Set(Object.values(markerToToken));
      const pool = preferMarkerLinked ? stateTokens.filter(t => markerIds.has(t.id)) : stateTokens;
      const candidates = preferMarkerLinked && pool.length > 0 ? pool : stateTokens;
      let minD = Infinity; let id: string | null = null;
      candidates.forEach(t => {
        const d = Math.hypot(t.x - point.x, t.y - point.y);
        if (d < minD) { minD = d; id = t.id; }
      });
      return id;
    };

    // Crear fichas iniciales desde markers y mapear marker.id -> token.id
    const markerToToken: Record<string, string> = {};
    const markers = pack.primitivas.filter(p => p.tipo === 'marker');
    markers.forEach(m => {
      if (!m.puntos || m.puntos.length === 0) return;
      const pt = { x: m.puntos[0].x * fieldWidth, y: m.puntos[0].y * fieldHeight };
      const team = m.equipo === 'propio' ? 'blue' : 'red';
      const before = useBoardStore.getState().tokens.length;
      const nearest = findNearestTokenId(team, pt);
      const nearEnough = nearest && Math.hypot((useBoardStore.getState().tokens.find(t => t.id===nearest)!.x - pt.x), (useBoardStore.getState().tokens.find(t => t.id===nearest)!.y - pt.y)) <= 3;
      if (!nearEnough) store.addToken(team, pt.x, pt.y, 'player', 'medium');
      const afterTokens = useBoardStore.getState().tokens;
      let created: string | null = null;
      if (afterTokens.length > before) {
        created = afterTokens[afterTokens.length - 1].id;
      } else if (nearest) {
        created = nearest;
      }
      if (created) markerToToken[m.id] = created;
    });

    // Preparar timeline
    const primitives = [...pack.primitivas];
    const totalDuration = primitives.reduce((acc, pr) => {
      if (!pr.puntos || pr.puntos.length < 2) return acc;
      const from = { x: pr.puntos[0].x * fieldWidth, y: pr.puntos[0].y * fieldHeight };
      const to = { x: pr.puntos[1].x * fieldWidth, y: pr.puntos[1].y * fieldHeight };
      const base = pr.tipo === 'arrow' ? passDuration(from, to) : pr.tipo === 'move' ? moveDuration(from, to) : 0;
      const end = (pr.tiempo || 0) + base;
      return Math.max(acc, end);
    }, 0);
    // totalSteps no longer used; maxStepUsed tracks effective length

    // Paths por tokenId
    const tokenIds = useBoardStore.getState().tokens.map(t => t.id);
    const initialPositions: Record<string, { x:number; y:number }> = {};
    tokenIds.forEach(id => {
      const t = useBoardStore.getState().tokens.find(x => x.id === id)!;
      initialPositions[id] = { x: t.x, y: t.y };
    });

    // Ball setup
    let ballId: string | null = useBoardStore.getState().tokens.find(t => t.type === 'ball')?.id || null;
    const ensureBall = (p: { x:number; y:number }) => {
      if (!ballId) {
        store.addObject('ball', p.x, p.y, 'small');
        ballId = useBoardStore.getState().tokens.find(t => t.type === 'ball')?.id || null;
        if (ballId) initialPositions[ballId] = { x: p.x, y: p.y };
      } else {
        store.updateToken(ballId, { x: p.x, y: p.y });
        initialPositions[ballId] = { x: p.x, y: p.y };
      }
    };

    // Asegurar al menos 4 jugadores por equipo para dar contexto
    const ensureMinPlayers = (team: 'blue'|'red', min = 4) => {
      const tokensNow = useBoardStore.getState().tokens.filter(t => t.type === 'player' && t.team === team);
      const need = Math.max(0, min - tokensNow.length);
      if (need === 0) return;
      const base: { x:number; y:number }[] = [
        { x: 0.38 * fieldWidth, y: 0.40 * fieldHeight },
        { x: 0.46 * fieldWidth, y: 0.58 * fieldHeight },
        { x: 0.54 * fieldWidth, y: 0.35 * fieldHeight },
        { x: 0.44 * fieldWidth, y: 0.22 * fieldHeight },
        { x: 0.60 * fieldWidth, y: 0.48 * fieldHeight },
      ];
      const candidates = team === 'blue' ? base : base.map(p => ({ x: fieldWidth - p.x, y: p.y }));
      const minDist = 3; // metros
      let added = 0;
      for (const c of candidates) {
        if (added >= need) break;
        const tooClose = useBoardStore.getState().tokens.some(t => Math.hypot(t.x - c.x, t.y - c.y) < minDist);
        if (!tooClose) {
          store.addToken(team, c.x, c.y, 'player', 'medium');
          added++;
        }
      }
    };

    ensureMinPlayers('blue', 4);
    ensureMinPlayers('red', 4);

    // Determinar punto inicial del balón
    const firstArrow = primitives.filter(p => p.tipo === 'arrow').sort((a,b)=>(a.tiempo||0)-(b.tiempo||0))[0];
    if (firstArrow) {
      const from = { x: firstArrow.puntos[0].x * fieldWidth, y: firstArrow.puntos[0].y * fieldHeight };
      const team = firstArrow.equipo === 'propio' ? 'blue' : 'red';
      const passerId = (firstArrow.targets && firstArrow.targets[0] && markerToToken[firstArrow.targets[0]]) || findNearestTokenId(team, from);
      if (passerId) {
        const passer = useBoardStore.getState().tokens.find(t => t.id === passerId)!;
        ensureBall({ x: passer.x, y: passer.y });
      } else {
        ensureBall(from);
      }
    }

    // Estructuras auxiliares
    const paths: Record<string, { x:number; y:number }[]> = {};
    const lastPoint: Record<string, { x:number; y:number }> = { ...initialPositions };
    let maxStepUsed = Math.max(1, Math.ceil(totalDuration / FRAME_MS));
    const ensureLen = (id: string, len: number) => {
      if (!paths[id]) paths[id] = [];
      const lp = lastPoint[id] || initialPositions[id];
      while (paths[id].length < len) paths[id].push({ x: lp.x, y: lp.y });
    };
    const getPointAt = (id: string, step: number) => {
      const arr = paths[id];
      if (arr && arr.length > step) return arr[step];
      return lastPoint[id] || initialPositions[id];
    };
    const addLinear = (id: string, from: {x:number;y:number}, to: {x:number;y:number}, startStep: number, steps: number, ease: (t:number)=>number = easeLinear) => {
      ensureLen(id, startStep);
      const start = paths[id].length === 0 ? from : paths[id][paths[id].length - 1];
      // si hay salto, rellenar con 'from' hasta startStep
      while (paths[id].length < startStep) paths[id].push({ x: start.x, y: start.y });
      for (let i=1; i<=steps; i++) {
        const t = ease(i/steps);
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        paths[id].push({ x, y });
      }
      lastPoint[id] = { x: to.x, y: to.y };
      maxStepUsed = Math.max(maxStepUsed, startStep + steps);
    };
    const addBezier = (id: string, from: {x:number;y:number}, cp: {x:number;y:number}, to: {x:number;y:number}, startStep: number, steps: number, ease: (t:number)=>number = easeInOutCubic) => {
      ensureLen(id, startStep);
      const start = paths[id].length === 0 ? from : paths[id][paths[id].length - 1];
      while (paths[id].length < startStep) paths[id].push({ x: start.x, y: start.y });
      for (let i=1; i<=steps; i++) {
        const te = ease(i/steps);
        const omt = 1 - te;
        const x = omt*omt*from.x + 2*omt*te*cp.x + te*te*to.x;
        const y = omt*omt*from.y + 2*omt*te*cp.y + te*te*to.y;
        paths[id].push({ x, y });
      }
      lastPoint[id] = { x: to.x, y: to.y };
      maxStepUsed = Math.max(maxStepUsed, startStep + steps);
    };

    // Construir timeline respetando tiempos
    const sorted = primitives.sort((a,b)=>(a.tiempo||0)-(b.tiempo||0));
    sorted.forEach(pr => {
      const t0 = pr.tiempo || 0;
      if (!pr.puntos || pr.puntos.length < 2) return;
      const from = { x: pr.puntos[0].x * fieldWidth, y: pr.puntos[0].y * fieldHeight };
      const to = { x: pr.puntos[1].x * fieldWidth, y: pr.puntos[1].y * fieldHeight };
      if (pr.tipo === 'move') {
        const team = pr.equipo === 'propio' ? 'blue' : 'red';
        const id = (pr.targets && pr.targets[0] && markerToToken[pr.targets[0]]) || findNearestTokenId(team, from);
        if (id) {
          const startStep = Math.max(0, Math.floor(t0 / FRAME_MS));
          const dur = moveDuration(lastPoint[id] || from, to);
          const steps = Math.max(6, Math.floor(dur / FRAME_MS));
          addLinear(id, lastPoint[id] || from, to, startStep, steps, easeInOutCubic);
        }
      } else if (pr.tipo === 'arrow') {
        const team = pr.equipo === 'propio' ? 'blue' : 'red';
        const passerId = (pr.targets && pr.targets[0] && markerToToken[pr.targets[0]]) || findNearestTokenId(team, from);
        const receiverId = (pr.targets && pr.targets[1] && markerToToken[pr.targets[1]]) || findNearestTokenId(team, to);
        // Mover receptor un poco antes
        if (receiverId) {
          const lead = RECEIVER_LEAD_FRAC * passDuration(from, to);
          const startStepR = Math.max(0, Math.floor((t0 - lead) / FRAME_MS));
          const durR = moveDuration(lastPoint[receiverId] || to, to) * 0.6;
          const stepsR = Math.max(4, Math.floor(durR / FRAME_MS));
          addLinear(receiverId, lastPoint[receiverId] || to, to, startStepR, stepsR, easeOutQuad);
        }
        // Pase del balón con coordinación: espera a que el receptor alcance ~70% de su movimiento
        const baseStartStep = Math.max(0, Math.floor(t0 / FRAME_MS));
        let startStepB = baseStartStep;
        if (receiverId && paths[receiverId]) {
          // usamos el último tramo añadido para el receptor
          const stepsR = paths[receiverId].length;
          const readyStep = Math.max(baseStartStep, Math.floor(stepsR * 0.7));
          startStepB = Math.max(baseStartStep, readyStep);
        }

        // Garantizar lectura de posiciones a startStepB
        if (passerId) ensureLen(passerId, startStepB + 1);
        if (receiverId) ensureLen(receiverId, startStepB + 1);

        // Control bajo presión: si hay rival muy cerca del pasador, hacer un micro-control antes de pasar
        const CONTROL_RADIUS = 3; // metros
        const CONTROL_OFFSET = 1.2; // metros
        const CONTROL_MS = 280;
        const controlSteps = Math.max(3, Math.floor(CONTROL_MS / FRAME_MS));
        if (passerId) {
          const passerTeam: 'blue' | 'red' = pr.equipo === 'propio' ? 'blue' : 'red';
          const rivals = useBoardStore.getState().tokens.filter(t => t.type === 'player' && t.team !== passerTeam);
          const passerAt = getPointAt(passerId, startStepB);
          let closest = Infinity;
          let nearest = null as null | { x:number;y:number };
          for (const r of rivals) {
            const dpr = dist(passerAt, { x: r.x, y: r.y });
            if (dpr < closest) { closest = dpr; nearest = { x: r.x, y: r.y }; }
          }
          if (nearest && closest < CONTROL_RADIUS) {
            // Mover ligeramente al pasador alejándose del rival
            const dx = passerAt.x - nearest.x;
            const dy = passerAt.y - nearest.y;
            const ll = Math.hypot(dx, dy) || 1;
            const ux = dx / ll, uy = dy / ll;
            const ctrlTo = { x: passerAt.x + ux * CONTROL_OFFSET, y: passerAt.y + uy * CONTROL_OFFSET };
            addLinear(passerId, passerAt, ctrlTo, startStepB, controlSteps, easeOutQuad);
            startStepB += controlSteps; // retrasar pase tras el control
            ensureLen(passerId, startStepB + 1);
          }
        }

        const passFrom = passerId ? getPointAt(passerId, startStepB) : from;
        const passTo = receiverId ? getPointAt(receiverId, startStepB) : to;
        if (!ballId) ensureBall(passFrom);
        if (ballId) {
          const durB = passDuration(passFrom, passTo);
          const stepsB = Math.max(4, Math.floor(durB / FRAME_MS));
          const dNow = dist(passFrom, passTo);
          const LONG_PASS = 25; // metros
          if (dNow > LONG_PASS) {
            // Rival-aware control point: curvar alejando del rival más cercano a la línea
            const vx = passTo.x - passFrom.x;
            const vy = passTo.y - passFrom.y;
            const len = Math.hypot(vx, vy) || 1;
            const ux = vx / len, uy = vy / len;
            const nx = -uy, ny = ux; // perpendicular
            const mid = { x: (passFrom.x + passTo.x) / 2, y: (passFrom.y + passTo.y) / 2 };
            const offset = clamp(dNow * 0.18, 6, 18); // altura del arco

            const passerTeam: 'blue' | 'red' = pr.equipo === 'propio' ? 'blue' : 'red';
            const rivals = useBoardStore.getState().tokens.filter(t => t.type === 'player' && t.team !== passerTeam);

            const nearestPointOnSeg = (a: {x:number;y:number}, b: {x:number;y:number}, p: {x:number;y:number}) => {
              const abx = b.x - a.x, aby = b.y - a.y;
              const ab2 = abx*abx + aby*aby || 1;
              const apx = p.x - a.x, apy = p.y - a.y;
              let t = (apx*abx + apy*aby) / ab2; t = Math.max(0, Math.min(1, t));
              return { x: a.x + abx*t, y: a.y + aby*t };
            };

            // Elegir lado
            let cp1 = { x: mid.x + nx * offset, y: mid.y + ny * offset };
            let cp2 = { x: mid.x - nx * offset, y: mid.y - ny * offset };

            if (rivals.length > 0) {
              let bestR = rivals[0];
              let bestD = Infinity;
              for (const r of rivals) {
                const np = nearestPointOnSeg(passFrom, passTo, { x: r.x, y: r.y });
                const dd = dist(np, { x: r.x, y: r.y });
                if (dd < bestD) { bestD = dd; bestR = r; }
              }
              const d1 = dist(cp1, { x: bestR.x, y: bestR.y });
              const d2 = dist(cp2, { x: bestR.x, y: bestR.y });
              const cp = d1 >= d2 ? cp1 : cp2;
              addBezier(ballId, lastPoint[ballId] || passFrom, cp, passTo, startStepB, stepsB, easeInOutCubic);
            } else {
              addBezier(ballId, lastPoint[ballId] || passFrom, cp1, passTo, startStepB, stepsB, easeInOutCubic);
            }
          } else {
            addLinear(ballId, lastPoint[ballId] || passFrom, passTo, startStepB, stepsB, easeInOutCubic);
          }
        }
      }
    });

    // Rellenar el resto de la línea de tiempo con la última posición
    Object.keys(paths).forEach(id => ensureLen(id, maxStepUsed + 1));

    // Volcar paths al store en orden de tiempo para reproducir coherente
    for (let s = 0; s <= maxStepUsed; s++) {
      Object.entries(paths).forEach(([id, arr]) => {
        const p = arr[Math.min(s, arr.length - 1)];
        store.addTokenPathPoint(id, p);
      });
    }

    // Reproducir
    setTimeout(() => store.playTokenPaths(), 200);
  }, []);

  // Handle canvas pointer down - no double tap for lines
  const handleCanvasPointerDown = useCallback((e: any) => {
    if (drawingMode === 'move') return; // Don't handle canvas events in move mode
    
    console.log('🎨 Canvas tap - starting drawing');
    startDrawing(e);
  }, [startDrawing, drawingMode]);
  
  // Calculate transform for zoom and pan
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;
  
  return (
    <div 
      ref={containerRef}
      className="bg-gray-800 text-white overflow-hidden"
      style={{ 
        height: '100dvh',
        minHeight: '100dvh',
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        gridTemplateAreas: '"toolbar" "content"'
      }}
    >
      {/* Toolbar */}
      <div style={{ gridArea: 'toolbar', flexShrink: 0 }} className="space-y-2 p-2">
        <Toolbar
        svgRef={svgRef}
        onAddToken={handleAddToken}
        onAddObject={handleAddObject}
        onShowPresets={() => setShowPresets(true)}
        onShowFormations={() => setShowFormations(true)}
        onOpenAIPackSelector={() => setShowAIPackSelector(true)}
        drawColor={drawColor}
        drawingMode={drawingMode}
        canUndoDraw={canUndoDraw}
        canRedoDraw={canRedoDraw}
        onSetDrawColor={setDrawColor}
        onSetDrawingMode={setDrawingMode}
        onUndoDraw={undoDraw}
        onRedoDraw={redoDraw}
        onClearCanvas={clearCanvas}
        sizeSettings={sizeSettings}
        onSizeChange={(key, size) => setSizeSettings(prev => ({ ...prev, [key]: size }))}
        isRecording={recording}
        onToggleRecording={handleToggleRecording}
        onPlayRecording={handlePlayRecording}
        />
        
        {/* Tactical Description Input */}
        <TacticalDescriptionInput
          onSequenceGenerated={handleSequenceGenerated}
          onError={handleSequenceError}
        />
        
        {/* Playback Controls */}
        <PlaybackControls />
      </div>
      
      {/* Main Content: Pitch */}
      <main 
        className="flex items-center justify-center p-2"
        style={{ 
          gridArea: 'content',
          minHeight: 0,
          height: '100%',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        }}
      >
        <div id="board" className={clsx("shadow-2xl rounded-lg relative bg-gray-900 p-1", {
          'erase-mode': mode === 'erase'
        })} style={{ 
          touchAction: 'none',
          aspectRatio: '105/68',
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}>
          <div id="pitch" className="pitch w-full h-full rounded-md relative">
            <svg
              ref={svgRef}
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${viewBoxWidth} ${fieldHeight}`}
              className="w-full h-full select-none absolute top-0 left-0"
              style={{
                touchAction: 'none',
                cursor: mode === 'trajectory' ? 'crosshair' : 'default',
                pointerEvents: 'auto',
                zIndex: 1,
              }}
              onPointerDown={handleSVGPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
            <g transform={transform}>
              {/* Pitch */}
              <Pitch
                width={viewBoxWidth}
                height={fieldHeight}
                showFullField={showFullField}
              />
              
              {/* Arrows Layer */}
              <ArrowsLayer
                arrows={arrows}
                onArrowSelect={selectArrow}
                onArrowUpdate={updateArrow}
              />
              
              {/* Trajectories Layer */}
              <TrajectoriesLayer
                trajectories={trajectories}
                onTrajectorySelect={selectTrajectory}
                onTrajectoryUpdate={updateTrajectory}
              />
              

              
              {/* Trajectory preview while drawing */}
              {isDrawingTrajectory && trajectoryPreview.length > 1 && (
                <path
                  d={trajectoryPreview.reduce((path, point, index) => {
                    if (index === 0) return `M ${point.x} ${point.y}`;
                    return `${path} L ${point.x} ${point.y}`;
                  }, '')}
                  stroke="white"
                  strokeWidth="1.2"
                  strokeDasharray="3,2"
                  fill="none"
                  opacity="0.7"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {selectionRect && (
                <rect
                  x={selectionRect.x}
                  y={selectionRect.y}
                  width={selectionRect.width}
                  height={selectionRect.height}
                  fill="rgba(251,191,36,0.1)"
                  stroke="#FBBF24"
                  strokeWidth={0.5}
                  strokeDasharray="4"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Tokens */}
              {tokens.map((token) => (
                <Token
                  key={token.id}
                  token={token}
                  fieldWidth={viewBoxWidth}
                  fieldHeight={fieldHeight}
                  onPointerDown={handleTokenPointerDown}
                  onEditNumber={handleEditNumber}
                />
              ))}
            </g>
            </svg>
            
            {/* Drawing Canvas - Above SVG */}
            <canvas 
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
              style={{ 
                touchAction: 'none',
                zIndex: drawingMode === 'move' ? 1 : 10,
                pointerEvents: drawingMode === 'move' ? 'none' : 'auto',
                backgroundColor: 'transparent',
                cursor: drawColor === 'transparent' ? 'crosshair' : 'default'
              }}
              onMouseDown={(e) => {
                console.log('🖱️ Mouse down on canvas');
                handleCanvasPointerDown(e);
              }}
              onMouseMove={(e) => {
                draw(e);
              }}
              onMouseUp={() => {
                endDrawing();
              }}
              onTouchStart={(e) => {
                console.log('👆 Touch start on canvas');
                e.preventDefault();
                handleCanvasPointerDown(e);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                draw(e);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                endDrawing();
              }}
            />
            
      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute top-4 right-4 bg-slate-800 text-white px-2 py-1 rounded text-sm" style={{ zIndex: 3 }}>
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Non-blocking notice */}
      {notice && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-2 rounded-md text-sm shadow-md" style={{ zIndex: 4 }}>
          {notice}
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 px-4 py-3 rounded-md text-sm shadow-md border border-red-700 max-w-md" style={{ zIndex: 4 }}>
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">❌</span>
            <div className="whitespace-pre-line">{error}</div>
          </div>
        </div>
      )}
          </div>
        </div>
      </main>
      
      {/* Formations Modal */}
      <FormationsModal
        isOpen={showFormations}
        onClose={() => setShowFormations(false)}
        onApplyFormation={handleApplyFormation}
      />
      
      {/* Presets Panel */}
      <PresetsPanel
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
        onApplyFormation={handlePresetFormation}
      />

      <TokenNumberModal
        isOpen={!!editingToken}
        currentNumber={editingToken?.number ?? 0}
        onClose={handleCloseEdit}
        onSave={handleSaveNumber}
      />

      {/* Selector de jugadas IA (dentro de la pizarra) */}
      {showAIPackSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAIPackSelector(false)} />
          <div className="relative z-10 bg-white text-black rounded-xl shadow-xl w-full max-w-xl p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Elegir jugada IA</h2>
              <button onClick={() => setShowAIPackSelector(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {(aiPacks || []).map((p, idx) => (
                <label key={idx} className="flex items-start gap-3 p-3 rounded border hover:bg-gray-50">
                  <input
                    type="radio"
                    name="board-ia-pack"
                    className="mt-1"
                    checked={selectedAIPackIdx === idx}
                    onChange={() => setSelectedAIPackIdx(idx)}
                  />
                  <div>
                    <div className="font-medium">{p.titulo}</div>
                    <div className="text-sm text-gray-600">{p.instrucciones?.join(' • ')}</div>
                    <div className="text-xs text-gray-500">{p.primitivas.length} movimientos</div>
                  </div>
                </label>
              ))}
              {(!aiPacks || aiPacks.length === 0) && (
                <div className="text-sm text-gray-600">No hay jugadas recientes. Genera un informe en Planes.</div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setShowAIPackSelector(false)}>Cancelar</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded"
                onClick={() => {
                  if (!aiPacks || aiPacks.length === 0) return;
                  const pack = aiPacks[selectedAIPackIdx];
                  loadTacticalPackToBoard(pack);
                  try { playAISequence(pack); } catch {}
                  setShowAIPackSelector(false);
                }}
              >
                Pintar y reproducir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
