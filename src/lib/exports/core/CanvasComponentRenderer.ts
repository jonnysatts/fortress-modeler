import { FORTRESS_COLORS } from '../themes/FortressTheme';

export interface CanvasRenderOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
}

export interface StatCardData {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorScheme?: 'fortress-emerald' | 'fortress-blue' | 'warning' | 'success' | 'danger';
}

export interface ScenarioData {
  name: string;
  label: 'Conservative' | 'Realistic' | 'Optimistic' | 'Custom';
  projectedRevenue: number;
  projectedExpenses: number;
  netProfit: number;
  roi: number;
  breakEvenMonth: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export class CanvasComponentRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    this.ctx = ctx;
    
    // Set default font
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }

  async captureStatCard(data: StatCardData, options: CanvasRenderOptions = {}): Promise<string> {
    const { width = 320, height = 160, scale = 2 } = options;
    
    // Set canvas size with scale for high DPI
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;
    this.ctx.scale(scale, scale);
    
    // Clear canvas
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw card background
    this.drawRoundedRect(0, 0, width, height, 12);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    
    // Draw border
    this.ctx.strokeStyle = FORTRESS_COLORS.gray[200];
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // Draw shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetY = 2;
    
    const padding = 24;
    let currentY = padding;
    
    // Draw title
    this.ctx.fillStyle = FORTRESS_COLORS.gray[700];
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(data.title, padding, currentY);
    currentY += 30;
    
    // Draw value
    this.ctx.fillStyle = FORTRESS_COLORS.gray[900];
    this.ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(data.value, padding, currentY);
    currentY += 35;
    
    // Draw subtitle and trend
    if (data.subtitle || data.trend) {
      this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      if (data.subtitle) {
        this.ctx.fillStyle = FORTRESS_COLORS.gray[500];
        this.ctx.fillText(data.subtitle, padding, currentY);
      }
      
      if (data.trend && data.trendValue) {
        const trendColors = {
          up: FORTRESS_COLORS.success[500],
          down: FORTRESS_COLORS.danger[500],
          neutral: FORTRESS_COLORS.gray[500]
        };
        
        const trendSymbols = {
          up: '↗',
          down: '↘',
          neutral: '→'
        };
        
        this.ctx.fillStyle = trendColors[data.trend];
        const trendText = `${trendSymbols[data.trend]} ${data.trendValue}`;
        const textWidth = this.ctx.measureText(trendText).width;
        this.ctx.fillText(trendText, width - padding - textWidth, currentY);
      }
    }
    
    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;
    
    // Convert to base64
    return this.canvas.toDataURL('image/png');
  }

  async captureScenarioCard(scenario: ScenarioData, options: CanvasRenderOptions = {}): Promise<string> {
    const { width = 800, height = 200, scale = 2 } = options;
    
    // Set canvas size with scale for high DPI
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;
    this.ctx.scale(scale, scale);
    
    // Clear canvas
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw card background
    this.drawRoundedRect(0, 0, width, height, 12);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    
    // Draw border
    const scenarioColors = this.getScenarioColors(scenario.label);
    this.ctx.strokeStyle = scenarioColors.border;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    const padding = 24;
    let currentY = padding + 20;
    
    // Draw scenario name and label
    this.ctx.fillStyle = FORTRESS_COLORS.gray[900];
    this.ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(scenario.name, padding, currentY);
    
    // Draw scenario label badge
    const labelWidth = 100;
    const labelX = width - padding - labelWidth;
    this.drawRoundedRect(labelX, currentY - 18, labelWidth, 24, 12);
    this.ctx.fillStyle = scenarioColors.bg;
    this.ctx.fill();
    this.ctx.strokeStyle = scenarioColors.border;
    this.ctx.stroke();
    
    this.ctx.fillStyle = scenarioColors.text;
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(scenario.label, labelX + labelWidth / 2, currentY - 3);
    this.ctx.textAlign = 'left';
    
    currentY += 40;
    
    // Draw metrics grid
    const metrics = [
      { label: 'Revenue', value: `$${scenario.projectedRevenue.toLocaleString()}`, color: FORTRESS_COLORS.gray[900] },
      { label: 'Net Profit', value: `$${scenario.netProfit.toLocaleString()}`, color: scenario.netProfit >= 0 ? FORTRESS_COLORS.success[500] : FORTRESS_COLORS.danger[500] },
      { label: 'ROI', value: `${scenario.roi.toFixed(1)}%`, color: scenario.roi >= 0 ? FORTRESS_COLORS.success[500] : FORTRESS_COLORS.danger[500] }
    ];
    
    const columnWidth = (width - padding * 2) / 3;
    metrics.forEach((metric, index) => {
      const x = padding + index * columnWidth;
      
      // Label
      this.ctx.fillStyle = FORTRESS_COLORS.gray[500];
      this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.fillText(metric.label, x, currentY);
      
      // Value
      this.ctx.fillStyle = metric.color;
      this.ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.fillText(metric.value, x, currentY + 25);
    });
    
    currentY += 60;
    
    // Draw footer with break-even and risk
    this.ctx.strokeStyle = FORTRESS_COLORS.gray[200];
    this.ctx.beginPath();
    this.ctx.moveTo(padding, currentY);
    this.ctx.lineTo(width - padding, currentY);
    this.ctx.stroke();
    
    currentY += 20;
    
    // Break-even
    this.ctx.fillStyle = FORTRESS_COLORS.gray[500];
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(`Break-even: Month ${scenario.breakEvenMonth}`, padding, currentY);
    
    // Risk level badge
    const riskColors = {
      Low: { bg: FORTRESS_COLORS.success[100], text: FORTRESS_COLORS.success[700] },
      Medium: { bg: FORTRESS_COLORS.warning[100], text: FORTRESS_COLORS.warning[700] },
      High: { bg: FORTRESS_COLORS.danger[100], text: FORTRESS_COLORS.danger[700] }
    };
    
    const riskColor = riskColors[scenario.riskLevel];
    const riskText = `Risk: ${scenario.riskLevel}`;
    const riskWidth = 80;
    const riskX = width - padding - riskWidth;
    
    this.drawRoundedRect(riskX, currentY - 15, riskWidth, 20, 8);
    this.ctx.fillStyle = riskColor.bg;
    this.ctx.fill();
    
    this.ctx.fillStyle = riskColor.text;
    this.ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(riskText, riskX + riskWidth / 2, currentY - 2);
    this.ctx.textAlign = 'left';
    
    // Convert to base64
    return this.canvas.toDataURL('image/png');
  }

  async captureKPIGrid(kpis: Array<{ title: string; value: string; trend?: 'up' | 'down' | 'neutral'; trendValue?: string }>, options: CanvasRenderOptions = {}): Promise<string> {
    const { width = 800, height = 200, scale = 2 } = options;
    const cardWidth = 180;
    const cardHeight = 120;
    const gap = 20;
    const cardsPerRow = Math.floor(width / (cardWidth + gap));
    const rows = Math.ceil(kpis.length / cardsPerRow);
    
    // Adjust height based on rows
    const actualHeight = rows * (cardHeight + gap) + gap;
    
    // Set canvas size with scale for high DPI
    this.canvas.width = width * scale;
    this.canvas.height = actualHeight * scale;
    this.ctx.scale(scale, scale);
    
    // Clear canvas with background
    this.ctx.fillStyle = FORTRESS_COLORS.gray[50];
    this.ctx.fillRect(0, 0, width, actualHeight);
    
    // Draw each KPI card
    kpis.forEach((kpi, index) => {
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      const x = gap + col * (cardWidth + gap);
      const y = gap + row * (cardHeight + gap);
      
      // Draw card background
      this.drawRoundedRect(x, y, cardWidth, cardHeight, 8);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fill();
      
      // Draw border
      this.ctx.strokeStyle = FORTRESS_COLORS.gray[200];
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      const padding = 16;
      let currentY = y + padding + 14;
      
      // Title
      this.ctx.fillStyle = FORTRESS_COLORS.gray[600];
      this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.fillText(kpi.title, x + padding, currentY);
      currentY += 25;
      
      // Value
      this.ctx.fillStyle = FORTRESS_COLORS.gray[900];
      this.ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.fillText(kpi.value, x + padding, currentY);
      
      // Trend
      if (kpi.trend && kpi.trendValue) {
        currentY += 25;
        const trendColors = {
          up: FORTRESS_COLORS.success[500],
          down: FORTRESS_COLORS.danger[500],
          neutral: FORTRESS_COLORS.gray[500]
        };
        
        const trendSymbols = {
          up: '↗',
          down: '↘',
          neutral: '→'
        };
        
        this.ctx.fillStyle = trendColors[kpi.trend];
        this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        this.ctx.fillText(`${trendSymbols[kpi.trend]} ${kpi.trendValue}`, x + padding, currentY);
      }
    });
    
    // Convert to base64
    return this.canvas.toDataURL('image/png');
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  private getScenarioColors(label: string) {
    const colors = {
      Conservative: {
        bg: FORTRESS_COLORS.danger[50],
        text: FORTRESS_COLORS.danger[600],
        border: FORTRESS_COLORS.danger[200],
      },
      Realistic: {
        bg: FORTRESS_COLORS.primary[50],
        text: FORTRESS_COLORS.primary[600],
        border: FORTRESS_COLORS.primary[200],
      },
      Optimistic: {
        bg: FORTRESS_COLORS.success[50],
        text: FORTRESS_COLORS.success[600],
        border: FORTRESS_COLORS.success[200],
      },
      Custom: {
        bg: FORTRESS_COLORS.gray[50],
        text: FORTRESS_COLORS.gray[700],
        border: FORTRESS_COLORS.gray[200],
      },
    };

    return colors[label as keyof typeof colors] || colors.Custom;
  }

  async captureFinancialChart(data: { labels: string[]; values: number[]; title: string; type?: 'bar' | 'line' }, options: CanvasRenderOptions = {}): Promise<string> {
    const { width = 600, height = 400, scale = 2 } = options;
    const { labels, values, title, type = 'bar' } = data;
    
    // Set canvas size with scale for high DPI
    this.canvas.width = width * scale;
    this.canvas.height = height * scale;
    this.ctx.scale(scale, scale);
    
    // Clear canvas with white background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, width, height);
    
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 40; // Leave space for title
    const chartX = padding;
    const chartY = padding + 40;
    
    // Draw title
    this.ctx.fillStyle = FORTRESS_COLORS.gray[900];
    this.ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(title, width / 2, 30);
    this.ctx.textAlign = 'left';
    
    // Find max value for scaling
    const maxValue = Math.max(...values);
    const minValue = Math.min(0, Math.min(...values));
    const valueRange = maxValue - minValue;
    
    // Draw axes
    this.ctx.strokeStyle = FORTRESS_COLORS.gray[300];
    this.ctx.lineWidth = 2;
    
    // Y-axis
    this.ctx.beginPath();
    this.ctx.moveTo(chartX, chartY);
    this.ctx.lineTo(chartX, chartY + chartHeight);
    this.ctx.stroke();
    
    // X-axis
    this.ctx.beginPath();
    this.ctx.moveTo(chartX, chartY + chartHeight);
    this.ctx.lineTo(chartX + chartWidth, chartY + chartHeight);
    this.ctx.stroke();
    
    // Draw Y-axis labels
    this.ctx.fillStyle = FORTRESS_COLORS.gray[600];
    this.ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'right';
    
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = minValue + (valueRange * i / ySteps);
      const y = chartY + chartHeight - (i * chartHeight / ySteps);
      
      this.ctx.fillText(this.formatChartValue(value), chartX - 10, y + 4);
      
      // Draw grid line
      if (i > 0) {
        this.ctx.strokeStyle = FORTRESS_COLORS.gray[200];
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(chartX, y);
        this.ctx.lineTo(chartX + chartWidth, y);
        this.ctx.stroke();
      }
    }
    
    // Draw data
    if (type === 'bar') {
      this.drawBarChart(labels, values, chartX, chartY, chartWidth, chartHeight, minValue, valueRange);
    } else {
      this.drawLineChart(labels, values, chartX, chartY, chartWidth, chartHeight, minValue, valueRange);
    }
    
    // Draw X-axis labels
    this.ctx.fillStyle = FORTRESS_COLORS.gray[600];
    this.ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    
    const barWidth = chartWidth / labels.length;
    labels.forEach((label, index) => {
      const x = chartX + (index + 0.5) * barWidth;
      this.ctx.fillText(label, x, chartY + chartHeight + 20);
    });
    
    // Convert to base64
    return this.canvas.toDataURL('image/png');
  }

  private drawBarChart(labels: string[], values: number[], chartX: number, chartY: number, chartWidth: number, chartHeight: number, minValue: number, valueRange: number) {
    const barWidth = chartWidth / labels.length;
    const barPadding = barWidth * 0.2;
    const actualBarWidth = barWidth - barPadding;
    
    values.forEach((value, index) => {
      const x = chartX + index * barWidth + barPadding / 2;
      const normalizedValue = (value - minValue) / valueRange;
      const barHeight = normalizedValue * chartHeight;
      const y = chartY + chartHeight - barHeight;
      
      // Draw bar
      this.drawRoundedRect(x, y, actualBarWidth, barHeight, 4);
      this.ctx.fillStyle = value >= 0 ? FORTRESS_COLORS.fortress.emerald : FORTRESS_COLORS.danger[500];
      this.ctx.fill();
      
      // Draw border
      this.ctx.strokeStyle = FORTRESS_COLORS.gray[300];
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      // Draw value label on top of bar
      this.ctx.fillStyle = FORTRESS_COLORS.gray[700];
      this.ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.formatChartValue(value), x + actualBarWidth / 2, y - 5);
    });
  }

  private drawLineChart(labels: string[], values: number[], chartX: number, chartY: number, chartWidth: number, chartHeight: number, minValue: number, valueRange: number) {
    const pointSpacing = chartWidth / (labels.length - 1);
    
    this.ctx.strokeStyle = FORTRESS_COLORS.fortress.emerald;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    
    values.forEach((value, index) => {
      const x = chartX + index * pointSpacing;
      const normalizedValue = (value - minValue) / valueRange;
      const y = chartY + chartHeight - (normalizedValue * chartHeight);
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    
    this.ctx.stroke();
    
    // Draw data points
    values.forEach((value, index) => {
      const x = chartX + index * pointSpacing;
      const normalizedValue = (value - minValue) / valueRange;
      const y = chartY + chartHeight - (normalizedValue * chartHeight);
      
      this.ctx.fillStyle = FORTRESS_COLORS.fortress.emerald;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Draw value label
      this.ctx.fillStyle = FORTRESS_COLORS.gray[700];
      this.ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.formatChartValue(value), x, y - 10);
    });
  }

  private formatChartValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${Math.round(value)}`;
    }
  }

  cleanup() {
    // Canvas doesn't need cleanup like DOM elements
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}