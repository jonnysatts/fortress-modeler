import { EnhancedPDFGenerator, PDFExportOptions, ProjectData } from './core/EnhancedPDFGenerator';
import { EnhancedExcelGenerator, ExcelExportOptions, ExcelProjectData } from './core/EnhancedExcelGenerator';
import { CanvasComponentRenderer } from './core/CanvasComponentRenderer';

export interface ExportSystemOptions {
  format: 'PDF' | 'Excel' | 'Both';
  template?: 'executive' | 'detailed' | 'board' | 'technical';
  includeCharts?: boolean;
  includeScenarioComparison?: boolean;
  includeRiskAnalysis?: boolean;
  colorScheme?: 'fortress' | 'monochrome' | 'high-contrast';
  pageSize?: 'Letter' | 'A4' | 'Legal';
  orientation?: 'Portrait' | 'Landscape';
  companyName?: string;
  author?: string;
  embedImages?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: Uint8Array;
  filename?: string;
  error?: string;
}

export interface ExportResults {
  pdf?: ExportResult;
  excel?: ExportResult;
}

export class EnhancedExportSystem {
  private pdfGenerator: EnhancedPDFGenerator;
  private excelGenerator: EnhancedExcelGenerator;
  private componentRenderer: CanvasComponentRenderer;

  constructor() {
    this.pdfGenerator = new EnhancedPDFGenerator();
    this.excelGenerator = new EnhancedExcelGenerator();
    this.componentRenderer = new CanvasComponentRenderer();
  }

  async exportProject(data: ProjectData | ExcelProjectData, options: ExportSystemOptions): Promise<ExportResults> {
    const {
      format,
      template = 'executive',
      includeCharts = true,
      includeScenarioComparison = true,
      includeRiskAnalysis = true,
      colorScheme = 'fortress',
      pageSize = 'Letter',
      orientation = 'Portrait',
      companyName = 'Fortress Financial',
      author = 'Financial Analysis Team',
      embedImages = false,
    } = options;

    const results: ExportResults = {};

    try {
      if (format === 'PDF' || format === 'Both') {
        const pdfOptions: PDFExportOptions = {
          format: pageSize.toLowerCase() as 'letter' | 'a4' | 'legal',
          orientation: orientation.toLowerCase() as 'portrait' | 'landscape',
          template,
          includeCharts,
          includeScenarioComparison,
          includeRiskAnalysis,
          colorScheme,
          companyName,
          projectName: data.name,
          author,
          date: new Date().toLocaleDateString(),
        };

        try {
          const pdfData = await this.pdfGenerator.generatePDF(data as ProjectData, pdfOptions);
          results.pdf = {
            success: true,
            data: pdfData,
            filename: this.generateFilename(data.name, 'pdf', template),
          };
        } catch (error) {
          results.pdf = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown PDF generation error',
          };
        }
      }

      if (format === 'Excel' || format === 'Both') {
        const excelOptions: ExcelExportOptions = {
          includeCharts,
          includeScenarioComparison,
          includeRiskAnalysis,
          colorScheme,
          companyName,
          projectName: data.name,
          author,
          date: new Date().toLocaleDateString(),
          embedImages,
        };

        try {
          const excelData = await this.excelGenerator.generateExcel(data as ExcelProjectData, excelOptions);
          results.excel = {
            success: true,
            data: excelData,
            filename: this.generateFilename(data.name, 'xlsx', template),
          };
        } catch (error) {
          results.excel = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Excel generation error',
          };
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown export error';
      
      if (format === 'PDF') {
        results.pdf = { success: false, error: errorMessage };
      } else if (format === 'Excel') {
        results.excel = { success: false, error: errorMessage };
      } else {
        results.pdf = { success: false, error: errorMessage };
        results.excel = { success: false, error: errorMessage };
      }

      return results;
    }
  }

  private generateFilename(projectName: string, extension: string, template: string): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const templateSuffix = template === 'executive' ? '' : `_${template}`;
    
    return `${cleanName}_${timestamp}${templateSuffix}.${extension}`;
  }

  cleanup() {
    this.componentRenderer.cleanup();
  }
}

// Convenience functions for backward compatibility
export async function exportRichPDF(data: ProjectData, options: Partial<ExportSystemOptions> = {}): Promise<ExportResult> {
  const exportSystem = new EnhancedExportSystem();
  try {
    const results = await exportSystem.exportProject(data, {
      format: 'PDF',
      template: 'detailed',
      ...options,
    });
    return results.pdf || { success: false, error: 'PDF export failed' };
  } finally {
    exportSystem.cleanup();
  }
}

export async function exportBoardReadyPDF(data: ProjectData, options: Partial<ExportSystemOptions> = {}): Promise<ExportResult> {
  const exportSystem = new EnhancedExportSystem();
  try {
    const results = await exportSystem.exportProject(data, {
      format: 'PDF',
      template: 'board',
      ...options,
    });
    return results.pdf || { success: false, error: 'PDF export failed' };
  } finally {
    exportSystem.cleanup();
  }
}

export async function exportEnhancedExcel(data: ExcelProjectData, options: Partial<ExportSystemOptions> = {}): Promise<ExportResult> {
  const exportSystem = new EnhancedExportSystem();
  try {
    const results = await exportSystem.exportProject(data, {
      format: 'Excel',
      template: 'detailed',
      ...options,
    });
    return results.excel || { success: false, error: 'Excel export failed' };
  } finally {
    exportSystem.cleanup();
  }
}

export async function exportExecutiveSummary(data: ProjectData, options: Partial<ExportSystemOptions> = {}): Promise<ExportResults> {
  const exportSystem = new EnhancedExportSystem();
  try {
    return await exportSystem.exportProject(data, {
      format: 'Both',
      template: 'executive',
      ...options,
    });
  } finally {
    exportSystem.cleanup();
  }
}

export async function exportTechnicalAnalysis(data: ProjectData, options: Partial<ExportSystemOptions> = {}): Promise<ExportResults> {
  const exportSystem = new EnhancedExportSystem();
  try {
    return await exportSystem.exportProject(data, {
      format: 'Both',
      template: 'technical',
      ...options,
    });
  } finally {
    exportSystem.cleanup();
  }
}

// Error handling utilities
export class ExportError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ExportError';
  }
}

export function isExportError(error: any): error is ExportError {
  return error instanceof ExportError;
}

export function formatExportError(error: any): string {
  if (isExportError(error)) {
    return `Export Error (${error.code}): ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Unknown export error';
}