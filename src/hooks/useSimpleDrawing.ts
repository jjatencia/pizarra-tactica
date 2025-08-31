import { useCallback, useState, useRef, useEffect } from 'react';

interface DrawingState {
  isDrawing: boolean;
  history: ImageData[];
  historyStep: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  currentPath: { x: number; y: number }[];
}

export const useSimpleDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    history: [],
    historyStep: -1,
    color: 'white',
    lineStyle: 'solid',
    currentPath: [],
  });

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      console.log('Canvas initialized:', rect.width, 'x', rect.height);
      
      // Save initial empty state
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setState(prev => ({
        ...prev,
        history: [imageData],
        historyStep: 0
      }));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [canvasRef]);

  const getCoords = useCallback((e: any) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, [canvasRef]);

  const startDrawing = useCallback((e: any) => {
    if (!canvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    console.log('🎨 Starting drawing at:', coords, 'Color:', state.color, 'Style:', state.lineStyle);

    setState(prev => ({ 
      ...prev, 
      isDrawing: true, 
      currentPath: [coords] 
    }));
    lastPointRef.current = coords;

    // Draw starting point
    ctx.fillStyle = state.color;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    console.log('✅ Drew starting point');
  }, [canvasRef, getCoords, state.color, state.lineStyle]);

  const draw = useCallback((e: any) => {
    if (!state.isDrawing || !canvasRef.current || !lastPointRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Add point to current path
    setState(prev => ({
      ...prev,
      currentPath: [...prev.currentPath, coords]
    }));

    if (state.lineStyle === 'solid') {
      // For solid lines, draw immediately
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = state.color;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    // For dashed lines, we'll draw the complete path at the end
    
    lastPointRef.current = coords;
  }, [canvasRef, getCoords, state.isDrawing, state.color, state.lineStyle]);

  const endDrawing = useCallback(() => {
    if (!state.isDrawing || !canvasRef.current) return;
    
    console.log('🏁 Ending drawing, Path length:', state.currentPath.length);
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // If it's a dashed line, draw the complete path now
    if (state.lineStyle === 'dashed' && state.currentPath.length > 1) {
      console.log('🖊️ Drawing dashed line with', state.currentPath.length, 'points');
      
      // Setup context for dashed drawing
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = state.color;
      ctx.globalCompositeOperation = 'source-over';
      ctx.setLineDash([25, 15]); // Larger pattern for better visibility
      
      // Create path from all points
      ctx.beginPath();
      ctx.moveTo(state.currentPath[0].x, state.currentPath[0].y);
      
      for (let i = 1; i < state.currentPath.length; i++) {
        ctx.lineTo(state.currentPath[i].x, state.currentPath[i].y);
      }
      
      ctx.stroke();
      console.log('✅ Dashed line drawn');
    }
    
    setState(prev => ({ 
      ...prev, 
      isDrawing: false, 
      currentPath: [] 
    }));
    lastPointRef.current = null;
    
    // Save to history
    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyStep + 1);
      newHistory.push(imageData);
      return {
        ...prev,
        history: newHistory,
        historyStep: newHistory.length - 1
      };
    });
  }, [canvasRef, state.isDrawing, state.currentPath, state.lineStyle, state.color]);

  const undo = useCallback(() => {
    if (!canvasRef.current || state.historyStep <= 0) return;
    
    console.log('↶ Undo drawing');
    
    const newStep = state.historyStep - 1;
    setState(prev => ({ ...prev, historyStep: newStep }));
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && state.history[newStep]) {
      ctx.putImageData(state.history[newStep], 0, 0);
    }
  }, [canvasRef, state.historyStep, state.history]);

  const redo = useCallback(() => {
    if (!canvasRef.current || state.historyStep >= state.history.length - 1) return;
    
    console.log('↷ Redo drawing');
    
    const newStep = state.historyStep + 1;
    setState(prev => ({ ...prev, historyStep: newStep }));
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && state.history[newStep]) {
      ctx.putImageData(state.history[newStep], 0, 0);
    }
  }, [canvasRef, state.historyStep, state.history]);

  const setColor = useCallback((color: string) => {
    console.log('🎨 Setting color to:', color);
    setState(prev => ({ ...prev, color }));
  }, []);

  const setLineStyle = useCallback((lineStyle: 'solid' | 'dashed') => {
    console.log('📏 Setting line style to:', lineStyle);
    setState(prev => ({ ...prev, lineStyle }));
  }, []);

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    console.log('🗑️ Clearing canvas');
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Reset history
    setState(prev => ({
      ...prev,
      history: [],
      historyStep: -1,
      currentPath: []
    }));
    
    // Save empty state
    setTimeout(() => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          setState(prev => ({
            ...prev,
            history: [imageData],
            historyStep: 0
          }));
        }
      }
    }, 10);
  }, [canvasRef]);

  return {
    isDrawing: state.isDrawing,
    color: state.color,
    lineStyle: state.lineStyle,
    canUndo: state.historyStep > 0,
    canRedo: state.historyStep < state.history.length - 1,
    startDrawing,
    draw,
    endDrawing,
    undo,
    redo,
    setColor,
    setLineStyle,
    clearCanvas,
  };
};