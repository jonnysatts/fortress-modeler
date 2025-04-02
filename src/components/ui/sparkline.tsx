import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
}

interface SparklinePointProps {
  x: number;
  y: number;
  color?: string;
  size?: number;
}

export const SparklinePoint: React.FC<SparklinePointProps> = ({ 
  x, 
  y, 
  color = 'currentColor', 
  size = 4 
}) => {
  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill={color}
    />
  );
};

export const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  width = 100, 
  height = 30, 
  color = 'currentColor',
  strokeWidth = 1.5,
  fillOpacity = 0.2
}) => {
  if (!data || data.length === 0) {
    return <svg width={width} height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Prevent division by zero

  // Calculate points for the path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Create the path for the area under the line
  const areaPath = `
    M 0,${height} 
    L ${points} 
    L ${width},${height} 
    Z
  `;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* Area under the line */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity={fillOpacity}
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Last point */}
      <SparklinePoint 
        x={width} 
        y={height - ((data[data.length - 1] - min) / range) * height}
        color={color}
      />
    </svg>
  );
};
