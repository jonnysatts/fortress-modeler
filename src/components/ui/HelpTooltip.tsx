import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: React.ReactNode;
  title?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconSize?: number;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  title,
  side = 'top',
  className,
  iconSize = 16,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 transition-colors",
              "text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
          >
            <HelpCircle size={iconSize} />
            <span className="sr-only">Help</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-2">
            {title && (
              <div className="font-semibold text-sm">{title}</div>
            )}
            <div className="text-sm">{content}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Predefined help content for common features
export const helpContent = {
  productType: {
    title: "Product Type",
    content: "Defines the type of product or service you're modeling. Currently supports Weekly Events with plans to expand to other product types.",
  },
  
  fbCogs: {
    title: "F&B Cost of Goods Sold",
    content: "Choose to enter actual dollar amounts or use the percentage set in your financial model. The percentage option provides automatic calculations based on your revenue.",
  },
  
  marketingBudget: {
    title: "Marketing Budget Tracking",
    content: "Track marketing spend using your planned allocation from the model or enter custom amounts. The system calculates expected spend based on your marketing setup.",
  },
  
  modelComparison: {
    title: "Model Comparison",
    content: "Compare up to 4 financial models side-by-side to analyze different scenarios, metrics, and outcomes for better decision making.",
  },
  
  breadcrumbNav: {
    title: "Navigation",
    content: "Use the breadcrumb navigation to understand your current location and quickly jump back to any previous level in the hierarchy.",
  },
  
  riskAssessment: {
    title: "Risk Assessment",
    content: "Evaluate potential risks and their impact on your financial projections. Higher risk levels indicate greater uncertainty in outcomes.",
  },
  
  profitMargin: {
    title: "Profit Margin",
    content: "Calculated as (Net Profit / Total Revenue) × 100. Higher margins indicate more efficient operations and better profitability.",
  },
  
  paybackPeriod: {
    title: "Payback Period",
    content: "The time required to recover your initial investment. Shorter payback periods are generally preferred as they indicate faster return on investment.",
  },
};