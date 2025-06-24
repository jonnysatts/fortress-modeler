import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { formatCurrency } from './utils';

export interface SimpleExportData {
  project: Project;
  models: FinancialModel[];
}

// Simple Excel Export that always works
export const exportSimpleExcel = async (data: SimpleExportData): Promise<void> => {
  const workbook = XLSX.utils.book_new();

  // Project Info Sheet
  const projectInfo = [
    ['Fortress Financial Modeler - Export'],
    [''],
    ['Project Name', data.project.name],
    ['Description', data.project.description || 'No description'],
    ['Product Type', data.project.productType],
    ['Created', format(data.project.createdAt, 'PPP')],
    ['Updated', format(data.project.updatedAt, 'PPP')],
    ['Target Audience', data.project.targetAudience || 'Not specified'],
    [''],
    ['Financial Models', data.models.length.toString()],
  ];

  const projectSheet = XLSX.utils.aoa_to_sheet(projectInfo);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Info');

  // Models Overview
  if (data.models.length > 0) {
    const modelsData = data.models.map(model => ({
      'Model Name': model.name,
      'Created': format(model.createdAt, 'MM/dd/yyyy'),
      'Revenue Streams': model.assumptions?.revenue?.length || 0,
      'Cost Items': model.assumptions?.costs?.length || 0,
      'Growth Type': model.assumptions?.growthModel?.type || 'None'
    }));

    const modelsSheet = XLSX.utils.json_to_sheet(modelsData);
    XLSX.utils.book_append_sheet(workbook, modelsSheet, 'Models');

    // Revenue Details (if any)
    const revenueData = [];
    data.models.forEach(model => {
      if (model.assumptions?.revenue) {
        model.assumptions.revenue.forEach(rev => {
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
      const revenueSheet = XLSX.utils.json_to_sheet(revenueData);
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Streams');
    }

    // Cost Details (if any)
    const costData = [];
    data.models.forEach(model => {
      if (model.assumptions?.costs) {
        model.assumptions.costs.forEach(cost => {
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
      const costSheet = XLSX.utils.json_to_sheet(costData);
      XLSX.utils.book_append_sheet(workbook, costSheet, 'Cost Structure');
    }
  }

  // Download
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Export_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// Simple PDF Export that always works
export const exportSimplePDF = async (data: SimpleExportData): Promise<void> => {
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
    ['Project Name', data.project.name],
    ['Product Type', data.project.productType],
    ['Created', format(data.project.createdAt, 'PPP')],
    ['Description', data.project.description || 'No description provided'],
    ['Target Audience', data.project.targetAudience || 'Not specified']
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
  if (data.models.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    
    doc.setFontSize(14);
    doc.text('Financial Models', margin, finalY + 20);

    const modelsData = data.models.map(model => [
      model.name,
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
    const revenueItems = [];
    data.models.forEach(model => {
      if (model.assumptions?.revenue) {
        model.assumptions.revenue.forEach(rev => {
          revenueItems.push([model.name, rev.name, formatCurrency(rev.value), rev.type]);
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
    const costItems = [];
    data.models.forEach(model => {
      if (model.assumptions?.costs) {
        model.assumptions.costs.forEach(cost => {
          costItems.push([model.name, cost.name, formatCurrency(cost.value), cost.category]);
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

  // Download
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};