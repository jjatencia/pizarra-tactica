import { useCallback, useState } from 'react';
import { useBoardStore } from './useBoardStore';

interface TouchState {
  lastTapTime: number;
}

export const useZoomPan = (svgRef: React.RefObject<SVGSVGElement>) => {
  const { zoom, pan, setZoom, setPan } = useBoardStore();
  const [touchState, setTouchState] = useState<TouchState>({
    lastTapTime: 0,
  });
  
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
      // Single touch - check for double tap
      const now = Date.now();
      if (now - touchState.lastTapTime < 300) {
        // Double tap - reset zoom
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }

      setTouchState({ lastTapTime: now });
    } else if (touches.length === 2) {
      // Ignore pinch gestures
      e.preventDefault();
    }
  }, [setZoom, setPan, touchState.lastTapTime]);
  
  const handleTouchMove = useCallback((e: Event) => {
    const touchEvent = e as TouchEvent;
    if (touchEvent.touches.length === 2) {
      e.preventDefault();
    }
  }, []);
  
  const handleTouchEnd = useCallback((_e: Event) => {}, []);
  
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