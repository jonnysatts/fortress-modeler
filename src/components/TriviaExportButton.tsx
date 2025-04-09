import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import useStore from '@/store/useStore';

/**
 * A button component specifically for exporting Trivia data to Excel
 */
export function TriviaExportButton() {
  const { triggerTriviaExport, loading } = useStore();
  const isLoading = loading?.isLoading || false;

  const handleExport = async () => {
    try {
      await triggerTriviaExport();
    } catch (error) {
      console.error('Error exporting Trivia data:', error);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isLoading}
      className="flex items-center gap-1"
    >
      <Download className="h-4 w-4" />
      {isLoading ? 'Exporting...' : 'Export Trivia Data'}
    </Button>
  );
}
