export interface TrendDataPoint {
  point: string;
  attendance?: number;
  revenue?: number;
  cumulativeRevenue?: number;
  costs?: number;
  cumulativeCosts?: number;
  profit?: number;
  cumulativeProfit?: number;
  [key: string]: number | string | undefined;
}
