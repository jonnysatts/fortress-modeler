import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { format } from 'date-fns';
import { Project, FinancialModel } from './db';
import { formatCurrency } from './utils';

export interface RichReportData {
  project: Project;
  model: FinancialModel;
  simulationResults: any; // The same simulation results from ModelOverview
}

// Create a chart off-screen and convert to image
async function createChartImage(config: ChartConfiguration, width: number = 800, height: number = 400): Promise<string> {
  // Create a temporary canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.position = 'absolute';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);
  
  try {
    // Create chart
    const chart = new Chart(canvas, config);
    
    // Wait for chart to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Convert to image
    const imageData = canvas.toDataURL('image/png');
    
    // Cleanup
    chart.destroy();
    document.body.removeChild(canvas);
    
    return imageData;
  } catch (error) {
    // Cleanup on error
    if (canvas.parentNode) {
      document.body.removeChild(canvas);
    }
    throw error;
  }
}

// Generate revenue trend chart
async function generateRevenueChart(periodicData: any[]): Promise<string> {
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: periodicData.map(p => p.point),
      datasets: [
        {
          label: 'Revenue',
          data: periodicData.map(p => p.revenue),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Cumulative Revenue',
          data: periodicData.map(p => p.cumulativeRevenue),
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Revenue Projections',
          font: { size: 16 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + (Number(value) / 1000).toFixed(0) + 'K';
            }
          }
        }
      }
    }
  };
  
  return await createChartImage(config);
}

// Generate cost breakdown chart
async function generateCostChart(periodicData: any[]): Promise<string> {
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: periodicData.map(p => p.point),
      datasets: [
        {
          label: 'Costs',
          data: periodicData.map(p => p.costs),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Cumulative Costs',
          data: periodicData.map(p => p.cumulativeCosts),
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: '#ef4444',
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Cost Projections',
          font: { size: 16 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + (Number(value) / 1000).toFixed(0) + 'K';
            }
          }
        }
      }
    }
  };
  
  return await createChartImage(config);
}

// Generate profit chart
async function generateProfitChart(periodicData: any[]): Promise<string> {
  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels: periodicData.map(p => p.point),
      datasets: [
        {
          label: 'Period Profit',
          data: periodicData.map(p => p.profit),
          backgroundColor: periodicData.map(p => p.profit >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
          borderColor: periodicData.map(p => p.profit >= 0 ? '#22c55e' : '#ef4444'),
          borderWidth: 1
        },
        {
          label: 'Cumulative Profit',
          data: periodicData.map(p => p.cumulativeProfit),
          type: 'line',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Profit Analysis',
          font: { size: 16 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + (Number(value) / 1000).toFixed(0) + 'K';
            }
          }
        }
      }
    }
  };
  
  return await createChartImage(config);
}

// Generate attendance chart (for weekly models)
async function generateAttendanceChart(periodicData: any[]): Promise<string | null> {
  const hasAttendance = periodicData.some(p => p.attendance !== undefined);
  if (!hasAttendance) return null;
  
  const config: ChartConfiguration = {
    type: 'line',
    data: {
      labels: periodicData.map(p => p.point),
      datasets: [
        {
          label: 'Weekly Attendance',
          data: periodicData.map(p => p.attendance || 0),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Attendance Projections',
          font: { size: 16 }
        },
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return Number(value).toLocaleString();
            }
          }
        }
      }
    }
  };
  
  return await createChartImage(config);
}

// Main export function
export async function exportRichPDF(data: RichReportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  
  // Title Page
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, pageWidth, 80, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text('FINANCIAL MODEL REPORT', pageWidth / 2, 35, { align: 'center' });
  
  doc.setFontSize(18);
  doc.text(data.project.name, pageWidth / 2, 55, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Model: ${data.model.name}`, pageWidth / 2, 100, { align: 'center' });
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageWidth / 2, 115, { align: 'center' });
  
  // Executive Summary
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('EXECUTIVE SUMMARY', margin, 30);
  
  const results = data.simulationResults;
  let yPos = 50;
  
  // Key metrics table
  const summaryData = [
    ['Total Revenue Projection', formatCurrency(results.totalRevenue)],
    ['Total Cost Projection', formatCurrency(results.totalCosts)],
    ['Total Profit Projection', formatCurrency(results.totalProfit)],
    ['Duration', `${results.duration} ${results.timeUnit}s`],
    ['Break-even Point', results.breakEvenPoint ? `${results.timeUnit} ${results.breakEvenPoint}` : 'Not achieved'],
    ['Initial Margin', `${results.initialMargin.toFixed(1)}%`],
    ['Final Period Margin', `${results.finalWeekMargin.toFixed(1)}%`]
  ];
  
  if (results.totalAttendance && results.totalAttendance > 0) {
    summaryData.push(['Total Projected Attendance', results.totalAttendance.toLocaleString()]);
  }
  
  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 6 },
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 70 }
    }
  });
  
  // Revenue Analysis Charts
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('REVENUE ANALYSIS', margin, 30);
  
  try {
    const revenueChart = await generateRevenueChart(results.periodicData);
    doc.addImage(revenueChart, 'PNG', margin, 50, pageWidth - 2 * margin, 100);
  } catch (error) {
    console.error('Revenue chart generation failed:', error);
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text('Revenue chart could not be generated', margin, 100);
  }
  
  // Revenue projections table
  const revenueTableData = results.periodicData.slice(0, 12).map((period: any) => [
    period.point,
    formatCurrency(period.revenue),
    formatCurrency(period.cumulativeRevenue),
    period.attendance ? period.attendance.toLocaleString() : 'N/A'
  ]);
  
  autoTable(doc, {
    startY: 170,
    head: [['Period', 'Revenue', 'Cumulative', 'Attendance']],
    body: revenueTableData,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  // Cost Analysis
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('COST ANALYSIS', margin, 30);
  
  try {
    const costChart = await generateCostChart(results.periodicData);
    doc.addImage(costChart, 'PNG', margin, 50, pageWidth - 2 * margin, 100);
  } catch (error) {
    console.error('Cost chart generation failed:', error);
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text('Cost chart could not be generated', margin, 100);
  }
  
  // Cost projections table
  const costTableData = results.periodicData.slice(0, 12).map((period: any) => [
    period.point,
    formatCurrency(period.costs),
    formatCurrency(period.cumulativeCosts)
  ]);
  
  autoTable(doc, {
    startY: 170,
    head: [['Period', 'Costs', 'Cumulative Costs']],
    body: costTableData,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' }
    }
  });
  
  // Profit Analysis
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('PROFITABILITY ANALYSIS', margin, 30);
  
  try {
    const profitChart = await generateProfitChart(results.periodicData);
    doc.addImage(profitChart, 'PNG', margin, 50, pageWidth - 2 * margin, 100);
  } catch (error) {
    console.error('Profit chart generation failed:', error);
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text('Profit chart could not be generated', margin, 100);
  }
  
  // Profit projections table
  const profitTableData = results.periodicData.slice(0, 12).map((period: any) => [
    period.point,
    formatCurrency(period.profit),
    formatCurrency(period.cumulativeProfit),
    period.revenue > 0 ? `${((period.profit / period.revenue) * 100).toFixed(1)}%` : '0%'
  ]);
  
  autoTable(doc, {
    startY: 170,
    head: [['Period', 'Profit', 'Cumulative Profit', 'Margin']],
    body: profitTableData,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  // Attendance Analysis (if applicable)
  if (results.totalAttendance && results.totalAttendance > 0) {
    doc.addPage();
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185);
    doc.text('ATTENDANCE ANALYSIS', margin, 30);
    
    try {
      const attendanceChart = await generateAttendanceChart(results.periodicData);
      if (attendanceChart) {
        doc.addImage(attendanceChart, 'PNG', margin, 50, pageWidth - 2 * margin, 100);
      }
    } catch (error) {
      console.error('Attendance chart generation failed:', error);
    }
    
    // Attendance projections table
    const attendanceTableData = results.periodicData.slice(0, 12)
      .filter((period: any) => period.attendance !== undefined)
      .map((period: any) => [
        period.point,
        period.attendance.toLocaleString(),
        formatCurrency((period.revenue / period.attendance) || 0)
      ]);
    
    if (attendanceTableData.length > 0) {
      autoTable(doc, {
        startY: 170,
        head: [['Period', 'Attendance', 'Revenue per Attendee']],
        body: attendanceTableData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' }
        }
      });
    }
  }
  
  // Model Assumptions Detail
  doc.addPage();
  doc.setFontSize(20);
  doc.setTextColor(41, 128, 185);
  doc.text('MODEL ASSUMPTIONS', margin, 30);
  
  let assumptionsY = 50;
  
  // Revenue Streams
  if (data.model.assumptions?.revenue) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Revenue Streams', margin, assumptionsY);
    assumptionsY += 15;
    
    const revenueData = data.model.assumptions.revenue.map(stream => [
      stream.name,
      formatCurrency(stream.value),
      stream.type || 'N/A',
      stream.frequency || 'Monthly'
    ]);
    
    autoTable(doc, {
      startY: assumptionsY,
      head: [['Stream', 'Value', 'Type', 'Frequency']],
      body: revenueData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });
    
    assumptionsY = (doc as any).lastAutoTable.finalY + 20;
  }
  
  // Cost Structure
  if (data.model.assumptions?.costs) {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Cost Structure', margin, assumptionsY);
    assumptionsY += 15;
    
    const costData = data.model.assumptions.costs.map(cost => [
      cost.name,
      formatCurrency(cost.value),
      cost.type || 'N/A',
      cost.category || 'General'
    ]);
    
    autoTable(doc, {
      startY: assumptionsY,
      head: [['Cost Item', 'Value', 'Type', 'Category']],
      body: costData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' }
      }
    });
  }
  
  // Download
  const fileName = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${data.model.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}