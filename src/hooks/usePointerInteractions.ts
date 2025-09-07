import { useCallback, useRef, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { Token, Point } from '../types';
import { clampToField, snapToGrid, screenToSVG } from '../lib/geometry';

const getTokenRadius = (token: Token): number => {
  const objectType = token.type || 'player';
  const baseRadius = objectType === 'player' ? 3 : objectType === 'ball' ? 2 : objectType === 'cone' ? 2 : 3;
  const sizeMultiplier = token.size === 'small' ? 0.5 : token.size === 'medium' ? 0.8 : 1;
  return baseRadius * sizeMultiplier;
};

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
  drawStartTime?: number;
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
    recording,
    addTokenPathPoint,
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

    if (recording) {
      currentSelected.forEach(id => {
        const pos = positions[id];
        addTokenPathPoint(id, { x: pos.x, y: pos.y });
      });
    }

    // Capture pointer
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [mode, getSVGPoint]);
  
  const handleSVGPointerDown = useCallback((e: React.PointerEvent) => {
    const svgPoint = getSVGPoint(e.clientX, e.clientY);

    if (mode === 'trajectory') {
      const currentSelected = recording ? useBoardStore.getState().selectedTokenIds : [];
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
        selectedTokenIds: currentSelected,
        initialPositions: {},
        drawStartTime: performance.now(),
      });
      selectArrow(null);
      if (!recording) selectToken(null);
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
  }, [mode, getSVGPoint, recording, selectToken, selectTokens, selectArrow, selectTrajectory]);
  
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
        const token = useBoardStore.getState().tokens.find(t => t.id === id);
        const margin = token ? getTokenRadius(token) : 5;
        newPosition = clampToField(newPosition, fieldWidth, fieldHeight, margin);
        updateToken(id, newPosition);
        if (recording) {
          addTokenPathPoint(id, newPosition);
        }
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
        
        // Create trajectory and record duration based on draw speed
        const id = addTrajectory(finalPoints, trajectoryType);
        const start = dragState.drawStartTime || performance.now();
        const durationMs = Math.min(3000, Math.max(200, Math.round(performance.now() - start)));
        useBoardStore.getState().updateTrajectory(id, { durationMs });
        // Movement paths are recorded via dragging tokens
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
      if (recording) {
        const { tokens } = useBoardStore.getState();
        dragState.selectedTokenIds.forEach(id => {
          const token = tokens.find(t => t.id === id);
          if (token) {
            addTokenPathPoint(id, { x: token.x, y: token.y });
          }
        });
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

      // Release pointer capture
      (e.target as Element).releasePointerCapture(e.pointerId);
    }
  }, [mode, dragState, getSVGPoint, gridSnap, fieldWidth, fieldHeight, addArrow, addTrajectory, trajectoryType, selectTokens, recording, addTokenPathPoint]);
  
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
