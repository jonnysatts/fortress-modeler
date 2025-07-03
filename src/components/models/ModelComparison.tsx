import React, { useState, useMemo } from 'react';
import { FinancialModel } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BarChart3, TrendingUp, TrendingDown, Eye, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/EmptyState';
import { HelpTooltip, helpContent } from '@/components/ui/HelpTooltip';

interface ModelComparisonProps {
  models: FinancialModel[];
  onViewModel: (modelId: string) => void;
}

interface ModelMetrics {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  paybackPeriod: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({ models, onViewModel }) => {
  const [selectedModels, setSelectedModels] = useState<string[]>(
    models.slice(0, Math.min(3, models.length)).map(m => m.id)
  );

  // Calculate metrics for each model
  const modelMetrics = useMemo(() => {
    const metrics = new Map<string, ModelMetrics>();
    
    models.forEach(model => {
      // Mock calculations - replace with actual financial calculations
      const revenue = Math.random() * 1000000 + 500000;
      const costs = revenue * (0.3 + Math.random() * 0.4);
      const profit = revenue - costs;
      const margin = (profit / revenue) * 100;
      
      metrics.set(model.id, {
        totalRevenue: revenue,
        totalCosts: costs,
        netProfit: profit,
        profitMargin: margin,
        paybackPeriod: Math.random() * 18 + 6,
        riskLevel: margin > 30 ? 'Low' : margin > 15 ? 'Medium' : 'High',
      });
    });
    
    return metrics;
  }, [models]);

  const selectedModelData = useMemo(() => {
    return models
      .filter(model => selectedModels.includes(model.id))
      .map(model => ({
        model,
        metrics: modelMetrics.get(model.id)!,
      }));
  }, [models, selectedModels, modelMetrics]);

  const handleModelSelection = (modelId: string, checked: boolean) => {
    if (checked) {
      if (selectedModels.length < 4) {
        setSelectedModels([...selectedModels, modelId]);
      }
    } else {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    }
  };

  const getMetricColor = (value: number, type: 'profit' | 'margin' | 'risk') => {
    switch (type) {
      case 'profit':
        return value > 0 ? 'text-green-600' : 'text-red-600';
      case 'margin':
        return value > 20 ? 'text-green-600' : value > 10 ? 'text-yellow-600' : 'text-red-600';
      case 'risk':
        return value < 10 ? 'text-green-600' : value < 20 ? 'text-yellow-600' : 'text-red-600';
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'Low': return 'default';
      case 'Medium': return 'secondary';
      case 'High': return 'destructive';
      default: return 'outline';
    }
  };

  if (models.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Models to Compare"
        description="Create multiple financial models to enable comparison features."
      />
    );
  }

  if (models.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Model Comparison
          </CardTitle>
          <CardDescription>
            You need at least 2 models to enable comparison features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Only one model found. Create additional models to compare different scenarios.
            </p>
            <Button onClick={() => onViewModel(models[0].id)} variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              View {models[0].name}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Model Comparison
            <HelpTooltip 
              title={helpContent.modelComparison.title}
              content={helpContent.modelComparison.content}
              className="ml-2"
            />
          </CardTitle>
          <CardDescription>
            Select up to 4 models to compare their key metrics and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
              <div key={model.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={model.id}
                  checked={selectedModels.includes(model.id)}
                  onCheckedChange={(checked) => handleModelSelection(model.id, checked as boolean)}
                  disabled={!selectedModels.includes(model.id) && selectedModels.length >= 4}
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={model.id} className="text-sm font-medium cursor-pointer">
                    {model.name}
                  </label>
                  <p className="text-xs text-muted-foreground truncate">
                    Updated {formatDate(model.updatedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewModel(model.id)}
                  className="flex-shrink-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {selectedModels.length >= 4 && (
            <p className="text-sm text-muted-foreground mt-4">
              Maximum of 4 models can be compared at once. Unselect some models to add others.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedModelData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Metrics Comparison</CardTitle>
            <CardDescription>
              Side-by-side comparison of financial metrics for selected models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Metric</TableHead>
                    {selectedModelData.map(({ model }) => (
                      <TableHead key={model.id} className="text-center min-w-32">
                        <div className="space-y-1">
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(model.updatedAt)}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Revenue</TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <div className="font-medium">
                          {formatCurrency(metrics.totalRevenue)}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">Total Costs</TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <div className="font-medium">
                          {formatCurrency(metrics.totalCosts)}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">Net Profit</TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <div className={`font-medium ${getMetricColor(metrics.netProfit, 'profit')}`}>
                          {formatCurrency(metrics.netProfit)}
                          {metrics.netProfit > 0 ? (
                            <TrendingUp className="inline ml-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="inline ml-1 h-3 w-3" />
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium flex items-center">
                      Profit Margin
                      <HelpTooltip 
                        title={helpContent.profitMargin.title}
                        content={helpContent.profitMargin.content}
                        className="ml-1"
                        iconSize={14}
                      />
                    </TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <div className={`font-medium ${getMetricColor(metrics.profitMargin, 'margin')}`}>
                          {metrics.profitMargin.toFixed(1)}%
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium flex items-center">
                      Payback Period
                      <HelpTooltip 
                        title={helpContent.paybackPeriod.title}
                        content={helpContent.paybackPeriod.content}
                        className="ml-1"
                        iconSize={14}
                      />
                    </TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <div className={`font-medium ${getMetricColor(metrics.paybackPeriod, 'risk')}`}>
                          {metrics.paybackPeriod.toFixed(1)} months
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  <TableRow>
                    <TableCell className="font-medium">Risk Level</TableCell>
                    {selectedModelData.map(({ model, metrics }) => (
                      <TableCell key={model.id} className="text-center">
                        <Badge variant={getRiskBadgeVariant(metrics.riskLevel)}>
                          {metrics.riskLevel}
                        </Badge>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-2">
              {selectedModelData.map(({ model }) => (
                <Button
                  key={model.id}
                  variant="outline"
                  size="sm"
                  onClick={() => onViewModel(model.id)}
                  className="flex items-center"
                >
                  View {model.name}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};