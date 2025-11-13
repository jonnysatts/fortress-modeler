import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  children: React.ReactNode;
}

export const MetricsCard = ({ title, children }: MetricsCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {children}
    </CardContent>
  </Card>
);

interface MetricRowProps {
  label: string;
  value: string | number;
  isHighlight?: boolean;
  colorClass?: string;
}

export const MetricRow = ({ label, value, isHighlight, colorClass }: MetricRowProps) => (
  <div className={`flex justify-between items-baseline ${isHighlight ? 'border-t pt-3 mt-3' : ''}`}>
    <span className={`text-sm ${isHighlight ? 'font-medium' : ''} text-muted-foreground`}>
      {label}
    </span>
    <span className={`${isHighlight ? 'text-2xl font-bold' : 'text-lg font-semibold'} ${colorClass || ''}`}>
      {typeof value === 'number' ? formatCurrency(value) : value}
    </span>
  </div>
);