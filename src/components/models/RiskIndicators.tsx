import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RiskIndicatorsProps {
  revenueConcentration: number;
  fixedCostRatio: number;
  highestInitialRevenue: { name: string; value: number };
}

export const RiskIndicators = ({ revenueConcentration, fixedCostRatio, highestInitialRevenue }: RiskIndicatorsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary">Risk Indicators</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Revenue Concentration</p>
        <p className="text-2xl font-bold">{revenueConcentration.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">From highest stream ({highestInitialRevenue.name})</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Fixed Cost Ratio</p>
        <p className="text-2xl font-bold">{fixedCostRatio.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">Percentage of total costs</p>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">Sensitivity Analysis</p>
        <p className="text-sm italic text-muted-foreground">(Not Implemented)</p>
        <p className="text-xs text-muted-foreground">e.g., Impact of ±10% attendance</p>
      </div>
    </CardContent>
  </Card>
);