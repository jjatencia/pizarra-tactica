import { useCallback, useRef, useState } from 'react';
import { useBoardStore } from './useBoardStore';
import { Point } from '../types';

interface TouchState {
  touches: Touch[];
  initialDistance: number;
  initialZoom: number;
  initialPan: Point;
  lastTapTime: number;
}

export const useZoomPan = (svgRef: React.RefObject<SVGSVGElement>) => {
  const { zoom, pan, setZoom, setPan } = useBoardStore();
  const [touchState, setTouchState] = useState<TouchState>({
    touches: [],
    initialDistance: 0,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    lastTapTime: 0,
  });
  
  const animationFrameRef = useRef<number>();
  
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const getTouchCenter = (touch1: Touch, touch2: Touch): Point => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };
  
  const handleWheel = useCallback((e: Event) => {
    e.preventDefault();
    const wheelEvent = e as WheelEvent;
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const delta = wheelEvent.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    
    // Zoom towards mouse position
    const mouseX = wheelEvent.clientX - rect.left;
    const mouseY = wheelEvent.clientY - rect.top;
    
    const zoomRatio = newZoom / zoom;
    const newPan = {
      x: pan.x - (mouseX - pan.x) * (zoomRatio - 1),
      y: pan.y - (mouseY - pan.y) * (zoomRatio - 1),
    };
    
    setZoom(newZoom);
    setPan(newPan);
  }, [zoom, pan, setZoom, setPan, svgRef]);
  
  const handleTouchStart = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    const touches = Array.from(touchEvent.touches);
    
    if (touches.length === 1) {
      // Single touch - just update touch state
      const now = Date.now();
      
      setTouchState(prev => ({
        ...prev,
        lastTapTime: now,
      }));
    } else if (touches.length === 2) {
      // Two finger pinch - start zoom/pan
      const distance = getTouchDistance(touches[0], touches[1]);
      
      setTouchState({
        touches,
        initialDistance: distance,
        initialZoom: zoom,
        initialPan: pan,
        lastTapTime: touchState.lastTapTime,
      });
    }
  }, [zoom, pan, setZoom, setPan, touchState.lastTapTime]);
  
  const handleTouchMove = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    const touches = Array.from(touchEvent.touches);
    
    if (touches.length === 2 && touchState.touches.length === 2) {
      e.preventDefault();
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const currentDistance = getTouchDistance(touches[0], touches[1]);
        const currentCenter = getTouchCenter(touches[0], touches[1]);
        const initialCenter = getTouchCenter(touchState.touches[0], touchState.touches[1]);
        
        // Calculate zoom
        const zoomRatio = currentDistance / touchState.initialDistance;
        const newZoom = Math.max(0.5, Math.min(3, touchState.initialZoom * zoomRatio));
        
        // Calculate pan
        const panDelta = {
          x: currentCenter.x - initialCenter.x,
          y: currentCenter.y - initialCenter.y,
        };
        
        const newPan = {
          x: touchState.initialPan.x + panDelta.x,
          y: touchState.initialPan.y + panDelta.y,
        };
        
        setZoom(newZoom);
        setPan(newPan);
      });
    }
  }, [touchState, setZoom, setPan]);
  
  const handleTouchEnd = useCallback((_e: Event) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setTouchState(prev => ({
      ...prev,
      touches: [],
      initialDistance: 0,
    }));
  }, []);
  
  // Attach wheel event listener
  const attachWheelListener = useCallback((element: HTMLElement | SVGSVGElement) => {
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);
  
  // Attach touch event listeners
  const attachTouchListeners = useCallback((element: HTMLElement | SVGSVGElement) => {
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return {
    attachWheelListener,
    attachTouchListeners,
    zoom,
    pan,
  };
};