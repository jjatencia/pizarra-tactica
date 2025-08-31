import { useCallback, useState } from 'react';

interface DrawingState {
  isDrawing: boolean;
  currentPath: { x: number; y: number }[];
  history: string[];
  historyStep: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  penMode: boolean;
}

export const useCanvasDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    currentPath: [],
    history: [],
    historyStep: -1,
    color: 'white',
    lineStyle: 'solid',
    penMode: true,
  });

  const saveHistory = useCallback(() => {
    if (!canvasRef.current) return;
    
    setDrawingState(prev => {
      const newHistory = prev.history.slice(0, prev.historyStep + 1);
      newHistory.push(canvasRef.current!.toDataURL());
      return {
        ...prev,
        history: newHistory,
        historyStep: newHistory.length - 1,
      };
    });
  }, [canvasRef]);

  const redrawFromHistory = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    if (drawingState.history[drawingState.historyStep]) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = drawingState.history[drawingState.historyStep];
    }
  }, [canvasRef, drawingState.history, drawingState.historyStep]);

  const getCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, [canvasRef]);

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    e.preventDefault();
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setDrawingState(prev => ({ ...prev, isDrawing: true, currentPath: [coords] }));

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    
    if (drawingState.lineStyle === 'dashed') {
      ctx.setLineDash([8, 6]); // Smaller dashes for better turn visibility
    } else {
      ctx.setLineDash([]);
    }

    if (drawingState.penMode) {
      ctx.strokeStyle = drawingState.color;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.lineWidth = 25;
      ctx.globalCompositeOperation = 'destination-out';
    }

    ctx.moveTo(coords.x, coords.y);
  }, [canvasRef, getCoords, drawingState.lineStyle, drawingState.penMode, drawingState.color]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing || !canvasRef.current) return;
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setDrawingState(prev => ({
      ...prev,
      currentPath: [...prev.currentPath, coords]
    }));

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }, [canvasRef, getCoords, drawingState.isDrawing]);

  const endDrawing = useCallback(() => {
    if (!drawingState.isDrawing || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setDrawingState(prev => ({ ...prev, isDrawing: false, currentPath: [] }));
    ctx.closePath();
    saveHistory();
  }, [canvasRef, drawingState.isDrawing, saveHistory]);

  const undo = useCallback(() => {
    if (drawingState.historyStep > 0) {
      setDrawingState(prev => ({
        ...prev,
        historyStep: prev.historyStep - 1
      }));
      redrawFromHistory();
    }
  }, [drawingState.historyStep, redrawFromHistory]);

  const redo = useCallback(() => {
    if (drawingState.historyStep < drawingState.history.length - 1) {
      setDrawingState(prev => ({
        ...prev,
        historyStep: prev.historyStep + 1
      }));
      redrawFromHistory();
    }
  }, [drawingState.historyStep, drawingState.history.length, redrawFromHistory]);

  const setColor = useCallback((color: string) => {
    setDrawingState(prev => ({
      ...prev,
      color,
      penMode: color !== 'transparent'
    }));
  }, []);

  const setLineStyle = useCallback((lineStyle: 'solid' | 'dashed') => {
    setDrawingState(prev => ({ ...prev, lineStyle }));
  }, []);

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setDrawingState(prev => ({
      ...prev,
      history: [],
      historyStep: -1
    }));
    saveHistory();
  }, [canvasRef, saveHistory]);

  const handleDoubleTapClear = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    // Simple approach: double tap anywhere on canvas clears the last drawing
    if (drawingState.historyStep > 0) {
      setDrawingState(prev => ({
        ...prev,
        historyStep: prev.historyStep - 1
      }));
      redrawFromHistory();
    }
  }, [drawingState.historyStep, redrawFromHistory]);

  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvasRef.current.width = rect.width;
    canvasRef.current.height = rect.height;
    redrawFromHistory();
  }, [canvasRef, redrawFromHistory]);

  return {
    // State
    isDrawing: drawingState.isDrawing,
    color: drawingState.color,
    lineStyle: drawingState.lineStyle,
    canUndo: drawingState.historyStep > 0,
    canRedo: drawingState.historyStep < drawingState.history.length - 1,
    
    // Handlers
    startDrawing,
    draw,
    endDrawing,
    undo,
    redo,
    setColor,
    setLineStyle,
    clearCanvas,
    resizeCanvas,
    saveHistory,
    handleDoubleTapClear,
  };
};