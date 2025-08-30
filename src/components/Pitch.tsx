import React from 'react';
import { useBoardStore } from '../hooks/useBoardStore';

interface PitchProps {
  width: number;
  height: number;
  showFullField: boolean;
}

export const Pitch: React.FC<PitchProps> = ({ showFullField }) => {

  
  // Field dimensions in meters (FIFA standard)
  const fieldWidth = 105;
  const fieldHeight = 68;
  

  
  // SVG viewBox - show full field or half field
  const viewBoxWidth = showFullField ? fieldWidth : fieldWidth / 2;

  
  // Field markings dimensions
  const goalAreaWidth = 5.5;
  const goalAreaHeight = 18.32;
  const penaltyAreaWidth = 16.5;
  const penaltyAreaHeight = 40.32;
  const centerCircleRadius = 9.15;
  const penaltySpotDistance = 11;
  const cornerRadius = 1;
  const goalWidth = 7.32;
  const goalDepth = 2.44;
  
  // Grass stripes pattern
  const stripeWidth = fieldHeight / 12;
  
  return (
    <g>
      {/* Grass background with stripes */}
      <defs>
        <pattern id="grassStripes" patternUnits="userSpaceOnUse" width={stripeWidth * 2} height={fieldHeight}>
          <rect width={stripeWidth} height={fieldHeight} fill="#1B5E20" />
          <rect x={stripeWidth} width={stripeWidth} height={fieldHeight} fill="#1A4D1A" />
        </pattern>
      </defs>
      
      {/* Field background */}
      <rect
        x={0}
        y={0}
        width={viewBoxWidth}
        height={fieldHeight}
        fill="url(#grassStripes)"
      />
      
      {/* Field border */}
      <rect
        x={0}
        y={0}
        width={viewBoxWidth}
        height={fieldHeight}
        fill="none"
        stroke="white"
        strokeWidth="0.2"
      />
      
      {/* Center line (only if showing full field) */}
      {showFullField && (
        <line
          x1={fieldWidth / 2}
          y1={0}
          x2={fieldWidth / 2}
          y2={fieldHeight}
          stroke="white"
          strokeWidth="0.2"
        />
      )}
      
      {/* Center circle (only if showing full field) */}
      {showFullField && (
        <>
          <circle
            cx={fieldWidth / 2}
            cy={fieldHeight / 2}
            r={centerCircleRadius}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          <circle
            cx={fieldWidth / 2}
            cy={fieldHeight / 2}
            r="0.3"
            fill="white"
          />
        </>
      )}
      
      {/* Left goal area and penalty area */}
      {(showFullField || viewBoxWidth > fieldWidth / 2) && (
        <>
          {/* Goal */}
          <rect
            x={-goalDepth}
            y={(fieldHeight - goalWidth) / 2}
            width={goalDepth}
            height={goalWidth}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Goal area */}
          <rect
            x={0}
            y={(fieldHeight - goalAreaHeight) / 2}
            width={goalAreaWidth}
            height={goalAreaHeight}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Penalty area */}
          <rect
            x={0}
            y={(fieldHeight - penaltyAreaHeight) / 2}
            width={penaltyAreaWidth}
            height={penaltyAreaHeight}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Penalty spot */}
          <circle
            cx={penaltySpotDistance}
            cy={fieldHeight / 2}
            r="0.3"
            fill="white"
          />
          
          {/* Penalty arc */}
          <path
            d={`M ${penaltyAreaWidth} ${fieldHeight / 2 - centerCircleRadius} A ${centerCircleRadius} ${centerCircleRadius} 0 0 1 ${penaltyAreaWidth} ${fieldHeight / 2 + centerCircleRadius}`}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
        </>
      )}
      
      {/* Right goal area and penalty area */}
      {showFullField && (
        <>
          {/* Goal */}
          <rect
            x={fieldWidth}
            y={(fieldHeight - goalWidth) / 2}
            width={goalDepth}
            height={goalWidth}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Goal area */}
          <rect
            x={fieldWidth - goalAreaWidth}
            y={(fieldHeight - goalAreaHeight) / 2}
            width={goalAreaWidth}
            height={goalAreaHeight}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Penalty area */}
          <rect
            x={fieldWidth - penaltyAreaWidth}
            y={(fieldHeight - penaltyAreaHeight) / 2}
            width={penaltyAreaWidth}
            height={penaltyAreaHeight}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Penalty spot */}
          <circle
            cx={fieldWidth - penaltySpotDistance}
            cy={fieldHeight / 2}
            r="0.3"
            fill="white"
          />
          
          {/* Penalty arc */}
          <path
            d={`M ${fieldWidth - penaltyAreaWidth} ${fieldHeight / 2 - centerCircleRadius} A ${centerCircleRadius} ${centerCircleRadius} 0 0 0 ${fieldWidth - penaltyAreaWidth} ${fieldHeight / 2 + centerCircleRadius}`}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
        </>
      )}
      
      {/* Corner arcs */}
      {/* Bottom left */}
      <path
        d={`M ${cornerRadius} 0 A ${cornerRadius} ${cornerRadius} 0 0 0 0 ${cornerRadius}`}
        fill="none"
        stroke="white"
        strokeWidth="0.2"
      />
      
      {/* Top left */}
      <path
        d={`M 0 ${fieldHeight - cornerRadius} A ${cornerRadius} ${cornerRadius} 0 0 0 ${cornerRadius} ${fieldHeight}`}
        fill="none"
        stroke="white"
        strokeWidth="0.2"
      />
      
      {showFullField && (
        <>
          {/* Bottom right */}
          <path
            d={`M ${fieldWidth - cornerRadius} 0 A ${cornerRadius} ${cornerRadius} 0 0 1 ${fieldWidth} ${cornerRadius}`}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
          
          {/* Top right */}
          <path
            d={`M ${fieldWidth} ${fieldHeight - cornerRadius} A ${cornerRadius} ${cornerRadius} 0 0 1 ${fieldWidth - cornerRadius} ${fieldHeight}`}
            fill="none"
            stroke="white"
            strokeWidth="0.2"
          />
        </>
      )}
      
      {/* Grid overlay (optional) */}
      {useBoardStore.getState().gridSnap && (
        <g opacity="0.1">
          {Array.from({ length: Math.floor(viewBoxWidth / 12) + 1 }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={i * 12}
              y1={0}
              x2={i * 12}
              y2={fieldHeight}
              stroke="white"
              strokeWidth="0.1"
            />
          ))}
          {Array.from({ length: Math.floor(fieldHeight / 12) + 1 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={i * 12}
              x2={viewBoxWidth}
              y2={i * 12}
              stroke="white"
              strokeWidth="0.1"
            />
          ))}
        </g>
      )}
    </g>
  );
};