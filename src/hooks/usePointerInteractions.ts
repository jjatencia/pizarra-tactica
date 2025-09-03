import { useCallback, useRef, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { Token, Point } from '../types';
import { clampToField, snapToGrid, screenToSVG } from '../lib/geometry';

interface DragState {
  isDragging: boolean;
  dragStartPoint: Point | null;
  dragToken: Token | null;
  arrowStart: Point | null;
  trajectoryPoints: Point[];
  isDrawingTrajectory: boolean;
  selectionStart: Point | null;
  selectionRect: { x: number; y: number; width: number; height: number } | null;
  selectedTokenIds: string[];
  initialPositions: Record<string, Point>;
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

    updateToken,
    addArrow,
    addTrajectory,
    selectToken,
    selectTokens,
    selectArrow,
    selectTrajectory,
  } = useBoardStore();
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragStartPoint: null,
    dragToken: null,
    arrowStart: null,
    trajectoryPoints: [],
    isDrawingTrajectory: false,
    selectionStart: null,
    selectionRect: null,
    selectedTokenIds: [],
    initialPositions: {},
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

    const { selectedTokenIds, tokens } = useBoardStore.getState();
    const currentSelected = selectedTokenIds.includes(token.id) ? selectedTokenIds : [token.id];
    const positions: Record<string, Point> = {};
    tokens.filter(t => currentSelected.includes(t.id)).forEach(t => {
      positions[t.id] = { x: t.x, y: t.y };
    });

    setDragState({
      isDragging: true,
      dragStartPoint: svgPoint,
      dragToken: token,
      arrowStart: null,
      trajectoryPoints: [],
      isDrawingTrajectory: false,
      selectionStart: null,
      selectionRect: null,
      selectedTokenIds: currentSelected,
      initialPositions: positions,
    });

    // Capture pointer
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [mode, getSVGPoint]);
  
  const handleSVGPointerDown = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);

    if (mode === 'trajectory') {
      // Start trajectory drawing
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
        trajectoryPoints: [svgPoint],
        isDrawingTrajectory: true,
        selectionStart: null,
        selectionRect: null,
        selectedTokenIds: [],
        initialPositions: {},
      });
      selectArrow(null);
      selectToken(null);
      selectTrajectory(null);
    } else {
      // Start selection box
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
        trajectoryPoints: [],
        isDrawingTrajectory: false,
        selectionStart: svgPoint,
        selectionRect: { x: svgPoint.x, y: svgPoint.y, width: 0, height: 0 },
        selectedTokenIds: [],
        initialPositions: {},
      });
      selectTokens([]);
      selectArrow(null);
      selectTrajectory(null);
    }
  }, [mode, getSVGPoint, selectToken, selectTokens, selectArrow, selectTrajectory]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Handle selection box drawing
    if (dragState.selectionStart && !dragState.isDragging) {
      const svgPoint = getSVGPoint(e.clientX, e.clientY);
      const rect = {
        x: Math.min(dragState.selectionStart.x, svgPoint.x),
        y: Math.min(dragState.selectionStart.y, svgPoint.y),
        width: Math.abs(svgPoint.x - dragState.selectionStart.x),
        height: Math.abs(svgPoint.y - dragState.selectionStart.y),
      };
      setDragState(prev => ({ ...prev, selectionRect: rect }));
      return;
    }

    // Handle token dragging
    if (dragState.isDragging && dragState.dragToken && dragState.dragStartPoint) {
      e.preventDefault();

      const svgPoint = getSVGPoint(e.clientX, e.clientY);
      const dx = svgPoint.x - dragState.dragStartPoint.x;
      const dy = svgPoint.y - dragState.dragStartPoint.y;

      dragState.selectedTokenIds.forEach(id => {
        const startPos = dragState.initialPositions[id];
        if (!startPos) return;
        let newPosition = { x: startPos.x + dx, y: startPos.y + dy };
        if (gridSnap) {
          newPosition = snapToGrid(newPosition);
        }
        newPosition = clampToField(newPosition, fieldWidth, fieldHeight);
        updateToken(id, newPosition);
      });
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
        const clampedPoint = clampToField(svgPoint, fieldWidth, fieldHeight);

        setDragState(prev => ({
          ...prev,
          trajectoryPoints: [...prev.trajectoryPoints, clampedPoint],
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
          const clampedPoint = clampToField(svgPoint, fieldWidth, fieldHeight);
          finalPoints.push(clampedPoint);
        }
        
        // Create trajectory
        addTrajectory(finalPoints, trajectoryType);
      }
      
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
        trajectoryPoints: [],
        isDrawingTrajectory: false,
        selectionStart: null,
        selectionRect: null,
        selectedTokenIds: [],
        initialPositions: {},
      });
      return;
    }
    

    
    // Handle selection box end
    if (dragState.selectionStart && dragState.selectionRect) {
      const rect = dragState.selectionRect;
      const { tokens } = useBoardStore.getState();
      const ids = tokens
        .filter(t => t.x >= rect.x && t.x <= rect.x + rect.width && t.y >= rect.y && t.y <= rect.y + rect.height)
        .map(t => t.id);
      selectTokens(ids);
      setDragState({
        isDragging: false,
        dragStartPoint: null,
        dragToken: null,
        arrowStart: null,
        trajectoryPoints: [],
        isDrawingTrajectory: false,
        selectionStart: null,
        selectionRect: null,
        selectedTokenIds: [],
        initialPositions: {},
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
        trajectoryPoints: [],
        isDrawingTrajectory: false,
        selectionStart: null,
        selectionRect: null,
        selectedTokenIds: [],
        initialPositions: {},
      });

      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  }, [mode, dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, addArrow, addTrajectory, trajectoryType, selectTokens]);
  
  const handlePointerCancel = useCallback((_e: React.PointerEvent) => {
    setDragState({
      isDragging: false,
      dragStartPoint: null,
      dragToken: null,
      arrowStart: null,
      trajectoryPoints: [],
      isDrawingTrajectory: false,
      selectionStart: null,
      selectionRect: null,
      selectedTokenIds: [],
      initialPositions: {},
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
    isCreatingArrow: false,
    isDrawingTrajectory: dragState.isDrawingTrajectory,
    trajectoryPreview: dragState.trajectoryPoints,
    arrowPreview: null,
    selectionRect: dragState.selectionRect,
  };
};