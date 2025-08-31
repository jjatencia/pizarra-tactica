import React from 'react';
import { Arrow } from '../types';
import { useBoardStore } from '../hooks/useBoardStore';
import { createSVGPath } from '../lib/geometry';

interface ArrowsLayerProps {
  arrows: Arrow[];
  onArrowSelect: (id: string) => void;
  onArrowUpdate: (id: string, updates: Partial<Arrow>) => void;
}

export const ArrowsLayer: React.FC<ArrowsLayerProps> = ({ 
  arrows, 
  onArrowSelect, 
  onArrowUpdate: _onArrowUpdate 
}) => {
  const { selectedArrowId } = useBoardStore();
  
  return (
    <g className="arrows-layer">
      <defs>
        {/* Arrow markers */}
        <marker
          id="arrowhead-solid"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
          />
        </marker>
        
        <marker
          id="arrowhead-dashed"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="white"
            stroke="white"
            strokeWidth="0.5"
          />
        </marker>
        
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L9,3 z"
            fill="#FBBF24"
            stroke="#FBBF24"
            strokeWidth="0.5"
          />
        </marker>
      </defs>
      
      {arrows.map((arrow) => {
        const isSelected = selectedArrowId === arrow.id;
        const pathData = createSVGPath(arrow.from, arrow.to, arrow.control);
        const markerId = isSelected ? 'arrowhead-selected' : 
          arrow.style === 'solid' ? 'arrowhead-solid' : 'arrowhead-dashed';
        
        return (
          <g key={arrow.id} className="arrow-group">
            {/* Arrow line */}
            <path
              d={pathData}
              fill="none"
              stroke={isSelected ? '#FBBF24' : 'white'}
              strokeWidth={isSelected ? "1.2" : "0.8"}
              strokeDasharray={arrow.style === 'dashed' ? '3,2' : 'none'}
              markerEnd={`url(#${markerId})`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onArrowSelect(arrow.id);
              }}
            />
            
            {/* Hit area (invisible, wider for easier selection) */}
            <path
              d={pathData}
              fill="none"
              stroke="transparent"
              strokeWidth="6"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                onArrowSelect(arrow.id);
              }}
            />
            
            {/* Control handles for curved arrows */}
            {isSelected && arrow.curved && arrow.control && (
              <>
                {/* Control point */}
                <circle
                  cx={arrow.control.x}
                  cy={arrow.control.y}
                  r="2"
                  fill="#FBBF24"
                  stroke="white"
                  strokeWidth="0.5"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    // TODO: Implement control point dragging
                  }}
                />
                
                {/* Control lines */}
                <line
                  x1={arrow.from.x}
                  y1={arrow.from.y}
                  x2={arrow.control.x}
                  y2={arrow.control.y}
                  stroke="#FBBF24"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  opacity="0.6"
                  style={{ pointerEvents: 'none' }}
                />
                <line
                  x1={arrow.control.x}
                  y1={arrow.control.y}
                  x2={arrow.to.x}
                  y2={arrow.to.y}
                  stroke="#FBBF24"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  opacity="0.6"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
            
            {/* Endpoint handles for selected arrow */}
            {isSelected && (
              <>
                <circle
                  cx={arrow.from.x}
                  cy={arrow.from.y}
                  r="2"
                  fill="#FBBF24"
                  stroke="white"
                  strokeWidth="0.5"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    // TODO: Implement endpoint dragging
                  }}
                />
                <circle
                  cx={arrow.to.x}
                  cy={arrow.to.y}
                  r="2"
                  fill="#FBBF24"
                  stroke="white"
                  strokeWidth="0.5"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    // TODO: Implement endpoint dragging
                  }}
                />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};