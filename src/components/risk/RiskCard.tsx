/**
 * Enhanced Risk Card Component
 * Phase 2B: Transform "unknowable summaries" into actionable insights
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Trash2, 
  User as UserIcon, 
  Calendar,
  Target,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Activity,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskCategory, RiskPriority, RiskStatus } from '@/services/RiskService';

interface Risk {
  id: string;
  title: string;
  description: string | undefined;
  category: RiskCategory;
  priority: RiskPriority;
  status: RiskStatus;
  impact_description?: string;
  likelihood?: number;
  impact_score?: number;
  risk_score: number;
  mitigation_plan?: string;
  target_date?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
}

interface RiskCardProps {
  risk: Risk;
  onEdit: (risk: Risk) => void;
  onDelete: (riskId: string) => void;
  className?: string;
}

// Visual configurations
const CATEGORY_CONFIG = {
  'customer': {
    name: 'Customer & Market',
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    accentColor: 'bg-blue-500'
  },
  'revenue': {
    name: 'Revenue & Financial', 
    icon: <DollarSign className="h-4 w-4" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    accentColor: 'bg-green-500'
  },
  'timeline': {
    name: 'Timeline & Delivery',
    icon: <Calendar className="h-4 w-4" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
    accentColor: 'bg-purple-500'
  },
  'resources': {
    name: 'Resources & Team',
    icon: <UserIcon className="h-4 w-4" />,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800',
    accentColor: 'bg-orange-500'
  },
  'market': {
    name: 'Market & External',
    icon: <BarChart3 className="h-4 w-4" />,
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-800',
    accentColor: 'bg-indigo-500'
  }
};

const PRIORITY_CONFIG = {
  critical: { 
    label: 'Critical', 
    color: 'bg-red-500 text-white',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    pulse: 'animate-pulse'
  },
  high: { 
    label: 'High', 
    color: 'bg-orange-500 text-white',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    pulse: ''
  },
  medium: { 
    label: 'Medium', 
    color: 'bg-yellow-500 text-white',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    pulse: ''
  },
  low: { 
    label: 'Low', 
    color: 'bg-blue-500 text-white',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    pulse: ''
  }
};

const STATUS_CONFIG = {
  identified: { 
    label: 'Identified', 
    color: 'bg-blue-100 text-blue-800',
    icon: <AlertTriangle className="h-3 w-3" />
  },
  monitoring: { 
    label: 'Monitoring', 
    color: 'bg-gray-100 text-gray-800',
    icon: <Activity className="h-3 w-3" />
  },
  mitigating: { 
    label: 'Mitigating', 
    color: 'bg-orange-100 text-orange-800',
    icon: <Target className="h-3 w-3" />
  },
  resolved: { 
    label: 'Resolved', 
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="h-3 w-3" />
  }
};

export const RiskCard: React.FC<RiskCardProps> = ({ 
  risk, 
  onEdit, 
  onDelete, 
  className 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[risk.category] || CATEGORY_CONFIG['market'];
  const priorityConfig = PRIORITY_CONFIG[risk.priority];
  const statusConfig = STATUS_CONFIG[risk.status];

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = () => {
    if (!risk.target_date) return false;
    return new Date(risk.target_date) < new Date() && risk.status !== 'resolved';
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskScoreLabel = (score: number) => {
    if (score >= 75) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 25) return 'Medium';
    return 'Low';
  };

  return (
    <Card className={cn(
      "relative transition-all duration-200 hover:shadow-md",
      priorityConfig.borderColor,
      isOverdue() && "ring-2 ring-red-200",
      className
    )}>
      {/* Priority indicator stripe */}
      <div className={cn(
        "absolute left-0 top-0 w-1 h-full rounded-l",
        priorityConfig.color.includes('bg-red') ? 'bg-red-500' :
        priorityConfig.color.includes('bg-orange') ? 'bg-orange-500' :
        priorityConfig.color.includes('bg-yellow') ? 'bg-yellow-500' :
        'bg-blue-500',
        priorityConfig.pulse
      )} />

      <CardHeader className="pb-3 pl-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Header row with priority and status */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("text-xs", priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                <div className="flex items-center gap-1">
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>
              </Badge>
              {isOverdue() && (
                <Badge variant="destructive" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>

            {/* Risk title */}
            <h3 className="text-lg font-semibold mb-1 line-clamp-2">
              {risk.title}
            </h3>

            {/* Risk description */}
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {risk.description || 'No description provided.'}
            </p>

            {/* Quick info row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                {categoryConfig.icon}
                <span>{categoryConfig.name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full", getRiskScoreColor(risk.risk_score))} />
                <span className={getRiskScoreColor(risk.risk_score)}>
                  {getRiskScoreLabel(risk.risk_score)}
                </span>
                <span>({risk.risk_score})</span>
              </div>

              {risk.owner && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{risk.owner}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(risk)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(risk.id)}
              className="text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0 pl-4 space-y-4">
          {/* Risk score breakdown */}
          <div className={cn("p-3 rounded-lg", priorityConfig.bgColor)}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Enhanced Risk Score</span>
              <span className={cn("text-lg font-bold", getRiskScoreColor(risk.risk_score))}>
                {risk.risk_score}/100
              </span>
            </div>
            <Progress 
              value={risk.risk_score} 
              className="h-2 mb-2"
            />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Likelihood:</span>
                <span className="ml-2 font-medium">{risk.likelihood || 'N/A'}/5</span>
              </div>
              <div>
                <span className="text-muted-foreground">Impact:</span>
                <span className="ml-2 font-medium">{risk.impact_score || 'N/A'}/5</span>
              </div>
            </div>
          </div>

          {/* Impact description */}
          {risk.impact_description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Potential Impact</h4>
              <p className="text-sm text-muted-foreground">
                {risk.impact_description}
              </p>
            </div>
          )}

          {/* Mitigation plan */}
          {risk.mitigation_plan && (
            <div>
              <h4 className="text-sm font-medium mb-1">Mitigation Strategy</h4>
              <p className="text-sm text-muted-foreground">
                {risk.mitigation_plan}
              </p>
            </div>
          )}

          {/* Timeline and owner */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <h4 className="text-sm font-medium mb-1">Target Resolution</h4>
              <div className={cn(
                "text-sm",
                isOverdue() ? "text-red-600 font-medium" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3 inline mr-1" />
                {formatDate(risk.target_date)}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Risk Owner</h4>
              <div className="text-sm text-muted-foreground">
                <User className="h-3 w-3 inline mr-1" />
                {risk.owner || 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Timeline info */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div className="flex justify-between">
              <span>Created: {formatDate(risk.created_at)}</span>
              <span>Updated: {formatDate(risk.updated_at)}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
