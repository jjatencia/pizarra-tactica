import React, { useCallback } from 'react';
import { Token as TokenType } from '../types';
import { useBoardStore } from '../hooks/useBoardStore';


interface TokenProps {
  token: TokenType;
  fieldWidth: number;
  fieldHeight: number;
  onPointerDown: (e: React.PointerEvent, token: TokenType) => void;
  isDragging?: boolean;
}

export const Token: React.FC<TokenProps> = ({ 
  token, 
  onPointerDown,
  isDragging = false
}) => {
  const { selectedTokenId, selectToken } = useBoardStore();
  
  const isSelected = selectedTokenId === token.id;
  const radius = 3;
  const hitRadius = 8; // Larger hit area for better touch response on iPad
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Ensure immediate response for touch on iPad
    selectToken(token.id);
    
    onPointerDown(e, token);
  }, [token, onPointerDown, selectToken]);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Show number/color edit dialog
    console.log('Double click on token', token.id);
  }, [token.id]);
  
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
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none', // Prevent default touch behaviors for smoother dragging
          userSelect: 'none',
          webkitUserSelect: 'none',
          webkitTouchCallout: 'none', // Disable iOS callout menu
          webkitTapHighlightColor: 'transparent' // Remove tap highlight on mobile
        }}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      />
      
      {/* Token background */}
      <circle
        cx={token.x}
        cy={token.y}
        r={radius}
        fill={teamColors[token.team]}
        stroke={isSelected ? '#FBBF24' : 'white'}
        strokeWidth={isSelected ? 0.4 : 0.2}
        opacity={isDragging ? 0.8 : 1}
        style={{ 
          pointerEvents: 'none',
          filter: isDragging ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none'
        }}
      />
      
      {/* Token number */}
      <text
        x={token.x}
        y={token.y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="2.5"
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {token.number}
      </text>
      
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