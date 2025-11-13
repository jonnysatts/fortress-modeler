import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, BarChart3, FileSpreadsheet, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (optionId: string) => void;
  isExporting?: boolean;
  exportingOption?: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'rich-pdf',
    title: 'Rich PDF Report',
    description: 'Comprehensive PDF with charts, financial analysis, and detailed projections',
    icon: BarChart3,
    recommended: true,
  },
  {
    id: 'board-pdf',
    title: 'Executive Summary',
    description: 'Board-ready PDF focused on key metrics and strategic insights',
    icon: FileText,
  },
  {
    id: 'excel',
    title: 'Excel Analysis',
    description: 'Detailed Excel workbook with multiple sheets and raw data',
    icon: FileSpreadsheet,
  },
];

export function ExportModal({ 
  open, 
  onOpenChange, 
  onExport, 
  isExporting = false,
  exportingOption 
}: ExportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-fortress-emerald" />
            Export Financial Report
          </DialogTitle>
          <DialogDescription>
            Choose the format that best suits your needs. All exports include your current scenario data and analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {exportOptions.map((option) => {
            const Icon = option.icon;
            const isCurrentlyExporting = isExporting && exportingOption === option.id;
            
            return (
              <div
                key={option.id}
                className={cn(
                  "relative border rounded-lg p-4 cursor-pointer transition-all hover:border-fortress-emerald/50 hover:bg-fortress-emerald/5",
                  option.recommended && "border-fortress-emerald ring-1 ring-fortress-emerald/20",
                  isCurrentlyExporting && "opacity-75 cursor-not-allowed"
                )}
                onClick={() => {
                  if (!isExporting) {
                    onExport(option.id);
                  }
                }}
              >
                {option.recommended && (
                  <div className="absolute -top-2 -right-2 bg-fortress-emerald text-white text-xs px-2 py-1 rounded-full">
                    Recommended
                  </div>
                )}
                
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                    option.recommended 
                      ? "bg-fortress-emerald/10 text-fortress-emerald" 
                      : "bg-gray-100 text-gray-600"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {option.title}
                      {isCurrentlyExporting && (
                        <span className="ml-2 text-sm text-fortress-emerald">
                          Generating...
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  
                  {isCurrentlyExporting && (
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-fortress-emerald border-t-transparent"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500">
            {isExporting ? 'Export in progress...' : 'Select an option above to download'}
          </p>
          
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            {isExporting ? 'Please wait...' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}