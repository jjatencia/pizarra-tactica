import { useCallback, useRef, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { Token, Point } from '../types';
import { clampToField, snapToGrid, screenToSVG } from '../lib/geometry';

interface DragState {
  isDragging: boolean;
  dragStartPoint: Point | null;
  dragToken: Token | null;
  arrowStart: Point | null;
}

export const usePointerInteractions = (
  svgRef: React.RefObject<SVGSVGElement>,
  fieldWidth: number,
  fieldHeight: number
) => {
  const {
    mode,
    zoom,
    pan,
    gridSnap,

    updateToken,
    addArrow,
    selectToken,
    selectArrow,
  } = useBoardStore();
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStartPoint: null,
    dragToken: null,
    arrowStart: null,
  });
  
  const animationFrameRef = useRef<number>();
  
  const getSVGPoint = useCallback((clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    return screenToSVG(
      { x: clientX, y: clientY },
      svgRef.current,
      zoom,
      pan
    );
  }, [svgRef, zoom, pan]);
  
  const handleTokenPointerDown = useCallback((e: React.PointerEvent, token: Token) => {
    if (mode !== 'select') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    
    setDragState({
      isDragging: true,
      dragStartPoint: svgPoint,
      dragToken: token,
      arrowStart: null,
    });
    
    // Capture pointer
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [mode, getSVGPoint]);
  
  const handleSVGPointerDown = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    
    if (mode === 'arrow') {
      // Start arrow creation
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: svgPoint,
      });
      selectArrow(null);
      selectToken(null);
    } else {
      // Clear selection
      selectToken(null);
      selectArrow(null);
    }
  }, [mode, getSVGPoint, selectToken, selectArrow]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.isDragging || !dragState.dragToken || !dragState.dragStartPoint) return;
    
    e.preventDefault();
    
    // Use requestAnimationFrame for smooth dragging
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      const svgPoint = getSVGPoint(e.clientX, e.clientY);
      
      // Calculate new position
      let newPosition = {
        x: svgPoint.x,
        y: svgPoint.y,
      };
      
      // Apply grid snapping
      if (gridSnap) {
        newPosition = snapToGrid(newPosition);
      }
      
      // Clamp to field boundaries
      newPosition = clampToField(newPosition, fieldWidth, fieldHeight);
      
      // Update token position
      updateToken(dragState.dragToken!.id, newPosition);
    });
  }, [dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, updateToken]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    
    // Handle arrow creation
    if (mode === 'arrow' && dragState.arrowStart) {
      const distance = Math.sqrt(
        Math.pow(svgPoint.x - dragState.arrowStart.x, 2) + 
        Math.pow(svgPoint.y - dragState.arrowStart.y, 2)
      );
      
      // Only create arrow if drag distance is significant
      if (distance > 5) {
        let endPoint = svgPoint;
        
        if (gridSnap) {
          endPoint = snapToGrid(endPoint);
        }
        
        endPoint = clampToField(endPoint, fieldWidth, fieldHeight);
        
        addArrow(dragState.arrowStart, endPoint);
      }
      
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
      });
      return;
    }
    
    // Handle token dragging end
    if (dragState.isDragging) {
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
      });
      
      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  }, [mode, dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, addArrow]);
  
  const handlePointerCancel = useCallback((_e: React.PointerEvent) => {
    setDragState({
      isDragging: false,
      dragStartPoint: null,
      dragToken: null,
      arrowStart: null,
    });
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);
  
  return {
    handleTokenPointerDown,
    handleSVGPointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    isDragging: dragState.isDragging,
    isCreatingArrow: mode === 'arrow' && dragState.arrowStart !== null,
    arrowPreview: dragState.arrowStart ? {
      from: dragState.arrowStart,
      to: { x: 0, y: 0 }, // Will be updated in real-time
    } : null,
  };
};