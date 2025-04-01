import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Model } from '@/types/models';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ModelOverviewProps {
  model: Model;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const ModelOverview: React.FC<ModelOverviewProps> = ({ model }) => {
  const metadata = model.assumptions.metadata || {};
  const weeks = metadata.weeks || 12;
  const initialAttendance = metadata.initialWeeklyAttendance || 0;
  const attendanceGrowthRate = (metadata.growth?.attendanceGrowthRate || 0) / 100;

  // Calculate initial metrics
  const initialRevenue = model.assumptions.revenue.reduce((sum, stream) => sum + stream.value, 0);
  const initialCosts = model.assumptions.costs.reduce((sum, cost) => sum + cost.value, 0);
  const initialProfit = initialRevenue - initialCosts;
  const initialMargin = (initialProfit / initialRevenue) * 100;

  // Calculate final week metrics for each revenue stream
  const revenueStreams = model.assumptions.revenue.map(stream => {
    let finalValue = 0;
    if (stream.name === "F&B Sales") {
      let fbSpendPerCustomer = metadata.perCustomer?.fbSpend || 0;
      const finalAttendance = initialAttendance * Math.pow(1 + attendanceGrowthRate, weeks - 1);
      if (metadata.growth?.useCustomerSpendGrowth) {
        const fbSpendGrowthRate = (metadata.growth.fbSpendGrowth || 0) / 100;
        fbSpendPerCustomer *= Math.pow(1 + fbSpendGrowthRate, weeks - 1);
      }
      finalValue = fbSpendPerCustomer * finalAttendance;
    } else {
      finalValue = stream.value;
      if (metadata.growth?.useCustomerSpendGrowth) {
        const growthRate = stream.name.toLowerCase().includes('merchandise') 
          ? (metadata.growth.merchandiseSpendGrowth || 0) / 100
          : 0;
        finalValue *= Math.pow(1 + growthRate, weeks - 1);
      }
    }
    return {
      name: stream.name,
      initialValue: stream.value,
      finalValue: Math.ceil(finalValue),
      growth: ((finalValue / stream.value - 1) * 100).toFixed(1)
    };
  });

  // Find highest revenue stream based on total revenue over the period
  const highestRevenue = revenueStreams.reduce((prev, current) => 
    current.finalValue > prev.finalValue ? current : prev
  );

  // Calculate final week costs for each cost category
  const costCategories = model.assumptions.costs.map(cost => {
    const costType = cost.type?.toLowerCase();
    let finalValue = 0;
    
    if (costType === "fixed") {
      finalValue = 0; // Only applies in week 1
    } else if (cost.name === "F&B COGS") {
      const fbRevenue = revenueStreams.find(r => r.name === "F&B Sales")?.finalValue || 0;
      const cogsPct = metadata.costs?.fbCOGSPercent || 30;
      finalValue = (fbRevenue * cogsPct) / 100;
    } else if (costType === "recurring") {
      finalValue = cost.value;
    } else if (costType === "variable") {
      finalValue = cost.value;
      if (metadata.growth?.useCustomerSpendGrowth) {
        const growthRate = metadata.growth.fbSpendGrowth / 100;
        finalValue *= Math.pow(1 + growthRate, weeks - 1);
      }
    }

    return {
      name: cost.name,
      initialValue: cost.value,
      finalValue: Math.ceil(finalValue),
      type: costType,
      weeklyAverage: costType === "fixed" 
        ? Math.ceil(cost.value / weeks) 
        : Math.ceil(finalValue)
    };
  });

  // Find largest cost based on total cost over the period
  const largestCost = costCategories.reduce((prev, current) => {
    const prevTotal = prev.type === "fixed" ? prev.initialValue : prev.weeklyAverage * weeks;
    const currentTotal = current.type === "fixed" ? current.initialValue : current.weeklyAverage * weeks;
    return currentTotal > prevTotal ? current : prev;
  });

  // Calculate final week revenue and costs
  const finalWeekRevenue = revenueStreams.reduce((sum, stream) => sum + stream.finalValue, 0);
  const finalWeekCosts = costCategories.reduce((sum, cost) => {
    if (cost.type === "fixed") return sum;
    return sum + cost.finalValue;
  }, 0);

  const finalWeekProfit = finalWeekRevenue - finalWeekCosts;
  const finalWeekMargin = (finalWeekProfit / finalWeekRevenue) * 100;

  // Calculate attendance data for the chart
  const finalWeekAttendance = initialAttendance * Math.pow(1 + attendanceGrowthRate, weeks - 1);
  const weeklyAttendance = Array.from({ length: weeks }, (_, i) => ({
    week: i + 1,
    attendance: Math.round(initialAttendance * Math.pow(1 + attendanceGrowthRate, i))
  }));
  const totalCustomers = weeklyAttendance.reduce((sum, week) => sum + week.attendance, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="text-green-600">●</span>
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Initial Weekly Revenue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(initialRevenue)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Final Week Revenue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-green-600">{formatCurrency(finalWeekRevenue)}</p>
                  <p className="text-sm font-medium text-green-600/80">
                    +{((finalWeekRevenue / initialRevenue - 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Highest Revenue Stream</p>
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-lg font-semibold mb-2">{highestRevenue.name}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Initial</span>
                      <span>{formatCurrency(highestRevenue.initialValue)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Final</span>
                      <span>{formatCurrency(highestRevenue.finalValue)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Growth</span>
                      <span>+{highestRevenue.growth}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="text-red-600">●</span>
              Cost Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Initial Weekly Costs</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(initialCosts)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Final Week Costs</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-red-600">{formatCurrency(finalWeekCosts)}</p>
                  <p className="text-sm font-medium text-red-600/80">
                    +{((finalWeekCosts / initialCosts - 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Largest Cost Category</p>
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-lg font-semibold mb-2">{largestCost.name}</p>
                  <div className="space-y-1 text-sm">
                    {largestCost.type === "fixed" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">One-time Cost</span>
                          <span>{formatCurrency(largestCost.initialValue)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Weekly Average</span>
                          <span>{formatCurrency(largestCost.weeklyAverage)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Initial</span>
                          <span>{formatCurrency(largestCost.initialValue)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Final</span>
                          <span>{formatCurrency(largestCost.finalValue)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="text-blue-600">●</span>
              Profitability
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Initial Weekly Profit</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold tracking-tight">{formatCurrency(initialProfit)}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {initialMargin.toFixed(1)}% margin
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Final Week Profit</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold text-blue-600">{formatCurrency(finalWeekProfit)}</p>
                  <p className="text-sm font-medium text-blue-600/80">
                    {finalWeekMargin.toFixed(1)}% margin
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Forecast */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            <span className="text-purple-600">●</span>
            Customer Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#7c3aed" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Initial Weekly Attendance</p>
                <p className="text-3xl font-bold tracking-tight">{initialAttendance}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Final Week Attendance</p>
                <p className="text-2xl font-semibold text-purple-600">{Math.round(finalWeekAttendance)}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Forecast Customers</p>
                <p className="text-2xl font-semibold">{totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Assumptions */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/10 pb-4">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
            <span className="text-orange-600">●</span>
            Critical Assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Event Details */}
            <div className="bg-muted/10 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">Event Structure</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{weeks} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Initial Attendance</span>
                  <span className="text-sm font-medium">{initialAttendance} per week</span>
                </div>
              </div>
            </div>

            {/* Growth Rates */}
            <div className="bg-muted/10 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">Growth Rates</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Attendance Growth</span>
                  <span className="text-sm font-medium">{metadata.growth?.attendanceGrowthRate || 0}% weekly</span>
                </div>
                {metadata.growth?.useCustomerSpendGrowth && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">F&B Spend Growth</span>
                      <span className="text-sm font-medium">{metadata.growth?.fbSpendGrowth || 0}% weekly</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Merchandise Growth</span>
                      <span className="text-sm font-medium">{metadata.growth?.merchandiseSpendGrowth || 0}% weekly</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Key Cost Factors */}
            <div className="bg-muted/10 rounded-lg p-4">
              <h3 className="font-medium text-sm mb-3">Cost Factors</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">F&B COGS</span>
                  <span className="text-sm font-medium">{metadata.costs?.fbCOGSPercent || 30}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Staff Count</span>
                  <span className="text-sm font-medium">{metadata.costs?.staffCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Staff Cost Per Person</span>
                  <span className="text-sm font-medium">{formatCurrency(metadata.costs?.staffCostPerPerson || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 