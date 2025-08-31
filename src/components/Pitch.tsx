import React from 'react';

interface PitchProps {
  width: number;
  height: number;
  showFullField: boolean;
}

export const Pitch: React.FC<PitchProps> = ({ width, height }) => {
  // Since we're now using CSS background for the pitch design,
  // we just need to render a transparent background rect
  // The pitch markings are handled by the CSS background image
  
  return (
    <g>
      {/* Transparent background rect - pitch design is handled by CSS background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="transparent"
      />
    </g>
  );
};