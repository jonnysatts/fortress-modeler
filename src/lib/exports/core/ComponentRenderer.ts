import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import { FORTRESS_COLORS } from '../themes/FortressTheme';

export interface ComponentRenderOptions {
  format?: 'png' | 'jpeg' | 'svg';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  pixelRatio?: number;
  style?: Record<string, string>;
  skipFonts?: boolean;
  preferCanvas?: boolean;
}

export interface StatCardData {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  colorScheme?: 'fortress-emerald' | 'fortress-blue' | 'warning' | 'success' | 'danger';
  size?: 'compact' | 'standard' | 'large';
}

export interface ScenarioMetrics {
  scenarios: Array<{
    name: string;
    label: 'Conservative' | 'Realistic' | 'Optimistic' | 'Custom';
    projectedRevenue: number;
    projectedExpenses: number;
    netProfit: number;
    roi: number;
    breakEvenMonth: number;
    cashFlow: number[];
    riskLevel: 'Low' | 'Medium' | 'High';
  }>;
}

export class ComponentRenderer {
  private renderingContainer: HTMLElement | null = null;

  constructor() {
    this.setupRenderingContainer();
  }

  private setupRenderingContainer() {
    // Create an invisible container for rendering components
    this.renderingContainer = document.createElement('div');
    this.renderingContainer.style.position = 'fixed';
    this.renderingContainer.style.top = '-10000px';
    this.renderingContainer.style.left = '-10000px';
    this.renderingContainer.style.pointerEvents = 'none';
    this.renderingContainer.style.visibility = 'hidden';
    this.renderingContainer.style.zIndex = '-1000';
    document.body.appendChild(this.renderingContainer);
  }

  private async renderComponent(
    htmlContent: string,
    options: ComponentRenderOptions = {}
  ): Promise<string> {
    const {
      format = 'png',
      quality = 0.95,
      width = 800,
      height = 600,
      backgroundColor = 'transparent',
      pixelRatio = 2,
      style = {},
      skipFonts = false,
      preferCanvas = false,
    } = options;

    if (!this.renderingContainer) {
      throw new Error('Rendering container not initialized');
    }

    // Create a temporary element for rendering
    const tempElement = document.createElement('div');
    tempElement.innerHTML = htmlContent;
    tempElement.style.width = `${width}px`;
    tempElement.style.height = 'auto';
    tempElement.style.backgroundColor = backgroundColor;
    tempElement.style.padding = '24px';
    tempElement.style.fontFamily = "'Inter', sans-serif";
    
    // Apply custom styles
    Object.entries(style).forEach(([key, value]) => {
      tempElement.style[key as any] = value;
    });

    this.renderingContainer.appendChild(tempElement);

    try {
      const renderOptions = {
        quality,
        width,
        height: tempElement.offsetHeight,
        backgroundColor,
        pixelRatio,
        skipFonts,
        preferCanvas,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          ...style,
        },
      };

      let imageData: string;
      
      switch (format) {
        case 'jpeg':
          imageData = await toJpeg(tempElement, renderOptions);
          break;
        case 'svg':
          imageData = await toSvg(tempElement, renderOptions);
          break;
        case 'png':
        default:
          imageData = await toPng(tempElement, renderOptions);
          break;
      }

      return imageData;
    } finally {
      // Clean up
      this.renderingContainer.removeChild(tempElement);
    }
  }

  async captureStatCard(data: StatCardData, options: ComponentRenderOptions = {}): Promise<string> {
    const { colorScheme = 'fortress-emerald', size = 'standard' } = data;
    
    const colors = {
      'fortress-emerald': FORTRESS_COLORS.fortress.emerald,
      'fortress-blue': FORTRESS_COLORS.fortress.blue,
      'warning': FORTRESS_COLORS.warning[500],
      'success': FORTRESS_COLORS.success[500],
      'danger': FORTRESS_COLORS.danger[500],
    };

    const sizes = {
      compact: { width: 240, padding: '16px' },
      standard: { width: 320, padding: '24px' },
      large: { width: 400, padding: '32px' },
    };

    const sizeConfig = sizes[size];
    const primaryColor = colors[colorScheme];

    const trendIcon = data.trend === 'up' ? '↗' : data.trend === 'down' ? '↘' : '→';
    const trendColor = data.trend === 'up' ? FORTRESS_COLORS.success[500] : 
                      data.trend === 'down' ? FORTRESS_COLORS.danger[500] : 
                      FORTRESS_COLORS.gray[500];

    const htmlContent = `
      <div style="
        width: ${sizeConfig.width}px;
        background: white;
        border-radius: 12px;
        padding: ${sizeConfig.padding};
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        border: 1px solid ${FORTRESS_COLORS.gray[200]};
        font-family: 'Inter', sans-serif;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        ">
          <h3 style="
            font-size: 14px;
            font-weight: 500;
            color: ${FORTRESS_COLORS.gray[700]};
            margin: 0;
          ">${data.title}</h3>
          ${data.icon ? `<span style="color: ${primaryColor}; font-size: 16px;">${data.icon}</span>` : ''}
        </div>
        
        <div style="margin-bottom: 8px;">
          <div style="
            font-size: 28px;
            font-weight: 600;
            color: ${FORTRESS_COLORS.gray[900]};
            margin: 0;
          ">${data.value}</div>
        </div>
        
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          ${data.subtitle ? `
            <span style="
              font-size: 12px;
              color: ${FORTRESS_COLORS.gray[500]};
            ">${data.subtitle}</span>
          ` : ''}
          
          ${data.trend && data.trendValue ? `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              font-weight: 500;
              color: ${trendColor};
            ">
              <span>${trendIcon}</span>
              <span>${data.trendValue}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    return this.renderComponent(htmlContent, {
      ...options,
      width: sizeConfig.width + 48, // Add padding
      backgroundColor: 'transparent',
    });
  }

  async captureScenarioOverview(scenarios: ScenarioMetrics['scenarios'], options: ComponentRenderOptions = {}): Promise<string> {
    const scenarioCards = scenarios.map(scenario => {
      const scenarioColor = this.getScenarioColor(scenario.label);
      
      return `
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
          border: 1px solid ${scenarioColor.border};
          margin-bottom: 16px;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          ">
            <h3 style="
              font-size: 18px;
              font-weight: 600;
              color: ${FORTRESS_COLORS.gray[900]};
              margin: 0;
            ">${scenario.name}</h3>
            <span style="
              background: ${scenarioColor.bg};
              color: ${scenarioColor.text};
              padding: 4px 12px;
              border-radius: 16px;
              font-size: 12px;
              font-weight: 500;
              border: 1px solid ${scenarioColor.border};
            ">${scenario.label}</span>
          </div>
          
          <div style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 16px;
          ">
            <div>
              <div style="
                font-size: 12px;
                color: ${FORTRESS_COLORS.gray[500]};
                margin-bottom: 4px;
              ">Revenue</div>
              <div style="
                font-size: 20px;
                font-weight: 600;
                color: ${FORTRESS_COLORS.gray[900]};
              ">$${scenario.projectedRevenue.toLocaleString()}</div>
            </div>
            
            <div>
              <div style="
                font-size: 12px;
                color: ${FORTRESS_COLORS.gray[500]};
                margin-bottom: 4px;
              ">Net Profit</div>
              <div style="
                font-size: 20px;
                font-weight: 600;
                color: ${scenario.netProfit >= 0 ? FORTRESS_COLORS.success[500] : FORTRESS_COLORS.danger[500]};
              ">$${scenario.netProfit.toLocaleString()}</div>
            </div>
            
            <div>
              <div style="
                font-size: 12px;
                color: ${FORTRESS_COLORS.gray[500]};
                margin-bottom: 4px;
              ">ROI</div>
              <div style="
                font-size: 20px;
                font-weight: 600;
                color: ${scenario.roi >= 0 ? FORTRESS_COLORS.success[500] : FORTRESS_COLORS.danger[500]};
              ">${scenario.roi.toFixed(1)}%</div>
            </div>
          </div>
          
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 16px;
            border-top: 1px solid ${FORTRESS_COLORS.gray[200]};
          ">
            <div>
              <span style="
                font-size: 12px;
                color: ${FORTRESS_COLORS.gray[500]};
              ">Break-even: Month ${scenario.breakEvenMonth}</span>
            </div>
            <div style="
              padding: 4px 8px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 500;
              background: ${scenario.riskLevel === 'Low' ? FORTRESS_COLORS.success[100] : 
                         scenario.riskLevel === 'Medium' ? FORTRESS_COLORS.warning[100] : 
                         FORTRESS_COLORS.danger[100]};
              color: ${scenario.riskLevel === 'Low' ? FORTRESS_COLORS.success[700] : 
                     scenario.riskLevel === 'Medium' ? FORTRESS_COLORS.warning[700] : 
                     FORTRESS_COLORS.danger[700]};
            ">Risk: ${scenario.riskLevel}</div>
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <div style="
        width: 800px;
        background: ${FORTRESS_COLORS.gray[50]};
        padding: 24px;
        border-radius: 12px;
        font-family: 'Inter', sans-serif;
      ">
        <h2 style="
          font-size: 24px;
          font-weight: 600;
          color: ${FORTRESS_COLORS.gray[900]};
          margin: 0 0 24px 0;
        ">Scenario Analysis</h2>
        
        ${scenarioCards}
      </div>
    `;

    return this.renderComponent(htmlContent, {
      ...options,
      width: 850,
      backgroundColor: 'transparent',
    });
  }

  private getScenarioColor(label: string) {
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

  async captureKPIGrid(metrics: any, options: ComponentRenderOptions = {}): Promise<string> {
    const kpiCards = [
      { title: 'Total Revenue', value: `$${metrics.totalRevenue?.toLocaleString() || '0'}`, trend: 'up', trendValue: '+12%' },
      { title: 'Net Profit', value: `$${metrics.netProfit?.toLocaleString() || '0'}`, trend: metrics.netProfit >= 0 ? 'up' : 'down', trendValue: '8.5%' },
      { title: 'ROI', value: `${metrics.roi?.toFixed(1) || '0'}%`, trend: 'up', trendValue: '+2.1%' },
      { title: 'Break-even', value: `Month ${metrics.breakEvenMonth || 'N/A'}`, trend: 'neutral', trendValue: null },
    ];

    const cardHtml = await Promise.all(
      kpiCards.map(async (card) => {
        const cardData: StatCardData = {
          title: card.title,
          value: card.value,
          trend: card.trend as 'up' | 'down' | 'neutral',
          trendValue: card.trendValue,
          colorScheme: 'fortress-emerald',
          size: 'standard',
        };
        
        return this.captureStatCard(cardData, { format: 'png' });
      })
    );

    // For now, return the first card as a placeholder
    // In a real implementation, you'd arrange these in a grid
    return cardHtml[0];
  }

  cleanup() {
    if (this.renderingContainer && this.renderingContainer.parentNode) {
      this.renderingContainer.parentNode.removeChild(this.renderingContainer);
    }
  }
}