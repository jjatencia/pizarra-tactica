import { useCallback, useState, useRef, useEffect } from 'react';

interface DrawingState {
  isDrawing: boolean;
  history: ImageData[];
  historyStep: number;
  color: string;
  lineStyle: 'solid' | 'dashed';
}

export const useSimpleDrawing = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    history: [],
    historyStep: -1,
    color: 'white',
    lineStyle: 'solid',
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

    console.log('🎨 Starting drawing at:', coords, 'Color:', state.color);

    setState(prev => ({ ...prev, isDrawing: true }));
    lastPointRef.current = coords;

    // Setup drawing context
    ctx.lineWidth = 8; // Increased from 4 to 8 for better visibility
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.color;
    ctx.fillStyle = state.color;
    ctx.globalCompositeOperation = 'source-over';
    
    if (state.lineStyle === 'dashed') {
      ctx.setLineDash([12, 8]); // Larger dashes for better visibility
    } else {
      ctx.setLineDash([]);
    }

    // Draw starting point
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 2, 0, 2 * Math.PI);
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

    console.log('🖊️ Drawing line to:', coords);

    // Re-setup context for each stroke to ensure dashed lines work
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.color;
    ctx.globalCompositeOperation = 'source-over';

    if (state.lineStyle === 'dashed') {
      // For dashed lines, draw individual dashes manually for better control
      const distance = Math.sqrt(
        Math.pow(coords.x - lastPointRef.current.x, 2) + 
        Math.pow(coords.y - lastPointRef.current.y, 2)
      );
      
      if (distance > 5) { // Only draw if moved enough distance
        const dashLength = 15;
        const gapLength = 10;
        const totalLength = dashLength + gapLength;
        const numDashes = Math.floor(distance / totalLength);
        
        const deltaX = (coords.x - lastPointRef.current.x) / distance;
        const deltaY = (coords.y - lastPointRef.current.y) / distance;
        
        for (let i = 0; i <= numDashes; i++) {
          const startX = lastPointRef.current.x + (deltaX * i * totalLength);
          const startY = lastPointRef.current.y + (deltaY * i * totalLength);
          const endX = startX + (deltaX * dashLength);
          const endY = startY + (deltaY * dashLength);
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }
    } else {
      // For solid lines, draw normally
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    
    lastPointRef.current = coords;
  }, [canvasRef, getCoords, state.isDrawing, state.color, state.lineStyle]);

  const endDrawing = useCallback(() => {
    if (!state.isDrawing || !canvasRef.current) return;
    
    console.log('🏁 Ending drawing');
    
    setState(prev => ({ ...prev, isDrawing: false }));
    lastPointRef.current = null;
    
    // Save to history
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
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
    }
  }, [canvasRef, state.isDrawing]);

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
  };
};