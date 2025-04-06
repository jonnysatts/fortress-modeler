import { create } from 'zustand';
import { Project, FinancialModel, db, deleteProject as dbDeleteProject } from '@/lib/db';
// Remove static imports for pdfmake
// Import types from @types/pdfmake
import type { TDocumentDefinitions, Content, TableCell, Table } from 'pdfmake/interfaces';

// EXPORT the generic type
export type ExportDataType = Record<string, any>;

// EXPORT the type for the export function map
export type ExportFunctionMap = {
    [key: string]: () => ExportDataType | Promise<ExportDataType>;
};

interface AppState {
  projects: Project[];
  currentProject: Project | null;
  currentModel: FinancialModel | null;
  isLoading: boolean;
  error: string | null;

  // Export state and actions
  exportFunctions: ExportFunctionMap;
  registerExportFunction: (key: string, func: () => ExportDataType | Promise<ExportDataType>) => void;
  unregisterExportFunction: (key: string) => void;
  triggerExport: (reportKey: string, format: 'json' | 'pdf' | 'xlsx') => Promise<void>;
  triggerFullExport: (format: 'json' | 'pdf' | 'xlsx') => Promise<void>;

  loadProjects: () => Promise<void>;
  loadProjectById: (id: number) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentModel: (model: FinancialModel | null) => void;
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateProject: (id: number, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;

  // Financial model methods
  loadModelsForProject: (projectId: number) => Promise<FinancialModel[]>;
  loadModelById: (id: number) => Promise<FinancialModel | null>;
  addFinancialModel: (model: Omit<FinancialModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateFinancialModel: (id: number, updates: Partial<FinancialModel>) => Promise<void>;
  deleteFinancialModel: (id: number) => Promise<void>;

  // Actuals methods
  loadActualsForProject: (projectId: number) => Promise<any[]>;
}

// --- Helper function to format currency values ---
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// --- Helper function to format percentage values ---
const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100);
};

// --- Helper function to create a variance indicator ---
const getVarianceIndicator = (value: number, higherIsBetter: boolean = true): string => {
  if (value === 0) return '⚪'; // Neutral
  if (higherIsBetter) {
    return value > 0 ? '🟢' : '🔴'; // Positive/Negative
  } else {
    return value < 0 ? '🟢' : '🔴'; // Negative/Positive (for costs)
  }
};

// --- Helper function to create pdfmake doc definition with proper typing ---
const createDocDefinition = (data: ExportDataType, reportKey: string): TDocumentDefinitions => {
  console.log("Creating pdfmake doc definition for:", reportKey, data);
  const content: Content[] = [];
  const primaryColor = '#4f46e5'; // Indigo color for branding
  const secondaryColor = '#f97316'; // Orange for accents
  const lightGray = '#f3f4f6';
  const darkGray = '#374151';

  // --- Document Header with Logo and Title ---
  content.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'FORTRESS MODELER', style: 'brandName', color: primaryColor },
          { text: `${reportKey} Report`, style: 'documentTitle' },
          { text: `Project: ${data.projectName || 'N/A'}`, style: 'projectName' },
          { text: `Generated: ${new Date(data.exportDate).toLocaleString()}`, style: 'generatedDate' }
        ]
      },
      {
        width: 80,
        alignment: 'right',
        // Placeholder for logo - in a real app, you'd use an image here
        stack: [
          {
            canvas: [
              {
                type: 'rect',
                x: 0, y: 0,
                w: 60, h: 60,
                r: 5,
                color: primaryColor
              }
            ]
          },
          { text: 'LOGO', color: 'white', fontSize: 10, alignment: 'center', relativePosition: { x: 30, y: -35 } }
        ]
      }
    ],
    margin: [0, 0, 0, 20]
  });

  // --- Executive Summary Section ---
  if (data.summaryMetrics) {
    const summary = data.summaryMetrics;

    // Add section header
    content.push({
      text: 'EXECUTIVE SUMMARY',
      style: 'sectionHeader',
      margin: [0, 10, 0, 15],
      pageBreak: 'before'
    });

    // Create KPI Dashboard
    const kpiRows: TableCell[][] = [
      // Header row
      [{ text: 'METRIC', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'FORECAST', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'ACTUAL', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'VARIANCE', style: 'tableHeader', fillColor: primaryColor, color: 'white' }]
    ];

    // Revenue KPI
    const revenueVariance = summary.actualTotalRevenue - summary.periodSpecificRevenueForecast;
    const revenueVariancePercent = summary.periodSpecificRevenueForecast !== 0 ?
      (revenueVariance / summary.periodSpecificRevenueForecast) * 100 : 0;

    kpiRows.push([
      { text: 'Revenue', style: 'metricName', fillColor: lightGray },
      { text: formatCurrency(summary.periodSpecificRevenueForecast), alignment: 'right' },
      { text: formatCurrency(summary.actualTotalRevenue), alignment: 'right' },
      {
        columns: [
          { text: getVarianceIndicator(revenueVariance), width: 20 },
          {
            text: `${formatCurrency(revenueVariance)} (${formatPercent(revenueVariancePercent)})`,
            color: revenueVariance >= 0 ? 'green' : 'red'
          }
        ]
      }
    ]);

    // Cost KPI (note: for costs, lower is better)
    const costVariance = summary.actualTotalCost - summary.periodSpecificCostForecast;
    const costVariancePercent = summary.periodSpecificCostForecast !== 0 ?
      (costVariance / summary.periodSpecificCostForecast) * 100 : 0;

    kpiRows.push([
      { text: 'Costs', style: 'metricName', fillColor: lightGray },
      { text: formatCurrency(summary.periodSpecificCostForecast), alignment: 'right' },
      { text: formatCurrency(summary.actualTotalCost), alignment: 'right' },
      {
        columns: [
          { text: getVarianceIndicator(costVariance, false), width: 20 },
          {
            text: `${formatCurrency(costVariance)} (${formatPercent(costVariancePercent)})`,
            color: costVariance <= 0 ? 'green' : 'red'
          }
        ]
      }
    ]);

    // Profit KPI
    const profitVariance = summary.actualTotalProfit - summary.periodSpecificProfitForecast;
    const profitVariancePercent = summary.periodSpecificProfitForecast !== 0 ?
      (profitVariance / summary.periodSpecificProfitForecast) * 100 : 0;

    kpiRows.push([
      { text: 'Profit', style: 'metricName', fillColor: lightGray },
      { text: formatCurrency(summary.periodSpecificProfitForecast), alignment: 'right' },
      { text: formatCurrency(summary.actualTotalProfit), alignment: 'right' },
      {
        columns: [
          { text: getVarianceIndicator(profitVariance), width: 20 },
          {
            text: `${formatCurrency(profitVariance)} (${formatPercent(profitVariancePercent)})`,
            color: profitVariance >= 0 ? 'green' : 'red'
          }
        ]
      }
    ]);

    // Profit Margin KPI
    const marginVariance = summary.actualAvgProfitMargin - summary.periodSpecificProfitMargin;

    kpiRows.push([
      { text: 'Profit Margin', style: 'metricName', fillColor: lightGray },
      { text: formatPercent(summary.periodSpecificProfitMargin), alignment: 'right' },
      { text: formatPercent(summary.actualAvgProfitMargin), alignment: 'right' },
      {
        columns: [
          { text: getVarianceIndicator(marginVariance), width: 20 },
          {
            text: `${formatPercent(marginVariance)}`,
            color: marginVariance >= 0 ? 'green' : 'red'
          }
        ]
      }
    ]);

    // Add Attendance KPI if available
    if (summary.periodSpecificAttendanceForecast !== undefined) {
      const attendanceVariance = summary.actualTotalAttendance - summary.periodSpecificAttendanceForecast;
      const attendanceVariancePercent = summary.periodSpecificAttendanceForecast !== 0 ?
        (attendanceVariance / summary.periodSpecificAttendanceForecast) * 100 : 0;

      kpiRows.push([
        { text: 'Attendance', style: 'metricName', fillColor: lightGray },
        { text: summary.periodSpecificAttendanceForecast.toLocaleString(), alignment: 'right' },
        { text: summary.actualTotalAttendance.toLocaleString(), alignment: 'right' },
        {
          columns: [
            { text: getVarianceIndicator(attendanceVariance), width: 20 },
            {
              text: `${attendanceVariance.toLocaleString()} (${formatPercent(attendanceVariancePercent)})`,
              color: attendanceVariance >= 0 ? 'green' : 'red'
            }
          ]
        }
      ]);
    }

    // Add KPI table to content
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: kpiRows
      },
      layout: {
        hLineWidth: function(i: number, node: any) { return 1; },
        vLineWidth: function(i: number, node: any) { return 1; },
        hLineColor: function(i: number, node: any) { return i === 0 || i === node.table.body.length ? primaryColor : lightGray; },
        vLineColor: function(i: number, node: any) { return lightGray; },
        paddingLeft: function(i: number, node: any) { return 10; },
        paddingRight: function(i: number, node: any) { return 10; },
        paddingTop: function(i: number, node: any) { return 8; },
        paddingBottom: function(i: number, node: any) { return 8; }
      }
    });

    // Add summary text
    content.push({
      text: 'Performance Summary',
      style: 'subheader',
      margin: [0, 20, 0, 10]
    });

    // Create a summary paragraph
    const revenueSummary = revenueVariance >= 0 ?
      `Revenue is ${formatPercent(revenueVariancePercent)} above forecast` :
      `Revenue is ${formatPercent(Math.abs(revenueVariancePercent))} below forecast`;

    const profitSummary = profitVariance >= 0 ?
      `Profit is ${formatPercent(profitVariancePercent)} above forecast` :
      `Profit is ${formatPercent(Math.abs(profitVariancePercent))} below forecast`;

    const costSummary = costVariance <= 0 ?
      `Costs are ${formatPercent(Math.abs(costVariancePercent))} below budget` :
      `Costs are ${formatPercent(costVariancePercent)} above budget`;

    content.push({
      text: [
        { text: 'Performance Overview: ', bold: true },
        { text: `${revenueSummary}. ${profitSummary}. ${costSummary}.` }
      ],
      margin: [0, 0, 0, 10]
    });

    // Add a spacer
    content.push({ text: ' ', margin: [0, 10, 0, 0] });
  }

  // --- Trend Analysis Section ---
  if (data.trendData && Array.isArray(data.trendData) && data.trendData.length > 0) {
    content.push({
      text: 'TREND ANALYSIS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 15],
      pageBreak: 'before'
    });

    // Note about visualizations
    content.push({
      text: 'Note: For interactive visualizations and charts, please visit the web application.',
      italics: true,
      color: darkGray,
      alignment: 'center',
      margin: [0, 10, 0, 20]
    });

    // Create an enhanced trend table with performance indicators
    const trendTableBody: TableCell[][] = [
      // Header row with better labels
      [{ text: 'PERIOD', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'FORECAST REVENUE', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'ACTUAL REVENUE', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'VARIANCE', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'FORECAST PROFIT', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'ACTUAL PROFIT', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
       { text: 'VARIANCE', style: 'tableHeader', fillColor: primaryColor, color: 'white' }]
    ];

    // Add only the most recent periods (last 6 or all if less than 6)
    const periodsToShow = Math.min(data.trendData.length, 6);
    const recentTrendData = data.trendData.slice(-periodsToShow);

    recentTrendData.forEach(period => {
      // Calculate variances
      const revenueVariance = period.revenueActual !== undefined ?
        period.revenueActual - period.revenueForecast : undefined;

      const revenueVariancePercent = (revenueVariance !== undefined && period.revenueForecast !== 0) ?
        (revenueVariance / period.revenueForecast) * 100 : undefined;

      const profitVariance = period.profitActual !== undefined ?
        period.profitActual - period.profitForecast : undefined;

      const profitVariancePercent = (profitVariance !== undefined && period.profitForecast !== 0) ?
        (profitVariance / period.profitForecast) * 100 : undefined;

      // Add row with enhanced formatting
      trendTableBody.push([
        // Period
        { text: period.point, style: 'periodLabel', fillColor: lightGray },

        // Forecast Revenue
        { text: formatCurrency(period.revenueForecast), alignment: 'right' },

        // Actual Revenue with color coding
        {
          text: period.revenueActual !== undefined ? formatCurrency(period.revenueActual) : 'N/A',
          alignment: 'right',
          color: period.revenueActual !== undefined && period.revenueActual >= period.revenueForecast ? 'green' :
                 period.revenueActual !== undefined ? 'red' : darkGray
        },

        // Revenue Variance with indicator
        {
          text: revenueVariance !== undefined ?
            `${getVarianceIndicator(revenueVariance)} ${formatCurrency(revenueVariance)} (${formatPercent(revenueVariancePercent!)})` :
            'N/A',
          alignment: 'right',
          color: revenueVariance !== undefined && revenueVariance >= 0 ? 'green' :
                 revenueVariance !== undefined ? 'red' : darkGray
        },

        // Forecast Profit
        { text: formatCurrency(period.profitForecast), alignment: 'right' },

        // Actual Profit with color coding
        {
          text: period.profitActual !== undefined ? formatCurrency(period.profitActual) : 'N/A',
          alignment: 'right',
          color: period.profitActual !== undefined && period.profitActual >= period.profitForecast ? 'green' :
                 period.profitActual !== undefined ? 'red' : darkGray
        },

        // Profit Variance with indicator
        {
          text: profitVariance !== undefined ?
            `${getVarianceIndicator(profitVariance)} ${formatCurrency(profitVariance)} (${formatPercent(profitVariancePercent!)})` :
            'N/A',
          alignment: 'right',
          color: profitVariance !== undefined && profitVariance >= 0 ? 'green' :
                 profitVariance !== undefined ? 'red' : darkGray
        }
      ]);
    });

    // Add trend table to content
    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: trendTableBody
      },
      layout: {
        hLineWidth: function(i: number, node: any) { return 1; },
        vLineWidth: function(i: number, node: any) { return 1; },
        hLineColor: function(i: number, node: any) { return i === 0 || i === node.table.body.length ? primaryColor : lightGray; },
        vLineColor: function(i: number, node: any) { return lightGray; },
        paddingLeft: function(i: number, node: any) { return 10; },
        paddingRight: function(i: number, node: any) { return 10; },
        paddingTop: function(i: number, node: any) { return 8; },
        paddingBottom: function(i: number, node: any) { return 8; }
      },
      margin: [0, 0, 0, 20]
    });

    // Add a note about data visualization
    content.push({
      text: 'For interactive charts and visualizations, please refer to the web application.',
      italics: true,
      color: darkGray,
      alignment: 'center',
      margin: [0, 0, 0, 10]
    });

    // Add trend analysis text
    content.push({
      text: 'Trend Insights',
      style: 'subheader',
      margin: [0, 10, 0, 10]
    });

    // Calculate trend insights
    const latestPeriods = recentTrendData.filter(p => p.revenueActual !== undefined);
    const isRevenueImproving = latestPeriods.length >= 2 &&
      latestPeriods[latestPeriods.length-1].revenueActual! > latestPeriods[latestPeriods.length-2].revenueActual!;

    const isProfitImproving = latestPeriods.length >= 2 &&
      latestPeriods[latestPeriods.length-1].profitActual! > latestPeriods[latestPeriods.length-2].profitActual!;

    content.push({
      text: [
        { text: 'Trend Analysis: ', bold: true },
        {
          text: isRevenueImproving ?
            'Revenue is showing an upward trend in recent periods. ' :
            'Revenue has not shown improvement in the most recent period. '
        },
        {
          text: isProfitImproving ?
            'Profit is trending positively compared to previous periods.' :
            'Profit has not improved in the most recent period.'
        }
      ],
      margin: [0, 0, 0, 10]
    });

    // Add a spacer
    content.push({ text: ' ', margin: [0, 10, 0, 0] });
  }

  // --- Assumptions Section ---
  if (data.assumptions) {
    content.push({
      text: 'MODEL ASSUMPTIONS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 15],
      pageBreak: 'before'
    });

    // Handle different types of assumptions
    if (typeof data.assumptions === 'object' && !Array.isArray(data.assumptions)) {
      // Extract key assumptions for a summary table
      const keyAssumptions: Record<string, any> = {};

      // Try to extract metadata if available
      if (data.assumptions.metadata) {
        const metadata = data.assumptions.metadata;
        if (metadata.type) keyAssumptions['Model Type'] = metadata.type;
        if (metadata.weeks) keyAssumptions['Duration (Weeks)'] = metadata.weeks;
        if (metadata.initialAttendance) keyAssumptions['Initial Attendance'] = metadata.initialAttendance;
      }

      // Try to extract growth model if available
      if (data.assumptions.growthModel) {
        const growth = data.assumptions.growthModel;
        if (growth.attendanceGrowthRate) keyAssumptions['Attendance Growth Rate'] = `${growth.attendanceGrowthRate}%`;
        if (growth.revenuePerAttendee) keyAssumptions['Revenue Per Attendee'] = formatCurrency(growth.revenuePerAttendee);
      }

      // Create assumptions table
      if (Object.keys(keyAssumptions).length > 0) {
        const assumptionsTableBody: TableCell[][] = [
          [{ text: 'PARAMETER', style: 'tableHeader', fillColor: primaryColor, color: 'white' },
           { text: 'VALUE', style: 'tableHeader', fillColor: primaryColor, color: 'white' }]
        ];

        Object.entries(keyAssumptions).forEach(([key, value]) => {
          assumptionsTableBody.push([
            { text: key, style: 'parameterName', fillColor: lightGray },
            { text: String(value), alignment: 'right' }
          ]);
        });

        content.push({
          table: {
            headerRows: 1,
            widths: ['*', 'auto'],
            body: assumptionsTableBody
          },
          layout: {
            hLineWidth: function(i: number, node: any) { return 1; },
            vLineWidth: function(i: number, node: any) { return 1; },
            hLineColor: function(i: number, node: any) { return i === 0 || i === node.table.body.length ? primaryColor : lightGray; },
            vLineColor: function(i: number, node: any) { return lightGray; },
            paddingLeft: function(i: number, node: any) { return 10; },
            paddingRight: function(i: number, node: any) { return 10; },
            paddingTop: function(i: number, node: any) { return 8; },
            paddingBottom: function(i: number, node: any) { return 8; }
          },
          margin: [0, 0, 0, 20]
        });
      }
    } else if (Array.isArray(data.assumptions)) {
      // If assumptions is an array, create a styled list
      content.push({
        ul: data.assumptions.map(assumption => ({
          text: assumption,
          margin: [0, 5, 0, 5]
        })),
        margin: [0, 0, 0, 20]
      });
    }
  }

  // --- Document Footer ---
  const footer = function(currentPage: number, pageCount: number) {
    return {
      columns: [
        { text: 'Fortress Modeler - Confidential', alignment: 'left', fontSize: 8, color: darkGray, margin: [40, 0, 0, 0] },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', fontSize: 8, color: darkGray, margin: [0, 0, 40, 0] }
      ],
      margin: [40, 10, 40, 0]
    };
  };

  // Return the complete document definition
  return {
    content: content,
    styles: {
      brandName: { fontSize: 10, bold: true, color: primaryColor },
      documentTitle: { fontSize: 24, bold: true, margin: [0, 5, 0, 5] },
      projectName: { fontSize: 14, margin: [0, 5, 0, 0] },
      generatedDate: { fontSize: 10, color: darkGray, margin: [0, 5, 0, 0] },
      sectionHeader: { fontSize: 16, bold: true, color: primaryColor },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fontSize: 10 },
      metricName: { bold: true, fontSize: 12 },
      parameterName: { fontSize: 11 },
      periodLabel: { fontSize: 11, bold: true }
    },
    defaultStyle: {
      fontSize: 10,
      color: darkGray
    },
    pageMargins: [40, 60, 40, 60],
    footer: footer,
    pageOrientation: 'portrait',
    pageSize: 'A4'
  };
};

const useStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentModel: null,
  isLoading: false,
  error: null,

  // --- Export State & Actions ---
  exportFunctions: {},

  registerExportFunction: (key, func) => {
    console.log(`[Store] Registering export function: ${key}`);
    set((state) => ({
      exportFunctions: { ...state.exportFunctions, [key]: func },
    }));
  },

  unregisterExportFunction: (key) => {
    console.log(`[Store] Unregistering export function: ${key}`);
    set((state) => {
      const { [key]: _, ...rest } = state.exportFunctions;
      return { exportFunctions: rest };
    });
  },

  triggerExport: async (reportKey, format) => {
    console.log(`[Store] Triggering export for: ${reportKey} as ${format}`);
    const func = get().exportFunctions[reportKey];
    if (!func) {
      console.error(`Export function for key "${reportKey}" not found.`);
      alert(`Could not export ${reportKey}: Data function not available.`);
      return;
    }
    try {
      const data = await func();
      console.log(`[Store] Data fetched for ${reportKey}:`, data);

      const projectName = get().currentProject?.name || 'export';
      const filenameBase = `${reportKey.replace(/\s+/g, '_')}-${projectName.replace(/\s+/g, '_')}`;

      if (format === 'json') {
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(data, null, 2)
          )}`;
          const link = document.createElement("a");
          link.href = jsonString;
          link.download = `${filenameBase}.json`;
          link.click();
          console.log(`[Store] JSON export triggered for ${reportKey}`);
      } else if (format === 'pdf') {
          alert(`PDF export for '${reportKey}' starting. Generation may take a moment...`);
          console.log('PDF Export Data:', data);
          try {
              // Add project name and export date to data if not present
              if (!data.projectName) {
                  data.projectName = get().currentProject?.name || 'Unknown Project';
              }
              if (!data.exportDate) {
                  data.exportDate = new Date();
              }

              // Dynamically import pdfmake to avoid static import issues
              const pdfMakeModule = await import('pdfmake/build/pdfmake');
              const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

              // Configure fonts properly
              // Access the default export for pdfmake
              const pdfMake = pdfMakeModule.default || pdfMakeModule;
              // Access vfs_fonts correctly - the structure can vary between environments
              if (pdfFontsModule.pdfMake && pdfFontsModule.pdfMake.vfs) {
                  pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
              } else if (pdfFontsModule.default && pdfFontsModule.default.pdfMake && pdfFontsModule.default.pdfMake.vfs) {
                  pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;
              } else if (pdfFontsModule.vfs) {
                  pdfMake.vfs = pdfFontsModule.vfs;
              }

              // Log the pdfMake and fonts objects to debug
              console.log('pdfMake object:', pdfMake);
              console.log('pdfFontsModule object:', pdfFontsModule);

              // Create document definition with proper typing
              const docDefinition = createDocDefinition(data, reportKey);

              // Check if fonts are loaded
              if (!pdfMake.vfs) {
                  console.warn("VFS fonts not loaded, attempting to load fonts directly");
                  try {
                      // Try to load fonts directly from CDN
                      const fontBase64 = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js')
                          .then(response => response.text())
                          .then(text => {
                              // Extract the base64 font data from the JS file
                              const match = text.match(/pdfMake.vfs\s*=\s*([\s\S]*?);/);
                              return match ? match[1] : null;
                          });

                      if (fontBase64) {
                          try {
                              // Try to parse and assign the fonts
                              const vfs = JSON.parse(fontBase64);
                              pdfMake.vfs = vfs;
                              console.log("Fonts loaded from CDN");
                          } catch (parseError) {
                              console.error("Error parsing font data:", parseError);
                          }
                      }
                  } catch (fontError) {
                      console.error("Error loading fonts from CDN:", fontError);
                      // Continue with default fonts
                  }
              }

              // Generate and download PDF
              try {
                  pdfMake.createPdf(docDefinition).download(`${filenameBase}.pdf`);
                  console.log("[Store] pdfmake PDF download triggered.");
              } catch (innerError) {
                  console.error("Error during PDF creation/download:", innerError);
                  throw innerError; // Re-throw to be caught by the outer try-catch
              }

          } catch (pdfError) {
              console.error("Error during PDF generation:", pdfError);
              alert("Failed to generate PDF. Check console and ensure library is installed correctly.");
          }
      } else if (format === 'xlsx') {
          alert(`Excel export for '${reportKey}' requires implementation.\n\nInstall xlsx (SheetJS) or exceljs and add generation logic here using the fetched data object.`);
          console.log('Excel Export Data:', data);
      }
    } catch (error) {
        console.error(`Error during export for ${reportKey}:`, error);
        alert(`Failed to export ${reportKey}.`);
    }
  },

  triggerFullExport: async (format) => {
      console.log(`[Store] Triggering FULL export as ${format}`);
      const state = get();
      const allExportData: Record<string, ExportDataType> = {};
      let errorOccurred = false;

      for (const key in state.exportFunctions) {
          try {
              const func = state.exportFunctions[key];
              allExportData[key] = await func();
              console.log(`[Store] Fetched data for ${key} (Full Report)`);
          } catch (error) {
              console.error(`Error fetching data for ${key} during full export:`, error);
              errorOccurred = true;
              // Optionally skip failed parts or add error info to export
              allExportData[key] = { error: `Failed to fetch data for ${key}` };
          }
      }

      if (errorOccurred) {
          alert("Warning: Some parts of the full report failed to generate. Check console.");
      }

      const projectName = state.currentProject?.name || 'full_report';
      const filenameBase = `full_product_report-${projectName.replace(/\s+/g, '_')}`;

       if (format === 'json') {
          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify(allExportData, null, 2)
          )}`;
          const link = document.createElement("a");
          link.href = jsonString;
          link.download = `${filenameBase}.json`;
          link.click();
          console.log(`[Store] FULL JSON export triggered`);
      } else if (format === 'pdf') {
          alert("Full Report PDF export starting. Generation may take a moment...");
          console.log('Full PDF Export Data:', allExportData);
          try {
              // Prepare data for full report
              const fullReportData: ExportDataType = {
                  projectName: projectName,
                  exportDate: new Date(),
                  sections: []
              };

              // Process each section's data
              for (const key in allExportData) {
                  const reportData = allExportData[key];
                  if (reportData.error) { // Handle potential errors during data fetching
                      fullReportData.sections.push({
                          title: key,
                          error: reportData.error
                      });
                  } else {
                      fullReportData.sections.push({
                          title: key,
                          data: reportData
                      });
                  }
              }

              // Dynamically import pdfmake to avoid static import issues
              const pdfMakeModule = await import('pdfmake/build/pdfmake');
              const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

              // Configure fonts properly
              // Access the default export for pdfmake
              const pdfMake = pdfMakeModule.default || pdfMakeModule;
              // Access vfs_fonts correctly - the structure can vary between environments
              if (pdfFontsModule.pdfMake && pdfFontsModule.pdfMake.vfs) {
                  pdfMake.vfs = pdfFontsModule.pdfMake.vfs;
              } else if (pdfFontsModule.default && pdfFontsModule.default.pdfMake && pdfFontsModule.default.pdfMake.vfs) {
                  pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;
              } else if (pdfFontsModule.vfs) {
                  pdfMake.vfs = pdfFontsModule.vfs;
              }

              // Log the pdfMake and fonts objects to debug
              console.log('pdfMake object:', pdfMake);
              console.log('pdfFontsModule object:', pdfFontsModule);

              // Create content for full report
              const content: Content[] = [];

              // Add title and header
              content.push({ text: `Full Product Report - ${projectName}`, style: 'header' });
              content.push({ text: `Generated: ${new Date().toLocaleString()}`, style: 'subheader' });
              content.push({ text: ' ', margin: [0, 10, 0, 0] }); // Spacer

              // Add table of contents
              content.push({ text: 'Table of Contents', style: 'subheader' });
              fullReportData.sections.forEach((section, index) => {
                  content.push({
                      text: `${index + 1}. ${section.title}`,
                      margin: [0, 5, 0, 0],
                      pageBreak: index === fullReportData.sections.length - 1 ? 'after' : undefined
                  });
              });

              // Add each section with its own page
              fullReportData.sections.forEach((section, index) => {
                  // Section title
                  content.push({ text: section.title, style: 'header' });

                  if (section.error) {
                      content.push({ text: `Error: ${section.error}`, color: 'red' });
                  } else {
                      // Create section content using the same helper function
                      const sectionDoc = createDocDefinition(section.data, section.title);
                      if (Array.isArray(sectionDoc.content)) {
                          // Skip the title as we already added it
                          content.push(...sectionDoc.content.slice(1));
                      }
                  }

                  // Add page break after each section except the last one
                  if (index < fullReportData.sections.length - 1) {
                      content.push({ text: '', pageBreak: 'after' });
                  }
              });

              // Create document definition
              const docDefinition: TDocumentDefinitions = {
                  content: content,
                  styles: {
                      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
                      tableHeader: { bold: true, fontSize: 11, color: 'black', fillColor: '#eeeeee' }
                  },
                  defaultStyle: {
                      fontSize: 10
                  },
                  pageMargins: [40, 60, 40, 60],
                  footer: (currentPage, pageCount) => {
                      return { text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', fontSize: 8 };
                  }
              };

              // Check if fonts are loaded
              if (!pdfMake.vfs) {
                  console.warn("VFS fonts not loaded for full report, attempting to load fonts directly");
                  try {
                      // Try to load fonts directly from CDN
                      const fontBase64 = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js')
                          .then(response => response.text())
                          .then(text => {
                              // Extract the base64 font data from the JS file
                              const match = text.match(/pdfMake.vfs\s*=\s*([\s\S]*?);/);
                              return match ? match[1] : null;
                          });

                      if (fontBase64) {
                          try {
                              // Try to parse and assign the fonts
                              const vfs = JSON.parse(fontBase64);
                              pdfMake.vfs = vfs;
                              console.log("Fonts loaded from CDN for full report");
                          } catch (parseError) {
                              console.error("Error parsing font data for full report:", parseError);
                          }
                      }
                  } catch (fontError) {
                      console.error("Error loading fonts from CDN for full report:", fontError);
                      // Continue with default fonts
                  }
              }

              // Generate and download PDF
              try {
                  pdfMake.createPdf(docDefinition).download(`${filenameBase}.pdf`);
                  console.log("[Store] Full report PDF download triggered.");
              } catch (innerError) {
                  console.error("Error during full report PDF creation/download:", innerError);
                  throw innerError; // Re-throw to be caught by the outer try-catch
              }

           } catch (pdfError) {
                console.error("Error during Full PDF generation:", pdfError);
                alert("Failed to generate Full PDF. Check console and ensure library is installed correctly.");
           }
      } else if (format === 'xlsx') {
          alert("Full Report Excel export requires implementation.\n\nInstall xlsx/exceljs and add generation logic to create multiple sheets.");
          console.log('Full Excel Export Data:', allExportData);
      }
  },

  // --- Existing State & Actions ---
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await db.projects.toArray();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Error loading projects:', error);
      set({ error: 'Failed to load projects', isLoading: false });
    }
  },

  loadProjectById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const project = await db.projects.get(id);
      if (project) {
        set({ currentProject: project, isLoading: false });
        return project;
      } else {
        set({ error: 'Project not found', isLoading: false });
        return null;
      }
    } catch (error) {
      console.error('Error loading project:', error);
      set({ error: 'Failed to load project', isLoading: false });
      return null;
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  setCurrentModel: (model) => set({ currentModel: model }),

  addProject: async (project) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.projects.add({
        ...project,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await get().loadProjects();
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error adding project:', error);
      set({ error: 'Failed to add project', isLoading: false });
      return -1;
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.projects.update(id, { ...updates, updatedAt: new Date() });
      await get().loadProjects();

      // Update current project if it's the one being edited
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        const updatedProject = await db.projects.get(id);
        if (updatedProject) {
          set({ currentProject: updatedProject });
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: 'Failed to update project', isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      console.log(`Store: Deleting project ${id} using dbDeleteProject function`);
      // Use the imported dbDeleteProject function instead of trying to call it as a method on db
      await dbDeleteProject(id);

      // Reset current project if it's the one being deleted
      const currentProject = get().currentProject;
      if (currentProject && currentProject.id === id) {
        set({ currentProject: null });
      }

      await get().loadProjects();
      set({ isLoading: false });
      console.log(`Store: Successfully deleted project ${id}`);
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: 'Failed to delete project', isLoading: false });
      // Re-throw the error so the UI can handle it
      throw new Error('Failed to delete project');
    }
  },

  loadModelById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const model = await db.financialModels.get(id);
      if (model) {
        set({ currentModel: model, isLoading: false });
      } else {
        set({ error: 'Model not found', isLoading: false });
      }
      return model || null;
    } catch (error) {
      console.error('Error loading financial model:', error);
      set({ error: 'Failed to load financial model', isLoading: false });
      return null;
    }
  },

  loadModelsForProject: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const models = await db.financialModels
        .where('projectId')
        .equals(projectId)
        .toArray();
      set({ isLoading: false });
      return models;
    } catch (error) {
      console.error('Error loading financial models:', error);
      set({ error: 'Failed to load financial models', isLoading: false });
      return [];
    }
  },

  addFinancialModel: async (model) => {
    set({ isLoading: true, error: null });
    try {
      const id = await db.financialModels.add({
        ...model,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error adding financial model:', error);
      set({ error: 'Failed to add financial model', isLoading: false });
      return -1;
    }
  },

  updateFinancialModel: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.update(id, { ...updates, updatedAt: new Date() });

      // Update current model if it's the one being edited
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        const updatedModel = await db.financialModels.get(id);
        if (updatedModel) {
          set({ currentModel: updatedModel });
        }
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error updating financial model:', error);
      set({ error: 'Failed to update financial model', isLoading: false });
    }
  },

  deleteFinancialModel: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await db.financialModels.delete(id);

      // Reset current model if it's the one being deleted
      const currentModel = get().currentModel;
      if (currentModel && currentModel.id === id) {
        set({ currentModel: null });
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('Error deleting financial model:', error);
      set({ error: 'Failed to delete financial model', isLoading: false });
    }
  },

  loadActualsForProject: async (projectId) => {
    set({ error: null });
    try {
      console.log(`[Store] Loading actuals for projectId: ${projectId}`);
      const actuals = await db.actuals.where('projectId').equals(projectId).toArray();
      console.log(`[Store] Found ${actuals.length} actuals entries.`);
      return actuals;
    } catch (error) {
      console.error('Error loading actuals:', error);
      set({ error: 'Failed to load actuals'});
      return [];
    }
  },
}));

export default useStore;
