/**
 * Test script for Trivia Excel export
 */

import * as XLSX from 'xlsx';

/**
 * Generate an Excel file specifically for the Trivia product
 * with hardcoded values to ensure correct data.
 */
async function generateTriviaExcelReport() {
  try {
    console.log('[TriviaExport] Generating Trivia Excel report');

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Format date for file naming
    const exportDate = new Date();
    const formattedDate = exportDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Create file name
    const fileName = `Trivia_Export_${formattedDate}.xlsx`;

    // Add sheets to the workbook
    addSummarySheet(workbook);
    addAssumptionsSheet(workbook);
    addForecastVsActualSheet(workbook);
    addWeeklyPerformanceSheet(workbook);
    addWeeklyAveragesSheet(workbook);
    addFinancialSummarySheet(workbook);

    // Write the Excel file
    XLSX.writeFile(workbook, fileName);
    console.log('[TriviaExport] Excel report generated:', fileName);
    return fileName;
  } catch (error) {
    console.error('[TriviaExport] Error generating Excel report:', error);
    throw error;
  }
}

/**
 * Add the Summary sheet to the workbook
 */
function addSummarySheet(workbook) {
  console.log('[TriviaExport] Adding Summary sheet');

  // Create the summary data
  const summaryData = [
    ['FORTRESS MODELER - PROJECT SUMMARY', ''],
    [''],
    ['PROJECT INFORMATION', ''],
    ['Product Name', 'Trivia Night'],
    ['Project Name', 'Trivia'],
    ['Export Date', new Date().toLocaleDateString()],
    ['Product Type', 'Weekly Event'],
    [''],
    ['FINANCIAL SUMMARY', ''],
    ['Total Forecast Revenue', '$30,000.00'],
    ['Total Forecast Profit', '$14,400.00'],
    ['Forecast Profit Margin', '48.0%'],
    ['Actual Revenue (if available)', 'No actuals entered'],
    ['Actual Profit (if available)', 'No actuals entered'],
    ['Variance ($)', 'N/A'],
    ['Variance (%)', 'N/A'],
    ['Breakeven Point', 'Week 1'],
    [''],
    ['PERFORMANCE INDICATORS', ''],
    ['Growth Rate', '0.0%'],
    ['Health Score', '83'],
    ['Risk Level', 'Low']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  const columnWidths = [
    { wch: 25 },  // A
    { wch: 25 }   // B
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
}

/**
 * Add the Assumptions sheet to the workbook
 */
function addAssumptionsSheet(workbook) {
  console.log('[TriviaExport] Adding Assumptions sheet');

  // Create the assumptions data
  const assumptionsData = [
    ['FORTRESS MODELER - MODEL ASSUMPTIONS', ''],
    [''],
    ['GROWTH ASSUMPTIONS', ''],
    ['Growth Model', 'WeeklyEvent'],
    ['Weekly Growth Rate', '0.0%'],
    ['Initial Weekly Attendance', '100'],
    ['Weeks in Model', '12'],
    [''],
    ['REVENUE ASSUMPTIONS', ''],
    ['Ticket Price per Attendee', '$0.00'],
    ['F&B Spend per Attendee', '$20.00'],
    ['Merchandise Spend per Attendee', '$5.00'],
    ['Total Revenue per Attendee', '$25.00'],
    [''],
    ['COST ASSUMPTIONS', ''],
    ['F&B COGS', '30.0%'],
    ['Merchandise COGS', '40.0%'],
    ['Staff Count', '0'],
    ['Avg Cost per Staff', '$0.00'],
    ['Other Fixed/Recurring Costs', 'None'],
    [''],
    ['MARKETING ASSUMPTIONS', ''],
    ['Facebook Ads Budget', '$500.00'],
    ['Total Marketing Budget', '$500.00']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(assumptionsData);

  // Set column widths
  const columnWidths = [
    { wch: 30 },  // A
    { wch: 20 }   // B
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assumptions');
}

/**
 * Add the Forecast vs Actual sheet to the workbook
 */
function addForecastVsActualSheet(workbook) {
  console.log('[TriviaExport] Adding Forecast vs Actual sheet');

  // Create the forecast vs actual data
  const forecastVsActualData = [
    ['FORTRESS MODELER - FORECAST VS ACTUAL', '', '', '', ''],
    [''],
    ['Metric', 'Forecast Value', 'Actual Value', 'Variance ($)', 'Variance (%)'],
    ['Revenue', '$30,000.00', 'No actuals', 'N/A', 'N/A'],
    ['Marketing Spend', '$500.00', 'No actuals', 'N/A', 'N/A'],
    ['Attendance', '1,200', 'No actuals', 'N/A', 'N/A'],
    ['Profit', '$14,400.00', 'No actuals', 'N/A', 'N/A']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(forecastVsActualData);

  // Set column widths
  const columnWidths = [
    { wch: 20 },  // A - Metric
    { wch: 15 },  // B - Forecast Value
    { wch: 15 },  // C - Actual Value
    { wch: 15 },  // D - Variance ($)
    { wch: 15 }   // E - Variance (%)
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecast vs Actual');
}

/**
 * Add the Weekly Performance sheet to the workbook
 */
function addWeeklyPerformanceSheet(workbook) {
  console.log('[TriviaExport] Adding Weekly Performance sheet');

  // Create the weekly performance data
  const weeklyPerformanceData = [
    ['FORTRESS MODELER - WEEKLY PERFORMANCE', '', '', ''],
    [''],
    ['Week', 'Forecast Attendance', 'Forecast Revenue', 'Notes'],
    ['Week 1', '100', '$2,500.00', 'No actuals entered'],
    ['Week 2', '100', '$2,500.00', ''],
    ['Week 3', '100', '$2,500.00', ''],
    ['Week 4', '100', '$2,500.00', ''],
    ['Week 5', '100', '$2,500.00', ''],
    ['Week 6', '100', '$2,500.00', ''],
    ['Week 7', '100', '$2,500.00', ''],
    ['Week 8', '100', '$2,500.00', ''],
    ['Week 9', '100', '$2,500.00', ''],
    ['Week 10', '100', '$2,500.00', ''],
    ['Week 11', '100', '$2,500.00', ''],
    ['Week 12', '100', '$2,500.00', ''],
    [''],
    ['TOTAL', '1,200', '$30,000.00', '']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(weeklyPerformanceData);

  // Set column widths
  const columnWidths = [
    { wch: 10 },  // A - Week
    { wch: 20 },  // B - Forecast Attendance
    { wch: 20 },  // C - Forecast Revenue
    { wch: 25 }   // D - Notes
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Performance');
}

/**
 * Add the Weekly Averages sheet to the workbook
 */
function addWeeklyAveragesSheet(workbook) {
  console.log('[TriviaExport] Adding Weekly Averages sheet');

  // Create the weekly averages data
  const weeklyAveragesData = [
    ['FORTRESS MODELER - FORECAST AVERAGES (PER WEEK)', '', ''],
    [''],
    ['Metric', 'Average Value', 'Notes'],
    ['Avg. Revenue', '$2,500.00', ''],
    ['Avg. Costs', '$1,300.00', ''],
    ['Avg. Profit', '$1,200.00', ''],
    ['Avg. Attendance', '100', ''],
    ['Avg. Revenue per Attendee', '$25.00', '']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(weeklyAveragesData);

  // Set column widths
  const columnWidths = [
    { wch: 25 },  // A - Metric
    { wch: 15 },  // B - Average Value
    { wch: 25 }   // C - Notes
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Weekly Averages');
}

/**
 * Add the Financial Summary sheet to the workbook
 */
function addFinancialSummarySheet(workbook) {
  console.log('[TriviaExport] Adding Financial Summary sheet');

  // Create the financial summary data
  const financialSummaryData = [
    ['FORTRESS MODELER - FINANCIAL SUMMARY', '', '', ''],
    [''],
    ['REVENUE SUMMARY', '', '', ''],
    ['Revenue Stream', 'Per Attendee', 'Total Forecast', 'Notes'],
    ['Ticket Sales', '$0.00', '$0.00', ''],
    ['Food & Beverage', '$20.00', '$24,000.00', ''],
    ['Merchandise', '$5.00', '$6,000.00', ''],
    ['Sponsorship', '$0.00', '$0.00', ''],
    ['Other Revenue', '$0.00', '$0.00', ''],
    ['TOTAL REVENUE', '$25.00', '$30,000.00', ''],
    [''],
    ['COST SUMMARY', '', '', ''],
    ['Cost Category', 'Weekly Amount', 'Total Forecast', 'Notes'],
    ['F&B COGS (30%)', '', '$7,200.00', '30% of F&B revenue'],
    ['Merchandise COGS (40%)', '', '$2,400.00', '40% of Merchandise revenue'],
    ['Staff Costs', '$0.00', '$0.00', '0 staff at $0.00 each'],
    ['Marketing', '$500.00', '$500.00', 'Facebook Ads'],
    ['Other Costs', '$0.00', '$0.00', ''],
    ['TOTAL COSTS', '$841.67', '$15,600.00', ''],
    [''],
    ['PROFIT SUMMARY', '', '', ''],
    ['Metric', 'Amount', 'Percentage', 'Notes'],
    ['Total Revenue', '$30,000.00', '', ''],
    ['Total Costs', '$15,600.00', '', ''],
    ['Total Profit', '$14,400.00', '', ''],
    ['Profit Margin', '', '48.0%', ''],
    ['Breakeven Point', 'Week 1', '', 'Achieved']
  ];

  // Create the worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(financialSummaryData);

  // Set column widths
  const columnWidths = [
    { wch: 25 },  // A - Category
    { wch: 15 },  // B - Per Attendee/Weekly Amount
    { wch: 15 },  // C - Total Forecast
    { wch: 25 }   // D - Notes
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Summary');
}

// Run the export function
generateTriviaExcelReport()
  .then(fileName => {
    console.log(`Excel file generated successfully: ${fileName}`);
  })
  .catch(error => {
    console.error('Error generating Excel file:', error);
  });
