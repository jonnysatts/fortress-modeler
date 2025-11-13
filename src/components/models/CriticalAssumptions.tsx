import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Model } from '@/types/models';

interface CriticalAssumptionsProps {
  model: Model;
  duration: number;
  timeUnit: string;
  isWeekly: boolean;
}

export const CriticalAssumptions = ({ model, duration, timeUnit, isWeekly }: CriticalAssumptionsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary">Critical Assumptions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <h3 className="font-medium mb-2">Event Structure</h3>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Duration: </span>
              {duration} {timeUnit}s
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Initial Attendance: </span>
              {model.assumptions.metadata?.initialWeeklyAttendance 
                ? model.assumptions.metadata.initialWeeklyAttendance.toLocaleString() 
                : 'N/A'} {isWeekly ? 'per week' : ''}
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Growth Rates</h3>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Attendance Growth: </span>
              {model.assumptions.metadata?.growth?.attendanceGrowthRate ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
            </p>
            {model.assumptions.metadata?.growth?.useCustomerSpendGrowth ? (
              <>
                <p className="text-sm">
                  <span className="text-muted-foreground">F&B Spend Growth: </span>
                  {model.assumptions.metadata?.growth?.fbSpendGrowth ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Merch Spend Growth: </span>
                  {model.assumptions.metadata?.growth?.merchandiseSpendGrowth ?? 'N/A'}% {isWeekly ? 'weekly' : 'N/A'}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Customer spend growth not applied.</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">Cost Factors</h3>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Setup Costs: </span>
              {formatCurrency(model.assumptions.costs.find(c => c.name === "Setup Costs")?.value || 0)}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">F&B COGS %: </span>
              {model.assumptions.metadata?.costs?.fbCOGSPercent ?? 'N/A'}%
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Staff Count: </span>
              {model.assumptions.metadata?.costs?.staffCount ?? 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);