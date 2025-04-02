import React from 'react';
import { ActualsPeriodEntry, RevenueStream, CostCategory, Model } from '@/types/models';
import { FinancialModel } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ActualsDisplayTableProps {
  model: FinancialModel;
  actualsData: ActualsPeriodEntry[];
}

export const ActualsDisplayTable: React.FC<ActualsDisplayTableProps> = ({ model, actualsData }) => {
  
  if (!actualsData || actualsData.length === 0) {
    return (
        <p className="text-sm text-center text-muted-foreground mt-6">No actuals data saved yet.</p>
    );
  }
  
  const revenueItems: RevenueStream[] = model.assumptions.revenue || [];
  const costItems: CostCategory[] = model.assumptions.costs || [];
   const hasMarketingBudget = (
       (model.assumptions.marketing?.allocationMode === 'channels' && model.assumptions.marketing.channels.some(ch => ch.weeklyBudget > 0)) ||
       (model.assumptions.marketing?.allocationMode === 'highLevel' && (model.assumptions.marketing.totalBudget || 0) > 0)
   );
   const allCostKeys = [
       ...costItems.map(c => c.name), 
       ...(hasMarketingBudget ? ["Marketing Budget"] : [])
   ];

  const sortedData = [...actualsData].sort((a, b) => a.period - b.period);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Saved Actuals Summary</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10">Period</TableHead>
              {revenueItems.map(item => (
                  <TableHead key={`rev-h-${item.name}`} className="text-right text-green-700">{item.name}</TableHead>
              ))}
              <TableHead className="text-right font-bold text-green-800 border-l border-r">Total Revenue</TableHead>
              
              {allCostKeys.map(key => (
                  <TableHead key={`cost-h-${key}`} className="text-right text-red-700 border-l">{key}</TableHead>
              ))}
              <TableHead className="text-right font-bold text-red-800 border-l border-r">Total Costs</TableHead>
              
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((entry) => {
              const totalRevenue = Object.values(entry.revenueActuals || {}).reduce((sum, val) => sum + val, 0);
              const totalCosts = Object.values(entry.costActuals || {}).reduce((sum, val) => sum + val, 0);
              
              return (
                <TableRow key={entry.id || `${entry.projectId}-${entry.period}`}>
                  <TableCell className="sticky left-0 bg-background z-10">{entry.periodType} {entry.period}</TableCell>
                  {revenueItems.map(item => (
                      <TableCell key={`rev-d-${item.name}-${entry.period}`} className="text-right">
                          {formatCurrency(entry.revenueActuals?.[item.name] || 0)}
                      </TableCell>
                  ))}
                  <TableCell className="text-right font-medium text-green-800 border-l border-r">{formatCurrency(totalRevenue)}</TableCell>
                  
                  {allCostKeys.map(key => (
                       <TableCell key={`cost-d-${key}-${entry.period}`} className="text-right border-l">
                          {formatCurrency(entry.costActuals?.[key] || 0)}
                      </TableCell>
                  ))}
                  <TableCell className="text-right font-medium text-red-800 border-l border-r">{formatCurrency(totalCosts)}</TableCell>
                  
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={entry.notes}>{entry.notes || "-"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}; 