import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generatePdfReport } from '@/lib/simplePdfExport';

interface TestPdfButtonProps {
  className?: string;
}

const TestPdfButton: React.FC<TestPdfButtonProps> = ({ className }) => {
  const handleClick = async () => {
    try {
      // Create some test data
      const testData = {
        title: 'Test PDF Report',
        date: new Date().toISOString(),
        items: [
          { name: 'Item 1', value: 100, status: 'Active' },
          { name: 'Item 2', value: 200, status: 'Pending' },
          { name: 'Item 3', value: 300, status: 'Completed' }
        ],
        summary: {
          total: 600,
          average: 200,
          percentChange: 15.5
        },
        chartData: [
          { month: 'Jan', revenue: 1000, expenses: 700 },
          { month: 'Feb', revenue: 1500, expenses: 800 },
          { month: 'Mar', revenue: 1200, expenses: 750 },
          { month: 'Apr', revenue: 1800, expenses: 900 }
        ]
      };

      // Generate the PDF with a custom document definition
      const customDocDef = {
        content: [
          // Header with logo placeholder
          {
            columns: [
              {
                text: 'Fortress Modeler',
                style: 'header',
                margin: [0, 0, 0, 10]
              },
              {
                text: new Date().toLocaleDateString(),
                alignment: 'right',
                margin: [0, 10, 0, 0]
              }
            ]
          },
          // Title
          {
            text: 'Test PDF Report',
            style: 'title',
            margin: [0, 20, 0, 20]
          },
          // Summary section
          {
            text: 'Executive Summary',
            style: 'subheader'
          },
          {
            columns: [
              {
                width: '33%',
                text: [
                  { text: 'Total: ', bold: true },
                  { text: `$${testData.summary.total.toLocaleString()}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Average: ', bold: true },
                  { text: `$${testData.summary.average.toLocaleString()}` }
                ]
              },
              {
                width: '33%',
                text: [
                  { text: 'Change: ', bold: true },
                  {
                    text: `+${testData.summary.percentChange}%`,
                    color: '#10B981' // Green for positive
                  }
                ]
              }
            ],
            margin: [0, 10, 0, 20]
          },
          // Items table
          {
            text: 'Detailed Items',
            style: 'subheader',
            margin: [0, 10, 0, 10]
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto'],
              body: [
                // Header row
                [
                  { text: 'Name', style: 'tableHeader' },
                  { text: 'Value', style: 'tableHeader' },
                  { text: 'Status', style: 'tableHeader' }
                ],
                // Data rows
                ...testData.items.map(item => [
                  item.name,
                  { text: `$${item.value.toLocaleString()}`, alignment: 'right' },
                  item.status
                ])
              ]
            },
            layout: {
              fillColor: function(rowIndex) {
                return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
              }
            }
          },
          // Chart data table
          {
            text: 'Monthly Performance',
            style: 'subheader',
            margin: [0, 20, 0, 10]
          },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                // Header row
                [
                  { text: 'Month', style: 'tableHeader' },
                  { text: 'Revenue', style: 'tableHeader' },
                  { text: 'Expenses', style: 'tableHeader' },
                  { text: 'Profit', style: 'tableHeader' }
                ],
                // Data rows
                ...testData.chartData.map(item => {
                  const profit = item.revenue - item.expenses;
                  return [
                    item.month,
                    { text: `$${item.revenue.toLocaleString()}`, alignment: 'right' },
                    { text: `$${item.expenses.toLocaleString()}`, alignment: 'right' },
                    {
                      text: `$${profit.toLocaleString()}`,
                      alignment: 'right',
                      color: profit >= 0 ? '#10B981' : '#EF4444' // Green for positive, red for negative
                    }
                  ];
                })
              ]
            },
            layout: {
              fillColor: function(rowIndex) {
                return (rowIndex % 2 === 0) ? '#f9f9f9' : null;
              }
            }
          },
          // Footer
          {
            text: 'Generated by Fortress Modeler',
            style: 'footer',
            margin: [0, 30, 0, 0]
          }
        ],
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            color: '#1A2942' // Fortress Blue
          },
          title: {
            fontSize: 24,
            bold: true,
            color: '#1A2942',
            alignment: 'center'
          },
          subheader: {
            fontSize: 14,
            bold: true,
            color: '#1A2942',
            margin: [0, 10, 0, 5]
          },
          tableHeader: {
            bold: true,
            fontSize: 12,
            color: '#1A2942'
          },
          footer: {
            fontSize: 10,
            color: '#666666',
            alignment: 'center',
            italics: true
          }
        },
        defaultStyle: {
          fontSize: 10
        }
      };

      // Generate the PDF
      await generatePdfReport(customDocDef, 'Test PDF Report');
    } catch (error) {
      console.error('Error generating test PDF:', error);
      alert('Error generating PDF. See console for details.');
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={handleClick}
    >
      <FileDown className="mr-2 h-4 w-4" />
      Test PDF
    </Button>
  );
};

export default TestPdfButton;
