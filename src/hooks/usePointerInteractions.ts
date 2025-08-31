import { useCallback, useRef, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { Token, Point } from '../types';
import { snapToGrid, screenToSVG } from '../lib/geometry';

interface DragState {
  isDragging: boolean;
  dragStartPoint: Point | null;
  dragToken: Token | null;
  dragTokenOriginalPosition: Point | null;
  arrowStart: Point | null;
  trajectoryPoints: Point[];
  isDrawingTrajectory: boolean;
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
    trajectoryType,
    tokens,

    updateToken,
    addArrow,
    addTrajectory,
    selectToken,
    selectArrow,
    selectTrajectory,
  } = useBoardStore();
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStartPoint: null,
    dragToken: null,
    dragTokenOriginalPosition: null,
    arrowStart: null,
    trajectoryPoints: [],
    isDrawingTrajectory: false,
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
      dragTokenOriginalPosition: { x: token.x, y: token.y },
      arrowStart: null,
      trajectoryPoints: [],
      isDrawingTrajectory: false,
    });
    
    // Capture pointer for better touch tracking
    (e.target as Element).setPointerCapture(e.pointerId);
    
    // Disable text selection and other interactions during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  }, [mode, getSVGPoint]);
  
  const handleSVGPointerDown = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    
    if (mode === 'trajectory') {
      // Start trajectory drawing
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        dragTokenOriginalPosition: null,
        arrowStart: null,
        trajectoryPoints: [svgPoint],
        isDrawingTrajectory: true,
      });
      selectArrow(null);
      selectToken(null);
      selectTrajectory(null);
    } else {
      // Clear selection
      selectToken(null);
      selectArrow(null);
      selectTrajectory(null);
    }
  }, [mode, getSVGPoint, selectToken, selectArrow, selectTrajectory]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Handle token dragging
    if (dragState.isDragging && dragState.dragToken && dragState.dragStartPoint) {
      e.preventDefault();
      
      // For iPad touch, update immediately without requestAnimationFrame for maximum responsiveness
      const svgPoint = getSVGPoint(e.clientX, e.clientY);
      
      // Calculate offset from the initial drag start point to current position
      const deltaX = svgPoint.x - dragState.dragStartPoint.x;
      const deltaY = svgPoint.y - dragState.dragStartPoint.y;
      
      // Calculate new position based on token's original position plus the drag offset
      let newPosition = {
        x: dragState.dragTokenOriginalPosition!.x + deltaX,
        y: dragState.dragTokenOriginalPosition!.y + deltaY,
      };
      
      // Don't apply grid snapping during drag for fluid movement
      // Grid snapping will be applied when drag ends
      
      // Update token position immediately for fluid movement
      updateToken(dragState.dragToken!.id, newPosition);
      return;
    }
    
    // Handle trajectory drawing
    if (dragState.isDrawingTrajectory && mode === 'trajectory') {
      e.preventDefault();
      
      const svgPoint = getSVGPoint(e.clientX, e.clientY);
      const lastPoint = dragState.trajectoryPoints[dragState.trajectoryPoints.length - 1];
      
      // Only add point if it's far enough from the last point (smooth drawing)
      if (!lastPoint || Math.sqrt(
        Math.pow(svgPoint.x - lastPoint.x, 2) + Math.pow(svgPoint.y - lastPoint.y, 2)
      ) > 3) {
        // Allow trajectory points anywhere, no field clamping
        setDragState(prev => ({
          ...prev,
          trajectoryPoints: [...prev.trajectoryPoints, svgPoint],
        }));
      }
    }
  }, [dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, updateToken, mode]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    
    // Handle trajectory drawing end
    if (mode === 'trajectory' && dragState.isDrawingTrajectory) {
      if (dragState.trajectoryPoints.length >= 2) {
        // Add final point if it's different from the last one
        const lastPoint = dragState.trajectoryPoints[dragState.trajectoryPoints.length - 1];
        let finalPoints = [...dragState.trajectoryPoints];
        
        if (Math.sqrt(
          Math.pow(svgPoint.x - lastPoint.x, 2) + Math.pow(svgPoint.y - lastPoint.y, 2)
        ) > 3) {
          // Allow final trajectory point anywhere, no field clamping
          finalPoints.push(svgPoint);
        }
        
        // Create trajectory
        addTrajectory(finalPoints, trajectoryType);
      }
      
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        dragTokenOriginalPosition: null,
        arrowStart: null,
        trajectoryPoints: [],
        isDrawingTrajectory: false,
      });
      return;
    }
    

    
    // Handle token dragging end
    if (dragState.isDragging && dragState.dragToken) {
      // Apply grid snapping at the end of drag for final position
      if (gridSnap) {
        const currentToken = tokens.find(t => t.id === dragState.dragToken!.id);
        if (currentToken) {
          const currentPosition = { x: currentToken.x, y: currentToken.y };
          const snappedPosition = snapToGrid(currentPosition);
          updateToken(dragState.dragToken.id, snappedPosition);
        }
      }
      
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        dragTokenOriginalPosition: null,
        arrowStart: null,
        trajectoryPoints: [],
        isDrawingTrajectory: false,
      });
      
      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);
      
      // Restore normal text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }
  }, [mode, dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, addArrow, addTrajectory, trajectoryType, tokens, updateToken]);
  
  const handlePointerCancel = useCallback((_e: React.PointerEvent) => {
    setDragState({
      isDragging: false,
      dragStartPoint: null,
      dragToken: null,
      dragTokenOriginalPosition: null,
      arrowStart: null,
      trajectoryPoints: [],
      isDrawingTrajectory: false,
    });
    
    // Restore normal text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    
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
    isCreatingArrow: false,
    isDrawingTrajectory: dragState.isDrawingTrajectory,
    trajectoryPreview: dragState.trajectoryPoints,
    arrowPreview: null,
  };
};