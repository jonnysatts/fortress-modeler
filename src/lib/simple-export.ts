import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { formatCurrency } from './utils';
import {
  sanitizeExportData,
  sanitizeSheetData,
  sanitizeJsonData,
  sanitizeWorkbookName,
  sanitizeSheetName,
  sanitizeString,
} from './xlsxSanitizer';

export interface SimpleExportData {
  project: Project;
  models: FinancialModel[];
}

// Simple Excel Export with security sanitization
export const exportSimpleExcel = async (data: SimpleExportData): Promise<void> => {
  try {
    // Sanitize entire export data structure
    const sanitizedData = sanitizeExportData(data);
    console.log('🔒 Export data sanitized for security');

    const workbook = XLSX.utils.book_new();

    // Project Info Sheet - sanitize array data
    const projectInfo = sanitizeSheetData([
      ['Fortress Financial Modeler - Export'],
      [''],
      ['Project Name', sanitizedData.project.name],
      ['Description', sanitizedData.project.description || 'No description'],
      ['Product Type', sanitizedData.project.productType],
      ['Created', format(sanitizedData.project.createdAt, 'PPP')],
      ['Updated', format(sanitizedData.project.updatedAt, 'PPP')],
      ['Target Audience', sanitizedData.project.targetAudience || 'Not specified'],
      [''],
      ['Financial Models', sanitizedData.models.length.toString()],
    ]);

    const projectSheet = XLSX.utils.aoa_to_sheet(projectInfo);
    XLSX.utils.book_append_sheet(workbook, projectSheet, sanitizeSheetName('Project Info'));

    // Models Overview - sanitize JSON data
    if (sanitizedData.models.length > 0) {
      const modelsData = sanitizeJsonData(
        sanitizedData.models.map(model => ({
          'Model Name': model.name,
          'Created': format(model.createdAt, 'MM/dd/yyyy'),
          'Revenue Streams': model.assumptions?.revenue?.length || 0,
          'Cost Items': model.assumptions?.costs?.length || 0,
          'Growth Type': model.assumptions?.growthModel?.type || 'None'
        }))
      );

      const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
      XLSX.utils.book_append_sheet(workbook, modelsSheet, sanitizeSheetName('Models'));

      // Revenue Details (if any) - sanitize JSON data
      const revenueData: any[] = [];
      sanitizedData.models.forEach(model => {
        if (model.assumptions?.revenue) {
          model.assumptions.revenue.forEach((rev: any) => {
            revenueData.push({
              'Model': model.name,
              'Revenue Stream': rev.name,
              'Value': rev.value,
              'Type': rev.type,
              'Frequency': rev.frequency || 'Monthly'
            });
          });
        }
      });

      if (revenueData.length > 0) {
        const sanitizedRevenue = sanitizeJsonData(revenueData);
        const revenueSheet = XLSX.utils.json_to_sheet(sanitizedRevenue);
        XLSX.utils.book_append_sheet(workbook, revenueSheet, sanitizeSheetName('Revenue Streams'));
      }

      // Cost Details (if any) - sanitize JSON data
      const costData: any[] = [];
      sanitizedData.models.forEach(model => {
        if (model.assumptions?.costs) {
          model.assumptions.costs.forEach((cost: any) => {
            costData.push({
              'Model': model.name,
              'Cost Item': cost.name,
              'Value': cost.value,
              'Type': cost.type,
              'Category': cost.category
            });
          });
        }
      });

      if (costData.length > 0) {
        const sanitizedCosts = sanitizeJsonData(costData);
        const costSheet = XLSX.utils.json_to_sheet(sanitizedCosts);
        XLSX.utils.book_append_sheet(workbook, costSheet, sanitizeSheetName('Cost Structure'));
      }
    }

    // Download with sanitized filename
    const fileName = sanitizeWorkbookName(
      `${sanitizedData.project.name}_Export_${format(new Date(), 'yyyy-MM-dd')}`
    ) + '.xlsx';
    XLSX.writeFile(workbook, fileName);

    console.log('✅ Secure Excel export completed');
  } catch (error) {
    console.error('❌ Excel export failed:', error);
    throw new Error(`Failed to export Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Simple PDF Export with security sanitization
export const exportSimplePDF = async (data: SimpleExportData): Promise<void> => {
  try {
    // Sanitize entire export data structure
    const sanitizedData = sanitizeExportData(data);
    console.log('🔒 PDF data sanitized for security');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('Fortress Financial Analysis', margin, 30);

    // Project Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Project Information', margin, 50);

    const projectInfo = [
      ['Project Name', sanitizeString(sanitizedData.project.name, 200)],
      ['Product Type', sanitizeString(sanitizedData.project.productType, 100)],
      ['Created', format(sanitizedData.project.createdAt, 'PPP')],
      ['Description', sanitizeString(sanitizedData.project.description || 'No description provided', 500)],
      ['Target Audience', sanitizeString(sanitizedData.project.targetAudience || 'Not specified', 200)]
    ];

  autoTable(doc, {
    startY: 60,
    head: [['Property', 'Value']],
    body: projectInfo,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 128, 185] },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

    // Models Summary
    if (sanitizedData.models.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 120;

      doc.setFontSize(14);
      doc.text('Financial Models', margin, finalY + 20);

      const modelsData = sanitizedData.models.map(model => [
        sanitizeString(model.name, 100),
        format(model.createdAt, 'MM/dd/yyyy'),
        (model.assumptions?.revenue?.length || 0).toString(),
        (model.assumptions?.costs?.length || 0).toString()
      ]);

    autoTable(doc, {
      startY: finalY + 30,
      head: [['Model Name', 'Created', 'Revenue Items', 'Cost Items']],
      body: modelsData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [22, 160, 133] }
    });

      // Revenue Summary
      const revenueItems: any[] = [];
      sanitizedData.models.forEach(model => {
        if (model.assumptions?.revenue) {
          model.assumptions.revenue.forEach((rev: any) => {
            revenueItems.push([
              sanitizeString(model.name, 100),
              sanitizeString(rev.name, 100),
              formatCurrency(rev.value),
              sanitizeString(rev.type, 50)
            ]);
          });
        }
      });

    if (revenueItems.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Revenue Breakdown', margin, 30);

      autoTable(doc, {
        startY: 40,
        head: [['Model', 'Revenue Stream', 'Value', 'Type']],
        body: revenueItems,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] }
      });
    }

      // Cost Summary
      const costItems: any[] = [];
      sanitizedData.models.forEach(model => {
        if (model.assumptions?.costs) {
          model.assumptions.costs.forEach((cost: any) => {
            costItems.push([
              sanitizeString(model.name, 100),
              sanitizeString(cost.name, 100),
              formatCurrency(cost.value),
              sanitizeString(cost.category, 50)
            ]);
          });
        }
      });

    if (costItems.length > 0) {
      const startY = revenueItems.length > 0 ? (doc as any).lastAutoTable.finalY + 30 : 40;
      
      if (startY > 200) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Cost Breakdown', margin, 30);
        
        autoTable(doc, {
          startY: 40,
          head: [['Model', 'Cost Item', 'Value', 'Category']],
          body: costItems,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] }
        });
      } else {
        doc.setFontSize(14);
        doc.text('Cost Breakdown', margin, startY);
        
        autoTable(doc, {
          startY: startY + 10,
          head: [['Model', 'Cost Item', 'Value', 'Category']],
          body: costItems,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] }
        });
      }
    }
  }

  // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${format(new Date(), 'PPP')} by Fortress Financial Modeler`, margin, doc.internal.pageSize.height - 10);

    // Download with sanitized filename
    const fileName = sanitizeWorkbookName(
      `${sanitizedData.project.name}_Report_${format(new Date(), 'yyyy-MM-dd')}`
    ) + '.pdf';
    doc.save(fileName);

    console.log('✅ Secure PDF export completed');
  } catch (error) {
    console.error('❌ PDF export failed:', error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};