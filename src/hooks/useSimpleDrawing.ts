import { useCallback, useState, useRef, useEffect } from 'react';
import { DrawingMode } from '../types';

interface DrawingState {
  isDrawing: boolean;
  history: string[];
  historyStep: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  currentPath: { x: number; y: number }[];
  drawingMode: DrawingMode;
}

export const useSimpleDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    history: [],
    historyStep: -1,
    color: 'white',
    lineStyle: 'solid',
    currentPath: [],
    drawingMode: 'move',
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
      const dataURL = canvas.toDataURL();
      setState(prev => ({
        ...prev,
        history: [dataURL],
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
    if (!canvasRef.current || state.drawingMode === 'move') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    console.log('🎨 Starting drawing at:', coords, 'Color:', state.color, 'Mode:', state.drawingMode);

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
  }, [canvasRef, getCoords, state.color, state.lineStyle, state.drawingMode]);

  const draw = useCallback((e: any) => {
    if (!state.isDrawing || !canvasRef.current || !lastPointRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Add point to current path
    const newPath = [...state.currentPath, coords];
    setState(prev => ({
      ...prev,
      currentPath: newPath
    }));

    if (state.drawingMode === 'pass') {
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
    } else if (state.drawingMode === 'displacement') {
      // For dashed lines, redraw the entire path with preview
      if (newPath.length > 1) {
        // Clear and redraw from history first
        if (state.history[state.historyStep]) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            ctx.drawImage(img, 0, 0);
            
            // Now draw the current dashed preview
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = state.color;
            ctx.globalCompositeOperation = 'source-over';
            ctx.setLineDash([25, 15]);
            
            ctx.beginPath();
            ctx.moveTo(newPath[0].x, newPath[0].y);
            for (let i = 1; i < newPath.length; i++) {
              ctx.lineTo(newPath[i].x, newPath[i].y);
            }
            ctx.stroke();
          };
          img.src = state.history[state.historyStep];
        } else {
          // No history, just draw the preview
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = state.color;
          ctx.globalCompositeOperation = 'source-over';
          ctx.setLineDash([25, 15]);
          
          ctx.beginPath();
          ctx.moveTo(newPath[0].x, newPath[0].y);
          for (let i = 1; i < newPath.length; i++) {
            ctx.lineTo(newPath[i].x, newPath[i].y);
          }
          ctx.stroke();
        }
      }
    }
    
    lastPointRef.current = coords;
  }, [canvasRef, getCoords, state.isDrawing, state.color, state.lineStyle, state.currentPath, state.history, state.historyStep]);

  const endDrawing = useCallback(() => {
    if (!state.isDrawing || !canvasRef.current) return;
    
    console.log('🏁 Ending drawing, Path length:', state.currentPath.length);
    
    setState(prev => ({ 
      ...prev, 
      isDrawing: false, 
      currentPath: [] 
    }));
    lastPointRef.current = null;
    
    // Save to history (the line is already drawn)
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      const dataURL = canvasRef.current.toDataURL();
      setState(prev => {
        const newHistory = prev.history.slice(0, prev.historyStep + 1);
        newHistory.push(dataURL);
        return {
          ...prev,
          history: newHistory,
          historyStep: newHistory.length - 1
        };
      });
    }
  }, [canvasRef, state.isDrawing, state.currentPath]);

  const undo = useCallback(() => {
    if (!canvasRef.current || state.historyStep <= 0) return;
    
    console.log('↶ Undo drawing');
    
    const newStep = state.historyStep - 1;
    setState(prev => ({ ...prev, historyStep: newStep }));
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && state.history[newStep]) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = state.history[newStep];
    }
  }, [canvasRef, state.historyStep, state.history]);

  const redo = useCallback(() => {
    if (!canvasRef.current || state.historyStep >= state.history.length - 1) return;
    
    console.log('↷ Redo drawing');
    
    const newStep = state.historyStep + 1;
    setState(prev => ({ ...prev, historyStep: newStep }));
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && state.history[newStep]) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = state.history[newStep];
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

  const setDrawingMode = useCallback((drawingMode: DrawingMode) => {
    console.log('🎯 Setting drawing mode to:', drawingMode);
    setState(prev => ({ ...prev, drawingMode }));
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
        const dataURL = canvasRef.current.toDataURL();
        setState(prev => ({
          ...prev,
          history: [dataURL],
          historyStep: 0
        }));
      }
    }, 10);
  }, [canvasRef]);

  return {
    isDrawing: state.isDrawing,
    color: state.color,
    lineStyle: state.lineStyle,
    drawingMode: state.drawingMode,
    canUndo: state.historyStep > 0,
    canRedo: state.historyStep < state.history.length - 1,
    startDrawing,
    draw,
    endDrawing,
    undo,
    redo,
    setColor,
    setLineStyle,
    setDrawingMode,
    clearCanvas,
  };
};