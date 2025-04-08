import React, { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ExportDataType } from '@/store/types';

/**
 * Sample Export Component
 * This component registers a sample export function that always provides data
 * for testing the PDF export functionality.
 */
const SampleExport: React.FC = () => {
  const { registerExportFunction, unregisterExportFunction } = useStore(state => ({
    registerExportFunction: state.registerExportFunction,
    unregisterExportFunction: state.unregisterExportFunction
  }));

  useEffect(() => {
    // Register the export function
    console.log('[SampleExport] Registering export function');
    
    registerExportFunction('Sample Data', async () => {
      console.log('[SampleExport] Export function called');
      
      // Create sample data
      const sampleData: ExportDataType = {
        title: 'Sample Data Report',
        projectName: 'Sample Project',
        exportDate: new Date(),
        summary: {
          totalForecast: 10000,
          totalActual: 8500,
          percentUtilized: 85,
          forecastToDate: 9000,
          actualToDate: 8500
        },
        formattedSummary: {
          totalForecast: '$10,000.00',
          totalActual: '$8,500.00',
          percentUtilized: '85%',
          forecastToDate: '$9,000.00',
          actualToDate: '$8,500.00'
        },
        marketingChannels: [
          {
            name: 'Facebook',
            type: 'Social Media',
            forecast: 3000,
            actual: 2800,
            variance: -200,
            variancePercent: -6.67,
            costPerResult: 1.25
          },
          {
            name: 'Google',
            type: 'Search',
            forecast: 4000,
            actual: 3500,
            variance: -500,
            variancePercent: -12.5,
            costPerResult: 2.10
          },
          {
            name: 'Email',
            type: 'Direct',
            forecast: 3000,
            actual: 2200,
            variance: -800,
            variancePercent: -26.67,
            costPerResult: 0.75
          }
        ],
        performanceData: {
          channelPerformance: [
            { name: 'Facebook', forecast: 3000, actual: 2800, variance: -200 },
            { name: 'Google', forecast: 4000, actual: 3500, variance: -500 },
            { name: 'Email', forecast: 3000, actual: 2200, variance: -800 }
          ],
          periodPerformance: [
            { name: 'Week 1', forecast: 2500, actual: 2200, variance: -300 },
            { name: 'Week 2', forecast: 2500, actual: 2100, variance: -400 },
            { name: 'Week 3', forecast: 2500, actual: 2300, variance: -200 },
            { name: 'Week 4', forecast: 2500, actual: 1900, variance: -600 }
          ]
        }
      };
      
      console.log('[SampleExport] Returning sample data:', sampleData);
      return sampleData;
    });
    
    // Cleanup function
    return () => {
      console.log('[SampleExport] Unregistering export function');
      unregisterExportFunction('Sample Data');
    };
  }, [registerExportFunction, unregisterExportFunction]);
  
  // This component doesn't render anything
  return null;
};

export default SampleExport;
