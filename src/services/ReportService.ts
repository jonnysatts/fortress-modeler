import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Project, SpecialEventForecast, SpecialEventActual } from '@/lib/db';

export interface SingleEventReport {
  project: Project;
  forecast?: SpecialEventForecast;
  actual?: SpecialEventActual;
}

export interface MultiEventSummary {
  project: Project;
  actual?: SpecialEventActual;
}

/**
 * Utility service for generating event reports in PDF or CSV format.
 */
export class ReportService {
  private static sumForecastRevenue(f?: SpecialEventForecast): number {
    if (!f) return 0;
    return (
      (f.forecast_fnb_revenue || 0) +
      (f.forecast_merch_revenue || 0) +
      (f.forecast_sponsorship_income || 0) +
      (f.forecast_ticket_sales || 0) +
      (f.forecast_other_income || 0)
    );
  }

  private static sumActualRevenue(a?: SpecialEventActual): number {
    if (!a) return 0;
    return (
      (a.actual_fnb_revenue || 0) +
      (a.actual_merch_revenue || 0) +
      (a.actual_sponsorship_income || 0) +
      (a.actual_ticket_sales || 0) +
      (a.actual_other_income || 0)
    );
  }

  private static calcROI(revenue: number, costs: number): number {
    if (!costs) return 0;
    return ((revenue - costs) / costs) * 100;
  }

  private static async createChart(forecast: number, actual: number): Promise<string | null> {
    if (typeof document === 'undefined') return null;
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Forecast', 'Actual'],
        datasets: [
          {
            label: 'Revenue',
            data: [forecast, actual],
            backgroundColor: ['#60a5fa', '#10b981'],
          },
        ],
      },
      options: { responsive: false, plugins: { legend: { display: false } } },
    });
    const url = canvas.toDataURL('image/png');
    return url;
  }

  static async generateSingleEventPDF(data: SingleEventReport): Promise<void> {
    const doc = new jsPDF();
    const margin = 20;
    doc.setFontSize(18);
    doc.text(`${data.project.name} Event Report`, margin, 30);

    const metadata = [
      ['Event Type', data.project.event_type || 'N/A'],
      ['Event Date', data.project.event_date ? format(data.project.event_date, 'PPP') : 'N/A'],
      ['Event End', data.project.event_end_date ? format(data.project.event_end_date, 'PPP') : 'N/A'],
    ];
    autoTable(doc, { startY: 40, head: [['Field', 'Value']], body: metadata, theme: 'grid', styles: { fontSize: 10 } });

    const forecastRevenue = this.sumForecastRevenue(data.forecast);
    const forecastCosts = data.forecast?.forecast_total_costs || 0;
    const actualRevenue = this.sumActualRevenue(data.actual);
    const actualCosts = data.actual?.actual_total_costs || 0;
    const roi = this.calcROI(actualRevenue || forecastRevenue, actualCosts || forecastCosts);

    const body = [
      ['Revenue', forecastRevenue.toFixed(2), actualRevenue.toFixed(2)],
      ['Costs', forecastCosts.toFixed(2), actualCosts.toFixed(2)],
      ['ROI (%)', roi.toFixed(2), ''],
    ];
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Metric', 'Forecast', 'Actual']],
      body,
      theme: 'grid',
      styles: { fontSize: 10 },
    });

    const chartUrl = await this.createChart(forecastRevenue, actualRevenue);
    if (chartUrl) {
      const y = (doc as any).lastAutoTable.finalY + 10;
      doc.addImage(chartUrl, 'PNG', margin, y, 170, 80);
    }

    const notes = data.actual?.notes || data.forecast?.notes;
    if (notes) {
      const y = (doc as any).lastAutoTable.finalY + 100;
      doc.text('Notes:', margin, y);
      doc.text(notes, margin, y + 10);
    }

    doc.save(`${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Event_Report.pdf`);
  }

  static generateSingleEventCSV(data: SingleEventReport): void {
    const forecastRevenue = this.sumForecastRevenue(data.forecast);
    const forecastCosts = data.forecast?.forecast_total_costs || 0;
    const actualRevenue = this.sumActualRevenue(data.actual);
    const actualCosts = data.actual?.actual_total_costs || 0;
    const roi = this.calcROI(actualRevenue || forecastRevenue, actualCosts || forecastCosts);

    const rows = [
      ['Project', data.project.name],
      ['Event Type', data.project.event_type || ''],
      ['Event Date', data.project.event_date ? format(data.project.event_date, 'yyyy-MM-dd') : ''],
      ['Forecast Revenue', forecastRevenue.toString()],
      ['Forecast Costs', forecastCosts.toString()],
      ['Actual Revenue', actualRevenue.toString()],
      ['Actual Costs', actualCosts.toString()],
      ['ROI (%)', roi.toFixed(2)],
      ['Notes', (data.actual?.notes || data.forecast?.notes || '').replace(/\n/g, ' ')],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_Event_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static async generateMultiEventSummaryPDF(events: MultiEventSummary[]): Promise<void> {
    const doc = new jsPDF();
    const margin = 20;
    doc.setFontSize(18);
    doc.text('Event Portfolio Summary', margin, 30);

    const rows: any[] = [];
    let totalProfit = 0;
    let totalCosts = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    events.forEach(e => {
      const revenue = this.sumActualRevenue(e.actual);
      const costs = e.actual?.actual_total_costs || 0;
      const roi = this.calcROI(revenue, costs);
      rows.push([
        e.project.name,
        e.project.event_date ? format(e.project.event_date, 'PPP') : '',
        roi ? roi.toFixed(2) + '%' : '0%',
        e.actual?.success_rating != null ? e.actual.success_rating.toString() : 'N/A',
      ]);
      totalProfit += revenue - costs;
      totalCosts += costs;
      if (e.actual?.success_rating != null) {
        ratingSum += e.actual.success_rating;
        ratingCount++;
      }
    });

    autoTable(doc, { startY: 40, head: [['Event', 'Date', 'ROI', 'Rating']], body: rows, theme: 'grid', styles: { fontSize: 10 } });

    const aggROI = this.calcROI(totalProfit + totalCosts, totalCosts);
    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
    const y = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Aggregated ROI: ${aggROI.toFixed(2)}%`, margin, y);
    if (ratingCount > 0) {
      doc.text(`Average Success Rating: ${avgRating.toFixed(1)}`, margin, y + 10);
    }

    doc.save('Event_Summary_Report.pdf');
  }

  static generateMultiEventSummaryCSV(events: MultiEventSummary[]): void {
    const rows = [['Event', 'Date', 'ROI', 'Rating']];
    let totalProfit = 0;
    let totalCosts = 0;
    let ratingSum = 0;
    let ratingCount = 0;
    events.forEach(e => {
      const revenue = this.sumActualRevenue(e.actual);
      const costs = e.actual?.actual_total_costs || 0;
      const roi = this.calcROI(revenue, costs);
      rows.push([
        e.project.name,
        e.project.event_date ? format(e.project.event_date, 'yyyy-MM-dd') : '',
        roi.toFixed(2),
        e.actual?.success_rating != null ? e.actual.success_rating.toString() : ''
      ]);
      totalProfit += revenue - costs;
      totalCosts += costs;
      if (e.actual?.success_rating != null) {
        ratingSum += e.actual.success_rating;
        ratingCount++;
      }
    });
    const aggROI = this.calcROI(totalProfit + totalCosts, totalCosts);
    const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 0;
    rows.push([]);
    rows.push(['Aggregated ROI', aggROI.toFixed(2)]);
    if (ratingCount > 0) rows.push(['Average Rating', avgRating.toFixed(1)]);

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Event_Summary_Report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export default ReportService;

