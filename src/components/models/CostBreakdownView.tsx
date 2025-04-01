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
import { CostData, TypeCategoryData } from "./breakdownCalculations";

interface CostBreakdownViewProps {
  costData: CostData[];
  typeData: TypeCategoryData[];
  colors: string[];
  tooltip: React.ReactElement;
  getTypeColor: (type: string) => string;
  selectedWeek: number;
}

const CostBreakdownView: React.FC<CostBreakdownViewProps> = ({ 
  costData, 
  typeData, 
  colors, 
  tooltip,
  getTypeColor,
  selectedWeek
}) => {
  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Cost Distribution for Week {selectedWeek}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="nameAndPercentage"
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
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
          <h4 className="text-sm font-medium mb-4">Cost Categories By Amount for Week {selectedWeek}</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={costData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTypeColor(entry.type)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Costs By Type Chart */}
      {typeData.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-medium mb-4">Costs By Type for Week {selectedWeek}</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={typeData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, ""]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {typeData.map((entry, index) => {
                    const typeKey = entry.name.toLowerCase().includes("fixed")
                      ? "fixed"
                      : entry.name.toLowerCase().includes("variable")
                      ? "variable"
                      : "recurring";
                    return <Cell key={`cell-${index}`} fill={getTypeColor(typeKey)} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Details Table */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-4">Cost Category Details for Week {selectedWeek}</h4>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costData.map((item, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? "bg-gray-50" : ""}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="capitalize">{item.type}</TableCell>
                  <TableCell className="text-right">${item.value.toLocaleString()}</TableCell>
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

export default CostBreakdownView; 