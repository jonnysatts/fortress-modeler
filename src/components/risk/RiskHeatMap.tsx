/**
 * Phase B3: Risk Heat Map Visualization
 * 
 * Visual representation of risks plotted by probability vs impact
 * to help identify risk priorities and patterns.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { RiskHeatMapPoint, RiskSeverity } from '@/types/risk';

interface RiskHeatMapProps {
  risks: RiskHeatMapPoint[];
  title?: string;
  className?: string;
}

export const RiskHeatMap: React.FC<RiskHeatMapProps> = ({
  risks,
  title = "Risk Heat Map",
  className
}) => {
  // Create 5x5 grid for probability (1-5) vs impact (1-5)
  const gridSize = 5;
  const cellSize = 60; // pixels
  
  const getSeverityColor = (severity: RiskSeverity): string => {
    switch (severity) {
      case 'low': return 'bg-green-100 border-green-300 text-green-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
    }
  };

  const getBackgroundIntensity = (probability: number, impact: number): string => {
    const riskScore = probability * impact;
    if (riskScore >= 20) return 'bg-red-200';
    if (riskScore >= 12) return 'bg-orange-200';
    if (riskScore >= 6) return 'bg-yellow-200';
    return 'bg-green-200';
  };

  // Get risks for a specific cell
  const getRisksForCell = (probability: number, impact: number) => {
    return risks.filter(risk => risk.probability === probability && risk.impact === impact);
  };

  if (risks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>Visual representation of risk probability vs impact</CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-lg mx-auto flex items-center justify-center">
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium">No Risks to Display</h3>
              <p className="text-sm text-muted-foreground">
                Risk heat map will appear here once risks are identified
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Risks plotted by probability (x-axis) vs impact (y-axis). Higher risk scores appear in the top-right.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium">Risk Level:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-200 rounded border border-green-300"></div>
              <span className="text-xs">Low (1-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-200 rounded border border-yellow-300"></div>
              <span className="text-xs">Medium (6-11)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-200 rounded border border-orange-300"></div>
              <span className="text-xs">High (12-19)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-200 rounded border border-red-300"></div>
              <span className="text-xs">Critical (20-25)</span>
            </div>
          </div>

          {/* Heat Map Grid */}
          <div className="relative">
            {/* Y-axis label (Impact) */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-muted-foreground">
              Impact
            </div>
            
            {/* Grid container */}
            <div className="ml-8 mb-8">
              {/* Y-axis numbers (Impact: 5 to 1, top to bottom) */}
              <div className="absolute -left-6 flex flex-col justify-between h-full text-xs text-muted-foreground">
                {[5, 4, 3, 2, 1].map(impact => (
                  <div key={impact} className="flex items-center h-[60px]">
                    {impact}
                  </div>
                ))}
              </div>

              {/* Grid cells */}
              <div className="grid grid-rows-5 gap-1" style={{ width: `${gridSize * (cellSize + 4)}px` }}>
                {[5, 4, 3, 2, 1].map(impact => (
                  <div key={impact} className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map(probability => {
                      const cellRisks = getRisksForCell(probability, impact);
                      const backgroundClass = getBackgroundIntensity(probability, impact);
                      
                      return (
                        <TooltipProvider key={`${probability}-${impact}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "border border-border rounded relative cursor-pointer hover:border-foreground/50 transition-colors",
                                  backgroundClass
                                )}
                                style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                              >
                                {cellRisks.length > 0 && (
                                  <div className="absolute inset-1 flex flex-wrap gap-1 p-1">
                                    {cellRisks.slice(0, 4).map((risk, index) => (
                                      <div
                                        key={risk.id}
                                        className={cn(
                                          "w-2 h-2 rounded-full border",
                                          getSeverityColor(risk.severity).split(' ')[0],
                                          getSeverityColor(risk.severity).split(' ')[1]
                                        )}
                                        title={risk.title}
                                      />
                                    ))}
                                    {cellRisks.length > 4 && (
                                      <div className="w-2 h-2 rounded-full bg-gray-400 border border-gray-500 flex items-center justify-center">
                                        <span className="text-[6px] text-white font-bold">
                                          +{cellRisks.length - 4}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {cellRisks.length > 0 && (
                                  <div className="absolute bottom-0 right-0 bg-black/50 text-white text-xs px-1 rounded-tl">
                                    {cellRisks.length}
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-2">
                                <div className="font-medium">
                                  Probability: {probability}, Impact: {impact}
                                </div>
                                {cellRisks.length > 0 ? (
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">
                                      {cellRisks.length} risk{cellRisks.length > 1 ? 's' : ''}:
                                    </div>
                                    {cellRisks.slice(0, 3).map(risk => (
                                      <div key={risk.id} className="flex items-center gap-2">
                                        <Badge className={cn("text-xs", getSeverityColor(risk.severity))}>
                                          {risk.severity}
                                        </Badge>
                                        <span className="text-xs truncate">{risk.title}</span>
                                      </div>
                                    ))}
                                    {cellRisks.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{cellRisks.length - 3} more...
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">
                                    No risks in this cell
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* X-axis numbers (Probability: 1 to 5, left to right) */}
              <div className="flex justify-between mt-2 text-xs text-muted-foreground" style={{ width: `${gridSize * (cellSize + 4)}px` }}>
                {[1, 2, 3, 4, 5].map(probability => (
                  <div key={probability} className="flex justify-center" style={{ width: `${cellSize}px` }}>
                    {probability}
                  </div>
                ))}
              </div>

              {/* X-axis label (Probability) */}
              <div className="text-center mt-2">
                <span className="text-sm font-medium text-muted-foreground">Probability</span>
              </div>
            </div>
          </div>

          {/* Risk Summary */}
          {risks.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-medium text-sm">Risk Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Risks:</span>
                  <span className="ml-2 font-medium">{risks.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Critical:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {risks.filter(r => r.severity === 'critical').length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">High:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {risks.filter(r => r.severity === 'high').length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Score:</span>
                  <span className="ml-2 font-medium">
                    {(risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};