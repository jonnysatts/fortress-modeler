/**
 * Add Risk Modal - Enhanced integration with RiskService
 * Updated for Phase 2 to work with enhanced risk management system
 */

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarIcon, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { User } from '@/types/user';
import { riskService } from '@/services/RiskService';

// Enhanced risk types from our database system
export type RiskCategory = 'customer' | 'revenue' | 'timeline' | 'resources' | 'market';
export type RiskPriority = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'identified' | 'monitoring' | 'mitigating' | 'resolved';

interface AddRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onRiskAdded: () => void; // Updated to just trigger refresh
  user?: User | null;
}

interface RiskFormData {
  title: string;
  description: string;
  category: RiskCategory;
  priority: RiskPriority;
  status: RiskStatus;
  impact_description: string;
  mitigation_plan: string;
  owner: string;
  target_resolution_date: string;
  probability: number;
  impact_score: number;
}

const ENHANCED_RISK_CATEGORIES = {
  'customer': {
    name: 'Customer & Market',
    description: 'Customer adoption, retention, and market positioning risks',
    icon: '👥',
    examples: ['Customer churn risk', 'Market demand shift', 'Competitive threat']
  },
  'revenue': {
    name: 'Revenue & Financial',
    description: 'Revenue generation, pricing, and financial sustainability risks',
    icon: '💰',
    examples: ['Revenue shortfall', 'Pricing pressure', 'Payment delays']
  },
  'timeline': {
    name: 'Timeline & Delivery',
    description: 'Project delays, scope creep, and delivery risks',
    icon: '📅',
    examples: ['Milestone delays', 'Scope expansion', 'Resource constraints']
  },
  'resources': {
    name: 'Resources & Team',
    description: 'Team capacity, skills, and resource availability risks',
    icon: '👩‍💻',
    examples: ['Key person dependency', 'Skill gaps', 'Resource conflicts']
  },
  'market': {
    name: 'Market & External',
    description: 'Market conditions, regulatory, and external factor risks',
    icon: '🌍',
    examples: ['Market volatility', 'Regulatory changes', 'Economic downturn']
  }
} as const;

const PRIORITY_CONFIG = {
  critical: {
    label: 'Critical',
    description: 'Immediate action required - high impact on project success',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800'
  },
  high: {
    label: 'High',
    description: 'Needs attention soon - could significantly impact project',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-800'
  },
  medium: {
    label: 'Medium',
    description: 'Monitor closely - moderate impact expected',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800'
  },
  low: {
    label: 'Low',
    description: 'Keep on radar - minimal immediate impact',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800'
  }
} as const;

const STATUS_CONFIG = {
  identified: {
    label: 'Identified',
    description: 'Risk spotted, needs assessment and planning',
    action: 'Plan response'
  },
  monitoring: {
    label: 'Monitoring',
    description: 'Watching this risk, no immediate action needed',
    action: 'Continue monitoring'
  },
  mitigating: {
    label: 'Mitigating',
    description: 'Actively working to reduce this risk',
    action: 'Execute mitigation'
  },
  resolved: {
    label: 'Resolved',
    description: 'Risk addressed or no longer relevant',
    action: 'Review outcome'
  }
} as const;

export const AddRiskModal: React.FC<AddRiskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onRiskAdded,
  user
}) => {
  const [step, setStep] = useState<'category' | 'details' | 'assessment'>('category');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<RiskFormData>({
    title: '',
    description: '',
    category: 'customer',
    priority: 'medium',
    status: 'identified',
    impact_description: '',
    mitigation_plan: '',
    owner: '',
    target_resolution_date: '',
    probability: 50,
    impact_score: 50
  });

  const handleReset = useCallback(() => {
    setStep('category');
    setIsSubmitting(false);
    setFormData({
      title: '',
      description: '',
      category: 'customer',
      priority: 'medium',
      status: 'identified',
      impact_description: '',
      mitigation_plan: '',
      owner: '',
      target_resolution_date: '',
      probability: 50,
      impact_score: 50
    });
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  // Create stable form field handlers
  const handleFieldChange = useCallback((field: keyof RiskFormData, value: RiskFormData[keyof RiskFormData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate risk score from probability and impact
      const riskScore = Math.round((formData.probability * formData.impact_score) / 100);

      const riskData = {
        project_id: projectId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        impact_description: formData.impact_description,
        mitigation_plan: formData.mitigation_plan,
        owner: formData.owner,
        target_resolution_date: formData.target_resolution_date || null,
        probability: formData.probability,
        impact_score: formData.impact_score,
        risk_score: riskScore,
        user_id: user.id
      };

      await riskService.createRisk(riskData);
      
      toast.success('Risk added successfully!');
      onRiskAdded(); // Trigger refresh
      handleClose();
    } catch (error) {
      console.error('Failed to add risk:', error);
      toast.error('Failed to add risk. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CategoryStep = useCallback(() => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">What type of risk is this?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the category that best describes your concern:
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(ENHANCED_RISK_CATEGORIES).map(([key, config]) => (
          <Card
            key={key}
            className={cn(
              "p-4 cursor-pointer border-2 transition-all hover:shadow-sm",
              formData.category === key ? "border-fortress-emerald bg-green-50" : "border-border hover:border-gray-300"
            )}
            onClick={() => handleFieldChange('category', key as RiskCategory)}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{config.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium">{config.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Examples:</p>
                  <ul className="text-xs text-muted-foreground mt-1">
                    {config.examples.slice(0, 2).map((example, index) => (
                      <li key={index}>• {example}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  ), [formData.category, handleFieldChange]);

  const DetailsStep = useCallback(() => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Describe the risk</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Tell us about this risk and its potential impact.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title" className="text-sm font-medium">
            Risk Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Key customer may not renew contract"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Provide details about this risk..."
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="impact" className="text-sm font-medium">
            Potential Impact
          </Label>
          <Textarea
            id="impact"
            placeholder="e.g., Could lose 30% of projected revenue, delay launch by 2 months..."
            value={formData.impact_description}
            onChange={(e) => handleFieldChange('impact_description', e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="mitigation" className="text-sm font-medium">
            Mitigation Plan
          </Label>
          <Textarea
            id="mitigation"
            placeholder="What actions will you take to address this risk?"
            value={formData.mitigation_plan}
            onChange={(e) => handleFieldChange('mitigation_plan', e.target.value)}
            className="mt-1"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="owner" className="text-sm font-medium">
            Owner
          </Label>
          <Input
            id="owner"
            placeholder="Who's responsible for this risk?"
            value={formData.owner}
            onChange={(e) => handleFieldChange('owner', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="targetDate" className="text-sm font-medium">
            Target Resolution Date
          </Label>
          <Input
            id="targetDate"
            type="date"
            value={formData.target_resolution_date}
            onChange={(e) => handleFieldChange('target_resolution_date', e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  ), [formData.title, formData.description, formData.impact_description, formData.mitigation_plan, formData.owner, formData.target_resolution_date, handleFieldChange]);

  // Memoize step components to prevent recreation on every render
  const AssessmentStep = useCallback(() => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Risk Assessment</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Rate the probability and impact of this risk.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-sm font-medium">Priority Level</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <Card
                key={key}
                className={cn(
                  "p-3 cursor-pointer border-2 transition-all text-center",
                  formData.priority === key ? `${config.bgColor} ${config.borderColor}` : "border-border hover:border-gray-300"
                )}
                onClick={() => handleFieldChange('priority', key as RiskPriority)}
              >
                <div className={cn("font-medium text-sm", formData.priority === key ? config.textColor : "")}>
                  {config.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {config.description}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Probability ({formData.probability}%)
          </Label>
          <div className="mt-2">
            <input
              type="range"
              min="0"
              max="100"
              value={formData.probability}
              onChange={(e) => handleFieldChange('probability', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Very Unlikely</span>
              <span>Very Likely</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">
            Impact Score ({formData.impact_score}%)
          </Label>
          <div className="mt-2">
            <input
              type="range"
              min="0"
              max="100"
              value={formData.impact_score}
              onChange={(e) => handleFieldChange('impact_score', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low Impact</span>
              <span>High Impact</span>
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Status</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => handleFieldChange('status', value as RiskStatus)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center space-x-2">
                    <span>{config.label}</span>
                    <span className="text-xs text-muted-foreground">- {config.action}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm font-medium mb-1">Enhanced Risk Score</div>
          <div className="text-2xl font-bold text-fortress-emerald">
            {(() => {
              // Convert percentages to 1-5 scale for calculation
              const prob1to5 = Math.ceil(formData.probability / 20);
              const impact1to5 = Math.ceil(formData.impact_score / 20);
              const baseScore = prob1to5 * impact1to5;
              
              // Priority multipliers
              const multipliers = { low: 1.0, medium: 1.5, high: 2.0, critical: 3.0 };
              const multipliedScore = baseScore * multipliers[formData.priority];
              
              return Math.min(25, Math.max(1, Math.round(multipliedScore)));
            })()}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Base: {Math.ceil(formData.probability / 20)} × {Math.ceil(formData.impact_score / 20)} = {Math.ceil(formData.probability / 20) * Math.ceil(formData.impact_score / 20)}</div>
            <div>Priority Multiplier: {formData.priority === 'low' ? '1.0x' : formData.priority === 'medium' ? '1.5x' : formData.priority === 'high' ? '2.0x' : '3.0x'}</div>
            <div>📊 <strong>{formData.priority.toUpperCase()}</strong> priority risks score higher</div>
          </div>
        </div>
      </div>
    </div>
  ), [formData.priority, formData.probability, formData.impact_score, formData.status, handleFieldChange]);

  const renderStepContent = () => {
    switch (step) {
      case 'category': return CategoryStep();
      case 'details': return DetailsStep();
      case 'assessment': return AssessmentStep();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'category': return formData.category ? true : false;
      case 'details': return formData.title.trim() !== '' && formData.description.trim() !== '';
      case 'assessment': return true;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'category': return 'Add New Risk - Step 1 of 3';
      case 'details': return 'Add New Risk - Step 2 of 3';
      case 'assessment': return 'Add New Risk - Step 3 of 3';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {step === 'category' && "Select the type of risk you want to track"}
            {step === 'details' && "Provide details about the risk and response plan"}
            {step === 'assessment' && "Assess the risk priority and likelihood"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mb-6">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              step === 'category' ? "bg-fortress-emerald text-white" : 
              ['details', 'assessment'].includes(step) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            )}>
              {['details', 'assessment'].includes(step) ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <div className={cn("h-0.5 w-12", ['details', 'assessment'].includes(step) ? "bg-green-300" : "bg-gray-200")} />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              step === 'details' ? "bg-fortress-emerald text-white" : 
              step === 'assessment' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            )}>
              {step === 'assessment' ? <CheckCircle2 className="w-4 h-4" /> : '2'}
            </div>
            <div className={cn("h-0.5 w-12", step === 'assessment' ? "bg-green-300" : "bg-gray-200")} />
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              step === 'assessment' ? "bg-fortress-emerald text-white" : "bg-gray-100 text-gray-500"
            )}>
              3
            </div>
          </div>

          {renderStepContent()}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {step !== 'category' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'details') setStep('category');
                  if (step === 'assessment') setStep('details');
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
          </div>
          <div>
            {step !== 'assessment' ? (
              <Button
                onClick={() => {
                  if (step === 'category') setStep('details');
                  if (step === 'details') setStep('assessment');
                }}
                disabled={!canProceed() || isSubmitting}
                className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Risk...
                  </>
                ) : (
                  'Add Risk'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
