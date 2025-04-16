import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FinancialModel, ActualsPeriodEntry, Scenario } from '@/lib/db';
import useStore from '@/store/useStore';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { generateForecastTimeSeries, ForecastPeriodData } from '@/lib/financialCalculations';
import { TypographyH4, TypographyMuted, TypographyH2, TypographyP } from '@/components/ui/typography';
import ContentCard from '@/components/common/ContentCard';
import ChartContainer from '@/components/common/ChartContainer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Label as RechartsLabel, AreaChart, Area } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Sparkline } from '@/components/ui/sparkline';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { dataColors } from '@/lib/colors';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { db } from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Placeholder types - Define these properly in @/types/models or similar
// REMOVE Placeholder types
// type ScenarioParameterAdjustment = { parameter: string; adjustment: number; /* originalValue?: any; scenarioValue?: any */ };
// type Scenario = { id?: number; projectId: number; name: string; description?: string; parameters: ScenarioParameterAdjustment[]; createdAt?: Date; updatedAt?: Date; };

// --- Helper: Calculate Revenue Breakdown from Time Series ---
interface RevenueBreakdownItem {
    name: string;
    totalValue: number;
    percentage: number;
}
const calculateRevenueBreakdown = (timeSeries: ForecastPeriodData[], model: FinancialModel | null): RevenueBreakdownItem[] => {
    if (!model?.assumptions || timeSeries.length === 0) return [];

    const breakdown: Record<string, number> = {};
    const revenueStreams = model.assumptions.revenue || [];
    const metadata = model.assumptions.metadata;
    const growthModel = model.assumptions.growthModel;
    const isWeekly = metadata?.type === "WeeklyEvent";

    // Initialize breakdown with all known stream names
    revenueStreams.forEach(s => breakdown[s.name] = 0);
    // Ensure standard streams exist if it's a weekly model
    if (isWeekly) {
        if (!breakdown["Ticket Sales"]) breakdown["Ticket Sales"] = 0;
        if (!breakdown["F&B Sales"]) breakdown["F&B Sales"] = 0;
        if (!breakdown["Merchandise Sales"]) breakdown["Merchandise Sales"] = 0;
    }

    // Sum revenue per stream across all periods
    timeSeries.forEach(periodData => {
        let currentAttendance = periodData.attendance ?? 0;
        const period = periodData.period;

        // Re-calculate per-period stream revenue based on drivers/assumptions
        // (This mirrors logic in generateForecastTimeSeries but sums into breakdown)
         if (isWeekly && metadata?.perCustomer) {
            let currentTicketPrice = metadata.perCustomer.ticketPrice ?? 0;
            let currentFbSpend = metadata.perCustomer.fbSpend ?? 0;
            let currentMerchSpend = metadata.perCustomer.merchandiseSpend ?? 0;
            // Apply growth...
            if (period > 1 && metadata.growth?.useCustomerSpendGrowth) {
                currentTicketPrice *= Math.pow(1 + (metadata.growth.ticketPriceGrowth ?? 0) / 100, period - 1);
                currentFbSpend *= Math.pow(1 + (metadata.growth.fbSpendGrowth ?? 0) / 100, period - 1);
                currentMerchSpend *= Math.pow(1 + (metadata.growth.merchandiseSpendGrowth ?? 0) / 100, period - 1);
            }
            breakdown["Ticket Sales"] += currentAttendance * currentTicketPrice;
            breakdown["F&B Sales"] += currentAttendance * currentFbSpend;
            breakdown["Merchandise Sales"] += currentAttendance * currentMerchSpend;
         }

         revenueStreams.forEach(stream => {
            if (isWeekly && ["Ticket Sales", "F&B Sales", "Merchandise Sales"].includes(stream.name)) return; // Skip already calculated

            let streamRevenue = stream.value ?? 0;
            if (period > 1 && growthModel) { // Apply general growth to others
                if (growthModel.type === "linear") streamRevenue = (stream.value??0) * (1 + growthModel.rate * (period - 1));
                else if (growthModel.type === "exponential") streamRevenue = (stream.value??0) * Math.pow(1 + growthModel.rate, period - 1);
                else if (growthModel.type === "seasonal" && growthModel.seasonalFactors && growthModel.seasonalFactors.length > 0) {
                    const seasonIndex = (period - 1) % growthModel.seasonalFactors.length;
                    const seasonFactor = growthModel.seasonalFactors[seasonIndex];
                    streamRevenue = (stream.value??0) * Math.pow(1 + growthModel.rate, period - 1) * seasonFactor;
                }
            }
            breakdown[stream.name] += streamRevenue;
         });
    });

    // Convert to array and calculate percentages
    const totalRevenue = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    return Object.entries(breakdown).map(([name, totalValue]) => ({
        name,
        totalValue,
        percentage: totalRevenue ? Math.round((totalValue / totalRevenue) * 1000) / 10 : 0
    }));
};

// --- Helper: Calculate Cost Breakdown from Time Series ---
interface CostBreakdownItem {
    category: string;
    totalValue: number;
    percentage: number;
}
const calculateCostBreakdown = (timeSeries: ForecastPeriodData[], model: FinancialModel | null): CostBreakdownItem[] => {
    if (!model?.assumptions || timeSeries.length === 0) return [];

    const breakdown: Record<string, number> = {};
    const costCategories = model.assumptions.costs || [];
    const metadata = model.assumptions.metadata;
    const isWeekly = metadata?.type === "WeeklyEvent";

    // Initialize breakdown with all known categories
    costCategories.forEach(c => breakdown[c.name] = 0);

    // Sum costs per category across all periods
    timeSeries.forEach(periodData => {
        if (periodData.costBreakdown) {
            Object.entries(periodData.costBreakdown).forEach(([category, value]) => {
                breakdown[category] = (breakdown[category] || 0) + (value ?? 0);
            });
        }
    });

    // Convert to array and calculate percentages
    const totalCosts = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    return Object.entries(breakdown).map(([category, totalValue]) => ({
        category,
        totalValue,
        percentage: totalCosts ? Math.round((totalValue / totalCosts) * 1000) / 10 : 0
    }));
};

// --- Custom Tooltip for Charts ---
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dataItem = payload[0].payload;
        return (
            <div className="bg-white p-3 border rounded-md shadow-sm">
                <p className="font-medium">{dataItem.name || payload[0].name}</p>
                <p>Value: ${dataItem.value?.toLocaleString()}</p>
                {dataItem.percentage !== undefined && (
                    <p>Percentage: {dataItem.percentage}%</p>
                )}
                {dataItem.type && (
                    <p>Type: {dataItem.type}</p>
                )}
            </div>
        );
    }
    return null;
};

function ProductSummary() {
    // ... (rest of the component code, 700+ lines)
}

export default ProductSummary;
