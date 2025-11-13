import { formatCurrency } from '@/lib/export';
import { CashFlowPeriod } from '@/lib/financial-calculations';

interface CashFlowTableProps {
  data: CashFlowPeriod[];
  getMetricColor: (value: number, isPositive?: boolean) => string;
}

export const CashFlowTable = ({ data, getMetricColor }: CashFlowTableProps) => (
  <div className="mt-6 overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Period</th>
          <th className="text-right py-2">Operating CF</th>
          <th className="text-right py-2">Investing CF</th>
          <th className="text-right py-2">Financing CF</th>
          <th className="text-right py-2">Net CF</th>
          <th className="text-right py-2">Cumulative CF</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 12).map((cf) => (
          <tr key={cf.period} className="border-b">
            <td className="py-1">{cf.periodName}</td>
            <td className="text-right py-1">{formatCurrency(cf.operatingCashFlow)}</td>
            <td className="text-right py-1">{formatCurrency(cf.investingCashFlow)}</td>
            <td className="text-right py-1">{formatCurrency(cf.financingCashFlow)}</td>
            <td className={`text-right py-1 ${getMetricColor(cf.netCashFlow)}`}>
              {formatCurrency(cf.netCashFlow)}
            </td>
            <td className={`text-right py-1 ${getMetricColor(cf.cumulativeCashFlow)}`}>
              {formatCurrency(cf.cumulativeCashFlow)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);