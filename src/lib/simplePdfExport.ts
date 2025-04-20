// Enhanced PDF Export Implementation
// This uses a CDN version of pdfmake to avoid bundling issues

import { createSampleChart, createSamplePerformanceChart } from './chartUtils';

// Helper function to load a script
function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const existingScript = document.querySelector(`script[src="${url}"]`);
    if (existingScript) {
      console.log(`Script already loaded: ${url}`);
      resolve();
      return;
    }

    // Check for browser environment
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
      // In non-browser environment, simply resolve
      resolve();
    } else {
      // Create and load the script
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => {
        console.log(`Script loaded: ${url}`);
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    }
  });
}

// Track if scripts are loaded
let scriptsLoaded = false;

// Load required scripts
async function loadPdfScripts(): Promise<void> {
  if (scriptsLoaded) {
    console.log('PDF scripts already loaded');
    return;
  }

  try {
    // Load pdfmake first
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js');
    // Then load fonts
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js');

    scriptsLoaded = true;
    console.log('PDF scripts loaded successfully');
  } catch (error) {
    console.error('Error loading PDF scripts:', error);
    throw error;
  }
}

/**
 * Generate and download a PDF report
 * @param dataOrDocDef The data to include in the PDF or a complete document definition
 * @param reportTitle The title of the report
 */
export async function generatePdfReport(dataOrDocDef: any, reportTitle: string): Promise<void> {
  // Generate sample charts for demonstration
  let marketingChart = '';
  let performanceChart = '';

  try {
    // If we have real data, use it to create the charts
    if ((reportTitle === 'Full Export' || reportTitle === 'Direct Export' ||
         reportTitle === 'Hardcoded Export' || reportTitle === 'Final Export') &&
        dataOrDocDef && typeof dataOrDocDef === 'object') {
      // Check if we have Product Data
      if (dataOrDocDef['Product Data'] && dataOrDocDef['Product Data'].marketingChannels) {
        console.log('[PDF] Creating chart from Product Data:', dataOrDocDef['Product Data']);
        const channelData = dataOrDocDef['Product Data'].marketingChannels.map((channel: any) => ({
          name: channel.name,
          value: channel.actual || 0
        }));

        marketingChart = await createSimpleChartImage(channelData, {
          title: 'Marketing Channel Performance',
          width: 600,
          height: 300
        });

        if (dataOrDocDef['Product Data'].performanceData &&
            dataOrDocDef['Product Data'].performanceData.periodPerformance) {
          console.log('[PDF] Creating period performance chart from:', dataOrDocDef['Product Data'].performanceData.periodPerformance);
          const periodData = dataOrDocDef['Product Data'].performanceData.periodPerformance.map((period: any) => ({
            name: period.name,
            value: period.actual || 0
          }));

          performanceChart = await createSimpleChartImage(periodData, {
            title: 'Weekly Performance',
            width: 600,
            height: 300,
            colors: ['#10B981', '#FBBF24', '#10B981', '#EF4444']
          });
        }
      } else {
        // Fallback to sample charts
        marketingChart = await createSampleChart();
        performanceChart = await createSamplePerformanceChart();
      }
    } else {
      // Fallback to sample charts
      marketingChart = await createSampleChart();
      performanceChart = await createSamplePerformanceChart();
    }
  } catch (error) {
    console.error('Error generating charts:', error);
    // Fallback to sample charts
    try {
      marketingChart = await createSampleChart();
      performanceChart = await createSamplePerformanceChart();
    } catch (e) {
      console.error('Error generating fallback charts:', e);
    }
  }
  try {
    console.log('Generating PDF report:', reportTitle);

    // Load required scripts
    await loadPdfScripts();

    // Access the global pdfMake object
    const pdfMake = (window as any).pdfMake;

    if (!pdfMake) {
      throw new Error('pdfMake not available after loading scripts');
    }

    // Check if we received a complete document definition or just data
    const isCompleteDocDef = dataOrDocDef && dataOrDocDef.content && Array.isArray(dataOrDocDef.content);

    let docDefinition;

    if (isCompleteDocDef) {
      // Use the provided document definition
      docDefinition = dataOrDocDef;
      console.log('Using provided document definition');
    } else if ((reportTitle === 'Full Export' || reportTitle === 'Direct Export' ||
                reportTitle === 'Hardcoded Export' || reportTitle === 'Final Export') &&
               dataOrDocDef && typeof dataOrDocDef === 'object') {
      // Special handling for Full Export
      console.log('Creating enhanced document definition for Full Export');

      // Create base document definition with enhanced styling
      docDefinition = {
        content: [
          // Header with logo and date
          {
            columns: [
              {
                text: 'Fortress Modeler',
                fontSize: 22,
                bold: true,
                color: '#1A2942',
                margin: [0, 0, 0, 5]
              },
              {
                text: new Date().toLocaleDateString(),
                alignment: 'right',
                fontSize: 12,
                margin: [0, 10, 0, 0]
              }
            ]
          },
          // Title with underline
          {
            text: reportTitle,
            fontSize: 28,
            bold: true,
            color: '#1A2942',
            alignment: 'center',
            margin: [0, 20, 0, 10]
          },
          // Decorative line
          {
            canvas: [
              {
                type: 'line',
                x1: 50, y1: 0,
                x2: 545, y2: 0,
                lineWidth: 2,
                lineColor: '#1A2942'
              }
            ],
            margin: [0, 0, 0, 20]
          }
        ],
        defaultStyle: {
          fontSize: 10
        },
        styles: {
          header: {
            fontSize: 20,
            bold: true,
            color: '#1A2942',
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 18,
            bold: true,
            color: '#1A2942',
            margin: [0, 20, 0, 10]
          },
          subsubheader: {
            fontSize: 16,
            bold: true,
            color: '#1A2942',
            margin: [0, 15, 0, 8]
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: '#FFFFFF',
            fillColor: '#1A2942'
          },
          positiveValue: {
            color: '#10B981'
          },
          negativeValue: {
            color: '#EF4444'
          },
          warningValue: {
            color: '#FBBF24'
          },
          footer: {
            fontSize: 10,
            color: '#666666',
            alignment: 'center',
            italics: true
          }
        },
        pageMargins: [40, 40, 40, 60],
        footer: function(currentPage: number, pageCount: number) {
          return {
            text: `Page ${currentPage} of ${pageCount} | Generated by Fortress Modeler`,
            alignment: 'center',
            fontSize: 8,
            margin: [0, 10, 0, 0],
            color: '#666666'
          };
        }
      };

      // Process each section in the Full Export data
      for (const [sectionKey, sectionData] of Object.entries(dataOrDocDef)) {
        if (sectionData && typeof sectionData === 'object' && Object.keys(sectionData).length > 0) {
          // Add a section header with page break (except for the first section)
          docDefinition.content.push({
            text: sectionKey,
            style: 'subheader',
            margin: [0, 20, 0, 15],
            pageBreak: docDefinition.content.length > 3 ? 'before' : undefined
          });

          // Add project name if available
          if (sectionData.projectName) {
            docDefinition.content.push({
              text: `Project: ${sectionData.projectName}`,
              fontSize: 12,
              margin: [0, 0, 0, 10]
            });
          }

          // Add executive summary section with enhanced styling
          if (sectionData.summary) {
            // Add executive summary header with decorative elements
            docDefinition.content.push(
              {
                text: 'Executive Summary',
                style: 'subheader',
                margin: [0, 15, 0, 10]
              },
              // Add decorative line under the header
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0, y1: 0,
                    x2: 150, y2: 0,
                    lineWidth: 3,
                    lineColor: '#10B981'
                  }
                ],
                margin: [0, 0, 0, 15]
              }
            );

            // Create a summary box with key metrics
            docDefinition.content.push({
              table: {
                widths: ['*', '*', '*'],
                body: [
                  [
                    {
                      stack: [
                        { text: 'TOTAL FORECAST', fontSize: 10, bold: true, color: '#666666' },
                        {
                          text: sectionData.formattedSummary?.totalForecast || `$${sectionData.summary.totalForecast.toLocaleString()}`,
                          fontSize: 18,
                          bold: true,
                          color: '#1A2942',
                          margin: [0, 5, 0, 0]
                        }
                      ],
                      alignment: 'center',
                      margin: [0, 10, 0, 10]
                    },
                    {
                      stack: [
                        { text: 'TOTAL ACTUAL', fontSize: 10, bold: true, color: '#666666' },
                        {
                          text: sectionData.formattedSummary?.totalActual || `$${sectionData.summary.totalActual.toLocaleString()}`,
                          fontSize: 18,
                          bold: true,
                          color: '#1A2942',
                          margin: [0, 5, 0, 0]
                        }
                      ],
                      alignment: 'center',
                      margin: [0, 10, 0, 10]
                    },
                    {
                      stack: [
                        { text: 'UTILIZATION', fontSize: 10, bold: true, color: '#666666' },
                        {
                          text: sectionData.formattedSummary?.percentUtilized || `${sectionData.summary.percentUtilized}%`,
                          fontSize: 18,
                          bold: true,
                          color: sectionData.summary.percentUtilized >= 90 ? '#10B981' :
                                 sectionData.summary.percentUtilized >= 75 ? '#FBBF24' : '#EF4444',
                          margin: [0, 5, 0, 0]
                        }
                      ],
                      alignment: 'center',
                      margin: [0, 10, 0, 10]
                    }
                  ]
                ]
              },
              layout: {
                hLineWidth: function() { return 1; },
                vLineWidth: function() { return 1; },
                hLineColor: function() { return '#EEEEEE'; },
                vLineColor: function() { return '#EEEEEE'; },
                fillColor: function() { return '#F9FAFB'; }
              },
              margin: [0, 0, 0, 20]
            });

            // Add a brief description
            docDefinition.content.push({
              text: 'This report provides a comprehensive overview of marketing performance and channel effectiveness.',
              fontSize: 11,
              italics: true,
              margin: [0, 0, 0, 15]
            });
          }

          // Add marketing channels if available
          if (sectionData.marketingChannels && Array.isArray(sectionData.marketingChannels)) {
            // Add marketing channels header with decorative elements
            docDefinition.content.push(
              {
                text: 'Marketing Channels',
                style: 'subheader',
                margin: [0, 15, 0, 10]
              },
              // Add decorative line under the header
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0, y1: 0,
                    x2: 150, y2: 0,
                    lineWidth: 3,
                    lineColor: '#1A2942'
                  }
                ],
                margin: [0, 0, 0, 15]
              }
            );

            // Create a table for marketing channels
            const channelTableBody = [
              // Header row
              [
                { text: 'Channel', style: 'tableHeader' },
                { text: 'Type', style: 'tableHeader' },
                { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
                { text: 'Actual', style: 'tableHeader', alignment: 'right' },
                { text: 'Variance', style: 'tableHeader', alignment: 'right' }
              ]
            ];

            // Add data rows
            sectionData.marketingChannels.forEach(channel => {
              channelTableBody.push([
                { text: channel.name, bold: true },
                { text: channel.type },
                { text: `$${channel.forecast.toLocaleString()}`, alignment: 'right' },
                { text: `$${channel.actual.toLocaleString()}`, alignment: 'right' },
                {
                  text: `$${channel.variance.toLocaleString()}`,
                  alignment: 'right',
                  color: channel.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                }
              ]);
            });

            docDefinition.content.push({
              table: {
                headerRows: 1,
                widths: ['*', '*', 'auto', 'auto', 'auto'],
                body: channelTableBody
              },
              layout: {
                fillColor: function(rowIndex) {
                  if (rowIndex === 0) return '#1A2942';
                  return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                },
                hLineWidth: function(i, node) {
                  return (i === 0 || i === node.table.body.length) ? 2 : 1;
                },
                vLineWidth: function(i, node) {
                  return (i === 0 || i === node.table.widths.length) ? 0 : 1;
                },
                hLineColor: function(i, node) {
                  return (i === 0 || i === node.table.body.length) ? '#1A2942' : '#CCCCCC';
                },
                vLineColor: function(i) {
                  return '#CCCCCC';
                }
              },
              margin: [0, 0, 0, 15]
            });

            // Add marketing chart if available
            if (marketingChart) {
              docDefinition.content.push({
                image: marketingChart,
                width: 500,
                alignment: 'center',
                margin: [0, 10, 0, 20]
              });
            }
          }

          // Add performance data if available
          if (sectionData.performanceData) {
            // Add channel performance
            if (sectionData.performanceData.channelPerformance && sectionData.performanceData.channelPerformance.length > 0) {
              // Add channel performance header with decorative elements
              docDefinition.content.push(
                {
                  text: 'Channel Performance',
                  style: 'subheader',
                  margin: [0, 15, 0, 10],
                  pageBreak: 'before'
                },
                // Add decorative line under the header
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0, y1: 0,
                      x2: 150, y2: 0,
                      lineWidth: 3,
                      lineColor: '#6366F1' // Purple
                    }
                  ],
                  margin: [0, 0, 0, 15]
                }
              );

              // Create a table for channel performance
              const channelPerfTableBody = [
                // Header row
                [
                  { text: 'Channel', style: 'tableHeader' },
                  { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
                  { text: 'Actual', style: 'tableHeader', alignment: 'right' },
                  { text: 'Variance', style: 'tableHeader', alignment: 'right' },
                  { text: 'Variance %', style: 'tableHeader', alignment: 'right' }
                ]
              ];

              // Add data rows
              sectionData.performanceData.channelPerformance.forEach(item => {
                const variancePercent = item.forecast > 0 ? (item.variance / item.forecast) * 100 : 0;

                channelPerfTableBody.push([
                  { text: item.name, bold: true },
                  { text: `$${item.forecast.toLocaleString()}`, alignment: 'right' },
                  { text: `$${item.actual.toLocaleString()}`, alignment: 'right' },
                  {
                    text: `$${item.variance.toLocaleString()}`,
                    alignment: 'right',
                    color: item.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                  },
                  {
                    text: `${variancePercent.toFixed(1)}%`,
                    alignment: 'right',
                    color: variancePercent >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                  }
                ]);
              });

              docDefinition.content.push({
                table: {
                  headerRows: 1,
                  widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                  body: channelPerfTableBody
                },
                layout: {
                  fillColor: function(rowIndex) {
                    return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                  }
                },
                margin: [0, 0, 0, 15]
              });
            }

            // Add period performance
            if (sectionData.performanceData.periodPerformance && sectionData.performanceData.periodPerformance.length > 0) {
              // Add period performance header with decorative elements
              docDefinition.content.push(
                {
                  text: 'Period Performance',
                  style: 'subheader',
                  margin: [0, 30, 0, 10]
                },
                // Add decorative line under the header
                {
                  canvas: [
                    {
                      type: 'line',
                      x1: 0, y1: 0,
                      x2: 150, y2: 0,
                      lineWidth: 3,
                      lineColor: '#10B981' // Green
                    }
                  ],
                  margin: [0, 0, 0, 15]
                }
              );

              // Create a table for period performance
              const periodPerfTableBody = [
                // Header row
                [
                  { text: 'Period', style: 'tableHeader' },
                  { text: 'Forecast', style: 'tableHeader', alignment: 'right' },
                  { text: 'Actual', style: 'tableHeader', alignment: 'right' },
                  { text: 'Variance', style: 'tableHeader', alignment: 'right' },
                  { text: 'Variance %', style: 'tableHeader', alignment: 'right' }
                ]
              ];

              // Add data rows
              sectionData.performanceData.periodPerformance.forEach(item => {
                const variancePercent = item.forecast > 0 ? (item.variance / item.forecast) * 100 : 0;

                periodPerfTableBody.push([
                  { text: item.name, bold: true },
                  { text: `$${item.forecast.toLocaleString()}`, alignment: 'right' },
                  { text: `$${item.actual.toLocaleString()}`, alignment: 'right' },
                  {
                    text: `$${item.variance.toLocaleString()}`,
                    alignment: 'right',
                    color: item.variance >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                  },
                  {
                    text: `${variancePercent.toFixed(1)}%`,
                    alignment: 'right',
                    color: variancePercent >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                  }
                ]);
              });

              docDefinition.content.push({
                table: {
                  headerRows: 1,
                  widths: ['*', 'auto', 'auto', 'auto', 'auto'],
                  body: periodPerfTableBody
                },
                layout: {
                  fillColor: function(rowIndex) {
                    if (rowIndex === 0) return '#1A2942';
                    return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
                  },
                  hLineWidth: function(i, node) {
                    return (i === 0 || i === node.table.body.length) ? 2 : 1;
                  },
                  vLineWidth: function(i, node) {
                    return (i === 0 || i === node.table.widths.length) ? 0 : 1;
                  },
                  hLineColor: function(i, node) {
                    return (i === 0 || i === node.table.body.length) ? '#1A2942' : '#CCCCCC';
                  },
                  vLineColor: function(i) {
                    return '#CCCCCC';
                  }
                },
                margin: [0, 0, 0, 15]
              });

              // Add performance chart if available
              if (performanceChart) {
                docDefinition.content.push({
                  image: performanceChart,
                  width: 500,
                  alignment: 'center',
                  margin: [0, 10, 0, 20]
                });
              }
            }

            // Add a conclusion section
            docDefinition.content.push(
              {
                text: 'Conclusion & Recommendations',
                style: 'subheader',
                margin: [0, 30, 0, 10]
              },
              // Add decorative line under the header
              {
                canvas: [
                  {
                    type: 'line',
                    x1: 0, y1: 0,
                    x2: 200, y2: 0,
                    lineWidth: 3,
                    lineColor: '#EF4444' // Red
                  }
                ],
                margin: [0, 0, 0, 15]
              },
              {
                text: 'Based on the performance data, the following recommendations are provided:',
                margin: [0, 0, 0, 10]
              },
              {
                ul: [
                  'Increase budget allocation for top-performing channels',
                  'Review underperforming channels and consider optimization strategies',
                  'Monitor weekly performance trends to identify opportunities for improvement',
                  'Consider A/B testing for channels with high variance'
                ],
                margin: [0, 0, 0, 20]
              }
            );
          }
        }
      }

      // Add footer
      docDefinition.content.push({
        text: 'Generated by Fortress Modeler',
        style: 'footer',
        margin: [0, 30, 0, 0]
      });
    } else {
      // Create a default document definition from the data
      docDefinition = {
        content: [
          {
            text: 'Fortress Modeler',
            fontSize: 10,
            color: '#666666',
            alignment: 'right'
          },
          {
            text: reportTitle,
            fontSize: 24,
            bold: true,
            color: '#1A2942',
            margin: [0, 10, 0, 20]
          },
          {
            text: `Generated: ${new Date().toLocaleString()}`,
            fontSize: 12,
            margin: [0, 0, 0, 20]
          },
          {
            text: 'Report Data:',
            fontSize: 14,
            bold: true,
            color: '#1A2942',
            margin: [0, 0, 0, 10]
          },
          {
            text: JSON.stringify(dataOrDocDef, null, 2),
            fontSize: 10
          }
        ],
        defaultStyle: {
          fontSize: 10
        },
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            color: '#1A2942',
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 14,
            bold: true,
            color: '#1A2942',
            margin: [0, 10, 0, 5]
          }
        }
      };
      console.log('Created default document definition');
    }

    // Generate and download PDF
    console.log('Creating PDF with pdfMake...');
    pdfMake.createPdf(docDefinition).download(`${reportTitle.replace(/\\s+/g, '_')}.pdf`);
    console.log('PDF download triggered');

  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}
