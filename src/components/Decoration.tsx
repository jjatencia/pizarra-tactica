import React, { useCallback } from 'react';
import { Decoration as DecorationType } from '../types';
import { useBoardStore } from '../hooks/useBoardStore';

interface DecorationProps {
  decoration: DecorationType;
  onPointerDown: (e: React.PointerEvent, decoration: DecorationType) => void;
}

export const Decoration: React.FC<DecorationProps> = ({ decoration, onPointerDown }) => {
  const { selectedDecorationId, selectDecoration, removeDecoration } = useBoardStore();
  const isSelected = selectedDecorationId === decoration.id;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    selectDecoration(decoration.id);
    onPointerDown(e, decoration);
  }, [decoration, onPointerDown, selectDecoration]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeDecoration(decoration.id);
  }, [decoration.id, removeDecoration]);

  const size = 3; // meters
  const half = size / 2;

  const common = {
    transform: `translate(${decoration.x - half} ${decoration.y - half})`,
  } as React.SVGProps<SVGGElement>;

  return (
    <g className="decoration-group">
      {/* Hit area */}
      <circle
        cx={decoration.x}
        cy={decoration.y}
        r={5}
        fill="transparent"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      />

      {/* Visual */}
      {decoration.type === 'ball' && (
        <g {...common} style={{ pointerEvents: 'none' }}>
          <circle cx={half} cy={half} r={half} fill="#fff" stroke="#000" strokeWidth={0.4} />
          <path d={`M${half},0 A${half},${half} 0 0,1 ${half},${size} M${half},0 A${half},${half} 0 0,0 ${half},${size} M0,${half} A${half},${half} 0 0,1 ${size},${half} M0,${half} A${half},${half} 0 0,0 ${size},${half}`} fill="none" stroke="#000" strokeWidth={0.2} />
          {isSelected && <circle cx={half} cy={half} r={half + 0.6} fill="none" stroke="#FBBF24" strokeWidth={0.3} />}
        </g>
      )}

      {decoration.type === 'cone' && (
        <g {...common} style={{ pointerEvents: 'none' }}>
          <polygon points={`${half},0 ${size*0.2},${size} ${size*0.8},${size}`} fill="#FF7F50" />
          <rect x={size*0.15} y={size} width={size*0.7} height={0.3} fill="#E65100" />
          {isSelected && <rect x={-0.5} y={-0.5} width={size+1} height={size+1} fill="none" stroke="#FBBF24" strokeWidth={0.3} />}
        </g>
      )}

      {decoration.type === 'minigoal' && (
        <g {...common} style={{ pointerEvents: 'none' }}>
          <rect x={0.2} y={size*0.2} width={size-0.4} height={size*0.7} fill="none" stroke="white" strokeWidth={0.5} />
          <line x1={0.2} y1={size*0.9} x2={size-0.2} y2={size*0.9} stroke="white" strokeWidth={0.5} />
          {isSelected && <rect x={-0.5} y={-0.5} width={size+1} height={size+1} fill="none" stroke="#FBBF24" strokeWidth={0.3} />}
        </g>
      )}
    </g>
  );
};

