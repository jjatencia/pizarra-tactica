import { useCallback, useState, useRef } from 'react';

interface DrawingState {
  isDrawing: boolean;
  history: string[];
  historyStep: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
  penMode: boolean;
}

export const useCanvasDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    history: [],
    historyStep: -1,
    color: 'white',
    lineStyle: 'solid',
    penMode: true,
  });

  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const saveHistory = useCallback(() => {
    if (!canvasRef.current) return;
    
    setDrawingState(prev => {
      const newHistory = prev.history.slice(0, prev.historyStep + 1);
      const dataURL = canvasRef.current!.toDataURL();
      newHistory.push(dataURL);
      console.log('Saving history. Step:', newHistory.length - 1, 'Total:', newHistory.length);
      return {
        ...prev,
        history: newHistory,
        historyStep: newHistory.length - 1,
      };
    });
  }, [canvasRef]);

  const getCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
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

  const startDrawing = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    console.log('Starting drawing at:', coords, 'Color:', drawingState.color);

    setDrawingState(prev => ({ ...prev, isDrawing: true }));
    lastPointRef.current = coords;

    // Set up drawing context
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawingState.color;
    ctx.fillStyle = drawingState.color;
    ctx.globalCompositeOperation = drawingState.penMode ? 'source-over' : 'destination-out';
    
    if (drawingState.lineStyle === 'dashed') {
      ctx.setLineDash([8, 6]);
    } else {
      ctx.setLineDash([]);
    }

    if (!drawingState.penMode) {
      ctx.lineWidth = 25;
    }

    // Draw a starting dot
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }, [canvasRef, getCoords, drawingState.color, drawingState.lineStyle, drawingState.penMode]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing || !canvasRef.current || !lastPointRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCoords(e);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    console.log('Drawing line from:', lastPointRef.current, 'to:', coords);

    // Draw line from last point to current point
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastPointRef.current = coords;
  }, [canvasRef, getCoords, drawingState.isDrawing]);

  const endDrawing = useCallback(() => {
    if (!drawingState.isDrawing) return;
    
    console.log('Ending drawing');
    setDrawingState(prev => ({ ...prev, isDrawing: false }));
    lastPointRef.current = null;
    saveHistory();
  }, [drawingState.isDrawing, saveHistory]);

  const undo = useCallback(() => {
    console.log('Undo called. Current step:', drawingState.historyStep, 'History length:', drawingState.history.length);
    if (drawingState.historyStep > 0) {
      const newStep = drawingState.historyStep - 1;
      setDrawingState(prev => ({
        ...prev,
        historyStep: newStep
      }));
      
      // Redraw immediately
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (drawingState.history[newStep]) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawingState.history[newStep];
      }
    }
  }, [drawingState.historyStep, drawingState.history, canvasRef]);

  const redo = useCallback(() => {
    console.log('Redo called. Current step:', drawingState.historyStep, 'History length:', drawingState.history.length);
    if (drawingState.historyStep < drawingState.history.length - 1) {
      const newStep = drawingState.historyStep + 1;
      setDrawingState(prev => ({
        ...prev,
        historyStep: newStep
      }));
      
      // Redraw immediately
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (drawingState.history[newStep]) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawingState.history[newStep];
      }
    }
  }, [drawingState.historyStep, drawingState.history, canvasRef]);

  const setColor = useCallback((color: string) => {
    console.log('Setting color to:', color);
    setDrawingState(prev => ({
      ...prev,
      color,
      penMode: color !== 'transparent'
    }));
  }, []);

  const setLineStyle = useCallback((lineStyle: 'solid' | 'dashed') => {
    console.log('Setting line style to:', lineStyle);
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

  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    const container = canvasRef.current.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    // Set canvas size directly
    canvasRef.current.width = rect.width;
    canvasRef.current.height = rect.height;
    
    console.log('Canvas resized to:', rect.width, 'x', rect.height);
    
    // Restore the last drawing if any
    if (drawingState.history[drawingState.historyStep]) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = drawingState.history[drawingState.historyStep];
      }
    }
  }, [canvasRef, drawingState.history, drawingState.historyStep]);

  const handleDoubleTapClear = useCallback((_e: React.PointerEvent<HTMLCanvasElement>) => {
    // Simple approach: double tap anywhere on canvas undoes last drawing
    if (drawingState.historyStep > 0) {
      undo();
    }
  }, [drawingState.historyStep, undo]);

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