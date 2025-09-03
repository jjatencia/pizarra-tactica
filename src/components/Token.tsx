import React, { useCallback, useRef } from 'react';
import { Token as TokenType, ObjectType } from '../types';
import { useBoardStore } from '../hooks/useBoardStore';


interface TokenProps {
  token: TokenType;
  fieldWidth: number;
  fieldHeight: number;
  onPointerDown: (e: React.PointerEvent, token: TokenType) => void;
  onEditNumber: (token: TokenType) => void;
}

export const Token: React.FC<TokenProps> = ({
  token,
  onPointerDown,
  onEditNumber
}) => {
  const { selectedTokenIds, selectToken, removeToken } = useBoardStore();
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const tapTimeoutRef = useRef<number | null>(null);

  const isSelected = selectedTokenIds.includes(token.id);
  const objectType: ObjectType = token.type || 'player';
  const baseRadius = objectType === 'player' ? 3 : objectType === 'ball' ? 2 : objectType === 'cone' ? 2 : 3;
  const sizeMultiplier = token.size === 'small' ? 0.5 : token.size === 'medium' ? 0.8 : 1;
  const radius = baseRadius * sizeMultiplier;
  const hitRadius = 8 * sizeMultiplier; // Adjust hit area based on size
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;
    
    console.log('👆 Token tap:', token.id, 'Time diff:', timeDiff, 'Tap count:', tapCountRef.current);
    
    // Reset tap count if too much time has passed
    if (timeDiff > 300) {
      tapCountRef.current = 0;
    }
    
    tapCountRef.current++;
    lastTapRef.current = now;
    
    // Clear any existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (tapCountRef.current === 3 && timeDiff < 300) {
      console.log('✏️ Triple tap edit token:', token.id);
      if (objectType === 'player') {
        onEditNumber(token);
      }
      tapCountRef.current = 0;
      return;
    }

    if (tapCountRef.current === 2 && timeDiff < 300) {
      tapTimeoutRef.current = window.setTimeout(() => {
        console.log('🗑️ Double tap delete token:', token.id);
        removeToken(token.id);
        tapCountRef.current = 0;
      }, 300);
    } else {
      if (!selectedTokenIds.includes(token.id)) {
        selectToken(token.id);
      }
      onPointerDown(e, token);

      tapTimeoutRef.current = window.setTimeout(() => {
        tapCountRef.current = 0;
        tapTimeoutRef.current = null;
      }, 300);
    }

  }, [token, onPointerDown, onEditNumber, selectToken, removeToken, selectedTokenIds]);
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TODO: Show context menu (edit, duplicate, delete)
    console.log('Context menu for token', token.id);
  }, [token.id]);
  
  // Team colors
  const teamColors = {
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#22C55E',
    yellow: '#EAB308',
  };
  
  const renderObject = () => {
    switch (objectType) {
      case 'ball':
        return (
          <g>
            <circle
              cx={token.x}
              cy={token.y}
              r={radius}
              fill="white"
              stroke="black"
              strokeWidth="0.2"
              style={{ pointerEvents: 'none' }}
            />
            {/* Ball pattern */}
            <path
              d={`M${token.x},${token.y - radius} A${radius},${radius} 0 0,1 ${token.x},${token.y + radius} M${token.x},${token.y - radius} A${radius},${radius} 0 0,0 ${token.x},${token.y + radius} M${token.x - radius},${token.y} A${radius},${radius} 0 0,1 ${token.x + radius},${token.y} M${token.x - radius},${token.y} A${radius},${radius} 0 0,0 ${token.x + radius},${token.y}`}
              fill="none"
              stroke="black"
              strokeWidth="0.1"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      
      case 'cone':
        return (
          <g>
            <polygon
              points={`${token.x},${token.y - radius} ${token.x - radius * 0.8},${token.y + radius} ${token.x + radius * 0.8},${token.y + radius}`}
              fill="#FF7F50"
              style={{ pointerEvents: 'none' }}
            />
            <rect
              x={token.x - radius}
              y={token.y + radius}
              width={radius * 2}
              height={radius * 0.3}
              fill="#E65100"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      
      case 'minigoal':
        return (
          <g>
            <rect
              x={token.x - radius * 1.2}
              y={token.y - radius * 0.8}
              width={radius * 2.4}
              height={radius * 1.6}
              stroke="white"
              strokeWidth="0.3"
              fill="none"
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1={token.x - radius * 1.2}
              y1={token.y + radius * 0.8}
              x2={token.x + radius * 1.2}
              y2={token.y + radius * 0.8}
              stroke="white"
              strokeWidth="0.3"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      
      default: // player
        return (
          <g>
            <circle
              cx={token.x}
              cy={token.y}
              r={radius}
              fill={teamColors[token.team]}
              stroke={isSelected ? '#FBBF24' : 'white'}
              strokeWidth={isSelected ? 0.4 : 0.2}
              style={{ pointerEvents: 'none' }}
            />
            <text
              x={token.x}
              y={token.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={2.5 * sizeMultiplier}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {token.number}
            </text>
          </g>
        );
    }
  };

  return (
    <g className="token-group">
      {/* Hit area (invisible, larger for touch) */}
      <circle
        cx={token.x}
        cy={token.y}
        r={hitRadius}
        fill="transparent"
        style={{ 
          cursor: 'grab',
          touchAction: 'none' // Prevent default touch behaviors for smoother dragging
        }}
        onPointerDown={handlePointerDown}
        onContextMenu={handleContextMenu}
      />
      
      {/* Render the appropriate object */}
      {renderObject()}
      
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={token.x}
          cy={token.y}
          r={radius + 1}
          fill="none"
          stroke="#FBBF24"
          strokeWidth="0.3"
          strokeDasharray="1,1"
          style={{ pointerEvents: 'none' }}
        >
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from={`0 ${token.x} ${token.y}`}
            to={`360 ${token.x} ${token.y}`}
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  );
};