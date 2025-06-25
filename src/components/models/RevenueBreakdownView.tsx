import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RevenueData } from "./breakdownCalculations";
import { formatCurrency } from "@/lib/utils";

interface RevenueBreakdownViewProps {
  data: RevenueData[];
  colors: string[];
  tooltip: React.ReactElement;
  selectedWeek: number;
}

const RevenueBreakdownView: React.FC<RevenueBreakdownViewProps> = ({ data, colors, tooltip, selectedWeek }) => {
  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* --- Restore Pie Chart Card --- */}
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Revenue Distribution for Week {selectedWeek}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* --- Restore Pie Component --- */}
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="nameAndPercentage"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                
                {/* Use default Tooltip */}
                <Tooltip /> 
                
                {/* --- Restore Legend --- */}
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right" 
                  wrapperStyle={{ paddingLeft: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Revenue Streams By Amount for Week {selectedWeek}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Details Table */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-4">Revenue Stream Details for Week {selectedWeek}</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                  <TableCell className="text-right">{item.percentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default RevenueBreakdownView; 