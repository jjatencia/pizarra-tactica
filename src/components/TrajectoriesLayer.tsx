import React, { useCallback } from 'react';
import { Trajectory } from '../types';
import { useBoardStore } from '../hooks/useBoardStore';

interface TrajectoriesLayerProps {
  trajectories: Trajectory[];
  onTrajectorySelect: (id: string | null) => void;
  onTrajectoryUpdate: (id: string, updates: Partial<Trajectory>) => void;
}

export const TrajectoriesLayer: React.FC<TrajectoriesLayerProps> = ({
  trajectories,
  onTrajectorySelect,
}) => {
  const { selectedTrajectoryId, removeTrajectory, mode } = useBoardStore();

  const handleTrajectoryClick = useCallback((e: React.MouseEvent, trajectory: Trajectory) => {
    e.stopPropagation();
    
    // In erase mode, delete the trajectory immediately
    if (mode === 'erase') {
      console.log('🗑️ Erasing trajectory:', trajectory.id);
      removeTrajectory(trajectory.id);
      return;
    }
    
    // In normal mode, select the trajectory
    onTrajectorySelect(trajectory.id);
  }, [onTrajectorySelect, mode, removeTrajectory]);

  const handleTrajectoryDoubleClick = useCallback((e: React.MouseEvent, trajectory: Trajectory) => {
    e.stopPropagation();
    removeTrajectory(trajectory.id);
  }, [removeTrajectory]);

  const createPathFromPoints = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use smooth curves for better visual appeal
    for (let i = 1; i < points.length; i++) {
      if (i === 1) {
        path += ` L ${points[i].x} ${points[i].y}`;
      } else {
        // Create smooth curves using quadratic Bezier curves
        const curr = points[i];
        const next = points[i + 1];
        
        if (next) {
          // Calculate control point for smooth curve
          const cpx = curr.x;
          const cpy = curr.y;
          path += ` Q ${cpx} ${cpy} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
        } else {
          path += ` L ${curr.x} ${curr.y}`;
        }
      }
    }
    
    return path;
  };

  return (
    <g className="trajectories-layer">
      {trajectories.map((trajectory) => {
        const isSelected = selectedTrajectoryId === trajectory.id;
        const pathData = createPathFromPoints(trajectory.points);
        
        if (!pathData) return null;

        const strokeColor = trajectory.type === 'pass' ? '#8B5CF6' : '#F59E0B'; // Changed from green to purple for better visibility
        const strokeDasharray = trajectory.style === 'dashed' ? '6,3' : undefined;

        return (
          <g key={trajectory.id}>
            {/* Invisible wider path for easier selection */}
            <path
              d={pathData}
              stroke="transparent"
              strokeWidth="6"
              fill="none"
              style={{ cursor: mode === 'erase' ? 'crosshair' : 'pointer' }}
              onClick={(e) => handleTrajectoryClick(e, trajectory)}
              onDoubleClick={(e) => handleTrajectoryDoubleClick(e, trajectory)}
            />
            
            {/* Visible trajectory path */}
            <path
              d={pathData}
              stroke={strokeColor}
              strokeWidth={isSelected ? "1.8" : "1.2"}
              strokeDasharray={strokeDasharray}
              fill="none"
              opacity={isSelected ? 1 : 0.8}
              style={{ pointerEvents: 'none' }}
            />
            
            {/* Selection highlight */}
            {isSelected && (
              <path
                d={pathData}
                stroke="#FBBF24"
                strokeWidth="2.5"
                fill="none"
                opacity="0.5"
                style={{ pointerEvents: 'none' }}
              />
            )}
            
            {/* Show points when selected */}
            {isSelected && trajectory.points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="1"
                fill="#FBBF24"
                style={{ pointerEvents: 'none' }}
              />
            ))}
          </g>
        );
      })}
    </g>
  );
};