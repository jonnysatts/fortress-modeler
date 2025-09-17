import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BarChart3, 
  PlusCircle, 
  TrendingUp, 
  Target, 
  Users, 
  FileText,
  Lightbulb,
  Zap,
  Star
} from 'lucide-react';

interface EmptyStateProps {
  variant: 'projects' | 'models' | 'actuals' | 'risks' | 'team' | 'reports' | 'insights';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfig = {
  projects: {
    icon: BarChart3,
    title: "No projects yet - time to build your empire!",
    description: "Every financial fortress starts with a single project. Ready to lay the foundation?",
    actionLabel: "Create Your First Project",
    illustration: "📊",
    tips: [
      "Start with a simple revenue model",
      "Add costs as you discover them",
      "Track actuals to improve accuracy"
    ]
  },
  models: {
    icon: TrendingUp,
    title: "Ready to model the future?",
    description: "Transform your business assumptions into powerful financial projections.",
    actionLabel: "Build Your First Model",
    illustration: "📈",
    tips: [
      "Begin with your revenue streams",
      "Consider seasonal patterns",
      "Include marketing investments"
    ]
  },
  actuals: {
    icon: Target,
    title: "Time for a reality check!",
    description: "Add actual performance data to see how your predictions stack up against reality.",
    actionLabel: "Add Actual Data",
    illustration: "🎯",
    tips: [
      "Weekly actuals improve accuracy",
      "Compare with your projections",
      "Spot trends early"
    ]
  },
  risks: {
    icon: Target,
    title: "Your risk radar is clear... for now",
    description: "Every great project faces challenges. Let's identify and prepare for potential obstacles.",
    actionLabel: "Assess Project Risks",
    illustration: "🛡️",
    tips: [
      "Consider market volatility",
      "Plan for operational challenges",
      "Build contingency scenarios"
    ]
  },
  team: {
    icon: Users,
    title: "Great minds think alike",
    description: "Collaboration makes models stronger. Invite your team to join the financial planning party!",
    actionLabel: "Invite Team Members",
    illustration: "👥",
    tips: [
      "Share insights across teams",
      "Get diverse perspectives",
      "Real-time collaboration"
    ]
  },
  reports: {
    icon: FileText,
    title: "No reports to show yet",
    description: "Once you have data flowing, we'll create beautiful reports that make CFOs smile.",
    actionLabel: "Generate First Report",
    illustration: "📄",
    tips: [
      "Board-ready presentations",
      "Export to Excel/PDF",
      "Automated insights"
    ]
  },
  insights: {
    icon: Lightbulb,
    title: "Insights are brewing...",
    description: "As your data grows, our AI will surface powerful insights about your business performance.",
    actionLabel: "Add More Data",
    illustration: "💡",
    tips: [
      "Pattern recognition",
      "Anomaly detection",
      "Predictive analytics"
    ]
  }
};

export const EmptyState = memo(({ 
  variant, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = "" 
}: EmptyStateProps) => {
  const config = emptyStateConfig[variant];
  const Icon = config.icon;

  return (
    <Card className={`border-dashed border-2 border-muted-foreground/25 hover:border-fortress-blue/50 transition-colors duration-300 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-8 text-center">
        {/* Animated illustration */}
        <div className="relative mb-6">
          <div className="text-6xl mb-4 animate-bounce">{config.illustration}</div>
          <div className="absolute -top-2 -right-2 text-2xl animate-ping">✨</div>
        </div>

        {/* Icon with gentle animation */}
        <div className="bg-muted rounded-full p-4 mb-6 animate-pulse hover:animate-none hover:scale-110 transition-transform duration-300">
          <Icon className="h-8 w-8 text-fortress-blue" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-fortress-blue mb-2">
          {title || config.title}
        </h3>
        
        <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
          {description || config.description}
        </p>

        {/* Tips section */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">Pro tips:</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            {config.tips.map((tip, index) => (
              <li key={index} className="flex items-center gap-2">
                <Star className="h-3 w-3 text-fortress-emerald flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action button */}
        {onAction && (
          <Button
            onClick={onAction}
            className="bg-fortress-emerald hover:bg-fortress-emerald/90 hover:shadow-lg hover:shadow-fortress-emerald/25 transition-all duration-300 transform hover:scale-105"
            size="lg"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            {actionLabel || config.actionLabel}
          </Button>
        )}

        {/* Subtle encouragement */}
        <p className="text-xs text-muted-foreground/70 mt-4 italic">
          Every expert was once a beginner. You've got this! 💪
        </p>
      </CardContent>
    </Card>
  );
});

EmptyState.displayName = 'EmptyState';