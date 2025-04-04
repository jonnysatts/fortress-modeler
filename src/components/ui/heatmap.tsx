import React, { useMemo } from 'react';
import { dataColors } from '@/lib/colors';
import { formatCurrency, formatPercent } from '@/lib/utils';

interface HeatmapCell {
  x: number;
  y: number;
  value: number;
  label?: string;
}

interface HeatmapProps {
  data: HeatmapCell[];
  width?: number;
  height?: number;
  xLabels: string[];
  yLabels: string[];
  colorRange?: string[];
  minValue?: number;
  maxValue?: number;
  isCurrency?: boolean;
  isPercentage?: boolean;
  showValues?: boolean;
  cellSize?: number;
  cellPadding?: number;
  title?: string;
  description?: string;
}

const Heatmap: React.FC<HeatmapProps> = ({
  data,
  width = 800,
  height = 400,
  xLabels,
  yLabels,
  colorRange = [
    '#f7fafc', // Very light blue
    '#e6f2ff', // Light blue
    '#bfdbfe', // Blue 200
    '#93c5fd', // Blue 300
    '#60a5fa', // Blue 400
    '#3b82f6', // Blue 500
    '#2563eb', // Blue 600
    '#1d4ed8', // Blue 700
  ],
  minValue,
  maxValue,
  isCurrency = false,
  isPercentage = false,
  showValues = true,
  cellSize = 40,
  cellPadding = 2,
  title,
  description,
}) => {
  // Calculate min and max values if not provided
  const calculatedMinValue = useMemo(() => 
    minValue !== undefined ? minValue : Math.min(...data.map(d => d.value)),
    [data, minValue]
  );
  
  const calculatedMaxValue = useMemo(() => 
    maxValue !== undefined ? maxValue : Math.max(...data.map(d => d.value)),
    [data, maxValue]
  );
  
  // Format value based on type
  const formatValue = (value: number): string => {
    if (isPercentage) return formatPercent(value);
    if (isCurrency) return formatCurrency(value);
    return value.toLocaleString();
  };
  
  // Get color for a value
  const getColor = (value: number): string => {
    if (value === null || value === undefined) return '#f1f5f9'; // Default light gray
    
    // Calculate position in the color range
    const range = calculatedMaxValue - calculatedMinValue;
    if (range === 0) return colorRange[colorRange.length - 1];
    
    const normalizedValue = (value - calculatedMinValue) / range;
    const colorIndex = Math.min(
      Math.floor(normalizedValue * colorRange.length),
      colorRange.length - 1
    );
    
    return colorRange[colorIndex];
  };
  
  // Calculate dimensions
  const labelWidth = 100;
  const labelHeight = 30;
  const totalWidth = labelWidth + (xLabels.length * (cellSize + cellPadding));
  const totalHeight = labelHeight + (yLabels.length * (cellSize + cellPadding));
  
  // Adjust SVG dimensions
  const svgWidth = Math.max(width, totalWidth);
  const svgHeight = Math.max(height, totalHeight);
  
  return (
    <div className="flex flex-col">
      {title && <h3 className="text-lg font-medium mb-1">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
      
      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight}>
          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={`x-${i}`}
              x={labelWidth + i * (cellSize + cellPadding) + cellSize / 2}
              y={labelHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
            >
              {label}
            </text>
          ))}
          
          {/* Y-axis labels */}
          {yLabels.map((label, i) => (
            <text
              key={`y-${i}`}
              x={labelWidth / 2}
              y={labelHeight + i * (cellSize + cellPadding) + cellSize / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fontWeight="500"
            >
              {label}
            </text>
          ))}
          
          {/* Heatmap cells */}
          {data.map((cell, i) => {
            const x = labelWidth + cell.x * (cellSize + cellPadding);
            const y = labelHeight + cell.y * (cellSize + cellPadding);
            
            return (
              <g key={`cell-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width={cellSize}
                  height={cellSize}
                  fill={getColor(cell.value)}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                >
                  <title>{`${xLabels[cell.x]}, ${yLabels[cell.y]}: ${formatValue(cell.value)}`}</title>
                </rect>
                
                {showValues && (
                  <text
                    x={x + cellSize / 2}
                    y={y + cellSize / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fontWeight="500"
                    fill="#1e293b"
                  >
                    {cell.label || formatValue(cell.value)}
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Legend */}
          <g transform={`translate(${labelWidth}, ${labelHeight + yLabels.length * (cellSize + cellPadding) + 20})`}>
            <text fontSize="12" fontWeight="500">Legend:</text>
            {colorRange.map((color, i) => {
              const x = i * 60;
              const value = calculatedMinValue + (i / (colorRange.length - 1)) * (calculatedMaxValue - calculatedMinValue);
              
              return (
                <g key={`legend-${i}`} transform={`translate(${x}, 20)`}>
                  <rect width="20" height="20" fill={color} stroke="#e2e8f0" strokeWidth="1" />
                  <text x="25" y="15" fontSize="10">{formatValue(value)}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default Heatmap;
