import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Download, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TooltipWrapper from '@/components/ui/tooltip-wrapper';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  height?: string | number;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  isLoading?: boolean;
  onRefresh?: () => void;
  allowDownload?: boolean;
  allowExpand?: boolean;
  downloadData?: any[];
  downloadFilename?: string;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  className,
  height = 300,
  actions,
  footer,
  isLoading = false,
  onRefresh,
  allowDownload = false,
  allowExpand = false,
  downloadData,
  downloadFilename = 'chart-data.csv',
}) => {
  const [expanded, setExpanded] = useState(false);

  // Handle chart download
  const handleDownload = () => {
    if (!downloadData) return;

    // Convert data to CSV
    const headers = Object.keys(downloadData[0] || {});
    const csvContent = [
      headers.join(','),
      ...downloadData.map(row =>
        headers.map(header =>
          typeof row[header] === 'string' && row[header].includes(',')
            ? `"${row[header]}"`
            : row[header]
        ).join(',')
      )
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', downloadFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle expand/collapse
  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-300",
        expanded && "fixed inset-4 z-50 flex flex-col",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <TooltipWrapper content="Refresh data">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            )}

            {allowDownload && downloadData && (
              <TooltipWrapper content="Download data">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            )}

            {allowExpand && (
              <TooltipWrapper content={expanded ? "Minimize" : "Maximize"}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleExpand}
                >
                  {expanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </TooltipWrapper>
            )}

            {actions && (
              <div className="ml-2">{actions}</div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(
        "p-0",
        expanded ? "flex-1 overflow-auto" : ""
      )}>
        <div
          style={{ height: expanded ? 'auto' : height }}
          className={cn(
            "w-full",
            expanded && "h-full",
            isLoading && "opacity-60 animate-pulse"
          )}
        >
          {children}
        </div>
      </CardContent>

      {footer && (
        <CardFooter className="px-6 py-4 bg-muted/20 border-t">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default ChartContainer;
