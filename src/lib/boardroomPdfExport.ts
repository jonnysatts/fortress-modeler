// Use the global pdfMake provided by the CDN
const pdfMake = (window as any).pdfMake;

/**
 * Generates a boardroom-ready PDF report for Fortress Modeler.
 * Accepts all report data and chart images as arguments.
 */
export async function generateBoardroomPdf({
  projectInfo,
  summaryMetrics,
  forecastTable,
  chartImages, // array of { title: string, dataUrl: string }
  revenueBreakdown,
  costBreakdown,
  marketingAnalysis,
  scenarioAnalysis,
  actualsVsForecast,
  risks,
  assumptions,
  exportTimestamp,
  logoDataUrl
}: {
  projectInfo: { name: string, client?: string, date: string },
  summaryMetrics: any,
  forecastTable: any[],
  chartImages: { title: string, dataUrl: string }[],
  revenueBreakdown: any,
  costBreakdown: any,
  marketingAnalysis: any,
  scenarioAnalysis: any,
  actualsVsForecast: any,
  risks: any,
  assumptions: any,
  exportTimestamp: string,
  logoDataUrl?: string
}) {
  if (!pdfMake) {
    console.error('[PDF Export] window.pdfMake is not available!');
    alert('PDF export failed: PDF engine not loaded.');
    return;
  }

  // Restore the full docDefinition for boardroom PDF export
  const docDefinition: any = {
    content: [
      // --- Cover Page ---
      { image: logoDataUrl, width: 120, alignment: 'center', margin: [0, 0, 0, 12] },
      { text: projectInfo.name, style: 'coverTitle', margin: [0, 0, 0, 8] },
      { text: projectInfo.client ? `Client: ${projectInfo.client}` : '', style: 'coverSub', margin: [0, 0, 0, 8] },
      { text: `Date: ${projectInfo.date}`, style: 'coverSub', margin: [0, 0, 0, 24] },
      { text: 'Boardroom Report', style: 'coverSubtitle', margin: [0, 0, 0, 40] },
      { text: '', pageBreak: 'after' },
      // --- Table of Contents ---
      { text: 'Table of Contents', style: 'sectionHeader', tocItem: true },
      { toc: { title: { text: '', style: 'normal' } }, margin: [0, 0, 0, 24] },
      // --- Executive Summary ---
      { text: 'Executive Summary', style: 'sectionHeader', tocItem: true },
      summaryMetrics,
      { text: '', pageBreak: 'after' },
      // --- Forecast Overview ---
      { text: 'Forecast Overview', style: 'sectionHeader', tocItem: true },
      forecastTable,
      // Insert chart images after forecast overview section
      ...((chartImages && Array.isArray(chartImages)) ? chartImages.map(img => ({
        image: img.dataUrl,
        width: 420,
        alignment: 'center',
        margin: [0, 0, 0, 16],
        pageBreak: undefined, // Only add pageBreak if you want each chart on its own page
        caption: img.title ? { text: img.title, style: 'normal', alignment: 'center', margin: [0, 4, 0, 12] } : undefined
      })) : []),
      { text: '', pageBreak: 'after' },
      // --- Revenue Breakdown ---
      { text: 'Revenue Breakdown', style: 'sectionHeader', tocItem: true },
      revenueBreakdown,
      { text: '', pageBreak: 'after' },
      // --- Cost Breakdown ---
      { text: 'Cost Breakdown', style: 'sectionHeader', tocItem: true },
      costBreakdown,
      { text: '', pageBreak: 'after' },
      // --- Marketing Analysis ---
      { text: 'Marketing Analysis', style: 'sectionHeader', tocItem: true },
      marketingAnalysis,
      { text: '', pageBreak: 'after' },
      // --- Scenario Analysis ---
      { text: 'Scenario Analysis', style: 'sectionHeader', tocItem: true },
      scenarioAnalysis,
      { text: '', pageBreak: 'after' },
      // --- Actuals vs. Forecast ---
      { text: 'Actuals vs. Forecast', style: 'sectionHeader', tocItem: true },
      actualsVsForecast,
      { text: '', pageBreak: 'after' },
      // --- Risks & Mitigations ---
      { text: 'Risks & Mitigations', style: 'sectionHeader', tocItem: true },
      risks,
      { text: '', pageBreak: 'after' },
      // --- Assumptions Appendix ---
      { text: 'Assumptions Appendix', style: 'sectionHeader', tocItem: true },
      assumptions,
      { text: '', pageBreak: 'after' }
    ],
    styles: {
      coverTitle: { fontSize: 28, bold: true, alignment: 'center', font: 'Roboto' },
      coverSubtitle: { fontSize: 18, italics: true, alignment: 'center', font: 'Roboto' },
      coverSub: { fontSize: 12, alignment: 'center', font: 'Roboto' },
      sectionHeader: { fontSize: 20, bold: true, margin: [0, 12, 0, 8], font: 'Roboto' },
      normal: { fontSize: 12, font: 'Roboto' },
      infoText: { fontSize: 12, font: 'Roboto', color: 'blue' },
      warningText: { fontSize: 12, font: 'Roboto', color: 'red' },
    },
    footer: function(currentPage: number, pageCount: number) {
      return {
        columns: [
          { text: 'Fortress Modeler | Confidential', alignment: 'left', margin: [40, 0, 0, 0], fontSize: 9, font: 'Roboto' },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', margin: [0, 0, 40, 0], fontSize: 9, font: 'Roboto' }
        ]
      };
    },
    defaultStyle: { font: 'Roboto' },
    pageMargins: [40, 60, 40, 60]
  };

  // Recursively flatten all nested arrays and remove empty arrays from content
  function deepFlattenContent(content: any[]): any[] {
    return content.reduce((acc: any[], item: any) => {
      if (Array.isArray(item)) {
        // Recursively flatten
        return acc.concat(deepFlattenContent(item));
      } else if (item !== undefined && item !== null) {
        acc.push(item);
      }
      return acc;
    }, []);
  }
  docDefinition.content = deepFlattenContent(docDefinition.content);
  console.log('[PDF Export] deep-flattened docDefinition.content:', docDefinition.content);

  // Remove invalid images (image: undefined or null) from content
  const filteredContent = docDefinition.content.filter((item: any, idx: number) => {
    if (item && typeof item === 'object' && 'image' in item && (item.image === undefined || item.image === null)) {
      console.warn(`[PDF Export] Removing content[${idx}] with invalid image property`, item);
      return false;
    }
    return true;
  });
  docDefinition.content = filteredContent;

  // Transform summary/stat objects into pdfMake tables
  function summaryMetricsToTable(metrics: any) {
    if (!metrics || typeof metrics !== 'object') return null;
    return {
      table: {
        widths: ['*', '*'],
        body: [
          ['Total Revenue', metrics.totalRevenue?.toLocaleString?.() ?? ''],
          ['Total Costs', metrics.totalCosts?.toLocaleString?.() ?? ''],
          ['Total Profit', metrics.totalProfit?.toLocaleString?.() ?? ''],
          ['Profit Margin', metrics.profitMargin ? metrics.profitMargin.toFixed(2) + '%' : ''],
          ['Break Even', metrics.breakEvenPeriod?.label ?? '']
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    };
  }

  // Transform revenue breakdown, cost breakdown, and scenario analysis objects/arrays into pdfMake tables
  function breakdownToTable(breakdown: any, type: 'revenue' | 'cost') {
    if (!breakdown || !Array.isArray(breakdown)) return null;
    const isRevenue = type === 'revenue';
    return {
      table: {
        widths: ['*', '*', '*'],
        body: [
          isRevenue
            ? ['Name', 'Total Value', 'Percentage']
            : ['Category', 'Total Value', 'Percentage'],
          ...breakdown.map((item: any) => [
            item.name || item.category || '',
            item.totalValue?.toLocaleString?.() ?? '',
            item.percentage != null ? item.percentage + '%' : ''
          ])
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    };
  }

  function scenarioAnalysisToTable(scenario: any) {
    if (!scenario || typeof scenario !== 'object') return null;
    return {
      table: {
        widths: ['*', '*'],
        body: [
          ['Revenue Δ', scenario.revenueDelta ?? ''],
          ['Revenue Δ %', scenario.revenueDeltaPercent ? scenario.revenueDeltaPercent + '%' : ''],
          ['Costs Δ', scenario.costsDelta ?? ''],
          ['Costs Δ %', scenario.costsDeltaPercent ? scenario.costsDeltaPercent + '%' : ''],
          ['Profit Δ', scenario.profitDelta ?? ''],
          ['Profit Δ %', scenario.profitDeltaPercent ? scenario.profitDeltaPercent + '%' : '']
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    };
  }

  // Transform forecast overview array into a table
  function forecastOverviewToTable(forecastArr: any[]) {
    if (!Array.isArray(forecastArr) || !forecastArr.length) return null;
    return {
      table: {
        headerRows: 1,
        widths: [40, 60, 60, 60, 60, 60, 60],
        body: [
          [
            'Period', 'Week', 'Revenue', 'Cost', 'Profit', 'Cumulative Revenue', 'Cumulative Profit'
          ],
          ...forecastArr.map(f => [
            f.period ?? '',
            f.point ?? '',
            f.revenue?.toLocaleString?.() ?? '',
            f.cost?.toLocaleString?.() ?? '',
            f.profit?.toLocaleString?.() ?? '',
            f.cumulativeRevenue?.toLocaleString?.() ?? '',
            f.cumulativeProfit?.toLocaleString?.() ?? ''
          ])
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    };
  }

  // Group consecutive forecast objects into a single array to be rendered as one table
  function groupForecastObjects(content: any[]) {
    const result = [];
    let forecastBlock: any[] = [];
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      if (
        item && typeof item === 'object' &&
        'period' in item && 'point' in item && 'revenue' in item && 'cost' in item && 'profit' in item
      ) {
        forecastBlock.push(item);
      } else {
        if (forecastBlock.length) {
          result.push(forecastOverviewToTable(forecastBlock));
          forecastBlock = [];
        }
        result.push(item);
      }
    }
    if (forecastBlock.length) {
      result.push(forecastOverviewToTable(forecastBlock));
    }
    return result;
  }

  // Helper: Render category/value/percentage arrays as tables
  function categorySummaryToTable(arr: any[], headers: string[] = ["Category", "Value", "%"]) {
    if (!Array.isArray(arr) || !arr.length) return null;
    return {
      table: {
        headerRows: 1,
        widths: ["*", 60, 40],
        body: [
          headers,
          ...arr.map(row => [
            row.category || row.name || '',
            (row.totalValue ?? row.value ?? '').toLocaleString?.() ?? '',
            (row.percentage !== undefined ? row.percentage + '%' : '')
          ])
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 12]
    };
  }

  // Helper: Render info/warning message objects as text blocks
  function infoMessageToText(obj: any) {
    if (!obj || typeof obj !== 'object' || !obj.message) return null;
    return {
      text: `${obj.type || 'Info'}: ${obj.message}`,
      style: obj.severity === 'info' ? 'infoText' : 'warningText',
      margin: [0, 0, 0, 12]
    };
  }

  // Helper: Render assumptions/metadata as bullet points
  function assumptionsToBullets(obj: any) {
    if (!obj || typeof obj !== 'object' || !obj.metadata) return null;
    const meta = obj.metadata;
    const lines = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
    return {
      ul: lines,
      margin: [0, 0, 0, 12]
    };
  }

  // Map all content items to tables/text where possible
  docDefinition.content = groupForecastObjects(docDefinition.content).map((item: any) => {
    // Executive summary metrics
    if (
      item && typeof item === 'object' &&
      'totalRevenue' in item && 'totalCosts' in item && 'totalProfit' in item && 'profitMargin' in item && 'breakEvenPeriod' in item
    ) {
      return summaryMetricsToTable(item);
    }
    // Revenue breakdown (array of revenue items)
    if (Array.isArray(item) && item.length && 'name' in item[0] && 'totalValue' in item[0]) {
      return breakdownToTable(item, 'revenue');
    }
    // Cost breakdown (array of cost items)
    if (Array.isArray(item) && item.length && 'category' in item[0] && 'totalValue' in item[0]) {
      return breakdownToTable(item, 'cost');
    }
    // Scenario analysis object
    if (
      item && typeof item === 'object' &&
      ('revenueDelta' in item || 'costsDelta' in item || 'profitDelta' in item)
    ) {
      return scenarioAnalysisToTable(item);
    }
    // Category/summary tables
    if (Array.isArray(item) && item.length && (item[0].category || item[0].name)) {
      return categorySummaryToTable(item);
    }
    // Single category summary objects
    if (item && typeof item === 'object' && (item.category || item.name) && ('totalValue' in item || 'value' in item)) {
      return categorySummaryToTable([item]);
    }
    // Info/warning message objects
    if (item && typeof item === 'object' && item.type && item.message) {
      return infoMessageToText(item);
    }
    // Assumptions/metadata
    if (item && typeof item === 'object' && item.metadata) {
      return assumptionsToBullets(item);
    }
    return item;
  });

  // Only allow valid pdfMake node types in content
  const validNodeKeys = ['text', 'image', 'table', 'ul', 'ol', 'columns', 'canvas', 'qr', 'svg', 'toc'];
  const pdfMakeContent = docDefinition.content.filter((item: any, idx: number) => {
    if (typeof item !== 'object' || item === null) return false;
    const hasValidKey = validNodeKeys.some(key => key in item);
    if (!hasValidKey) {
      console.warn(`[PDF Export] Skipping content[${idx}] - not a valid pdfMake node`, item);
      try {
        console.log(`[PDF Export] SKIPPED STRUCTURE content[${idx}]:`, JSON.stringify(item));
      } catch (e) {
        if (item && typeof item === 'object') {
          console.log(`[PDF Export] SKIPPED STRUCTURE content[${idx}]:`, Object.keys(item), 'type:', Object.prototype.toString.call(item));
        } else {
          console.log(`[PDF Export] SKIPPED STRUCTURE content[${idx}]:`, item, 'type:', typeof item);
        }
      }
      return false;
    }
    return true;
  });
  docDefinition.content = pdfMakeContent;

  // Log the structure of the first 10 content items for deep inspection
  docDefinition.content.slice(0, 10).forEach((item: any, idx: number) => {
    try {
      console.log(`[PDF Export] STRUCTURE content[${idx}]:`, JSON.stringify(item));
    } catch (e) {
      if (item && typeof item === 'object') {
        console.log(`[PDF Export] STRUCTURE content[${idx}]:`, Object.keys(item), 'type:', Object.prototype.toString.call(item));
      } else {
        console.log(`[PDF Export] STRUCTURE content[${idx}]:`, item, 'type:', typeof item);
      }
    }
  });

  // Log each content item for debugging
  docDefinition.content.forEach((item: any, idx: number) => {
    console.log(`[PDF Export] content[${idx}]:`, item, 'type:', typeof item, 'isArray:', Array.isArray(item));
    if (item === undefined) {
      console.error(`[PDF Export] content[${idx}] is undefined!`);
    }
    if (item === null) {
      console.error(`[PDF Export] content[${idx}] is null!`);
    }
  });

  // --- DEBUG: Log all content items with their index and structure ---
  docDefinition.content.forEach((item: any, idx: number) => {
    try {
      console.log(`[PDF Export] FINAL STRUCTURE content[${idx}]:`, JSON.stringify(item));
    } catch (e) {
      if (item && typeof item === 'object') {
        console.log(`[PDF Export] FINAL STRUCTURE content[${idx}]:`, Object.keys(item), 'type:', Object.prototype.toString.call(item));
      } else {
        console.log(`[PDF Export] FINAL STRUCTURE content[${idx}]:`, item, 'type:', typeof item);
      }
    }
  });

  // Defensive: Ensure VFS is set before generating PDF
  if (!pdfMake.vfs) {
    console.error('[PDF Export] pdfMake.vfs is not loaded!', pdfMake);
    alert('PDF export failed: PDF engine not loaded.');
    throw new Error('pdfMake VFS is not loaded. Cannot generate PDF.');
  }

  // Extra validation
  console.log('[PDF Export] docDefinition.content:', docDefinition.content);
  if (!Array.isArray(docDefinition.content) || docDefinition.content.length === 0) {
    console.error('[PDF Export] docDefinition.content is empty or invalid:', docDefinition.content);
    alert('PDF export failed: content is empty or invalid');
    return;
  }

  try {
    console.log('[PDF Export] pdfMake loaded:', !!pdfMake);
    console.log('[PDF Export] pdfMake.vfs loaded:', !!pdfMake.vfs);
    console.log('[PDF Export] docDefinition:', docDefinition);
    console.log('[PDF Export] download triggered');
    pdfMake.createPdf(docDefinition).download('boardroom-report.pdf');
    console.log('[PDF Export] download should have started');
  } catch (err) {
    console.error('[PDF Export] ERROR during download:', err);
    alert('PDF export failed: ' + err);
  }
}
