import { Chart, ChartConfiguration, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { FORTRESS_COLORS, FORTRESS_CHART_CONFIG } from '../themes/FortressTheme';

Chart.register(...registerables, ChartDataLabels);

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  theme?: 'fortress' | 'monochrome' | 'high-contrast';
  showDataLabels?: boolean;
  responsive?: boolean;
  animation?: boolean;
}

export interface ScenarioChartData {
  scenarios: Array<{
    name: string;
    label: 'Conservative' | 'Realistic' | 'Optimistic' | 'Custom';
    projectedRevenue: number;
    projectedExpenses: number;
    netProfit: number;
    roi: number;
  }>;
}

export interface CashFlowChartData {
  months: string[];
  scenarios: Array<{
    name: string;
    data: number[];
    color?: string;
  }>;
}

export interface PieChartData {
  labels: string[];
  data: number[];
  colors?: string[];
}

export class ChartRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async renderScenarioComparison(
    data: ScenarioChartData,
    options: ChartRenderOptions = {}
  ): Promise<string> {
    const {
      width = 800,
      height = 400,
      backgroundColor = 'transparent',
      theme = 'fortress',
      showDataLabels = true,
      responsive = false,
      animation = false,
    } = options;

    this.canvas.width = width;
    this.canvas.height = height;

    const scenarioColors = data.scenarios.map(scenario => {
      const colorMap = {
        Conservative: FORTRESS_COLORS.danger[500],
        Realistic: FORTRESS_COLORS.primary[500],
        Optimistic: FORTRESS_COLORS.success[500],
        Custom: FORTRESS_COLORS.gray[500],
      };
      return colorMap[scenario.label] || FORTRESS_COLORS.gray[500];
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.scenarios.map(s => s.name),
        datasets: [
          {
            label: 'Projected Revenue',
            data: data.scenarios.map(s => s.projectedRevenue),
            backgroundColor: scenarioColors.map(color => `${color}CC`), // 80% opacity
            borderColor: scenarioColors,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: 'Net Profit',
            data: data.scenarios.map(s => s.netProfit),
            backgroundColor: data.scenarios.map(s => 
              s.netProfit >= 0 ? `${FORTRESS_COLORS.success[500]}CC` : `${FORTRESS_COLORS.danger[500]}CC`
            ),
            borderColor: data.scenarios.map(s => 
              s.netProfit >= 0 ? FORTRESS_COLORS.success[500] : FORTRESS_COLORS.danger[500]
            ),
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
          }
        ]
      },
      options: {
        responsive,
        animation: animation ? {} : false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
                weight: 'bold',
              },
              color: FORTRESS_COLORS.gray[700],
            },
          },
          datalabels: {
            display: showDataLabels,
            anchor: 'end',
            align: 'top',
            formatter: (value: number) => this.formatCurrency(value),
            font: {
              family: FORTRESS_CHART_CONFIG.fonts.family,
              size: FORTRESS_CHART_CONFIG.fonts.size.small,
              weight: 'bold',
            },
            color: FORTRESS_COLORS.gray[700],
          },
          tooltip: {
            backgroundColor: FORTRESS_COLORS.gray[900],
            titleColor: FORTRESS_COLORS.gray[50],
            bodyColor: FORTRESS_COLORS.gray[50],
            borderColor: FORTRESS_COLORS.fortress.emerald,
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = this.formatCurrency(context.parsed.y);
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value as number),
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              },
              color: FORTRESS_COLORS.gray[600],
            },
            grid: {
              color: FORTRESS_CHART_CONFIG.grid.color,
              lineWidth: FORTRESS_CHART_CONFIG.grid.lineWidth,
            },
          },
          x: {
            ticks: {
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              },
              color: FORTRESS_COLORS.gray[600],
            },
            grid: {
              display: false,
            },
          },
        },
      },
    };

    const chart = new Chart(this.ctx, config);

    // Wait for chart to render
    await new Promise<void>((resolve) => {
      if (animation) {
        chart.options.animation = {
          onComplete: () => resolve(),
        };
      } else {
        setTimeout(() => resolve(), 100);
      }
    });

    const imageData = this.canvas.toDataURL('image/png');
    chart.destroy();

    return imageData;
  }

  async renderCashFlowChart(
    data: CashFlowChartData,
    options: ChartRenderOptions = {}
  ): Promise<string> {
    const {
      width = 800,
      height = 400,
      backgroundColor = 'transparent',
      theme = 'fortress',
      showDataLabels = false,
      responsive = false,
      animation = false,
    } = options;

    this.canvas.width = width;
    this.canvas.height = height;

    const defaultColors = [
      FORTRESS_COLORS.fortress.emerald,
      FORTRESS_COLORS.fortress.blue,
      FORTRESS_COLORS.primary[500],
      FORTRESS_COLORS.success[500],
      FORTRESS_COLORS.warning[500],
    ];

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.months,
        datasets: data.scenarios.map((scenario, index) => ({
          label: scenario.name,
          data: scenario.data,
          borderColor: scenario.color || defaultColors[index % defaultColors.length],
          backgroundColor: `${scenario.color || defaultColors[index % defaultColors.length]}1A`, // 10% opacity
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: scenario.color || defaultColors[index % defaultColors.length],
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        })),
      },
      options: {
        responsive,
        animation: animation ? {} : false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
                weight: 'bold',
              },
              color: FORTRESS_COLORS.gray[700],
            },
          },
          datalabels: {
            display: showDataLabels,
          },
          tooltip: {
            backgroundColor: FORTRESS_COLORS.gray[900],
            titleColor: FORTRESS_COLORS.gray[50],
            bodyColor: FORTRESS_COLORS.gray[50],
            borderColor: FORTRESS_COLORS.fortress.emerald,
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = this.formatCurrency(context.parsed.y);
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value as number),
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              },
              color: FORTRESS_COLORS.gray[600],
            },
            grid: {
              color: FORTRESS_CHART_CONFIG.grid.color,
              lineWidth: FORTRESS_CHART_CONFIG.grid.lineWidth,
            },
          },
          x: {
            ticks: {
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              },
              color: FORTRESS_COLORS.gray[600],
            },
            grid: {
              color: FORTRESS_CHART_CONFIG.grid.color,
              lineWidth: FORTRESS_CHART_CONFIG.grid.lineWidth,
            },
          },
        },
      },
    };

    const chart = new Chart(this.ctx, config);

    // Wait for chart to render
    await new Promise<void>((resolve) => {
      if (animation) {
        chart.options.animation = {
          onComplete: () => resolve(),
        };
      } else {
        setTimeout(() => resolve(), 100);
      }
    });

    const imageData = this.canvas.toDataURL('image/png');
    chart.destroy();

    return imageData;
  }

  async renderPieChart(
    data: PieChartData,
    title: string,
    options: ChartRenderOptions = {}
  ): Promise<string> {
    const {
      width = 600,
      height = 400,
      backgroundColor = 'transparent',
      theme = 'fortress',
      showDataLabels = true,
      responsive = false,
      animation = false,
    } = options;

    this.canvas.width = width;
    this.canvas.height = height;

    const defaultColors = [
      FORTRESS_COLORS.fortress.emerald,
      FORTRESS_COLORS.fortress.blue,
      FORTRESS_COLORS.primary[500],
      FORTRESS_COLORS.success[500],
      FORTRESS_COLORS.warning[500],
      FORTRESS_COLORS.danger[500],
    ];

    const colors = data.colors || defaultColors.slice(0, data.labels.length);

    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.data,
          backgroundColor: colors.map(color => `${color}CC`), // 80% opacity
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive,
        animation: animation ? {} : false,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              usePointStyle: true,
              font: {
                family: FORTRESS_CHART_CONFIG.fonts.family,
                size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              },
              color: FORTRESS_COLORS.gray[700],
              padding: 20,
            },
          },
          datalabels: {
            display: showDataLabels,
            formatter: (value: number, context) => {
              const total = context.dataset.data.reduce((sum, val) => sum + (val as number), 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${percentage}%`;
            },
            font: {
              family: FORTRESS_CHART_CONFIG.fonts.family,
              size: FORTRESS_CHART_CONFIG.fonts.size.normal,
              weight: 'bold',
            },
            color: '#ffffff',
          },
          title: {
            display: true,
            text: title,
            font: {
              family: FORTRESS_CHART_CONFIG.fonts.family,
              size: FORTRESS_CHART_CONFIG.fonts.size.large,
              weight: 'bold',
            },
            color: FORTRESS_COLORS.gray[900],
            padding: 20,
          },
          tooltip: {
            backgroundColor: FORTRESS_COLORS.gray[900],
            titleColor: FORTRESS_COLORS.gray[50],
            bodyColor: FORTRESS_COLORS.gray[50],
            borderColor: FORTRESS_COLORS.fortress.emerald,
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = context.dataset.data.reduce((sum, val) => sum + (val as number), 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${this.formatCurrency(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    };

    const chart = new Chart(this.ctx, config);

    // Wait for chart to render
    await new Promise<void>((resolve) => {
      if (animation) {
        chart.options.animation = {
          onComplete: () => resolve(),
        };
      } else {
        setTimeout(() => resolve(), 100);
      }
    });

    const imageData = this.canvas.toDataURL('image/png');
    chart.destroy();

    return imageData;
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }

  cleanup() {
    // Clean up any resources
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}