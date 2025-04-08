import React from 'react';
import { useParams } from 'react-router-dom';
import { getProductExportData } from '@/lib/dataExport';
import { generatePdfReport } from '@/lib/simplePdfExport';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

/**
 * DirectExport Component
 * This component provides a direct export button that bypasses the store
 * and directly accesses the database to generate a PDF report.
 */
const DirectExport: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = React.useState(false);
  
  const handleDirectExport = async () => {
    if (!projectId) {
      console.error('[DirectExport] No project ID available');
      alert('No project selected. Please select a project first.');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`[DirectExport] Starting direct export for project ${projectId}`);
      
      // Parse the project ID
      const projectIdNum = parseInt(projectId);
      console.log(`[DirectExport] Parsed project ID: ${projectIdNum}`);
      
      // Get the data directly from the database
      console.log(`[DirectExport] Getting data for project ${projectIdNum}`);
      const data = await getProductExportData(projectIdNum);
      console.log('[DirectExport] Got data:', data);
      
      // Create a wrapper object to match the expected format
      const exportData = {
        'Product Data': data
      };
      console.log('[DirectExport] Created export data wrapper:', exportData);
      
      // Generate the PDF report
      console.log('[DirectExport] Generating PDF report');
      await generatePdfReport(exportData, 'Direct Export');
      console.log('[DirectExport] PDF report generated');
      
      setLoading(false);
    } catch (error) {
      console.error('[DirectExport] Error during direct export:', error);
      alert('Error generating export. See console for details.');
      setLoading(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleDirectExport}
      disabled={loading}
      className="flex items-center gap-1"
    >
      <FileText className="h-4 w-4" />
      {loading ? 'Exporting...' : 'Direct Export'}
    </Button>
  );
};

export default DirectExport;
