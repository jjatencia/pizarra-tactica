import { Point } from '../types';

export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const snapToGrid = (point: Point, gridSize: number = 24): Point => {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
};

export const clampToField = (point: Point, fieldWidth: number, fieldHeight: number): Point => {
  const margin = 5; // margin from field edges
  return {
    x: Math.max(margin, Math.min(fieldWidth - margin, point.x)),
    y: Math.max(margin, Math.min(fieldHeight - margin, point.y)),
  };
};

export const getBezierControlPoint = (from: Point, to: Point, curvature: number = 0.3): Point => {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  
  // Calculate perpendicular offset
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return { x: midX, y: midY };
  
  const offsetX = (-dy / length) * curvature * length * 0.2;
  const offsetY = (dx / length) * curvature * length * 0.2;
  
  return {
    x: midX + offsetX,
    y: midY + offsetY,
  };
};

export const createSVGPath = (from: Point, to: Point, control?: Point): string => {
  if (control) {
    return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
  }
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
};

export const getArrowMarkerPath = (size: number = 8): string => {
  return `M 0 0 L ${size} ${size/2} L 0 ${size} L ${size/3} ${size/2} Z`;
};

// Convert screen coordinates to SVG coordinates
export const screenToSVG = (
  screenPoint: Point,
  svgElement: SVGSVGElement,
  zoom: number,
  pan: Point
): Point => {
  const rect = svgElement.getBoundingClientRect();
  const viewBox = svgElement.viewBox.baseVal;
  
  // Calculate the scale factor between screen and SVG coordinates
  const scaleX = viewBox.width / rect.width;
  const scaleY = viewBox.height / rect.height;
  
  // Convert screen coordinates to SVG coordinates
  const relativeX = (screenPoint.x - rect.left) * scaleX;
  const relativeY = (screenPoint.y - rect.top) * scaleY;
  
  // Apply zoom and pan transformations
  const x = (relativeX - pan.x) / zoom + viewBox.x;
  const y = (relativeY - pan.y) / zoom + viewBox.y;
  
  return { x, y };
};

// Check if point is inside a circle (for token hit detection)
export const isPointInCircle = (point: Point, center: Point, radius: number): boolean => {
  return distance(point, center) <= radius;
};

// Check if point is near a line (for arrow hit detection)
export const isPointNearLine = (point: Point, from: Point, to: Point, threshold: number = 10): boolean => {
  const lineLength = distance(from, to);
  if (lineLength === 0) return distance(point, from) <= threshold;
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - from.x) * (to.x - from.x) + (point.y - from.y) * (to.y - from.y)) / (lineLength * lineLength)
  ));
  
  const projection = {
    x: from.x + t * (to.x - from.x),
    y: from.y + t * (to.y - from.y),
  };
  
  return distance(point, projection) <= threshold;
};