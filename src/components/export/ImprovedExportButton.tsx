import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Presentation,
  ChevronDown,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { UnifiedExportService, ExportOptions, ExportData } from '@/services/UnifiedExportService';
import { Project, FinancialModel, ActualsPeriodEntry } from '@/lib/db';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  project: Project;
  models?: FinancialModel[];
  actuals?: ActualsPeriodEntry[];
  primaryModel?: FinancialModel;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showLabel?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

interface ExportState {
  isExporting: boolean;
  currentFormat?: string;
  lastExported?: {
    format: string;
    timestamp: Date;
  };
}

const exportService = new UnifiedExportService();

export const ImprovedExportButton: React.FC<ExportButtonProps> = ({
  project,
  models = [],
  actuals,
  primaryModel,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
  });

  const handleExport = async (format: 'pdf' | 'excel' | 'csv', template?: string) => {
    if (exportState.isExporting) {
      toast.error('Export already in progress');
      return;
    }

    setExportState({ ...exportState, isExporting: true, currentFormat: format });
    onExportStart?.();

    try {
      // Show starting toast
      const toastId = toast.loading(`Generating ${format.toUpperCase()} export...`);

      // Prepare export data
      const exportData: ExportData = {
        project,
        models,
        actuals,
        primaryModel: primaryModel || models[0],
      };

      // Configure export options
      const options: Partial<ExportOptions> = {
        format,
        template: template as any || 'executive',
        sections: {
          summary: true,
          financials: true,
          scenarios: models.length > 1,
          performance: !!actuals && actuals.length > 0,
          risks: false,
          appendix: false,
        },
        formatting: {
          includeCharts: format === 'pdf',
          includeLogos: true,
        },
        metadata: {
          author: 'Fortress Financial Team',
          company: 'Fortress Financial',
          confidentiality: 'Internal Use Only',
        },
      };

      // Generate export
      const result = await exportService.export(exportData, options);

      if (result.success && result.data && result.filename) {
        // Download the file
        const mimeTypes = {
          pdf: 'application/pdf',
          excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          csv: 'text/csv',
        };

        UnifiedExportService.downloadFile(
          result.data,
          result.filename,
          mimeTypes[format]
        );

        // Update state
        setExportState({
          isExporting: false,
          lastExported: {
            format,
            timestamp: new Date(),
          },
        });

        // Show success toast
        toast.success(`${format.toUpperCase()} exported successfully`, {
          id: toastId,
          description: result.filename,
        });

        onExportComplete?.();
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      
      toast.error(`Export failed`, {
        description: errorMessage,
      });

      setExportState({ ...exportState, isExporting: false });
      onExportError?.(errorMessage);
    }
  };

  const exportOptions = [
    {
      group: 'Quick Export',
      items: [
        {
          id: 'pdf-executive',
          label: 'Executive Summary',
          description: '2-3 page overview',
          icon: FileText,
          format: 'pdf' as const,
          template: 'executive',
          recommended: true,
        },
        {
          id: 'excel-full',
          label: 'Full Excel Analysis',
          description: 'Complete data workbook',
          icon: FileSpreadsheet,
          format: 'excel' as const,
          template: 'detailed',
        },
        {
          id: 'csv-data',
          label: 'CSV Data Export',
          description: 'Raw data for analysis',
          icon: File,
          format: 'csv' as const,
          template: 'detailed',
        },
      ],
    },
    {
      group: 'Detailed Reports',
      items: [
        {
          id: 'pdf-detailed',
          label: 'Detailed Analysis',
          description: '10-15 page comprehensive report',
          icon: FileText,
          format: 'pdf' as const,
          template: 'detailed',
        },
        {
          id: 'pdf-board',
          label: 'Board Presentation',
          description: 'Executive board report',
          icon: Presentation,
          format: 'pdf' as const,
          template: 'board',
        },
        {
          id: 'pdf-technical',
          label: 'Technical Deep Dive',
          description: 'Full technical analysis',
          icon: FileText,
          format: 'pdf' as const,
          template: 'technical',
        },
      ],
    },
  ];

  const isDisabled = exportState.isExporting || models.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
          disabled={isDisabled}
        >
          {exportState.isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {showLabel && 'Exporting...'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              {showLabel && 'Export'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Export Options</span>
          {exportState.lastExported && (
            <span className="text-xs text-muted-foreground font-normal">
              Last: {exportState.lastExported.format.toUpperCase()}
            </span>
          )}
        </DropdownMenuLabel>
        
        {exportOptions.map((group, groupIndex) => (
          <React.Fragment key={group.group}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            
            <div className="px-2 py-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {group.group}
              </p>
            </div>
            
            {group.items.map((item) => {
              const Icon = item.icon;
              const isCurrentlyExporting = 
                exportState.isExporting && 
                exportState.currentFormat === item.format;
              
              return (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => handleExport(item.format, item.template)}
                  disabled={isDisabled}
                  className="flex items-start gap-3 py-2"
                >
                  <div className={cn(
                    'flex-shrink-0 w-8 h-8 rounded flex items-center justify-center mt-0.5',
                    item.recommended 
                      ? 'bg-fortress-emerald/10 text-fortress-emerald'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {isCurrentlyExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.label}
                      </span>
                      {item.recommended && (
                        <span className="text-xs bg-fortress-emerald/10 text-fortress-emerald px-1.5 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  
                  {exportState.lastExported?.format === item.format && (
                    <Check className="h-4 w-4 text-fortress-emerald flex-shrink-0 mt-1" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </React.Fragment>
        ))}
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {models.length === 0 
                ? 'Create a financial model first to enable exports'
                : actuals && actuals.length > 0
                  ? 'Exports include actual performance data'
                  : 'Add performance data for variance analysis in exports'
              }
            </p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Simple export button for quick access
export const QuickExportButton: React.FC<{
  onClick: () => void;
  isExporting?: boolean;
  format?: 'pdf' | 'excel' | 'csv';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}> = ({
  onClick,
  isExporting = false,
  format = 'pdf',
  variant = 'outline',
  size = 'default',
  className,
}) => {
  const icons = {
    pdf: FileText,
    excel: FileSpreadsheet,
    csv: File,
  };
  
  const Icon = icons[format];
  
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={cn('gap-2', className)}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {format.toUpperCase()} Report
    </Button>
  );
};

export default ImprovedExportButton;
